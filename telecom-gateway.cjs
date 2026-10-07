const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto"),Stripe=require("stripe");
const QR=require("qrcode");
const {providerConfig}=require("./carrier/esim-capacity.cjs");
const PORT=process.env.PORT||10000;
const html=fs.readFileSync(path.join(__dirname,"telecom-live","index.html"),"utf8");
const stripe=process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY):null;
const jobs=new Map();
const handledEvents=new Set();

const json=(r,c,o,extra={})=>{r.writeHead(c,{"content-type":"application/json;charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*",...extra});r.end(JSON.stringify(o))};
async function body(q){let s="";for await(const c of q)s+=c;return s}
function origin(){return (process.env.PUBLIC_BASE_URL||"https://stellarnet-8g-plus-quantum-telecom.onrender.com").replace(/\/$/,"")}
function jobStatus(j){return j?{id:j.id,plan:j.plan,status:j.status,provider_status:j.provider_status||null,provider_result:j.provider_result||null,created_at:j.created_at}:null}

async function provisionEsim(j){
  const cfg=providerConfig(process.env);
  if(!cfg.configured)return {ok:false,status:"provider_not_configured"};
  const url=String(process.env.ESIM_PROVIDER_PROVISION_URL||cfg.baseUrl+"/api/v2/reseller/esim/provision");
  const payload={label:j.id};
  const res=await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+process.env.ESIM_PROVIDER_API_KEY,"Content-Type":"application/json","Accept":"application/json","Idempotency-Key":j.id},body:JSON.stringify(payload)});
  const text=await res.text();
  let data;try{data=JSON.parse(text)}catch{data={raw:text.slice(0,2000)}}
  if(!res.ok)throw Error("esim_provider_http_"+res.status);
  return {ok:true,status:"provisioned",data};
}

async function checkout(d){
  if(!stripe)throw Error("stripe_not_configured");
  const a=process.env.STRIPE_ACTIVATION_PRICE_ID,m=process.env.STRIPE_MONTHLY_PRICE_ID;
  if(!a||!m)throw Error("stripe_price_ids_not_configured");
  const id="sn-"+Date.now()+"-"+crypto.randomBytes(4).toString("hex");
  const x={mode:"subscription",line_items:[{price:a,quantity:1},{price:m,quantity:1}],phone_number_collection:{enabled:true},
    metadata:{service:"stellarnet_llc_telcom",activation_id:id,plan:d.plan,eid:String(d.eid||""),device_id:String(d.device_id||"")},
    subscription_data:{metadata:{service:"stellarnet_llc_telcom",activation_id:id,plan:d.plan},billing_mode:{type:"flexible"}},
    success_url:origin()+"/?activated=1&session_id={CHECKOUT_SESSION_ID}",cancel_url:origin()+"/?cancelled=1"};
  if(d.plan==="physical")x.shipping_address_collection={allowed_countries:["US","CA","MX","GB","IE","FR","DE","ES","IT","NL","AU","NZ","JP","SG"]};
  const s=await stripe.checkout.sessions.create(x,{idempotencyKey:id});
  jobs.set(id,{id,plan:d.plan,eid:d.eid||"",device_id:d.device_id||"",status:"checkout_created",url:s.url,created_at:new Date().toISOString()});
  return{ok:true,id,url:s.url,amount_usd:8,monthly_usd:4};
}

async function syncPaidSession(s){
  const id=s.metadata?.activation_id;
  if(!id)return null;
  let j=jobs.get(id);
  if(!j){
    j={id,plan:s.metadata?.plan||"esim",eid:s.metadata?.eid||"",device_id:s.metadata?.device_id||"",status:"payment_confirmed",created_at:new Date().toISOString()};
    jobs.set(id,j);
  }
  if(s.payment_status!=="paid")return j;
  if(j.status==="provisioned"||j.status==="provision_requested"||j.status==="provisioning")return j;
  j.status="payment_confirmed";
  if(j.plan!=="esim")return j;
  j.status="provision_requested";
  try{
    const p=await provisionEsim(j);
    j.provider_status=p.status;
    j.provider_result=p.data||null;
    j.status=p.ok?"provisioned":"provider_not_configured";
  }catch(e){j.status="provision_failed";j.provider_error=String(e.message||e)}
  return j;
}

