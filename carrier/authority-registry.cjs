// StellarNet Carrier Authority Registry
// Rights are evidence-backed records. Software never grants spectrum authority.
const STATUS=Object.freeze(["CLAIMED","PATENTED","LICENSE_APPLIED","LICENSED","LEASED","AUTHORIZED","OPERATIONAL","EXPIRED","REVOKED"]);
const ALLOWED=Object.freeze(new Set(["AUTHORIZED","OPERATIONAL"]));
function validFrequency(x){return Number.isFinite(Number(x))&&Number(x)>=0;}
function addRight(r={}){if(!r.id||!validFrequency(r.startHz)||!validFrequency(r.endHz)||Number(r.endHz)<=Number(r.startHz))throw Error("invalid_spectrum_right");if(!STATUS.includes(r.status))throw Error("invalid_right_status");return {...r,startHz:Number(r.startHz),endHz:Number(r.endHz),operational:ALLOWED.has(r.status),evidenceHash:String(r.evidenceHash||""),ipProvenance:r.ipProvenance||null};}
function canTransmit(r,at=new Date()){if(!r||!ALLOWED.has(r.status))return false;if(r.expiresAt&&new Date(r.expiresAt)<=new Date(at))return false;if(!r.evidenceHash)return false;return true;}
function authorizeTransmission(rights,frequencyHz,at=new Date()){return rights.some(r=>Number(frequencyHz)>=Number(r.startHz)&&Number(frequencyHz)<=Number(r.endHz)&&canTransmit(r,at));}
function provenance(right){return {rightId:right.id,licenseId:right.licenseId||null,patentIds:right.patentIds||[],evidenceHash:right.evidenceHash||null,onchainRecord:right.onchainRecord||null};}
module.exports={STATUS,addRight,canTransmit,authorizeTransmission,provenance};