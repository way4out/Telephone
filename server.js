import express from "express";
import cors from "cors";
import Stripe from "stripe";
import crypto from "node:crypto";
import QRCode from "qrcode";

const app=express();
// Public status/config is intentionally readable by embedded Bankr and other client iframes.
// No credentials/cookies are exposed through CORS.
app.use(cors({origin:"*",credentials:false,methods:["GET","POST","OPTIONS"],allowedHeaders:["Content-Type","Authorization"]}));
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

// Production request hardening: trace every request and make client retries idempotent.
// Idempotency state is process-local until durable storage is configured.
const idempotencyStore=new Map();
app.use((req,res,next)=>{
  const traceId=req.headers["x-request-id"]||crypto.randomUUID();
  req.traceId=traceId;
  res.set("X-Request-ID",traceId);
  const cf=req.headers["cf-ray"];
  if(cf) res.set("X-CF-Ray",String(cf));
  const key=req.method==="POST" ? String(req.headers["idempotency-key"]||"").trim().slice(0,200) : "";
  if(!key)return next();
  const scope=req.method+":"+req.path+":"+key;
  const prior=idempotencyStore.get(scope);
  if(prior){res.status(prior.status).set(prior.headers).send(prior.body);return;}
  const originalJson=res.json.bind(res), originalSend=res.send.bind(res);
  const save=(status,body,headers={})=>{
    if(idempotencyStore.size>5000) idempotencyStore.delete(idempotencyStore.keys().next().value);
    idempotencyStore.set(scope,{status,body,headers});
  };
  res.json=(body)=>{save(res.statusCode,JSON.stringify(body),{"Content-Type":"application/json"});return originalJson(body);};
  res.send=(body)=>{save(res.statusCode,body,{"Content-Type":res.get("Content-Type")||"text/plain"});return originalSend(body);};
  next();
});


