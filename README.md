# OEQL Quantum Telecom — Pass 1/4

Production web/PWA control layer for an experimental post-6G/7G+ architecture.

## Security baseline
- GSMA consumer eSIM/RSP-compatible integration boundary; actual operator provisioning remains carrier-controlled.
- NIST FIPS 203 ML-KEM, FIPS 204 ML-DSA and FIPS 205 SLH-DSA integration boundary.
- Wallet actions are explicit; no silent signatures or transfers.
- Capability detection is separated from claims of radio/network availability.
- Subscription authorization and payment execution are separate states.

## Pass 1
- phone-first dashboard
- wallet connection
- signed membership authorization receipt
- $4/month subscription boundary
- eSIM preparation workflow
- telemetry/capability model
- offline PWA shell

## Reality boundary
7G+ is an experimental architecture designation. It does not assert commercial 7G radio service. Actual cellular service requires compatible modem/eUICC, carrier credentials, spectrum/network infrastructure and regulatory authorization.
