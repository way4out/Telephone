import express from "express";
import cors from "cors";
import Stripe from "stripe";
import crypto from "node:crypto";

const app=express();
app.use(cors({origin:(process.env.CORS_ORIGIN||"https://oeql-quantum-telecom-phone.onrender.com").split(",").filter(Boolean),credentials:false}));
app.post("/v1/webhooks/stripe",express.raw({type:"application/json"}),async(req,res)=>{
  const stripeKey=process.env.STRIPE_SECRET_KEY;
  if(!stripeKey||!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send("webhook_not_configured");
  try{
    const stripe=new Stripe(stripeKey);
    const event=stripe.webhooks.constructEvent(req.body,req.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);
    res.json({received:true,type:event.type});
  }catch(e){res.status(400).send("invalid_signature");}
});
app.use(express.json({limit:"32kb"}));

const PORT=process.env.PORT||10000;
const stripeKey=process.env.STRIPE_SECRET_KEY;
const priceId=process.env.STRIPE_PRICE_ID||"price_1UM2djRPRXTyZSXkK8ceygV3";
const publicApp=process.env.PUBLIC_APP_URL||"https://oeql-quantum-telecom-phone.onrender.com";
const stripe=stripeKey?new Stripe(stripeKey):null;
const atomicBase=(process.env.ATOMIC_API_BASE_URL||"https://api.atomicmobile.com").replace(/\/$/,"");
const atomicKey=process.env.ATOMIC_API_KEY||process.env.ESIM_PROVIDER_API_KEY||"";
const atomicPlan=process.env.ATOMIC_PLAN_ID||"plan_att_platinum_5g";
const journeyBase=(process.env.JOURNEY_API_BASE_URL||"https://journeyesims.com/api/v1").replace(/\/$/,"");
const journeyKey=process.env.JOURNEY_API_KEY||"";
function id(){return crypto.randomUUID();}
const LIVE_MEDIA_CATALOG={
 tv:[{name:"NASA TV",region:"Global",kind:"official"},{name:"DW English",region:"Global",kind:"official"},{name:"Al Jazeera English",region:"Global",kind:"official"},{name:"France 24",region:"Global",kind:"official"},{name:"NHK WORLD-JAPAN",region:"Global",kind:"official"}],
 radio:[{name:"BBC World Service",region:"Global",kind:"official"},{name:"VOA",region:"Global",kind:"official"},{name:"RFI",region:"Global",kind:"official"},{name:"Global Player",region:"Supported territories",kind:"official"}],
 data:[{name:"NOAA",region:"Global",kind:"public"},{name:"NASA Earthdata",region:"Global",kind:"public"},{name:"USGS",region:"Global",kind:"public"}]
};
function requireStripe(res){if(!stripe)return res.status(503).json({ok:false,error:"payments_not_configured"});}

app.get("/health",(_,res)=>res.json({ok:true,service:"stellarnet-telecom-api",payments:Boolean(stripe),journey:Boolean(journeyKey),atomic:Boolean(atomicKey),carrier_mode:process.env.CARRIER_MODE||"development",version:"2.1.0"}));
app.get("/v1/media/catalog",(_,res)=>res.json({ok:true,scope:"global-live-media",policy:"public-authorized-or-licensed-feeds-only",catalog:LIVE_MEDIA_CATALOG}));
app.get("/v1/carrier/status",(_,res)=>res.json({carrier:process.env.CARRIER_NAME||"StellarNet Telecom",mode:process.env.CARRIER_MODE||"development",network:"7G+ experimental",public_cellular_authorization:process.env.CARRIER_MODE==="production_authorized",esim_rsp_ready:Boolean(atomicKey||journeyKey),journey_ready:Boolean(journeyKey),atomic_ready:Boolean(atomicKey),physical_fulfillment_ready:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY),note:"The software control plane does not itself grant spectrum, carrier, numbering, or GSMA authorization."}));

app.post("/v1/checkout/session",async(req,res)=>{
  if(requireStripe(res))return;
  try{
    const session=await stripe.checkout.sessions.create({
      mode:"subscription",line_items:[{price:priceId,quantity:1}],
      success_url:(req.body.success_url||publicApp)+"?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url:(req.body.cancel_url||publicApp)+"?checkout=cancelled",
      allow_promotion_codes:true,billing_address_collection:"auto",
      metadata:{vendor:"StellarNet Telecom",architecture:"OEQL 7G+",flow:"membership"},
      subscription_data:{metadata:{vendor:"StellarNet Telecom",architecture:"OEQL 7G+"}}
    });
    res.json({ok:true,url:session.url,id:session.id});
  }catch(e){res.status(400).json({ok:false,error:"checkout_creation_failed"});}
});

