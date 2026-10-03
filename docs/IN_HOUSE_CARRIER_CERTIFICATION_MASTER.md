# StellarNet In-House Carrier Certification Master

This repository implements the software/control-plane side of an in-house carrier. It does not self-issue regulatory licenses or GSMA certificates.

## Production authority gates
All must be verified before RF transmission:
1. Carrier operating authority and applicable regulatory registrations.
2. Spectrum license, lease, or other lawful right for the exact frequency, geography, service, and time.
3. Interconnect, wholesale, and roaming authorization.
4. Certified radio/network equipment and applicable device approvals.
5. Backhaul and physical RAN/core availability.
6. Production eSIM/RSP commercial authorization.
7. GSMA SAS-SM accreditation where required.
8. GSMA functional compliance and accepted declarations.
9. GSMA production PKI/certificates issued by a recognized Certificate Issuer.
10. Applicable regulatory, privacy, emergency-service, lawful-intercept, consumer, numbering, tax, and support obligations.

## eSIM production path
For an in-house SM-DP+/SM-DS, complete the applicable GSMA compliance process, SAS-SM accreditation, interoperability testing, accepted declarations, and production certificate issuance. Production credentials are supplied by authorized issuers; application code never fabricates credentials.

## Software enforcement
/api/authority exposes current evidence-backed authority state.
/api/readiness exposes production readiness.
/api/activate accepts payment but cannot turn payment into spectrum authority. RF transmission is permitted only when every production gate passes.

## Evidence model
Store references/hashes for licenses or leases, geographic/service restrictions, regulator/operator identifiers, interconnect agreements, equipment certifications, RSP authorization, SAS-SM evidence, GSMA compliance confirmation, production PKI metadata, expiration/revocation status, and audit events.

Never store private production keys in Git. Use the deployment secret manager.

## 7G / quantum-ready policy
“7G” and “quantum-ready” are architecture targets unless compatible standardized equipment, spectrum rights, and operational authorizations exist. The control plane is generation-neutral and can attach future licensed rights without bypassing authorization gates.