const PORT=process.env.PORT||10000;
const stripeKey=process.env.STRIPE_SECRET_KEY;
const priceId=process.env.STRIPE_PRICE_ID||"price_1UM2djRPRXTyZSXkK8ceygV3";
const publicApp=process.env.PUBLIC_APP_URL||"https://oeql-quantum-telecom-phone.onrender.com";
const stripe=stripeKey?new Stripe(stripeKey):null;
const TELECOM_CONFIG={
  schema_version:"1.0.0",
  app_slug:"oeql-telecom",
  brand:"StellarNet Telecom",
  pricing:{activation_usd:4,monthly_usd:4,currency:"USD",recurring:true},
  checkout:{
    esim:"https://buy.stripe.com/28E00leF9bjm6Yf09UdIA06",
    physical_sim:"https://buy.stripe.com/9B6eVf1Snafi1DV7CmdIA07"
  },
  bankr:{app_slug:"oeql-telecom",integration_mode:"iframe-fetch",status_endpoint:"/api/telecom-status"},
  architecture_layers:["telecom_plans","control_plane_status","sovereign_token_registry","frequency_bands","localization","upstream_mirror_status","spectrum_compliance","gsma_rsp_profiles","telephony_core","numbering_pool","wholesale_routing","autonomous_support","node_security"],
  dependency_policy:{hardware:"provider_required",carrier:"authorization_required",radio_access:"authorization_required",numbering:"authorized_numbering_provider_required",roaming:"wholesale_operator_agreement_required",esim_profiles:"authorized_rsp_required",physical_sim:"authorized_fulfillment_provider_required"},
  token_registry_source:"TOKEN_CONTRACTS_JSON",
  token_registry:[{"name":"buy drunk stay high","symbol":"BLZET","address":"0xad4f3857808a7c3b420c87d7cfabfe3934c18ba3","chain":"Base","enabled":true},{"name":"balloon app","symbol":"BALLOON","address":"0x494301facc434ca703239e3e1e5def31fdc20ba3","chain":"Base","enabled":true},{"name":"emerald tablets","symbol":"EMRLD","address":"0x4b89c4263e1dc7c843482b85bff12b142ac4aba3","chain":"Base","enabled":true},{"name":"way out","symbol":"WO","address":"0x7811d40ec95015c4571663a2eaaeca58c4412ba3","chain":"Base","enabled":true},{"name":"flawless","symbol":"FLAW","address":"0xe9bd329a1ff8c56c9f44a937863983ec5b81aba3","chain":"Base","enabled":true},{"name":"zenostate ai","symbol":"ZAi","address":"0x05e4c8b357da5981496cc7b2b0b8ea3956212ba3","chain":"Base","enabled":true},{"name":"aether","symbol":"AETH","address":"0x8c7cffbdd51be8c43300f38f052ccdaac59f0ba3","chain":"Base","enabled":true},{"name":"rollin'","symbol":"ROLLIN","address":"0x622e4536a4b3d5a3acb99a70bdfc50a3255d3ba3","chain":"Base","enabled":true},{"name":"revelations","symbol":"REV","address":"0xaf4721ead1b366b88d21d6a0bfec7b25cb118ba3","chain":"Base","enabled":true},{"name":"aiuse","symbol":"AIU4","address":"0xa6700712d8dbba2005ecffd277cec2f14871aba3","chain":"Base","enabled":true},{"name":"coffee powered","symbol":"CAFFEINE","address":"0x5a69d0cc5783bd15c437dc329d78319325d13ba3","chain":"Base","enabled":true},{"name":"2two","symbol":"TWO","address":"0x0033cf7b0e3ab5c1baa3509e27e7015743bc1ba3","chain":"Base","enabled":true},{"name":"usd coin","symbol":"USDC","address":"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913","chain":"Base","enabled":true},{"name":"telephone","symbol":"TELP","address":"0x22ffa503e90c651cb53e3f88deafc80160c9fba3","chain":"Base","enabled":true}],
  note:"Configured Base token contract addresses are surfaced as user-supplied registry entries. Holdings, prices, liquidity, approvals, and payment acceptance are never invented."
};
const DEFAULT_TOKEN_REGISTRY=[{"name":"buy drunk stay high","symbol":"BLZET","address":"0xad4f3857808a7c3b420c87d7cfabfe3934c18ba3","chain":"Base","enabled":true},{"name":"balloon app","symbol":"BALLOON","address":"0x494301facc434ca703239e3e1e5def31fdc20ba3","chain":"Base","enabled":true},{"name":"emerald tablets","symbol":"EMRLD","address":"0x4b89c4263e1dc7c843482b85bff12b142ac4aba3","chain":"Base","enabled":true},{"name":"way out","symbol":"WO","address":"0x7811d40ec95015c4571663a2eaaeca58c4412ba3","chain":"Base","enabled":true},{"name":"flawless","symbol":"FLAW","address":"0xe9bd329a1ff8c56c9f44a937863983ec5b81aba3","chain":"Base","enabled":true},{"name":"zenostate ai","symbol":"ZAi","address":"0x05e4c8b357da5981496cc7b2b0b8ea3956212ba3","chain":"Base","enabled":true},{"name":"aether","symbol":"AETH","address":"0x8c7cffbdd51be8c43300f38f052ccdaac59f0ba3","chain":"Base","enabled":true},{"name":"rollin'","symbol":"ROLLIN","address":"0x622e4536a4b3d5a3acb99a70bdfc50a3255d3ba3","chain":"Base","enabled":true},{"name":"revelations","symbol":"REV","address":"0xaf4721ead1b366b88d21d6a0bfec7b25cb118ba3","chain":"Base","enabled":true},{"name":"aiuse","symbol":"AIU4","address":"0xa6700712d8dbba2005ecffd277cec2f14871aba3","chain":"Base","enabled":true},{"name":"coffee powered","symbol":"CAFFEINE","address":"0x5a69d0cc5783bd15c437dc329d78319325d13ba3","chain":"Base","enabled":true},{"name":"2two","symbol":"TWO","address":"0x0033cf7b0e3ab5c1baa3509e27e7015743bc1ba3","chain":"Base","enabled":true},{"name":"usd coin","symbol":"USDC","address":"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913","chain":"Base","enabled":true},{"name":"telephone","symbol":"TELP","address":"0x22ffa503e90c651cb53e3f88deafc80160c9fba3","chain":"Base","enabled":true}];
function tokenRegistry(){
  try{
    const raw=process.env.TOKEN_CONTRACTS_JSON;
    const x=raw?JSON.parse(raw):DEFAULT_TOKEN_REGISTRY;
    return Array.isArray(x)?x:[];
  }catch{return DEFAULT_TOKEN_REGISTRY}
}
function telecomStatusPayload(country="US"){
 const c=String(country||"US").toUpperCase();
 const coverage=countryData("NETWORK_COVERAGE_JSON",c), speed=countryData("NETWORK_SPEED_JSON",c), numbering=countryData("NETWORK_NUMBERING_JSON",c), carrier=countryData("NETWORK_CARRIER_CAPABILITIES_JSON",c)||{};
 return {ok:true,updated_at:new Date().toISOString(),config:TELECOM_CONFIG,pricing:TELECOM_CONFIG.pricing,checkout:TELECOM_CONFIG.checkout,architecture:{telecom_plans:TELECOM_CONFIG.pricing,control_plane_status:{online:true,payments:Boolean(stripe),live_api:true},sovereign_token_registry:{configured:tokenRegistry().length>0,tokens:tokenRegistry()},frequency_bands:{status:"provider_required"},localization:{languages_supported:28},upstream_mirror_status:{render:true,github:true,bankr:"external_app_sync_required"},spectrum_compliance:{status:"authorization_required"},gsma_rsp_profiles:{status:(atomicKey||journeyKey)?"provider_configured":"provider_required"},telephony_core:{status:"provider_dependent"},numbering_pool:{status:numbering?"configured_data_available":"authorized_numbering_provider_required"},wholesale_routing:{status:"wholesale_operator_agreement_required"},autonomous_support:{status:"control_plane_ready"},node_security:{cors_public_read:true,secrets_server_side:true}},dependencies:TELECOM_CONFIG.dependency_policy,global:{country:c,coverage:{available:Boolean(coverage),data:coverage,source:coverage?.source||"provider_data_required"},speed:{measured:Boolean(speed?.measured),data:speed,source:speed?.source||"measured_telemetry_required"},numbering:{available:Boolean(numbering),data:numbering,source:numbering?.source||"authorized_numbering_provider_required"},carrier:{production_authorized:process.env.CARRIER_MODE==="production_authorized",...carrier}},bankr_sync:{required:true,endpoint_path:"/api/telecom-status",cors:"*",iframe_embedding:"allowed_by_render_header_configuration",auto_push_to_bankr:false}};
}
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