app.post("/v1/customer-portal",async(req,res)=>{
  if(requireStripe(res))return;
  const {checkout_session_id,return_url}=req.body||{};
  if(!checkout_session_id)return res.status(400).json({ok:false,error:"checkout_session_id_required"});
  try{
    const session=await stripe.checkout.sessions.retrieve(checkout_session_id);
    if(!session.customer)return res.status(400).json({ok:false,error:"customer_not_found"});
    const portal=await stripe.billingPortal.sessions.create({customer:session.customer,return_url:return_url||publicApp});
    res.json({ok:true,url:portal.url});
  }catch(e){res.status(400).json({ok:false,error:"customer_portal_unavailable"});}
});

app.post("/v1/journey/esim/provision",async(req,res)=>{
  const {planId,reference,checkout_session_id}=req.body||{};
  if(!journeyKey)return res.status(503).json({ok:false,error:"journey_api_key_not_configured"});
  if(!planId)return res.status(400).json({ok:false,error:"planId_required"});
  if(!checkout_session_id)return res.status(400).json({ok:false,error:"checkout_session_id_required"});
  if(!stripe)return res.status(503).json({ok:false,error:"payments_not_configured"});
  try{
    const session=await stripe.checkout.sessions.retrieve(checkout_session_id,{expand:["subscription"]});
    if(session.payment_status!=="paid"||!session.subscription)return res.status(402).json({ok:false,error:"subscription_not_paid"});
    const r=await fetch(journeyBase+"/esims",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+journeyKey},body:JSON.stringify({planId,quantity:1,reference:reference||("stellarnet-"+session.id)})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status===402?402:(r.status===422?422:502)).json({ok:false,error:"journey_provisioning_failed",provider_status:r.status,provider:data.error||null});
    const esim=data.esims?.[0]||null;
    res.status(201).json({ok:true,provider:"Journey eSIMs",orderId:data.orderId,status:data.status,planId:data.planId||planId,esim});
  }catch(e){res.status(502).json({ok:false,error:"journey_connection_failed"});}
});

