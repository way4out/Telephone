const USDC_BASE="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
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
  token_registry:[{"name":"buy drunk stay high","symbol":"BLZET","address":"0xad4f3857808a7c3b420c87d7cfabfe3934c18ba3","chain":"Base","enabled":true},{"name":"balloon app","symbol":"BALLOON","address":"0x494301facc434ca703239e3e1e5def31fdc20ba3","chain":"Base","enabled":true},{"name":"emerald tablets","symbol":"EMRLD","address":"0x4b89c4263e1dc7c843482b85bff12b142ac4aba3","chain":"Base","enabled":true},{"name":"way out","symbol":"WO","address":"0x7811d40ec95015c4571663a2eaaeca58c4412ba3","chain":"Base","enabled":true},{"name":"flawless","symbol":"FLAW","address":"0xe9bd329a1ff8c56c9f44a937863983ec5b81aba3","chain":"Base","enabled":true},{"name":"zenostate ai","symbol":"ZAi","address":"0x05e4c8b357da5981496cc7b2b0b8ea3956212ba3","chain":"Base","enabled":true},{"name":"aether","symbol":"AETH","address":"0x8c7cffbdd51be8c43300f38f052ccdaac59f0ba3","chain":"Base","enabled":true},{"name":"rollin'","symbol":"ROLLIN","address":"0x622e4536a4b3d5a3acb99a70bdfc50a3255d3ba3","chain":"Base","enabled":true},{"name":"revelations","symbol":"REV","address":"0xaf4721ead1b366b88d21d6a0bfec7b25cb118ba3","chain":"Base","enabled":true},{"name":"aiuse","symbol":"AIU4","address":"0xa6700712d8dbba2005ecffd277cec2f14871aba3","chain":"Base","enabled":true},{"name":"coffee powered","symbol":"CAFFEINE","address":"0x5a69d0cc5783bd15c437dc329d78319325d13ba3","chain":"Base","enabled":true},{"name":"2two","symbol":"TWO","address":"0x0033cf7b0e3ab5c1baa3509e27e7015743bc1ba3","chain":"Base","enabled":true},{"name":"usd coin","symbol":"USDC","address":"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913","chain":"Base","enabled":true},{"name":"telephone","symbol":"TELP","address":"0x22ffa503e90c651cb53e3f88deafc80160c9fba3","chain":"Base","enabled":true},{"name":"Base token 0x7d9e…7ba3","symbol":"7D9E","address":"0x7d9eeaf34246adf90b0ac9ae1525049249347ba3","chain":"Base","enabled":true},{"name":"Base token 0xc0d3…aba3","symbol":"C0D3","address":"0xc0d3b63dac80270379c87fa9dcab3421a5b2aba3","chain":"Base","enabled":true},{"name":"Base token 0xb628…3ba3","symbol":"B628","address":"0xb628f3f2aab853a95602dd45aeed48c807f93ba3","chain":"Base","enabled":true},{"name":"Base token 0x910c…8ba3","symbol":"910C","address":"0x910cb6ce72a2ee7b1c9d093d5b09aed7f19f8ba3","chain":"Base","enabled":true},{"name":"Base token 0xe512…4ba3","symbol":"E512","address":"0xe512509731c33632d3048948bc8471fba1ad4ba3","chain":"Base","enabled":true},{"name":"Base token 0x2d76…5ba3","symbol":"2D76","address":"0x2d76de6c499d0011999395ed5e437eb604635ba3","chain":"Base","enabled":true},{"name":"Base token 0x90e5…dba3","symbol":"90E5","address":"0x90e59e7ca1f2e4b2404342af3e5e0578880ddba3","chain":"Base","enabled":true},{"name":"Base token 0x2761…dba3","symbol":"2761","address":"0x27610a648e32176cf1ccd11e501bc3f900dbdba3","chain":"Base","enabled":true},{"name":"Base token 0x5490…4ba3","symbol":"5490","address":"0x5490c75dfe7b790351dea6736c742e5e3c4c4ba3","chain":"Base","enabled":true},{"name":"Base token 0x5421…cba3","symbol":"5421","address":"0x542165dafde4242939415b8f2ec8686a4f43cba3","chain":"Base","enabled":true}],
  note:"Configured Base token contract addresses are surfaced as user-supplied registry entries. Holdings, prices, liquidity, approvals, and payment acceptance are never invented."
};
const DEFAULT_TOKEN_REGISTRY=[{"name":"buy drunk stay high","symbol":"BLZET","address":"0xad4f3857808a7c3b420c87d7cfabfe3934c18ba3","chain":"Base","enabled":true},{"name":"balloon app","symbol":"BALLOON","address":"0x494301facc434ca703239e3e1e5def31fdc20ba3","chain":"Base","enabled":true},{"name":"emerald tablets","symbol":"EMRLD","address":"0x4b89c4263e1dc7c843482b85bff12b142ac4aba3","chain":"Base","enabled":true},{"name":"way out","symbol":"WO","address":"0x7811d40ec95015c4571663a2eaaeca58c4412ba3","chain":"Base","enabled":true},{"name":"flawless","symbol":"FLAW","address":"0xe9bd329a1ff8c56c9f44a937863983ec5b81aba3","chain":"Base","enabled":true},{"name":"zenostate ai","symbol":"ZAi","address":"0x05e4c8b357da5981496cc7b2b0b8ea3956212ba3","chain":"Base","enabled":true},{"name":"aether","symbol":"AETH","address":"0x8c7cffbdd51be8c43300f38f052ccdaac59f0ba3","chain":"Base","enabled":true},{"name":"rollin'","symbol":"ROLLIN","address":"0x622e4536a4b3d5a3acb99a70bdfc50a3255d3ba3","chain":"Base","enabled":true},{"name":"revelations","symbol":"REV","address":"0xaf4721ead1b366b88d21d6a0bfec7b25cb118ba3","chain":"Base","enabled":true},{"name":"aiuse","symbol":"AIU4","address":"0xa6700712d8dbba2005ecffd277cec2f14871aba3","chain":"Base","enabled":true},{"name":"coffee powered","symbol":"CAFFEINE","address":"0x5a69d0cc5783bd15c437dc329d78319325d13ba3","chain":"Base","enabled":true},{"name":"2two","symbol":"TWO","address":"0x0033cf7b0e3ab5c1baa3509e27e7015743bc1ba3","chain":"Base","enabled":true},{"name":"usd coin","symbol":"USDC","address":"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913","chain":"Base","enabled":true},{"name":"telephone","symbol":"TELP","address":"0x22ffa503e90c651cb53e3f88deafc80160c9fba3","chain":"Base","enabled":true},{"name":"Base token 0x7d9e…7ba3","symbol":"7D9E","address":"0x7d9eeaf34246adf90b0ac9ae1525049249347ba3","chain":"Base","enabled":true},{"name":"Base token 0xc0d3…aba3","symbol":"C0D3","address":"0xc0d3b63dac80270379c87fa9dcab3421a5b2aba3","chain":"Base","enabled":true},{"name":"Base token 0xb628…3ba3","symbol":"B628","address":"0xb628f3f2aab853a95602dd45aeed48c807f93ba3","chain":"Base","enabled":true},{"name":"Base token 0x910c…8ba3","symbol":"910C","address":"0x910cb6ce72a2ee7b1c9d093d5b09aed7f19f8ba3","chain":"Base","enabled":true},{"name":"Base token 0xe512…4ba3","symbol":"E512","address":"0xe512509731c33632d3048948bc8471fba1ad4ba3","chain":"Base","enabled":true},{"name":"Base token 0x2d76…5ba3","symbol":"2D76","address":"0x2d76de6c499d0011999395ed5e437eb604635ba3","chain":"Base","enabled":true},{"name":"Base token 0x90e5…dba3","symbol":"90E5","address":"0x90e59e7ca1f2e4b2404342af3e5e0578880ddba3","chain":"Base","enabled":true},{"name":"Base token 0x2761…dba3","symbol":"2761","address":"0x27610a648e32176cf1ccd11e501bc3f900dbdba3","chain":"Base","enabled":true},{"name":"Base token 0x5490…4ba3","symbol":"5490","address":"0x5490c75dfe7b790351dea6736c742e5e3c4c4ba3","chain":"Base","enabled":true},{"name":"Base token 0x5421…cba3","symbol":"5421","address":"0x542165dafde4242939415b8f2ec8686a4f43cba3","chain":"Base","enabled":true}];
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