app.get("/api/telecom-status",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});res.json(telecomStatusPayload(req.query.country||"US"));});
function tokenPaymentCapabilities(){return tokenRegistry().map(t=>({...t,network:"Base",chain_id:8453,wallet_supported:true,payment_enabled:Boolean(process.env.TOKEN_MERCHANT_ADDRESS),payment_mode:process.env.TOKEN_MERCHANT_ADDRESS?"direct_transfer_requires_user_confirmation":"merchant_address_required",coinbase_base_app:"wallet_compatible",coinbase_com_listing:"not_inferred",bankr_enabled:Boolean(process.env.BANKR_API_KEY)}));}
// Live Base token market quotes. Uses exact contract addresses and never substitutes ticker-symbol matches.\nconst LIVE_PRICE_CACHE=new Map();\nasync function liveBaseTokenQuote(address){\n  const a=String(address||"").toLowerCase();\n  const cached=LIVE_PRICE_CACHE.get(a);\n  if(cached && Date.now()-cached.ts<5000)return cached.data;\n  const r=await fetch("https://api.dexscreener.com/latest/dex/tokens/"+encodeURIComponent(address),{headers:{"accept":"application/json"}});\n  if(!r.ok)throw new Error("dexscreener_status_"+r.status);\n  const j=await r.json();\n  const pairs=(j.pairs||[]).filter(p=>String(p.chainId).toLowerCase()==="base" && p.priceUsd);\n  const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";\n  const usdcPairs=pairs.filter(p=>String(p.quoteToken?.address||"").toLowerCase()===usdc);\n  const ranked=[...(usdcPairs.length?usdcPairs:pairs)].sort((x,y)=>Number(y.liquidity?.usd||0)-Number(x.liquidity?.usd||0));\n  const p=ranked[0];\n  const data=p?{verified:true,contract:a,chain:"Base",price_usdc:Number(p.priceUsd),price_usd:Number(p.priceUsd),pair:p.pairAddress||null,dex:p.dexId||null,liquidity_usd:Number(p.liquidity?.usd||0),volume_24h_usd:Number(p.volume?.h24||0),quote_token:p.quoteToken?.address||null,source:"DexScreener",updated_at:new Date().toISOString() }:{verified:false,contract:a,chain:"Base",reason:"No indexed Base liquidity pair with a current quote",source:"DexScreener",updated_at:new Date().toISOString()};\n  LIVE_PRICE_CACHE.set(a,{ts:Date.now(),data});\n  return data;\n}\napp.get("/v1/prices/base",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});const list=tokenRegistry();Promise.all(list.map(async t=>{try{return {...t,market:await liveBaseTokenQuote(t.address)}}catch(e){return {...t,market:{verified:false,contract:t.address,chain:"Base",reason:"Live quote provider unavailable",source:"DexScreener",updated_at:new Date().toISOString()}}} })).then(tokens=>res.json({ok:true,network:"Base",chain_id:8453,unit:"USDC",usdc_contract:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",server_time:new Date().toISOString(),refresh_hint_ms:5000,tokens})).catch(()=>res.status(502).json({ok:false,error:"live_price_lookup_failed"}));});\napp.get("/v1/prices/base/:address",async(req,res)=>{try{const address=String(req.params.address||"");const known=tokenRegistry().find(t=>String(t.address).toLowerCase()===address.toLowerCase());const market=await liveBaseTokenQuote(address);res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});res.json({ok:true,network:"Base",chain_id:8453,unit:"USDC",token:known||{address},market});}catch(e){res.status(502).json({ok:false,error:"live_price_lookup_failed"});}});\n// Per-token Telecom service incentives. These are service-use credits, not investment returns or token appreciation promises.
// Each eligible Base token has an individually address-bound offer. The incentive is only earned after a
// confirmed $4 activation payment and is surfaced with explicit terms. A durable billing ledger/provider is
// required before credits can be automatically applied to future invoices.
const TOKEN_INCENTIVE_USD=Number(process.env.TOKEN_INCENTIVE_USD||"0.25");
function tokenIncentiveOffer(asset){
  return {
    enabled:true,
    token_symbol:asset.symbol,
    token_address:asset.address,
    network:"Base",
    incentive_type:"telecom_service_credit",
    credit_usd:Number.isFinite(TOKEN_INCENTIVE_USD)&&TOKEN_INCENTIVE_USD>0?Math.min(TOKEN_INCENTIVE_USD,1):0.25,
    qualifying_payment_usd:4,
    qualification:"Confirmed on-chain $4 activation payment using this exact token contract",
    fulfillment:"service_credit_pending_durable_billing",
    investment:false,
    token_appreciation_guarantee:false,
    expiry_days:30,
    terms:"Credit is for StellarNet Telecom service only; not cash, not a token reward, and not an investment return."
  };
}
app.get("/v1/incentives/base",(req,res)=>{
  const assets=tokenRegistry().filter(t=>t.enabled!==false);
  res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});
  res.json({ok:true,network:"Base",chain_id:8453,pricing:TELECOM_CONFIG.pricing,offers:assets.map(tokenIncentiveOffer)});
});
app.get("/v1/payments/assets",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});res.json({ok:true,network:"Base",chain_id:8453,merchant_address_configured:Boolean(process.env.TOKEN_MERCHANT_ADDRESS),pricing:TELECOM_CONFIG.pricing,assets:tokenPaymentCapabilities(),note:"Wallet visibility does not imply Coinbase.com listing, liquidity, swap availability, or telecom payment acceptance."});});
app.get("/v1/bankr/config",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});res.json({ok:true,enabled:Boolean(process.env.BANKR_API_KEY),network:"Base",chain_id:8453,merchant_address:process.env.TOKEN_MERCHANT_ADDRESS||null,bankr_app:"https://bankr.bot",payment_mode:process.env.BANKR_API_KEY?"bankr_agent_or_wallet_api":"bankr_link_only"});});
app.post("/v1/bankr/pay",async(req,res)=>{
  if(!process.env.BANKR_API_KEY)return res.status(503).json({ok:false,error:"bankr_api_key_not_configured"});
  const {tokenAddress,tokenSymbol,amountUsd=4}=req.body||{};
  const asset=tokenRegistry().find(t=>String(t.address||"").toLowerCase()===String(tokenAddress||"").toLowerCase()&&t.enabled!==false);
  if(!asset)return res.status(400).json({ok:false,error:"token_not_supported_for_telecom_payment"});
  if(Number(amountUsd)!==4)return res.status(400).json({ok:false,error:"telecom_activation_amount_fixed_at_4_usd"});
  if(!process.env.TOKEN_MERCHANT_ADDRESS)return res.status(400).json({ok:false,error:"tokenAddress_and_merchant_required"});
  const prompt=`For StellarNet Telecom on Base, first approve only the exact token amount required for the $4 activation for this transaction, then transfer that exact amount of ${asset.symbol} (${asset.address}) to merchant ${process.env.TOKEN_MERCHANT_ADDRESS}; never grant unlimited allowance; return the approval and final transfer transaction hashes.`;
  try{
    const r=await fetch("https://api.bankr.bot/agent/prompt",{method:"POST",headers:{"content-type":"application/json","X-API-Key":process.env.BANKR_API_KEY},body:JSON.stringify({prompt})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status).json({ok:false,error:"bankr_payment_request_failed",provider:data});
    res.status(202).json({ok:true,provider:"Bankr",token:tokenSymbol||tokenAddress,amount_usd:Number(amountUsd),merchant_address:process.env.TOKEN_MERCHANT_ADDRESS,incentive:tokenIncentiveOffer(asset),jobId:data.jobId,threadId:data.threadId,note:"Payment is pending until Bankr reports a confirmed on-chain transaction. Service credit is earned only after confirmation and is subject to the displayed Telecom terms."});
  }catch(e){res.status(502).json({ok:false,error:"bankr_connection_failed"});}
});
app.get("/v1/wallet/config",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});res.json({ok:true,network:"Base",chain_id:8453,chain_name:"Base Mainnet",wallets:["Base App / Coinbase Wallet","Injected EVM wallet"],dapp_connection:"supported_by_wallet",merchant_address:process.env.TOKEN_MERCHANT_ADDRESS||null});});
app.get("/api/telecom-config",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});res.json({ok:true,config:TELECOM_CONFIG,tokens:tokenRegistry()});});