app.get("/v1/journey/catalog",async(_,res)=>{
  if(!journeyKey)return res.status(503).json({ok:false,error:"journey_api_key_not_configured"});
  try{
    const r=await fetch(journeyBase+"/catalog",{headers:{authorization:`Bearer ${journeyKey}`}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(502).json({ok:false,error:"journey_catalog_failed",provider_status:r.status});
    res.json({ok:true,catalog:data});
  }catch(e){res.status(502).json({ok:false,error:"journey_connection_failed"});}
});

app.post("/v1/esim/provision",async(req,res)=>{
  const {checkout_session_id,eid,device_id}=req.body||{};
  if(!checkout_session_id||!eid)return res.status(400).json({ok:false,error:"checkout_session_id_and_eid_required"});
  if(!stripe)return res.status(503).json({ok:false,error:"payments_not_configured"});
  if(!atomicKey)
    return res.status(503).json({ok:false,error:"esim_provider_not_configured",message:"Authorized carrier/eSIM RSP credentials are required before a real profile can be downloaded."});
  try{
    const session=await stripe.checkout.sessions.retrieve(checkout_session_id,{expand:["subscription"]});
    if(session.payment_status!=="paid"||!session.subscription)return res.status(402).json({ok:false,error:"subscription_not_paid"});
    const r=await fetch(atomicBase+"/v1/subscriptions",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${atomicKey}`},body:JSON.stringify({planId:atomicPlan,simType:"esim",activation:"immediate",eid,deviceId:device_id,externalReference:id(),subscriptionId:session.subscription.id})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(502).json({ok:false,error:"esim_provider_error",provider_status:r.status});
    res.json({ok:true,provisioning:data});
  }catch(e){res.status(400).json({ok:false,error:"provisioning_failed"});}
});


// --- StellarNet subscriber/device control plane ---
// These endpoints manage StellarNet application state only. They never fabricate
// carrier credentials, IMSIs, ICCIDs, eSIM profiles, spectrum authorization, or
// GSMA certificates. Production SIM issuance remains delegated to an authorized RSP/MVNO.
const subscribers=new Map();
const simOrders=new Map();

function hashId(v){return crypto.createHash("sha256").update(String(v)).digest("hex");}

app.post("/v1/subscriber/register",async(req,res)=>{
  const {checkout_session_id,email,eid,device_id,sim_type="esim"}=req.body||{};
  if(!checkout_session_id||!email)return res.status(400).json({ok:false,error:"checkout_session_id_and_email_required"});
  if(!stripe)return res.status(503).json({ok:false,error:"payments_not_configured"});
  try{
    const session=await stripe.checkout.sessions.retrieve(checkout_session_id,{expand:["subscription","customer"]});
    if(session.payment_status!=="paid"||!session.subscription)return res.status(402).json({ok:false,error:"subscription_not_paid"});
    const subscriber_id=hashId(session.customer||email).slice(0,24);
    const record={subscriber_id,email,device_id:device_id||null,eid:eid||null,sim_type,subscription_id:session.subscription.id,status:"paid_pending_carrier",created_at:new Date().toISOString()};
    subscribers.set(subscriber_id,record);
    res.json({ok:true,subscriber:record,next_step:process.env.ESIM_PROVIDER_BASE_URL?"carrier_provisioning":"authorized_carrier_credentials_required"});
  }catch(e){res.status(400).json({ok:false,error:"subscriber_registration_failed"});}
});

app.post("/v1/sim/order",async(req,res)=>{
  const {checkout_session_id,email,shipping_address,sim_type="physical"}=req.body||{};
  if(!checkout_session_id||!email||!shipping_address)return res.status(400).json({ok:false,error:"checkout_session_id_email_shipping_address_required"});
  if(!stripe)return res.status(503).json({ok:false,error:"payments_not_configured"});
  try{
    const session=await stripe.checkout.sessions.retrieve(checkout_session_id,{expand:["subscription"]});
    if(session.payment_status!=="paid")return res.status(402).json({ok:false,error:"payment_not_completed"});
    const order_id=id();
    const order={order_id,email,sim_type,shipping_address,status:"paid_pending_authorized_fulfillment",subscription_id:session.subscription?.id||null,created_at:new Date().toISOString()};
    simOrders.set(order_id,order);
    res.status(202).json({ok:true,order,carrier_fulfillment_ready:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL)});
  }catch(e){res.status(400).json({ok:false,error:"sim_order_failed"});}
});

app.get("/v1/telecom/readiness",(_,res)=>res.json({
  ok:true,
  control_plane:true,
  payments:Boolean(stripe),
  eSIM_RSP:Boolean(atomicKey||journeyKey),
  physical_SIM_fulfillment:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY),
  production_carrier_authorized:process.env.CARRIER_MODE==="production_authorized",
  atomic_adapter:Boolean(atomicKey),
  journey_adapter:Boolean(journeyKey),
  atomic_plan:atomicPlan,
  quantum_radio:false,
  note:"Real operator credentials and SIM profiles must come from an authorized carrier/RSP; this service does not generate them."
}));

app.get("/v1/telecom/capabilities",(_,res)=>res.json({
  brand:process.env.PUBLIC_BRAND_NAME||"StellarNet Telecom",
  plan:{name:"StellarNet $4",activation_usd:4,monthly_usd:4,cancel_anytime:true},
  interfaces:["web","PWA","mobile-responsive","API"],
  customer_flows:["checkout","subscription lifecycle","customer portal","subscriber registration","eSIM provisioning adapter","physical SIM fulfillment adapter","order tracking","live readiness","global capability lookup"],
  radio_and_core_capabilities:[
    {name:"2G/GSM",status:"provider_dependent"},{name:"3G/UMTS",status:"provider_dependent"},
    {name:"4G/LTE",status:"provider_dependent"},{name:"5G NSA",status:"provider_dependent"},
    {name:"5G SA",status:"provider_dependent"},{name:"VoLTE/IMS",status:"provider_dependent"},
    {name:"VoWiFi",status:"provider_dependent"},{name:"SMS",status:"provider_dependent"},
    {name:"MMS",status:"provider_dependent"},{name:"RCS",status:"provider_dependent"},
    {name:"IPv4/IPv6 data",status:"provider_dependent"},{name:"Private APN",status:"provider_dependent"},
    {name:"IoT/M2M",status:"provider_dependent"},{name:"NTN/satellite",status:"device_and_provider_dependent"},
    {name:"International roaming",status:"provider_dependent"}
  ],
  subscriber_and_device:["eSIM","physical SIM","EID/device registration","device compatibility checks","numbering-provider lookup","fraud/risk controls","usage/status telemetry"],
  network_operations:["carrier capability lookup","coverage data adapter","measured speed telemetry adapter","numbering adapter","live one-second control-plane heartbeat","no-store live API"],
  standards_and_ecosystem:["GSMA eSIM Discovery / RSP integration path","SM-DP+ provider integration path","MNO/MVNO integration path","network settings/device compatibility integration path"],
  experimental:["quantum/control-plane architecture","7G+ research UI"],
  activation_reality:{
    software_control_plane:true,
    commercial_cellular_authorized:process.env.CARRIER_MODE==="production_authorized",
    esim_rsp_ready:Boolean(atomicKey||journeyKey),
    physical_sim_fulfillment_ready:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY),
    note:"Maximum software capability is exposed here, but live radio access, numbering, roaming, eSIM profiles, and SIM fulfillment activate only through authorized operator/provider contracts and credentials."
  }
}));

app.get("/v1/carrier/capabilities",(req,res)=>{
  const country=String(req.query.country||"US").toUpperCase();
  const configured=countryData("NETWORK_CARRIER_CAPABILITIES_JSON",country)||{};
  res.set("Cache-Control","no-store");
  res.json({
    ok:true,country,
    production_authorized:process.env.CARRIER_MODE==="production_authorized",
    provider_configured:Boolean(configured&&Object.keys(configured).length),
    capabilities:{
      "2g":"provider_dependent","3g":"provider_dependent","4g_lte":"provider_dependent",
      "5g_nsa":"provider_dependent","5g_sa":"provider_dependent",volte:"provider_dependent",
      vowifi:"provider_dependent",sms:"provider_dependent",mms:"provider_dependent",rcs:"provider_dependent",
      ipv4_ipv6:"provider_dependent",private_apn:"provider_dependent",iot_m2m:"provider_dependent",
      ntn_satellite:"device_and_provider_dependent",roaming:"provider_dependent",
      esim:Boolean(atomicKey||journeyKey),physical_sim:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY)
    },
    configured_data:configured
  });
});

// Global verified-data API layer. No synthetic coverage, speed, numbering, or carrier claims.
function countryData(env,country){try{return JSON.parse(process.env[env]||"{}")[String(country||"").toUpperCase()]||null}catch{return null}}
app.get("/v1/global/coverage",(req,res)=>{const country=String(req.query.country||"").toUpperCase(),x=countryData("NETWORK_COVERAGE_JSON",country);res.json({ok:true,country,available:Boolean(x),data:x,source:x?.source||"provider_data_required"})});
app.get("/v1/global/speed",(req,res)=>{const country=String(req.query.country||"").toUpperCase(),x=countryData("NETWORK_SPEED_JSON",country);res.json({ok:true,country,measured:Boolean(x?.measured),data:x,source:x?.source||"measured_telemetry_required"})});
app.get("/v1/global/numbering",(req,res)=>{const country=String(req.query.country||"").toUpperCase(),x=countryData("NETWORK_NUMBERING_JSON",country);res.json({ok:true,country,available:Boolean(x),data:x,source:x?.source||"authorized_numbering_provider_required"})});
app.get("/v1/global/carrier",(req,res)=>{const country=String(req.query.country||"").toUpperCase(),x=countryData("NETWORK_CARRIER_CAPABILITIES_JSON",country)||{};res.json({ok:true,country,production_authorized:process.env.CARRIER_MODE==="production_authorized",...x,esim_rsp_ready:Boolean(atomicKey||journeyKey),physical_fulfillment_ready:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY)})});
app.get("/v1/live",async(req,res)=>{
  const country=String(req.query.country||"US").toUpperCase();
  const coverage=countryData("NETWORK_COVERAGE_JSON",country);
  const speed=countryData("NETWORK_SPEED_JSON",country);
  const numbering=countryData("NETWORK_NUMBERING_JSON",country);
  const carrier=countryData("NETWORK_CARRIER_CAPABILITIES_JSON",country)||{};
  res.set("Cache-Control","no-store");
  res.json({
    ok:true,server_time:new Date().toISOString(),country,
    readiness:{
      control_plane:true,payments:Boolean(stripe),eSIM_RSP:Boolean(atomicKey||journeyKey),
      physical_SIM_fulfillment:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY),
      production_carrier_authorized:process.env.CARRIER_MODE==="production_authorized"
    },
    global:{
      coverage:{available:Boolean(coverage),data:coverage,source:coverage?.source||"provider_data_required"},
      speed:{measured:Boolean(speed?.measured),data:speed,source:speed?.source||"measured_telemetry_required"},
      numbering:{available:Boolean(numbering),data:numbering,source:numbering?.source||"authorized_numbering_provider_required"},
      carrier:{production_authorized:process.env.CARRIER_MODE==="production_authorized",...carrier}
    }
  });
});
app.listen(PORT,()=>console.log(`StellarNet Telecom API listening on ${PORT}`));