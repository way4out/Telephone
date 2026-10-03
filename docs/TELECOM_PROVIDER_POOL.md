# StellarNet Telecom Provider Pool

Updated 2026-10-03.

## Goal
Route StellarNet customers to the cheapest immediately deliverable lawful connectivity option while preserving the existing fail-closed carrier/eSIM authorization gates.

## Tier A — immediate consumer activation

| Provider | Current low-price example | Delivery | Scope | Use in StellarNet |
|---|---:|---|---|---|
| Red Pocket | $2.50/mo equivalent on its low-cost plan | eSIM or physical SIM | U.S. | Cheapest verified U.S. fallback; customer purchases/activates with Red Pocket |
| Tello | $5/mo entry plan | eSIM | U.S. | Lowest simple U.S. eSIM fallback found below mainstream plans |
| Airalo | local eSIMs from $4 | instant eSIM | 200+ locations | Global/local data fallback |
| Global YO | U.S. from $3.89; some destinations from $2.19 | instant eSIM | 200+ countries | Cheapest global/local data candidate; destination pricing varies |
| Airhub | 1 GB / 7 days global data $3.80 | eSIM delivered by email | 131+ destinations on listed multi-operator product | Immediate global data fallback |

These are retail offerings. They are NOT evidence that StellarNet is the carrier of record.

## Tier B — wholesale/API partners for StellarNet-branded service

1. Telna — global wholesale/API connectivity, eSIM management, 180+/200+ country reach depending product, multi-network access. Commercial agreement and credentials required.
2. 1GLOBAL Connect — partner API for ordering, activating and managing global connectivity/eSIM; domestic and global offerings vary by product. Commercial credentials required.
3. eSIM Go — wholesale API; prepaid model; brands can purchase bundles and provide/sell them to users. Commercial account/API key required.

Wholesale prices are quote/volume dependent. Never invent a sub-$4 wholesale rate.

## StellarNet customer pricing rule
- Public StellarNet plan: **$12 one-time setup + $4/month**.
- Customer may cancel the $4/month service at any time; “forever” means the displayed plan remains cancellable, not a guarantee that third-party wholesale costs, taxes, regulations, coverage, or provider terms can never change.
- The $12 setup is the StellarNet customer charge; provider wholesale/eSIM costs remain separate internal economics.

## $4 pricing rule
- A $4/month StellarNet-branded global full mobile service is NOT currently verified from public pricing.
- Under $4 is achievable today only for selected low-cost retail or travel-data offers, not as a universal global voice/SMS carrier plan.
- The StellarNet $4/month recurring service remains pricing_pending_wholesale_quote until an authorized wholesale provider contract proves the cost, coverage, voice/SMS/data scope, taxes/fees, and permitted resale model.
- Do not represent a travel-data eSIM as full carrier service.

## Activation routing
customer payment -> provider eligibility -> provider authorization -> device/eSIM capability -> provider order -> eSIM delivery -> installation -> service verification

For StellarNet-branded production activation, the provider must supply valid production credentials and resale/partner authorization. If those are missing, the gateway must return provisioning-pending rather than claim live cellular service.

## Current preferred order
1. Wholesale partner with the lowest verified all-in landed cost and required global coverage.
2. Telna / 1GLOBAL / eSIM Go for branded API integration after commercial onboarding.
3. Immediate retail fallback links/offers for customers who need connectivity before StellarNet wholesale onboarding is complete.

## Hard safety/compliance boundary
Software, payment, patents, tokens, blockchain records and this provider catalog do not grant spectrum authority, carrier authorization, eSIM production credentials, or permission to transmit RF. The existing transmission gate remains fail-closed.