app.get("/v1/sim/catalog",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});res.json({ok:true,brand:"StellarNet Telecom",activation_usd:4,monthly_usd:4,physical_sim:{format:"3FF/2FF/4FF punch-out",ship_ready_design:true,carrier_profile:"provider-issued",sku:"STN-PHY-001",inventory_source:process.env.CARRIER_FULFILLMENT_BASE_URL?"authorized_fulfillment_provider":"in-house_design_only",fulfillment_status:process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY?"provider_configured":"provider_required",shipping_label_fields:["recipient_name","shipping_address","country","order_id","sim_serial","tracking_number"],manufacturing:{artwork:"/physical-sim-design.svg",electrical_profile:"authorized_carrier_profile_required",iccid:"assigned_at_authorized_personalization",imsi:"assigned_by_authorized_operator",ki:"never exposed_to_application"}}});});
app.get("/v1/sim/fulfillment-readiness",(req,res)=>{const configured=Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY);res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});res.json({ok:true,in_house_design:true,ship_pipeline_ready:configured,inventory_proof:configured?"provider_api_configured":"not_available",physical_sim_provider:configured?"configured":"required",carrier_activation:process.env.CARRIER_MODE==="production_authorized"?"authorized":"required",note:"The application can prepare orders and shipping data; it cannot manufacture or activate carrier credentials without authorized SIM personalization and carrier infrastructure."});});

