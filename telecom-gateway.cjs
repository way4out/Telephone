const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const QR=require("qrcode");
const {providerConfig}=require("./carrier/esim-capacity.cjs");

const PORT=process.env.PORT||10000;
const html=fs.readFileSync(path.join(__dirname,"telecom-live","index.html"),"utf8");

const BASE_CHAIN_ID=8453;
const BASE_RPC_URL=process.env.BASE_RPC_URL||"https://mainnet.base.org";
const USDC_CONTRACT=(process.env.USDC_CONTRACT_ADDRESS||"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913").toLowerCase();
const RECEIVER=(process.env.USDC_RECEIVER_ADDRESS||"0x13653b6b8bd4b274da565faf6fa894e3418a6d10").toLowerCase();
const ACTIVATION_USDC="12";
const MONTHLY_USDC="4";
const USDC_DECIMALS=6;
const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a9df523b3ef";

const jobs=new Map();
const usedPaymentTxs=new Map();

const json=(r,c,o,extra={})=>{r.writeHead(c,{"content-type":"application/json;charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*",...extra});r.end(JSON.stringify(o))};
async function body(q){let s="";for await(const c of q)s+=c;return s}
function origin(){return (process.env.PUBLIC_BASE_URL||"https://stellarnet-8g-plus-quantum-telecom.onrender.com").replace(/\/$/,"")}
function jobStatus(j){return j?{id:j.id,plan:j.plan,status:j.status,provider_status:j.provider_status||null,provider_result:j.provider_result||null,payment_method:j.payment_method||null,payment_tx:j.payment_tx||null,amount_usdc:j.amount_usdc||null,created_at:j.created_at}:null}
function validAddress(a){return /^0x[a-fA-F0-9]{40}$/.test(String(a||""))}
function toUnits(amount){return BigInt(Math.round(Number(amount)*1e6)).toString()}
function padAddress(a){return String(a).slice(2).toLowerCase().padStart(64,"0")}
function transferCalldata(amount){return "0xa9059cbb"+padAddress(RECEIVER)+BigInt(toUnits(amount)).toString(16).padStart(64,"0")}
function paymentUri(amount){return "ethereum:"+USDC_CONTRACT+"@"+BASE_CHAIN_ID+"/transfer?address="+RECEIVER+"&uint256="+toUnits(amount)}