const server=http.createServer(async(q,r)=>{
  const u=new URL(q.url,"http://localhost");
  if(q.method==="OPTIONS")return json(r,204,{});
  if(q.method==="GET"&&(u.pathname==="/"||u.pathname==="/telecom"||u.pathname==="/index.html")){r.writeHead(200,{"content-type":"text/html;charset=utf-8","cache-control":"no-store"});return r.end(html)}
  if(q.method==="GET"&&u.pathname==="/health")return json(r,200,{ok:true,service:"StellarNet LLC Telcom",version:"6.1.0",network:"Base",chain_id:8453,timestamp:new Date().toISOString()});
  if(q.method==="GET"&&u.pathname==="/manifest.webmanifest"){r.writeHead(200,{"content-type":"application/manifest+json","cache-control":"public,max-age=3600"});return r.end(fs.readFileSync(path.join(__dirname,"manifest.webmanifest"),"utf8"))}
  if(q.method==="GET"&&u.pathname==="/api/readiness"){
    const p=providerConfig(process.env);
    return json(r,200,{ok:true,product:"StellarNet LLC Telcom",version:"6.1.0",network:"Base",chain_id:8453,activation_usd:8,monthly_usd:4,overage_multiplier_percent:104,pricing_verified:true,
      payment:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.STRIPE_ACTIVATION_PRICE_ID&&process.env.STRIPE_MONTHLY_PRICE_ID),
      stripe_prices:Boolean(process.env.STRIPE_ACTIVATION_PRICE_ID&&process.env.STRIPE_MONTHLY_PRICE_ID),
      esim_provider:p.configured,esim_provision_url:Boolean(process.env.ESIM_PROVIDER_PROVISION_URL||p.configured),
      physical_fulfillment:Boolean(process.env.PHYSICAL_SIM_FULFILLMENT_API_KEY),contract_address:process.env.STELLARNET_TELCOM_CONTRACT_ADDRESS||"",
      mobile_web:true,pwa:true,authorized_provider_required:true,qr:true,checkout_start:origin()+"/?checkout=1"});
  }
  if(q.method==="GET"&&u.pathname==="/api/checkout-qr"){
    try{
      const target=origin()+"/?checkout=1";
      return json(r,200,{ok:true,target,qr_data_url:await QR.toDataURL(target,{margin:4,width:1024,errorCorrectionLevel:"H"})});
    }catch{return json(r,500,{ok:false,error:"qr_generation_failed"})}
  }
  if(q.method==="GET"&&u.pathname==="/api/order"){
    const sessionId=u.searchParams.get("session_id");
    if(!sessionId||!stripe)return json(r,400,{ok:false,error:"session_id_required"});
    try{
      const s=await stripe.checkout.sessions.retrieve(sessionId,{expand:["subscription"]});
      const j=s.payment_status==="paid"?await syncPaidSession(s):jobs.get(s.metadata?.activation_id);
      return json(r,200,{ok:true,session_id:s.id,payment_status:s.payment_status,status:s.status,customer_email:s.customer_details?.email||null,activation_id:s.metadata?.activation_id||null,job:jobStatus(j)});
    }catch{return json(r,404,{ok:false,error:"order_not_found"})}
  }
  if(q.method==="POST"&&u.pathname==="/api/activate"){
    try{
      const d=JSON.parse((await body(q))||"{}");
      if(!["esim","physical"].includes(d.plan))return json(r,400,{ok:false,error:"invalid_plan"});
      if(d.plan==="esim"&&d.eid&&!/^\d{32}$/.test(String(d.eid)))return json(r,400,{ok:false,error:"eid_must_be_32_digits"});
      return json(r,200,await checkout(d));
    }catch(e){return json(r,503,{ok:false,error:e.message})}
  }
  if(q.method==="POST"&&u.pathname==="/stripe/webhook"){
    if(!stripe||!process.env.STRIPE_WEBHOOK_SECRET)return json(r,503,{ok:false,error:"stripe_webhook_not_configured"});
    try{
      const ev=stripe.webhooks.constructEvent(await body(q),q.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);
      if(handledEvents.has(ev.id))return json(r,200,{received:true,duplicate:true});
      handledEvents.add(ev.id);
      if(ev.type==="checkout.session.completed")await syncPaidSession(ev.data.object);
      return json(r,200,{received:true});
    }catch(e){return json(r,400,{ok:false,error:e.message==="No signatures found matching the expected signature for payload"?"invalid_webhook":"invalid_webhook"})}
  }
  return json(r,404,{ok:false,error:"not_found"});
});
server.listen(PORT,"0.0.0.0",()=>console.log("StellarNet LLC Telcom v6.1.0 on "+PORT));