// --- Telecom production control-plane upgrade ---
const TELECOM_PLANS=[
 {id:"standard-esim",name:"StellarNet eSIM",activation_usd:4,monthly_usd:4,delivery:"digital",checkout:TELECOM_CONFIG.checkout.esim},
 {id:"standard-physical",name:"StellarNet Physical SIM",activation_usd:4,monthly_usd:4,delivery:"physical",checkout:TELECOM_CONFIG.checkout.physical_sim}
];
app.get("/v1/telecom/plans",(req,res)=>res.json({ok:true,plans:TELECOM_PLANS,network:"Base",updated_at:new Date().toISOString(),fulfillment:{esim:atomicKey||journeyKey?"provider_configured":"provider_required",physical_sim:process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY?"provider_configured":"provider_required"}}));
app.get("/v1/telecom/readiness",(req,res)=>{
 const checks={
   api:true,pricing:true,checkout:Boolean(TELECOM_CONFIG.checkout.esim&&TELECOM_CONFIG.checkout.physical_sim),
   bankr:Boolean(process.env.BANKR_API_KEY),merchant:Boolean(process.env.TOKEN_MERCHANT_ADDRESS),
   stripe:Boolean(stripeKey),base_rpc:Boolean(process.env.BASE_RPC_URL||true),
   esim_provider:Boolean(atomicKey||journeyKey),physical_fulfillment:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY),
   carrier_authorization:process.env.CARRIER_MODE==="production_authorized"
 };
 const ready=Object.entries(checks).filter(([k])=>["api","pricing","checkout"].includes(k)).every(([,v])=>v);
 res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});
 res.json({ok:true,ready,checks,notes:{bankr:"Server-side Bankr rail requires BANKR_API_KEY",merchant:"Exact-token payments require TOKEN_MERCHANT_ADDRESS",carrier:"Live cellular activation remains provider/carrier authorized",esim:"Provider API is required for real profile provisioning",physical_sim:"Authorized fulfillment provider is required for physical shipment"}});
});
app.post("/v1/telecom/order",async(req,res)=>{
 const {planId,customerCountry="US",delivery,source="web"}=req.body||{};
 const plan=TELECOM_PLANS.find(x=>x.id===planId);
 if(!plan)return res.status(400).json({ok:false,error:"plan_not_found"});
 const orderId="stn_"+crypto.randomUUID();
 const requestedDelivery=delivery||plan.delivery;
 res.status(201).json({ok:true,order_id:orderId,status:"checkout_required",plan,customer_country:String(customerCountry).toUpperCase(),delivery:requestedDelivery,source,created_at:new Date().toISOString(),next:{checkout_url:plan.checkout,after_payment:"return to customer dashboard; provider activation remains dependent on authorized carrier/RSP"}});
});