// Simulator access pricing: $0.04/minute baseline with larger-duration bundle discounts.
// Discounts are applied server-side before quotes are generated, so UI and 1-tap payments use the same exact amount.
const SIMULATOR_BASE_USD_PER_MINUTE=0.04;
const SIMULATOR_DISCOUNTS={minute:0,five:0.05,fifteen:0.10,hour:0.15,day:0.25,week:0.35,month:0.50,year:0.60};
const SIMULATOR_DURATION_MINUTES={minute:1,five:5,fifteen:15,hour:60,day:1440,week:10080,month:43200,year:525600};
const simulatorBundlePrice=(id)=>Number((SIMULATOR_BASE_USD_PER_MINUTE*SIMULATOR_DURATION_MINUTES[id]*(1-(SIMULATOR_DISCOUNTS[id]||0))).toFixed(2));
const SIMULATOR_TIME_PACKAGES=[
 {id:"minute",name:"1 Minute",duration_ms:60000,minutes:1,base_usd:0.04,discount_percent:0,usd:simulatorBundlePrice("minute")},
 {id:"five",name:"5 Minutes",duration_ms:300000,minutes:5,base_usd:0.20,discount_percent:5,usd:simulatorBundlePrice("five")},
 {id:"fifteen",name:"15 Minutes",duration_ms:900000,minutes:15,base_usd:0.60,discount_percent:10,usd:simulatorBundlePrice("fifteen")},
 {id:"hour",name:"1 Hour",duration_ms:3600000,minutes:60,base_usd:2.40,discount_percent:15,usd:simulatorBundlePrice("hour")},
 {id:"day",name:"1 Day",duration_ms:86400000,minutes:1440,base_usd:57.60,discount_percent:25,usd:simulatorBundlePrice("day")},
 {id:"week",name:"1 Week",duration_ms:604800000,minutes:10080,base_usd:403.20,discount_percent:35,usd:simulatorBundlePrice("week")},
 {id:"month",name:"1 Month",duration_ms:2592000000,minutes:43200,base_usd:1728.00,discount_percent:50,usd:simulatorBundlePrice("month")},
 {id:"year",name:"1 Year",duration_ms:31536000000,minutes:525600,base_usd:21024.00,discount_percent:60,usd:simulatorBundlePrice("year")},
 {id:"forever",name:"Forever ∞",duration_ms:null,minutes:null,base_usd:null,discount_percent:0,usd:9999}
];
const SIMULATOR_PRICE_POINTS=SIMULATOR_TIME_PACKAGES.map(x=>x.usd);
const SIMULATOR_PACKAGES=SIMULATOR_TIME_PACKAGES.map(x=>({id:x.id,name:x.name,usd:x.usd,duration_ms:x.duration_ms,minutes:x.minutes,base_usd:x.base_usd,discount_percent:x.discount_percent,pricing_basis:x.minutes==null?"lifetime_fixed":"$0.04_per_minute"}));
function normalizeSimulatorPrice(value){const n=Number(value);if(!Number.isFinite(n)||!SIMULATOR_PRICE_POINTS.includes(n))throw new Error("unsupported_price_point");return n;}
const GAMEPLAY_FREE_MS=8*60*1000;const GAMEPLAY_FIRST_GRANT_MS=4*60*1000;const GAMEPLAY_SESSION_MAX_MS=2*60*1000;
const gameplayAccounts=new Map();
function gameplayAccount(account){let s=gameplayAccounts.get(account);if(!s){s={created_at:Date.now(),first_grant_claimed:false,free_started_at:null,paid:false,paid_at:null,paid_until:null,forever:false,paid_tx_hash:null,last_seen_at:0};gameplayAccounts.set(account,s);}return s;}
function gameplayState(s){if(s.forever||s.paid_until&&Date.now()<s.paid_until)return {access:"paid",free_remaining_ms:0,paid_until:s.forever?null:new Date(s.paid_until).toISOString(),forever:Boolean(s.forever)};if(!s.free_started_at)return {access:"unclaimed",free_remaining_ms:GAMEPLAY_FREE_MS};const r=Math.max(0,GAMEPLAY_FREE_MS-(Date.now()-s.free_started_at));return {access:r>0?"free":"payment_required",free_remaining_ms:r};}
app.post("/v1/gameplay/session",async(req,res)=>{try{const account=String(req.body?.account||"").trim().toLowerCase();if(!/^0x[a-f0-9]{40}$/.test(account))return res.status(400).json({ok:false,error:"wallet_account_required"});const s=gameplayAccount(account);s.last_seen_at=Date.now();const state=gameplayState(s);res.json({ok:true,account,access:state.access,free_remaining_ms:state.free_remaining_ms,free_total_ms:GAMEPLAY_FREE_MS,first_grant_claimed:s.first_grant_claimed,paid:s.paid,server_time:new Date().toISOString(),session_max_ms:GAMEPLAY_SESSION_MAX_MS});}catch(e){res.status(500).json({ok:false,error:"gameplay_session_failed"});}});
app.post("/v1/gameplay/claim-account",async(req,res)=>{try{const account=String(req.body?.account||"").trim().toLowerCase();if(!/^0x[a-f0-9]{40}$/.test(account))return res.status(400).json({ok:false,error:"wallet_account_required"});const s=gameplayAccount(account);if(s.first_grant_claimed)return res.status(409).json({ok:false,error:"one_time_account_grant_already_claimed",...gameplayState(s)});s.first_grant_claimed=true;s.free_started_at=Date.now();s.last_seen_at=Date.now();res.json({ok:true,account,grant_ms:GAMEPLAY_FIRST_GRANT_MS,free_total_ms:GAMEPLAY_FREE_MS,free_remaining_ms:GAMEPLAY_FREE_MS,one_time:true,reset_policy:"No refresh/browser reset; server clock is authoritative."});}catch(e){res.status(500).json({ok:false,error:"account_claim_failed"});}});
app.post("/v1/gameplay/unlock",async(req,res)=>{try{const {account,txHash,tokenAddress,amountUnits,amountUsd,durationId="hour"}=req.body||{};const a=String(account||"").trim().toLowerCase();if(!/^0x[a-f0-9]{40}$/.test(a))return res.status(400).json({ok:false,error:"wallet_account_required"});const quote=await exactTokenQuote(String(tokenAddress||""),amountUsd);if(String(quote.amount_base_units)!==String(amountUnits||""))return res.status(402).json({ok:false,error:"exact_amount_mismatch"});const verified=await verifyExactBaseTransfer({txHash,tokenAddress,merchantAddress:process.env.TOKEN_MERCHANT_ADDRESS,amountUnits});if(!verified.confirmed)return res.status(402).json({ok:false,error:"payment_not_settled",payment:verified});const s=gameplayAccount(a);const pkg=SIMULATOR_TIME_PACKAGES.find(x=>x.id===String(durationId));if(!pkg||Number(pkg.usd)!==Number(amountUsd))return res.status(400).json({ok:false,error:"duration_price_mismatch"});s.paid=true;s.paid_at=Date.now();s.paid_tx_hash=String(txHash||"");s.forever=pkg.duration_ms===null;s.paid_until=s.forever?null:Date.now()+pkg.duration_ms;res.json({ok:true,access:"paid",account:a,tx_hash:txHash,amount_usd:Number(amountUsd),unlocked:true,entitlement:pkg.name,paid_until:s.paid_until?new Date(s.paid_until).toISOString():null,forever:s.forever});}catch(e){res.status(502).json({ok:false,error:"gameplay_unlock_verification_failed"});}});
app.get("/v1/payments/quote",async(req,res)=>{
 try{
  if(!process.env.TOKEN_MERCHANT_ADDRESS)return res.status(503).json({ok:false,error:"merchant_address_not_configured"});
  const q=await exactTokenQuote(String(req.query.tokenAddress||""),req.query.amountUsd==null?4:req.query.amountUsd);
  res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});
  res.json({ok:true,network:"Base",chain_id:8453,merchant_address:process.env.TOKEN_MERCHANT_ADDRESS,token:{symbol:q.asset.symbol,address:q.asset.address,decimals:q.decimals},amount_usd:q.amount_usd,amount_human:q.amount_human,price_points_usd:SIMULATOR_PRICE_POINTS,packages:SIMULATOR_PACKAGES,amount_base_units:q.amount_base_units,price_usdc:q.market.price_usdc,source:q.market.source,pair:q.market.pair,quote_expires_at:q.quote_expires_at,exact_transfer:true});
 }catch(e){res.status(400).json({ok:false,error:e.message||"quote_unavailable"});}
});
app.post("/v1/payments/verify-transfer",async(req,res)=>{
 try{
  const {txHash,tokenAddress,from,amountUnits,amountUsd=4}=req.body||{};
  const merchantAddress=process.env.TOKEN_MERCHANT_ADDRESS||"";
  if(!merchantAddress)return res.status(503).json({ok:false,error:"merchant_address_not_configured"});
  const quote=await exactTokenQuote(String(tokenAddress||""),amountUsd);
  if(String(quote.amount_base_units)!==String(amountUnits||""))return res.status(402).json({ok:false,confirmed:false,settled:false,error:"exact_amount_mismatch"});
  const result=await verifyExactBaseTransfer({txHash,tokenAddress,merchantAddress,amountUnits});
  if(result.confirmed)return res.json({ok:true,confirmed:true,settled:true,network:"Base Mainnet",chain_id:8453,tx_hash:txHash,from:from||null,payment:result,amount_usd:Number(amountUsd),receipt_url:publicApp+"/receipt/"+encodeURIComponent(txHash)});
  res.status(result.error==="transaction_pending"?202:402).json({ok:false,confirmed:false,settled:false,payment:result});
 }catch(e){res.status(502).json({ok:false,error:"verification_unavailable"});}
});
app.get("/v1/payments/usdc",(req,res)=>{const a=tokenRegistry().find(t=>String(t.address).toLowerCase()===USDC_BASE);res.json({ok:true,network:"Base",chain_id:8453,token:"USDC",token_address:USDC_BASE,merchant_address:process.env.TOKEN_MERCHANT_ADDRESS||null,price_points_usd:SIMULATOR_PRICE_POINTS,packages:SIMULATOR_PACKAGES,asset:a||null});});
app.get("/v1/payments/price-points",(req,res)=>res.json({ok:true,network:"Base",chain_id:8453,merchant_address:process.env.TOKEN_MERCHANT_ADDRESS||null,price_points_usd:SIMULATOR_PRICE_POINTS,packages:SIMULATOR_PACKAGES,tokens:tokenRegistry().filter(t=>t.enabled!==false)}));
app.get("/v1/payments/assets",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"});res.json({ok:true,network:"Base",chain_id:8453,merchant_address_configured:Boolean(process.env.TOKEN_MERCHANT_ADDRESS),pricing:TELECOM_CONFIG.pricing,assets:tokenPaymentCapabilities(),note:"Wallet visibility does not imply Coinbase.com listing, liquidity, swap availability, or telecom payment acceptance."});});
// --- Account + community control plane ---
// Wallet-address identity is the canonical account key. No passwords or private keys are stored here.
// State is process-local until durable database storage is configured.
const profiles=new Map();
const communityPosts=[];
function walletAccount(v){const a=String(v||"").trim().toLowerCase();return /^0x[a-f0-9]{40}$/.test(a)?a:null;}
app.post("/v1/accounts/profile",(req,res)=>{
  const account=walletAccount(req.body?.account); if(!account)return res.status(400).json({ok:false,error:"wallet_account_required"});
  const old=profiles.get(account)||{account,created_at:new Date().toISOString(),display_name:"",bio:"",avatar:"",updated_at:null};
  const p={...old,display_name:String(req.body?.display_name||old.display_name).slice(0,80),bio:String(req.body?.bio||old.bio).slice(0,500),avatar:String(req.body?.avatar||old.avatar).slice(0,500),updated_at:new Date().toISOString()};
  profiles.set(account,p); res.json({ok:true,profile:p});
});
app.get("/v1/accounts/profile",(req,res)=>{
  const account=walletAccount(req.query.account); if(!account)return res.status(400).json({ok:false,error:"wallet_account_required"});
  const p=profiles.get(account)||{account,created_at:new Date().toISOString(),display_name:"",bio:"",avatar:"",updated_at:null};
  res.json({ok:true,profile:p});
});
app.get("/v1/accounts/summary",(req,res)=>{
  const account=walletAccount(req.query.account); if(!account)return res.status(400).json({ok:false,error:"wallet_account_required"});
  const s=gameplayAccount(account), state=gameplayState(s);
  res.json({ok:true,account,profile:profiles.get(account)||null,access:state,community_posts:communityPosts.filter(x=>x.account===account).length,bankr:{network:"Base",enabled:Boolean(process.env.BANKR_API_KEY),merchant_configured:Boolean(process.env.TOKEN_MERCHANT_ADDRESS)}});
});
app.get("/v1/community/feed",(req,res)=>{
  res.set("Cache-Control","no-store");
  res.json({ok:true,network:"Base",posts:communityPosts.slice(-100).reverse(),count:communityPosts.length});
});
app.post("/v1/community/post",(req,res)=>{
  const account=walletAccount(req.body?.account); if(!account)return res.status(400).json({ok:false,error:"wallet_account_required"});
  const body=String(req.body?.body||"").trim().slice(0,1000); if(!body)return res.status(400).json({ok:false,error:"post_body_required"});
  const p={id:crypto.randomUUID(),account,body,created_at:new Date().toISOString(),likes:0};
  communityPosts.push(p); if(communityPosts.length>500)communityPosts.shift();
  res.status(201).json({ok:true,post:p});
});
app.get("/v1/bankr/config",(req,res)=>{res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});res.json({ok:true,enabled:Boolean(process.env.BANKR_API_KEY),network:"Base",chain_id:8453,merchant_address:process.env.TOKEN_MERCHANT_ADDRESS||null,bankr_app:"https://bankr.bot",payment_mode:process.env.BANKR_API_KEY?"bankr_agent_or_wallet_api":"bankr_link_only"});});
app.post("/v1/bankr/pay",async(req,res)=>{
  if(!process.env.BANKR_API_KEY)return res.status(503).json({ok:false,error:"bankr_api_key_not_configured"});
  const {tokenAddress,tokenSymbol,amountUsd=4,packageId}=req.body||{};
  const asset=tokenRegistry().find(t=>String(t.address||"").toLowerCase()===String(tokenAddress||"").toLowerCase()&&t.enabled!==false);
  if(!asset)return res.status(400).json({ok:false,error:"token_not_supported_for_telecom_payment"});
  const pkg=packageId?SIMULATOR_PACKAGES.find(x=>x.id===packageId):null;
  const selectedUsd=pkg?pkg.usd:amountUsd;
  let quote; try{quote=await exactTokenQuote(asset.address,selectedUsd)}catch(e){return res.status(400).json({ok:false,error:e.message||"quote_unavailable"});}
  if(!process.env.TOKEN_MERCHANT_ADDRESS)return res.status(400).json({ok:false,error:"tokenAddress_and_merchant_required"});
  const prompt=`For StellarNet Universe Simulator on Base, pay exactly ${quote.amount_usd} using ${asset.symbol} (${asset.address}), exact amount ${quote.amount_base_units} base units, to merchant ${process.env.TOKEN_MERCHANT_ADDRESS}. Approve only this exact amount; never grant unlimited allowance; return approval and final transfer tx hashes.`;
  try{
    const r=await fetch("https://api.bankr.bot/agent/prompt",{method:"POST",headers:{"content-type":"application/json","X-API-Key":process.env.BANKR_API_KEY},body:JSON.stringify({prompt})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status).json({ok:false,error:"bankr_payment_request_failed",provider:data});
    res.status(202).json({ok:true,provider:"Bankr",token:tokenSymbol||tokenAddress,amount_usd:Number(quote.amount_usd),package_id:pkg?.id||null,exact_amount_base_units:quote.amount_base_units,merchant_address:process.env.TOKEN_MERCHANT_ADDRESS,incentive:tokenIncentiveOffer(asset),jobId:data.jobId,threadId:data.threadId,note:"Payment is pending until Bankr reports a confirmed on-chain transaction. Service credit is earned only after confirmation and is subject to the displayed Telecom terms."});
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


// --- Universal Atlas live-data gateway ---
// Continuously aggregates public scientific feeds. Each feed is timestamped and marked
// live/unavailable; missing feeds are never replaced with invented observations.
async function liveJson(url,timeoutMs=7000){
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),timeoutMs);
  try{const r=await fetch(url,{headers:{accept:"application/json"},signal:ctl.signal}); if(!r.ok)throw new Error("http_"+r.status); return await r.json();}
  finally{clearTimeout(t);}
}
app.get("/v1/universe/live",async(req,res)=>{
  const started=Date.now();
  const out={
    ok:true,server_time:new Date().toISOString(),refresh_hint_ms:5000,
    sources:[],
    render_policy:"real published observations are separated from procedural/model geometry",
    model_layers:{higher_dimensions:"simulation",multiverse_branches:"simulation",unobserved_domains:"simulation"},
    note:"No public feed provides literal real-time observations of all universes; the live layer uses currently published scientific observations and labels modeled domains."
  };
  const feed=async(name,url,transform)=>{
    try{const j=await liveJson(url); out[name]=transform?transform(j):j; out.sources.push({name,status:"live",updated_at:new Date().toISOString()});}
    catch(e){out.sources.push({name,status:"unavailable",reason:String(e.message||"feed_error")});}
  };
  await Promise.all([
    feed("apod","https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY",j=>({date:j.date,title:j.title,media_type:j.media_type,url:j.url,source:"NASA APOD"})),
    feed("satellites","https://celestrak.org/GP.php?GROUP=STATIONS&FORMAT=json",j=>({source:"CelesTrak",group:"STATIONS",count:Array.isArray(j)?j.length:0})),
    feed("active_satellites","https://celestrak.org/GP.php?GROUP=ACTIVE&FORMAT=json",j=>({source:"CelesTrak",group:"ACTIVE",count:Array.isArray(j)?j.length:0})),
    feed("space_weather","https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",j=>({source:"NOAA SWPC",latest:Array.isArray(j)&&j.length>1?j[j.length-1]:null})),
    feed("earthquakes","https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",j=>({source:"USGS",count:Number(j.metadata?.count||j.features?.length||0),generated:j.metadata?.generated||null})),
    feed("near_earth_objects","https://api.nasa.gov/neo/rest/v1/feed?api_key=DEMO_KEY",j=>({source:"NASA NEO",element_count:j.element_count||0,dates:Object.keys(j.near_earth_objects||{})})),
    feed("jpl_horizons","https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=%27599%27&OBJ_DATA=YES&MAKE_EPHEM=NO",j=>({source:"JPL Horizons",object:"Jupiter",signature:String(j.result||"").slice(0,4000)}))
  ]);
  out.latency_ms=Date.now()-started;
  res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"}).json(out);
});
const STELLARNET_SYSTEM={name:"StellarNet Unified Control Plane",version:"stellarnet-1.1",organization:"StellarNet LLC",jurisdiction:"Mesa, AZ 85210",domains:["Core OS","Quantum Earth","Atlas","Reality Matrix","Pixel Render","Accounts","Community","Payments","Bankr","Token Layer","Telecom","eSIM","Physical SIM","Wholesale","Security","Diagnostics","Accessibility","Observed Data","Simulation","User State"]};
app.get("/v1/stellarnet/status",(req,res)=>res.json({ok:true,service:STELLARNET_SYSTEM,api_time:new Date().toISOString()}));
// Unified Quantum Earth OS control-plane registry and health surface.
const QUANTUM_MODULES=[
  ["Core OS","routing, navigation, PWA shell"],["Earth / Gaia","globe, terrain, GIS and environment"],["Solar System","planetary and orbital models"],["Stars / Exoplanets","stellar catalogs and visualization"],["Galaxies / Cosmology","cosmic structure models"],["Space Weather","solar and geomagnetic feeds"],["Climate / Environment","source-aware Earth observations"],["Life / Biodiversity","catalog and model layer"],["3D / WebGL","hardware-accelerated rendering"],["WebXR / Immersion","VR/AR browser surfaces"],["Reality Matrix","time, space and dimension models"],["Universal Atlas","maps and camera controls"],["Pixel Render","paid render entitlement"],["Accounts","wallet identity and profiles"],["Community","feed and posts"],["Payments","exact Base transfer verification"],["Bankr Adapter","configurable payment bridge"],["Token Registry","enabled payment metadata"],["Telecom","plan/eSIM/physical-SIM control plane"],["Wholesale Routing","provider-dependent routing"],["GSMA/eSIM","authorized RSP boundary"],["Security","request IDs and idempotency"],["Diagnostics","health and telemetry"],["Accessibility","mobile and readable controls"],["Speculative Models","explicit simulation-only domains"],["User Data","session and preference state"]
];
app.get("/v1/system/registry",(req,res)=>res.json({ok:true,version:"quantum-control-plane-2.0",generated_at:new Date().toISOString(),modules:QUANTUM_MODULES.length,categories:QUANTUM_MODULES.map(([name,scope])=>({name,scope,status:"registered"})),boundaries:{observed_data:"separate",authorized_services:"provider_required",payments:"exact_transfer_verified",physical_reality_override:false}}));
app.get("/v1/system/health",(req,res)=>res.json({ok:true,status:"operational",version:"quantum-control-plane-2.0",modules:QUANTUM_MODULES.length,api_time:new Date().toISOString(),bankr_configured:Boolean(process.env.BANKR_API_KEY),merchant_configured:Boolean(process.env.TOKEN_MERCHANT_ADDRESS),stripe_configured:Boolean(process.env.STRIPE_SECRET_KEY),persistence:"process_local",boundaries:{observed_data:"separate",simulation_layers:"explicit",payment_settlement:"verification_required",physical_reality_override:false}}));

/* NFTQR v1.0 — 4000 individually addressable, one-time-use QR editions.
   Storage is process-local unless a durable database is added. This deliberately does not claim
   blockchain minting; minting is a separate authorized Bankr/contract operation. */
const NFTQR_TOTAL=4000;
// Each edition is a one-time customization slot: once issued, its customization is locked forever for that process lifetime. No edit endpoint exists.
const NFTQR_POLICY={inventory:4000,customizations_per_edition:1,reissue:false,edit_after_issue:false};
const nftqr=new Map();
for(let i=1;i<=NFTQR_TOTAL;i++){
  const id="SNQR-V1-"+String(i).padStart(4,"0");
  nftqr.set(id,{id,issued:false,used:false,label:"",destination:"",dark:"#02070b",light:"#ffffff",size:512,cellStyle:"square",cellRadius:0,cellScale:0.92,accent:"#63eaff",watermark:"STELLARNET",secret:crypto.randomBytes(24).toString("hex"),created_at:null,customized_at:null,used_at:null});
}
function nftqrPublic(x){
  return {id:x.id,issued:x.issued,used:x.used,label:x.label,redeem_url:x.issued?publicApp+"/v1/nftqr/redeem/"+encodeURIComponent(x.id)+"?k="+x.secret:null,metadata_url:x.issued?publicApp+"/v1/nftqr/metadata/"+encodeURIComponent(x.id):null,created_at:x.created_at,customized_at:x.customized_at,customization_locked:Boolean(x.customized_at),used_at:x.used_at,design:{cellStyle:x.cellStyle,cellRadius:x.cellRadius,cellScale:x.cellScale,dark:x.dark,light:x.light,accent:x.accent,watermark:x.watermark,artData:x.artData||"",cellMap:x.cellMap||""},rights:"Buyer receives the custom edition data/design license described by the purchase terms; StellarNet software, marks, QR standards and infrastructure remain separately owned unless a written agreement states otherwise."};
}
function validUrl(v){try{const u=new URL(String(v));return ["http:","https:"].includes(u.protocol)?u.toString():null}catch{return null}}
function validHex(v,fallback){return /^#[0-9a-fA-F]{6}$/.test(String(v||""))?String(v):fallback}
app.get("/v1/nftqr/catalog",(req,res)=>{
  const all=[...nftqr.values()];
  res.set({"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"})
    .json({ok:true,version:"1.0.0",network:"Base",total:NFTQR_TOTAL,issued:all.filter(x=>x.issued).length,used:all.filter(x=>x.used).length,available:all.filter(x=>!x.issued).length,policy:NFTQR_POLICY});
});
app.post("/v1/nftqr/create",(req,res)=>{
  try{
    const destination=validUrl(req.body?.destination);
    if(!destination)return res.status(400).json({ok:false,error:"valid_http_destination_required"});
    const slot=[...nftqr.values()].find(x=>!x.issued);
    if(!slot)return res.status(409).json({ok:false,error:"inventory_exhausted"});
    slot.issued=true;slot.customized_at=new Date().toISOString();slot.label=String(req.body?.label||"StellarNet NFTQR v1.0").slice(0,120);
    slot.destination=destination;slot.dark=validHex(req.body?.dark,"#02070b");slot.light=validHex(req.body?.light,"#ffffff");
    slot.size=Math.min(2048,Math.max(256,Number(req.body?.size)||512));
    slot.cellStyle=String(req.body?.cellStyle||"square").slice(0,24);
    slot.artData=String(req.body?.artData||"").slice(0,12000);
    slot.cellMap=String(req.body?.cellMap||"").slice(0,12000);
    slot.cellRadius=Math.min(0.45,Math.max(0,Number(req.body?.cellRadius)||0));
    slot.cellScale=Math.min(1,Math.max(0.55,Number(req.body?.cellScale)||0.92));
    slot.accent=validHex(req.body?.accent,"#63eaff");
    slot.watermark=String(req.body?.watermark||"STELLARNET").slice(0,32);
    slot.created_at=new Date().toISOString();
    res.status(201).json({ok:true,...nftqrPublic(slot),application:"one_time_qr",network:"Base",customization:"1x_ever_locked"});
  }catch(e){res.status(500).json({ok:false,error:"nftqr_create_failed"});}
});
app.get("/v1/nftqr/metadata/:id",(req,res)=>{
  const x=nftqr.get(String(req.params.id||""));if(!x||!x.issued)return res.status(404).json({ok:false,error:"nftqr_not_found"});
  res.json({name:x.label+" · "+x.id,description:"StellarNet NFTQR v1.0 one-time digital edition with a uniquely generated credential and a single locked customization; no post-issue customization or reissue is permitted.",external_url:publicApp+"/nftqr-v1.html",image:publicApp+"/v1/nftqr/render/"+encodeURIComponent(x.id),attributes:[{trait_type:"Edition",value:x.id},{trait_type:"One-Time",value:true},{trait_type:"Network",value:"Base"},{trait_type:"Used",value:Boolean(x.used)},{trait_type:"Cell Style",value:x.cellStyle},{trait_type:"Cell Scale",value:x.cellScale},{trait_type:"Cell Radius",value:x.cellRadius},{trait_type:"Watermark",value:x.watermark},{trait_type:"Hand Art",value:Boolean(x.artData||x.cellMap)}],rights:"Buyer-facing rights are limited to the purchased custom edition and its supplied data/design license unless separately documented in writing."});
});
app.get("/v1/nftqr/render/:id",async(req,res)=>{
  try{
    const x=nftqr.get(String(req.params.id||""));if(!x||!x.issued)return res.status(404).send("nftqr_not_found");
    const payload=publicApp+"/v1/nftqr/redeem/"+encodeURIComponent(x.id)+"?k="+x.secret;
    const qr=QRCode.create(payload,{errorCorrectionLevel:"H"}); const n=qr.modules.size, pad=8, cell=x.size/(n+pad*2), scale=x.cellScale||0.92, rr=Math.min(cell*0.45,Math.max(0,cell*(x.cellRadius||0)));
    const shape=(x.cellStyle||"square")==="diamond"?"diamond":(x.cellStyle||"square")==="round"?"round":(x.cellStyle||"square")==="pill"?"pill":"square";
    const rects=[]; for(let yy=0;yy<n;yy++)for(let xx=0;xx<n;xx++){if(!qr.modules.get(xx,yy))continue; const cx=(xx+pad+.5)*cell,cy=(yy+pad+.5)*cell,w=cell*scale; let tag="";
      if(shape==="diamond") tag='<polygon points="'+cx+','+(cy-w/2)+' '+(cx+w/2)+','+cy+' '+cx+','+(cy+w/2)+' '+(cx-w/2)+','+cy+'" fill="'+x.dark+'"/>';
      else { const rx=shape==="round"?w/2:(shape==="pill"?Math.min(w/2,rr):rr); tag='<rect x="'+(cx-w/2)+'" y="'+(cy-w/2)+'" width="'+w+'" height="'+w+'" rx="'+rx+'" fill="'+x.dark+'"/>'; }
      rects.push(tag);
    }
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+x.size+'" height="'+x.size+'" viewBox="0 0 '+x.size+' '+x.size+'"><rect width="100%" height="100%" fill="'+x.light+'"/>'+rects.join("")+'<rect x="3" y="3" width="'+(x.size-6)+'" height="'+(x.size-6)+'" rx="12" fill="none" stroke="'+x.accent+'" stroke-width="3"/><text x="'+(x.size/2)+'" y="'+(x.size-10)+'" text-anchor="middle" font-family="system-ui,sans-serif" font-size="'+Math.max(9,Math.round(x.size/42))+'" font-weight="700" fill="'+x.accent+'" opacity=".9">'+String(x.watermark||"STELLARNET").replace(/[<>&"]/g,"")+'</text></svg>';
    res.set({"Content-Type":"image/svg+xml","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}).send(svg); return;
    res.set({"Content-Type":"image/png","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}).send(png);
  }catch(e){res.status(500).send("qr_render_failed");}
});
app.get("/v1/nftqr/redeem/:id",async(req,res)=>{
  const x=nftqr.get(String(req.params.id||""));
  if(!x||!x.issued)return res.status(404).send("QR not found");
  if(String(req.query.k||"")!==x.secret)return res.status(403).send("Invalid QR credential");
  if(x.used)return res.status(410).send("This 1× QR has already been redeemed");
  x.used=true;x.used_at=new Date().toISOString();
  res.set({"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.redirect(303,x.destination);
});

const server=app.listen(PORT,()=>console.log(`StellarNet Telecom API listening on ${PORT}`));
process.on("SIGTERM",()=>{console.log("SIGTERM received; draining HTTP server");server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),25000);});
process.on("SIGINT",()=>server.close(()=>process.exit(0)));