# StellarNet Unified Carrier Authority System

## Purpose
One carrier-control authority layer for spectrum rights StellarNet legally acquires across current and future 6G/7G/8G-class networks.

## Rights model
Each spectrum record binds frequency range, geography, service, license/lease identifier, effective and expiry dates, operating status, technical restrictions, patent/IP provenance, evidence hash, and optional on-chain record.

Lifecycle: CLAIMED -> PATENTED -> LICENSE_APPLIED -> LICENSED/LEASED -> AUTHORIZED -> OPERATIONAL. EXPIRED and REVOKED always block operation.

## Hard transmission gate
The control plane returns transmission authorization only when a right is explicitly AUTHORIZED or OPERATIONAL, has unexpired evidence, and covers the requested frequency. A blockchain record, patent, payment, token balance, or internal flag cannot substitute for regulatory spectrum authority.

## eSIM integration
The authority layer is intended to gate subscriber/eSIM activation alongside an authorized carrier/MVNO/RSP arrangement. Real SM-DP+/SM-DS credentials and network identifiers remain external production dependencies.

## IP provenance
Patent/application identifiers, assignments, licenses, inventor/assignee records, and evidence hashes can be attached to each right. This creates provenance without confusing patent rights with spectrum operating rights.

## On-chain evidence
Store hashes and immutable references to executed licenses, leases, assignments, and authorization records. The chain is an evidence ledger, not a source of spectrum authority.

## Network generations
The schema is generation-neutral and can represent existing bands and future 6G/7G/8G-class allocations without asserting that those future radio standards or spectrum rights currently exist.

## Production requirement
Before any RF transmission, the operator must validate the applicable regulator authorization, geographic/service constraints, equipment certification, carrier/interconnect authorization, and current status. Unauthorized frequencies must remain blocked.