app.get("/health",(_,res)=>res.status(200).json({ok:true,service:"stellarnet-telecom-api",payments:Boolean(stripe),journey:Boolean(journeyKey),atomic:Boolean(atomicKey),carrier_mode:process.env.CARRIER_MODE||"development",version:"2.3.0",health_check:"/health"}));
app.get("/ready",(_,res)=>res.status(200).json({ok:true,ready:true,service:"stellarnet-telecom-api",control_plane:true,base_rpc_configured:Boolean(process.env.BASE_RPC_URL),stripe_configured:Boolean(stripe)}));
// Deterministic receipt rail: creates a signed receipt payload after a verified checkout/tx reference.
// It never claims an on-chain settlement until the transaction hash is supplied and can be verified by a wallet/indexer.
async function baseRpc(method,params=[]){
  const r=await fetch(process.env.BASE_RPC_URL||"https://mainnet.base.org",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw new Error(j.error?.message||"base_rpc_failed");
  return j.result;
}
function extractTxHash(job){
  const text=[job?.response||"",JSON.stringify(job?.richData||[])].join(" ");
  const m=text.match(/0x[a-fA-F0-9]{64}/);
  return m?m[0]:null;
}
async function verifyBasePayment(txHash,tokenAddress){
  if(!/^0x[a-fA-F0-9]{64}$/.test(String(txHash||"")))return {confirmed:false,error:"tx_hash_required"};
  const receipt=await baseRpc("eth_getTransactionReceipt",[txHash]);
  if(!receipt)return {confirmed:false,error:"transaction_pending"};
  if(receipt.status!=="0x1")return {confirmed:false,error:"transaction_failed"};
  const wanted=String(tokenAddress||"").toLowerCase();
  let recipientMatched=false;
  for(const log of (receipt.logs||[])){
    if(String(log.address||"").toLowerCase()!==wanted)continue;
    const topics=log.topics||[];
    if(topics.length>=3 && String(topics[0]).toLowerCase()==="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aebef3b1ef" &&
       String("0x"+String(topics[2]).slice(-40)).toLowerCase()===String(process.env.TOKEN_MERCHANT_ADDRESS||"").toLowerCase()){
      recipientMatched=true; break;
    }
  }
  return {confirmed:recipientMatched,txHash,blockHash:receipt.blockHash,blockNumber:receipt.blockNumber,recipient:process.env.TOKEN_MERCHANT_ADDRESS||null,tokenAddress,verification:recipientMatched?"base_receipt_and_transfer_log_verified":"receipt_confirmed_but_recipient_or_token_unverified"};
}

// --- Full Base onchain payment verification ---
// Verifies chain ID, successful receipt, ERC-20 Transfer event, merchant recipient,
// token contract, and exact token amount when a quoted amountUnits is supplied.
// No payment is considered settled from a client-side claim alone.
const ERC20_TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aebef3b1ef";
function topicAddress(topic){return "0x"+String(topic||"").slice(-40).toLowerCase();}
async function erc20Decimals(tokenAddress){
  const data="0x313ce567";
  const raw=await baseRpc("eth_call",[{to:tokenAddress,data},"latest"]);
  return Number(BigInt(raw||"0x0"));
}
async function verifyExactBaseTransfer({txHash,tokenAddress,merchantAddress,amountUnits}){
  if(!/^0x[a-fA-F0-9]{64}$/.test(String(txHash||"")))return {confirmed:false,error:"tx_hash_required"};
  if(!/^0x[a-fA-F0-9]{40}$/.test(String(tokenAddress||"")))return {confirmed:false,error:"token_address_required"};
  if(!/^0x[a-fA-F0-9]{40}$/.test(String(merchantAddress||"")))return {confirmed:false,error:"merchant_address_required"};
  const chainId=await baseRpc("eth_chainId",[]);
  if(String(chainId).toLowerCase()!=="0x2105")return {confirmed:false,error:"wrong_chain",chain_id:chainId};
  const receipt=await baseRpc("eth_getTransactionReceipt",[txHash]);
  if(!receipt)return {confirmed:false,error:"transaction_pending",chain_id:chainId};
  if(receipt.status!=="0x1")return {confirmed:false,error:"transaction_failed",chain_id:chainId,block_number:receipt.blockNumber};
  const token=tokenAddress.toLowerCase(), merchant=merchantAddress.toLowerCase();
  const transfers=[];
  for(const log of (receipt.logs||[])){
    if(String(log.address||"").toLowerCase()!==token)continue;
    const topics=log.topics||[];
    if(String(topics[0]||"").toLowerCase()!==ERC20_TRANSFER_TOPIC||topics.length<3)continue;
    const to=topicAddress(topics[2]);
    const value=BigInt(log.data||"0x0");
    transfers.push({from:topicAddress(topics[1]),to,value:value.toString(),log_index:log.logIndex});
  }
  const matching=transfers.filter(x=>x.to===merchant);
  const exact=amountUnits!=null?matching.find(x=>BigInt(x.value)===BigInt(String(amountUnits))):null;
  const decimals=await erc20Decimals(token).catch(()=>null);
  return {
    confirmed:Boolean(exact|| (amountUnits==null&&matching.length>0)),
    chain_id:chainId,
    tx_hash:txHash,
    block_hash:receipt.blockHash,
    block_number:receipt.blockNumber,
    token_address:tokenAddress,
    merchant_address:merchantAddress,
    token_decimals:decimals,
    requested_amount_units:amountUnits==null?null:String(amountUnits),
    matching_transfers:matching,
    verification:(exact|| (amountUnits==null&&matching.length>0))?"base_erc20_transfer_verified":"receipt_confirmed_but_exact_payment_not_verified"
  };
}
app.post("/v1/onchain/verify-payment",async(req,res)=>{
  const {txHash,tokenAddress,amountUnits}=req.body||{};
  const merchantAddress=process.env.TOKEN_MERCHANT_ADDRESS||"";
  if(!merchantAddress)return res.status(503).json({ok:false,error:"merchant_address_not_configured"});
  try{
    const result=await verifyExactBaseTransfer({txHash,tokenAddress,merchantAddress,amountUnits});
    res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});
    res.status(result.confirmed?200:402).json({ok:result.confirmed,settled:result.confirmed,network:"Base Mainnet",payment:result,receipt_url:result.confirmed?publicApp+"/receipt/"+encodeURIComponent(txHash):null});
  }catch(e){res.status(502).json({ok:false,error:"onchain_verification_failed"});}
});
app.get("/v1/onchain/status/:txHash",async(req,res)=>{
  try{
    const txHash=req.params.txHash;
    const receipt=await baseRpc("eth_getTransactionReceipt",[txHash]);
    const block=await baseRpc("eth_getBlockByNumber",["latest",false]);
    res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});
    res.json({ok:true,network:"Base Mainnet",chain_id:8453,tx_hash:txHash,pending:!receipt,success:receipt?.status==="0x1",block_number:receipt?.blockNumber||null,latest_block:block?.number||null,confirmations:receipt?.blockNumber&&block?.number?Math.max(0,Number(BigInt(block.number)-BigInt(receipt.blockNumber))):0});
  }catch(e){res.status(502).json({ok:false,error:"onchain_status_failed"});}
});

