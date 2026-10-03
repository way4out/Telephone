# StellarNet 1M+ On-Chain Expansion Gates

## Target

Support a control-plane architecture for 1,000,000+ subscribers without pretending that software creates radio capacity.

## Scale architecture

- 128 deterministic subscriber shards.
- Queue-backed provisioning and activation workers.
- Idempotent activation/payment/event processing.
- Per-subscriber and per-provider rate limits.
- Encrypted subscriber data and secret-manager-only credentials.
- Metrics, tracing, audit logs and alerting.
- Backup/restore and disaster-recovery testing.
- Batched Base Mainnet event anchoring rather than one blockchain transaction per subscriber event.

## On-chain record model

Anchor only the minimum proof needed for auditability:

- subscriber entitlement hash
- activation/payment transaction hash
- provider/order reference hash
- authorization-evidence hash
- service-state transition hash
- timestamp
- schema/version
- revocation/suspension evidence

Never put EID, ICCID, IMSI, phone number, API keys, private keys, identity documents or other sensitive subscriber data on-chain.

## Production gates

### Gate 1 — control plane

Database, queue, idempotency, encryption, rate limits, observability and disaster recovery must all be enabled.

### Gate 2 — provider capacity

Every production provider must have a signed agreement, valid credentials, documented geographic scope, documented concurrency/quota, and a tested provisioning API.

### Gate 3 — eSIM/RSP

Production eSIM operation requires the applicable current GSMA compliance path and production certificates/credentials. GSMA currently lists SGP.22 v2.7 and SGP.32 v1.3 as active specifications, and its compliance process requires applicable compliance plus certificate issuance. See the current GSMA specifications and compliance process.

### Gate 4 — carrier/spectrum/RAN

Each actual service region must have externally issued carrier/interconnect authorization and lawful spectrum/equipment authority. On-chain records do not substitute for these rights.

### Gate 5 — on-chain

Base RPC, an externally controlled signer/HSM, deployed subscriber-registry/attestation contract, batching, nonce management, gas policy, monitoring and an emergency pause mechanism must be operational.

### Gate 6 — launch ramp

Do not jump directly to 1M. Ramp by verified cohorts:

1,000 -> 10,000 -> 50,000 -> 100,000 -> 250,000 -> 500,000 -> 1,000,000+.

Advance only when provisioning success, latency, fraud/abuse, provider quotas, error rates, rollback and on-chain reconciliation pass the acceptance thresholds.

## Current implementation status

The repository now contains the deterministic shard/event model and readiness gate code. Actual production database, queue, RSP credentials, carrier agreements, spectrum rights, deployed contract, signer/HSM and provider quotas remain external production dependencies.

## Non-negotiable

A payment, token, patent, blockchain transaction or database flag never creates spectrum authority or permission to transmit. The existing transmission gate remains fail-closed.
