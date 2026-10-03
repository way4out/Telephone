# StellarNet 7G Telecom

Production architecture for an authorized universal eSIM platform.

## Safety boundary
- SIM 1 remains untouched.
- SIM 2 is provisioned only through an authorized carrier/SM-DP+ integration.
- Sandbox mode uses mock profiles and never claims cellular connectivity.
- “7G” is a simulation/future-network capability layer until real infrastructure exists.
- No bypassing carrier authentication, device locks, billing, or network authorization.

## Lifecycle
eligible -> provision -> download -> install -> activate -> verify -> ready -> suspend/recover

## Services
- Mobile-first frontend
- Render backend/API
- Supabase Postgres/Auth/Storage
- Carrier provisioning adapter with mock and production modes
- Stripe billing layer
- Base/BANKR asset registry and on-chain receipts
- Audit, revocation, recovery and incident tooling

## Production gates
Production activation requires a configured carrier/wholesale agreement, provisioning credentials, jurisdiction controls, identity requirements where applicable, emergency-service obligations, roaming policy, billing, and operational approval.

## Existing 23 Base assets
The canonical registry is config/base-assets.json. Assets remain distinct even where names or tickers overlap.