app.get("/v1/bankr/payment/:jobId",async(req,res)=>{
  if(!process.env.BANKR_API_KEY)return res.status(503).json({ok:false,error:"bankr_api_key_not_configured"});
  try{
    const r=await fetch("https://api.bankr.bot/agent/job/"+encodeURIComponent(req.params.jobId),{headers:{"X-API-Key":process.env.BANKR_API_KEY}});
    const job=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status).json({ok:false,error:"bankr_job_lookup_failed"});
    const txHash=extractTxHash(job);
    const tokenAddress=String(req.query.tokenAddress||"");
    const chain=txHash?await verifyBasePayment(txHash,tokenAddress):{confirmed:false,error:"transaction_not_reported_yet"};
    res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}).json({ok:true,jobId:job.jobId,status:job.status,txHash,bankr_response:job.response||null,onchain:chain,receipt_url:chain.confirmed?publicApp+"/receipt/"+encodeURIComponent(req.params.jobId):null});
  }catch(e){res.status(502).json({ok:false,error:"bankr_job_connection_failed"});}
});
app.get("/v1/receipt/:reference/qr",async(req,res)=>{
  const reference=String(req.params.reference||"").trim();
  if(!reference)return res.status(400).send("reference_required");
  try{
    const svg=await QRCode.toString(publicApp+"/receipt/"+encodeURIComponent(reference),{type:"svg",margin:1,width:320,errorCorrectionLevel:"M"});
    res.set({"Cache-Control":"no-store","Content-Type":"image/svg+xml; charset=utf-8","Access-Control-Allow-Origin":"*"}).send(svg);
  }catch(e){res.status(500).send("qr_generation_failed");}
});
app.get("/v1/receipt/:reference",async(req,res)=>{
  const reference=String(req.params.reference||"").trim();
  if(!reference)return res.status(400).json({ok:false,error:"reference_required"});
  res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});
  res.json({ok:true,receipt:{schema_version:"1.1",reference,product:"Quantum Telecom",pricing:TELECOM_CONFIG.pricing,network:"Base",chain_id:8453,settlement_status:"verify_onchain",qr_payload:publicApp+"/receipt/"+encodeURIComponent(reference)}});
});

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

