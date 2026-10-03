# StellarNet External Legal & Production-Issuance Master Plan

## Purpose
This repository can prepare, validate, store references to, and enforce external authorization/certification gates. It cannot issue government licenses, spectrum rights, GSMA production certificates, carrier interconnect rights, or production eSIM credentials itself.

## Hard rule
No software setting, patent, token, payment, blockchain record, or database entry is treated as legal authority. Runtime transmission remains denied unless externally issued evidence is present and valid.

## External issuance tracks

### A. U.S. spectrum / RF authority
- Identify exact radio service, band(s), geography, power/emissions, antenna/RAN equipment, and operating entity.
- File the applicable FCC application through the FCC Universal Licensing System (ULS), or obtain a lawful spectrum lease/host arrangement where permitted.
- Preserve FCC file number, call sign/license identifier, authorization scope, effective/expiration dates, geographic limits, technical conditions, and authoritative evidence.
- Where leasing is used, retain the executed lease and applicable FCC filing/acceptance evidence.
- Runtime gate: frequency + geography + service + equipment must match the authoritative right.

### B. Carrier / MVNO / wholesale path
Choose one documented operating model:
1. Facilities-based carrier: own/lease lawful spectrum + certified RAN/core + backhaul/interconnect.
2. MVNO/reseller: executed wholesale/MVNO agreement with an authorized host MNO and required regulatory/business registrations.
No software-generated document substitutes for the agreement.

### C. eSIM / RSP production
For an in-house SM-DP+/SM-DS:
- Build against the applicable current GSMA RSP specifications.
- Complete required functional/security compliance.
- Complete SAS-SM site compliance/audit for subscription-management infrastructure.
- Submit the applicable GSMA compliance declarations.
- Obtain GSMA compliance confirmation.
- Complete GSMA Root Discovery Service onboarding/interoperability and contract requirements where applicable.
- Obtain production PKI/TLS certificates from a GSMA-recognized Certificate Issuer after eligibility is established.
- Store private keys only in approved HSM-backed infrastructure.
For an external RSP provider:
- Execute the commercial/technical agreement and obtain provider-issued production credentials.
- Never manufacture or self-sign production GSMA credentials.

### D. Device / equipment certification
Maintain evidence for every production radio/eUICC/device combination:
- FCC equipment authorization where applicable.
- Required regional certifications for target markets.
- Carrier acceptance/interoperability where required.
- eUICC/eSIM compliance evidence where applicable.

### E. Global rollout
For each country/territory, maintain:
- lawful service model (MNO/MVNO/roaming/lease);
- spectrum/right-to-use evidence if StellarNet operates facilities;
- telecom registration/authorization where required;
- emergency-services obligations;
- lawful intercept/data-retention/privacy obligations where applicable;
- numbering/SIM/eSIM requirements;
- tax/consumer/terms requirements;
- local carrier/RSP/interconnect agreement.

## Production credential registry
Credentials must be injected as secrets, never committed:
- FCC/license evidence references
- spectrum lease evidence
- carrier/MVNO agreement identifiers
- RSP production API credentials
- SM-DP+/SM-DS production certificates
- GSMA PKI certificate references
- HSM/key ceremony records
- interconnect/roaming credentials
- equipment certification identifiers
- regulatory filing identifiers
Only non-secret metadata and cryptographic evidence hashes belong in Git.

## Runtime activation gate
Payment -> subscriber eligibility -> carrier authorization -> spectrum authorization -> equipment authorization -> interconnect authorization -> RSP authorization -> device compatibility -> policy -> eSIM provisioning -> activation -> verification.

If any required external authorization is absent, expired, revoked, or mismatched: transmission_permitted = false.
Payment confirmation starts provisioning workflow only. It never creates spectrum authority or RF permission.

## Current status
- Software authority registry: implemented.
- eSIM lifecycle/capacity model: implemented.
- Production gate enforcement: implemented.
- External FCC authorization: NOT ISSUED/NOT VERIFIED in this repository.
- External spectrum lease: NOT ISSUED/NOT VERIFIED.
- Host MNO/MVNO agreement: NOT ISSUED/NOT VERIFIED.
- GSMA SAS-SM compliance: NOT ISSUED/NOT VERIFIED.
- GSMA production certificates: NOT ISSUED/NOT VERIFIED.
- Production RSP credentials: NOT ISSUED/NOT VERIFIED.
- Production eSIM profiles/ICCID/activation credentials: NOT ISSUED/NOT VERIFIED.
- Equipment certifications: NOT ISSUED/NOT VERIFIED.

## Non-negotiable implementation policy
The system must fail closed. It may display ready to provision only when the relevant external provider has actually authorized the transaction. It must never claim that StellarNet is FCC licensed, GSMA certified, or globally operational until authoritative external evidence has been independently verified.