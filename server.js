import express from "express";
import cors from "cors";
import Stripe from "stripe";
import crypto from "node:crypto";

const app=express();
app.use(cors({origin:(process.env.CORS_ORIGIN||"").split(",").filter(Boolean),credentials:false}));
app.use(express.json({limit:"32kb"}));

const PORT=process.env.PORT||10000;
const stripeKey=process.env.STRIPE_SECRET_KEY;
const priceId=process.env.STRIPE_PRICE_ID||"price_1ULnPURPRXTyZSXkc7iu3H5o";
const publicApp=process.env.PUBLIC_APP_URL||"https://oeql-quantum-telecom-phone.onrender.com";
const stripe=stripeKey?new Stripe(stripeKey):null;

function id(){return crypto.randomUUID();}
function requireStripe(res){if(!stripe){return res.status(503).json({ok:false,error:"payments_not_configured"});}}

app.get("/health",(_,res)=>res.json({ok:true,service:"oeql-quantum-telecom-api",payments:Boolean(stripe),esim:Boolean(process.env.ESIM_PROVIDER_BASE_URL),version:"1.0.0"}));

app.post("/v1/checkout/session",async(req,res)=>{
  if(requireStripe(res)) return;
  try{
    const session=await stripe.checkout.sessions.create({
      mode:"subscription",
      line_items:[{price:priceId,quantity:1}],
      success_url:(req.body.success_url||publicApp)+"?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url:(req.body.cancel_url||publicApp)+"?checkout=cancelled",
      allow_promotion_codes:true,
      billing_address_collection:"auto",
      metadata:{vendor:"Quantum Telecom",architecture:"OEQL 7G+",flow:"membership"},
      subscription_data:{metadata:{vendor:"Quantum Telecom",architecture:"OEQL 7G+"}}
    });
    res.json({ok:true,url:session.url,id:session.id});
  }catch(e){res.status(400).json({ok:false,error:"checkout_creation_failed",detail:e.message});}
});

app.post("/v1/esim/provision",async(req,res)=>{
  const {checkout_session_id,eid,device_id}=req.body||{};
  if(!checkout_session_id||!eid) return res.status(400).json({ok:false,error:"checkout_session_id_and_eid_required"});
  if(!stripe) return res.status(503).json({ok:false,error:"payments_not_configured"});
  if(!process.env.ESIM_PROVIDER_BASE_URL||!process.env.ESIM_PROVIDER_API_KEY){
    return res.status(503).json({ok:false,error:"esim_provider_not_configured",message:"Authorized carrier/eSIM provider credentials are required before a real profile can be downloaded."});
  }
  try{
    const session=await stripe.checkout.sessions.retrieve(checkout_session_id,{expand:["subscription"]});
    if(session.payment_status!=="paid" || !session.subscription) return res.status(402).json({ok:false,error:"subscription_not_paid"});
    const r=await fetch(process.env.ESIM_PROVIDER_BASE_URL+"/v1/provision",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${process.env.ESIM_PROVIDER_API_KEY}`},body:JSON.stringify({eid,device_id,subscription_id:session.subscription.id,external_reference:id()})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) return res.status(502).json({ok:false,error:"esim_provider_error",provider_status:r.status});
    res.json({ok:true,provisioning:data});
  }catch(e){res.status(400).json({ok:false,error:"provisioning_failed",detail:e.message});}
});

app.post("/v1/webhooks/stripe",express.raw({type:"application/json"}),async(req,res)=>{
  if(!stripe||!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send("webhook_not_configured");
  try{
    const event=stripe.webhooks.constructEvent(req.body,req.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);
    // Entitlement state belongs in durable storage; events are the source of truth.
    res.json({received:true,type:event.type});
  }catch(e){res.status(400).send("invalid_signature");}
});

app.listen(PORT,()=>console.log(`OEQL Quantum Telecom API listening on ${PORT}`));