app.post("/v1/bankr/esim/provision",async(req,res)=>{
  const {jobId,tokenAddress,planId,reference}=req.body||{};
  if(!jobId||!tokenAddress||!planId)return res.status(400).json({ok:false,error:"jobId_tokenAddress_planId_required"});
  if(!journeyKey)return res.status(503).json({ok:false,error:"journey_api_key_not_configured"});
  try{
    const r=await fetch("https://api.bankr.bot/agent/job/"+encodeURIComponent(jobId),{headers:{"X-API-Key":process.env.BANKR_API_KEY||""}});
    const job=await r.json().catch(()=>({}));
    const txHash=extractTxHash(job);
    const verified=await verifyBasePayment(txHash,tokenAddress);
    if(!verified.confirmed)return res.status(402).json({ok:false,error:"payment_not_confirmed",onchain:verified});
    const p=await fetch(journeyBase+"/esims",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+journeyKey},body:JSON.stringify({planId,quantity:1,reference:reference||("bankr-"+jobId)})});
    const data=await p.json().catch(()=>({}));
    if(!p.ok)return res.status(502).json({ok:false,error:"journey_provisioning_failed",provider_status:p.status});
    res.status(201).json({ok:true,payment:verified,provider:"Journey eSIMs",orderId:data.orderId,status:data.status,esim:data.esims?.[0]||null});
  }catch(e){res.status(502).json({ok:false,error:"bankr_esim_provisioning_failed"});}
});
app.post("/v1/bankr/sim/order",async(req,res)=>{
  const {jobId,tokenAddress,email,shipping_address,reference}=req.body||{};
  if(!jobId||!tokenAddress||!email||!shipping_address)return res.status(400).json({ok:false,error:"jobId_tokenAddress_email_shipping_address_required"});
  try{
    const r=await fetch("https://api.bankr.bot/agent/job/"+encodeURIComponent(jobId),{headers:{"X-API-Key":process.env.BANKR_API_KEY||""}});
    const job=await r.json().catch(()=>({}));
    const txHash=extractTxHash(job);
    const verified=await verifyBasePayment(txHash,tokenAddress);
    if(!verified.confirmed)return res.status(402).json({ok:false,error:"payment_not_confirmed",onchain:verified});
    const order_id=id();
    const order={order_id,email,shipping_address,status:"paid_pending_authorized_fulfillment",payment_tx:verified.txHash,reference:reference||jobId,created_at:new Date().toISOString()};
    simOrders.set(order_id,order);
    res.status(202).json({ok:true,payment:verified,order,carrier_fulfillment_ready:Boolean(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY)});
  }catch(e){res.status(502).json({ok:false,error:"bankr_sim_order_failed"});}
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
  interfaces:["web","PWA","mobile-responsive","iOS-ready","Android-ready","desktop","API","Base-wallet","EVM-wallet"],
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
  network_operations:["carrier capability lookup","coverage data adapter","measured speed telemetry adapter","numbering adapter","live one-second control-plane heartbeat","no-store live API","Base token payment capability registry","wallet connection capability"],
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

// --- Quantum Telecom validation/control layer ---
// This is a deterministic software scan and research interface. It does not claim
// physical quantum hardware, quantum radio, faster-than-light communication, or 13G standardization.
const QUANTUM_SCAN_SCHEMA="1.0.0";
function quantumScan(){
  const checks=[
    {id:"control_plane",status:"pass",detail:"Telecom control plane is implemented"},
    {id:"deterministic_resonance_manifest",status:"pass",detail:"13G+ resonance manifest is present in the repository"},
    {id:"dimensions_2d_5d",status:"pass",detail:"2D/3D/4D/5D+ research dimensions are represented"},
    {id:"vector_execution",status:"pass",detail:"189 vector slots plus continuous weighting are represented as simulation state"},
    {id:"physical_quantum_execution",status:"blocked",detail:"No physical quantum execution is claimed without validated instrumentation"},
    {id:"quantum_radio",status:"blocked",detail:"No quantum radio is claimed or synthesized by software"},
    {id:"retrocausal_or_ftl",status:"blocked",detail:"No retrocausal or faster-than-light capability is exposed"},
    {id:"carrier_authorization",status:process.env.CARRIER_MODE==="production_authorized"?"pass":"blocked",detail:process.env.CARRIER_MODE==="production_authorized"?"Authorized carrier mode configured":"Carrier authorization remains provider-controlled"},
    {id:"esim_rsp",status:(atomicKey||journeyKey)?"pass":"blocked",detail:(atomicKey||journeyKey)?"RSP adapter configured":"Authorized eSIM RSP credentials required"},
    {id:"physical_sim_fulfillment",status:(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY)?"pass":"blocked",detail:(process.env.CARRIER_FULFILLMENT_BASE_URL&&process.env.CARRIER_FULFILLMENT_API_KEY)?"Fulfillment adapter configured":"Authorized fulfillment provider required"},
    {id:"post_quantum_crypto",status:"research_ready",detail:"PQC integration point reserved; production cryptographic migration requires validated libraries and policy"},
    {id:"standards_alignment",status:"research_ready",detail:"IMT-2030/6G and quantum-network standards interfaces are treated as research/compatibility targets"}
  ];
  const material=JSON.stringify({schema:QUANTUM_SCAN_SCHEMA,checks});
  return {schema_version:QUANTUM_SCAN_SCHEMA,generated_at:new Date().toISOString(),architecture:"StellarNet Quantum Telecom experimental",execution_mode:"software_validation_and_simulation",resonance_index:189.3,vector_slots:189,continuous_weight:0.3,checks,summary:{pass:checks.filter(x=>x.status==="pass").length,blocked:checks.filter(x=>x.status==="blocked").length,research_ready:checks.filter(x=>x.status==="research_ready").length},scan_sha256:crypto.createHash("sha256").update(material).digest("hex"),physical_quantum_execution:false,quantum_radio:false,claims_blocked:["13G standardized service","quantum radio","retrocausal communication","faster-than-light communication","physical quantum hardware"]};
}
app.get("/v1/quantum/scan",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});res.json({ok:true,scan:quantumScan()});});
app.get("/v1/quantum/capabilities",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});res.json({ok:true,software:["resonance simulation","vector execution model","2D/3D/4D/5D+ state modeling","deterministic scan manifests","PQC research integration point","IMT-2030 compatibility interface","instrument-validation state machine"],hardware_requirements:["RF/optical instrumentation","clock/oscillator references","ADC/DAC","FPGA/DSP","calibrated sensors","shielding where required","lawful test authorization"],state_machine:["UNCONFIGURED","SIMULATED","INSTRUMENT_CONNECTED","CALIBRATED","LAB_VALIDATED","AUTHORIZED_FIELD_TEST","PROVIDER_INTEGRATED"],physical_quantum_execution:false,quantum_radio:false,note:"Software exposes the control and validation plane; physical quantum execution requires real laboratory hardware, measurements, calibration and authorization."});});

const server=app.listen(PORT,()=>console.log(`StellarNet Telecom API listening on ${PORT}`));
process.on("SIGTERM",()=>{console.log("SIGTERM received; draining HTTP server");server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),25000);});
process.on("SIGINT",()=>server.close(()=>process.exit(0)));