async function rpc(method,params){
  const res=await fetch(BASE_RPC_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if(!res.ok)throw Error("base_rpc_http_"+res.status);
  const j=await res.json();
  if(j.error)throw Error("base_rpc_"+(j.error.message||"error"));
  return j.result;
}

async function verifyUsdcPayment(txHash,requiredAmount){
  if(!/^0x[a-fA-F0-9]{64}$/.test(String(txHash||"")))return {ok:false,error:"invalid_tx_hash"};
  const key=txHash.toLowerCase();
  if(usedPaymentTxs.has(key))return {ok:false,error:"payment_tx_already_used",activation_id:usedPaymentTxs.get(key)};
  const tx=await rpc("eth_getTransactionByHash",[txHash]);
  const receipt=await rpc("eth_getTransactionReceipt",[txHash]);
  if(!tx||!receipt)return {ok:false,error:"transaction_not_mined"};
  if(receipt.status!=="0x1")return {ok:false,error:"transaction_failed"};
  const logs=Array.isArray(receipt.logs)?receipt.logs:[];
  const required=BigInt(toUnits(requiredAmount));
  for(const log of logs){
    if(String(log.address||"").toLowerCase()!==USDC_CONTRACT)continue;
    const topics=log.topics||[];
    if(String(topics[0]||"").toLowerCase()!==TRANSFER_TOPIC||topics.length<3)continue;
    const to="0x"+String(topics[2]).slice(-40).toLowerCase();
    const from="0x"+String(topics[1]).slice(-40).toLowerCase();
    let amount;
    try{amount=BigInt(log.data)}catch{continue}
    if(to===RECEIVER&&amount===required){
      return {ok:true,tx_hash:txHash,from,to,amount_usdc:requiredAmount,block_number:parseInt(receipt.blockNumber,16),token:USDC_CONTRACT,chain_id:BASE_CHAIN_ID};
    }
  }
  return {ok:false,error:"matching_usdc_transfer_not_found",expected_recipient:RECEIVER,expected_amount_usdc:requiredAmount,chain_id:BASE_CHAIN_ID};
}

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

async function fulfillPaidJob(j){
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

async function createOrder(d){
  const id="sn-"+Date.now()+"-"+crypto.randomBytes(4).toString("hex");
  const amount=ACTIVATION_USDC;
  const j={id,plan:d.plan,eid:d.eid||"",device_id:d.device_id||"",status:"payment_required",payment_method:"base_usdc",amount_usdc:amount,receiver:RECEIVER,token:USDC_CONTRACT,chain_id:BASE_CHAIN_ID,payment_uri:paymentUri(amount),created_at:new Date().toISOString()};
  jobs.set(id,j);
  return {ok:true,id,amount_usdc:amount,monthly_usdc:MONTHLY_USDC,network:"Base",chain_id:BASE_CHAIN_ID,token:"USDC",token_contract:USDC_CONTRACT,receiver:RECEIVER,payment_uri:j.payment_uri,calldata:transferCalldata(amount),checkout_url:origin()+"/?checkout=1&order_id="+encodeURIComponent(id)};
}

const server=http.createServer(async(q,r)=>{
  const u=new URL(q.url,"http://localhost");
  if(q.method==="OPTIONS")return json(r,204,{});
  if(q.method==="GET"&&(u.pathname==="/"||u.pathname==="/telecom"||u.pathname==="/index.html")){r.writeHead(200,{"content-type":"text/html;charset=utf-8","cache-control":"no-store"});return r.end(html)}
  if(q.method==="GET"&&u.pathname==="/health")return json(r,200,{ok:true,service:"StellarNet LLC Telcom",version:"7.0.0",network:"Base",chain_id:BASE_CHAIN_ID,payment:"USDC",timestamp:new Date().toISOString()});
  if(q.method==="GET"&&u.pathname==="/manifest.webmanifest"){r.writeHead(200,{"content-type":"application/manifest+json","cache-control":"public,max-age=3600"});return r.end(fs.readFileSync(path.join(__dirname,"manifest.webmanifest"),"utf8"))}
  if(q.method==="GET"&&u.pathname==="/api/readiness"){
    const p=providerConfig(process.env);
    return json(r,200,{ok:true,product:"StellarNet LLC Telcom",version:"7.0.0",network:"Base",chain_id:BASE_CHAIN_ID,activation_usd:8,monthly_usd:4,initial_charge_usdc:ACTIVATION_USDC,renewal_usdc:MONTHLY_USDC,overage_multiplier_percent:104,pricing_verified:true,
      payment:true,payment_method:"base_usdc_direct",usdc_contract:USDC_CONTRACT,usdc_receiver:RECEIVER,base_rpc:Boolean(BASE_RPC_URL),
      esim_provider:p.configured,esim_provision_url:Boolean(process.env.ESIM_PROVIDER_PROVISION_URL||p.configured),physical_fulfillment:Boolean(process.env.PHYSICAL_SIM_FULFILLMENT_API_KEY),
      contract_address:process.env.STELLARNET_TELCOM_CONTRACT_ADDRESS||"",mobile_web:true,pwa:true,authorized_provider_required:true,qr:true,
      checkout_start:origin()+"/?checkout=1"});
  }
  if(q.method==="GET"&&u.pathname==="/api/checkout-qr"){
    try{
      const target=origin()+"/?checkout=1";
      return json(r,200,{ok:true,target,qr_data_url:await QR.toDataURL(target,{margin:4,width:1024,errorCorrectionLevel:"H"})});
    }catch{return json(r,500,{ok:false,error:"qr_generation_failed"})}
  }
  if(q.method==="GET"&&u.pathname==="/api/payment-qr"){
    try{
      const orderId=u.searchParams.get("order_id");
      const j=jobs.get(orderId);
      if(!j)return json(r,404,{ok:false,error:"order_not_found"});
      return json(r,200,{ok:true,target:j.payment_uri,qr_data_url:await QR.toDataURL(j.payment_uri,{margin:4,width:1024,errorCorrectionLevel:"H"})});
    }catch{return json(r,500,{ok:false,error:"payment_qr_generation_failed"})}
  }
  if(q.method==="GET"&&u.pathname==="/api/order"){
    const id=u.searchParams.get("id");
    const j=jobs.get(id);
    if(!j)return json(r,404,{ok:false,error:"order_not_found"});
    return json(r,200,{ok:true,order:jobStatus(j),payment_uri:j.payment_uri,receiver:RECEIVER,token:USDC_CONTRACT});
  }
  if(q.method==="POST"&&u.pathname==="/api/activate"){
    try{
      const d=JSON.parse((await body(q))||"{}");
      if(!["esim","physical"].includes(d.plan))return json(r,400,{ok:false,error:"invalid_plan"});
      if(d.plan==="esim"&&d.eid&&!/^\d{32}$/.test(String(d.eid)))return json(r,400,{ok:false,error:"eid_must_be_32_digits"});
      return json(r,200,await createOrder(d));
    }catch(e){return json(r,503,{ok:false,error:e.message})}
  }
  if(q.method==="POST"&&u.pathname==="/api/usdc/verify"){
    try{
      const d=JSON.parse((await body(q))||"{}");
      const j=jobs.get(String(d.order_id||""));
      if(!j)return json(r,404,{ok:false,error:"order_not_found"});
      if(j.status==="provisioned"||j.status==="payment_confirmed")return json(r,200,{ok:true,already_paid:true,order:jobStatus(j)});
      if(j.status!=="payment_required")return json(r,409,{ok:false,error:"order_not_payable",order:jobStatus(j)});
      const v=await verifyUsdcPayment(d.tx_hash,j.amount_usdc);
      if(!v.ok)return json(r,400,v);
      j.payment_method="base_usdc";
      j.payment_tx=v.tx_hash;
      j.payment_from=v.from;
      j.payment_block=v.block_number;
      j.status="payment_confirmed";
      usedPaymentTxs.set(v.tx_hash.toLowerCase(),j.id);
      await fulfillPaidJob(j);
      return json(r,200,{ok:true,verified:true,order:jobStatus(j),verification:v});
    }catch(e){return json(r,503,{ok:false,error:String(e.message||e)})}
  }
  if(q.method==="POST"&&u.pathname==="/api/usdc/renew"){
    try{
      const d=JSON.parse((await body(q))||"{}");
      const v=await verifyUsdcPayment(d.tx_hash,MONTHLY_USDC);
      if(!v.ok)return json(r,400,v);
      return json(r,200,{ok:true,renewal_verified:true,amount_usdc:MONTHLY_USDC,verification:v});
    }catch(e){return json(r,503,{ok:false,error:String(e.message||e)})}
  }
  return json(r,404,{ok:false,error:"not_found"});
});
server.listen(PORT,"0.0.0.0",()=>console.log("StellarNet LLC Telcom v7.0.0 on "+PORT));
