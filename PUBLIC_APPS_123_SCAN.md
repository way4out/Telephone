# StellarNet Public Apps — 123-Point Pre-Rebuild Scan

Scan date: 2026-10-03
Scope: all currently listed public Render apps across StellarNet, OEQL, Quantum Telecom and Rollin.
Rule: scan first; rebuild second; do not mark an item PASS unless observed or verified.

## Known pre-scan blockers
1. stellarnet-nftqr currently fails because Render starts nftqr-live-server.js while package.json declares type=module; logs show require is not defined. A .cjs server exists.
2. oeql-quantum-telecom-live has a prior failed deploy caused by an outdated pnpm lockfile; its current listed deployment is live, so the old failure must be removed from the release ledger.
3. oeql-bank-forever has historical port-scan failures, although later logs show node server.js listening on port 10000; final verification must use the current deployment.
4. Rollin public deployments are live, but static build commands are effectively no-op; functional route and one-tap regression is still required.

## Checklist
### 1–10 — Inventory & scope
1. [ ] enumerate every public app
2. [ ] map every Render service
3. [ ] map every repo
4. [ ] identify primary public URL
5. [ ] identify secondary public URL
6. [ ] record deployment branch
7. [ ] record service type
8. [ ] record runtime
9. [ ] record build command
10. [ ] record start/publish command

### 11–20 — Availability & deployment
11. [ ] verify service is not suspended
12. [ ] verify latest deploy status
13. [ ] verify deploy timestamp
14. [ ] verify auto-deploy setting
15. [ ] verify deploy source commit
16. [ ] check build logs
17. [ ] check runtime logs
18. [ ] check port binding for web services
19. [ ] check static publish path
20. [ ] check CDN/public URL

### 21–30 — Startup & blank-screen
21. [ ] root route loads
22. [ ] mobile viewport loads
23. [ ] desktop viewport loads
24. [ ] no fatal JavaScript startup error
25. [ ] no module import error
26. [ ] no CommonJS/ESM mismatch
27. [ ] no missing entry document
28. [ ] no missing stylesheet
29. [ ] no missing primary script
30. [ ] recovery screen exists if a child module fails

### 31–40 — Navigation
31. [ ] home link works
32. [ ] back/home recovery works
33. [ ] site map works
34. [ ] all top-level nav targets resolve
35. [ ] all category links resolve
36. [ ] all account links resolve
37. [ ] all commerce links resolve
38. [ ] all legal links resolve
39. [ ] all contact links resolve
40. [ ] no dead internal links

### 41–50 — UI interaction
41. [ ] buttons have visible state
42. [ ] touch targets are usable
43. [ ] keyboard focus works
44. [ ] forms have labels
45. [ ] disabled states are explicit
46. [ ] loading states are explicit
47. [ ] success states are explicit
48. [ ] error states are explicit
49. [ ] retry actions work
50. [ ] double-tap/double-submit is prevented

### 51–60 — One-tap action layer
51. [ ] primary one-tap action is visible
52. [ ] one-tap action has a single clear outcome
53. [ ] wallet connection is explicit
54. [ ] network is displayed before signing
55. [ ] chain ID is validated
56. [ ] recipient is displayed before signing
57. [ ] asset and amount are displayed before signing
58. [ ] user confirmation is required
59. [ ] transaction hash is captured
60. [ ] post-transaction verification is shown

### 61–70 — Payments and wallet safety
61. [ ] Base Mainnet is explicit
62. [ ] ERC-20 transfer calldata is validated
63. [ ] token contract is exact
64. [ ] merchant address is server-configured
65. [ ] amount uses base units
66. [ ] wallet rejection is recoverable
67. [ ] wrong-network state is recoverable
68. [ ] insufficient-balance state is recoverable
69. [ ] duplicate payment is blocked
70. [ ] idempotency key is supported

### 71–80 — Bankr and onchain execution
71. [ ] Bankr dependency is server-side
72. [ ] Bankr key is never exposed client-side
73. [ ] job ID is recorded
74. [ ] job status can be polled
75. [ ] completed status requires transaction hash
76. [ ] explorer URL is generated from verified hash
77. [ ] failed jobs are visible
78. [ ] pending jobs are visible
79. [ ] duplicate mint/deploy is blocked
80. [ ] no transaction is claimed without evidence

### 81–90 — Data persistence and state
81. [ ] critical state is identified
82. [ ] process-local state is marked temporary
83. [ ] persistent store requirement is documented
84. [ ] customization lock is enforced
85. [ ] reissue policy is enforced
86. [ ] edition numbering is deterministic
87. [ ] metadata endpoint is deterministic
88. [ ] public render URL is deterministic
89. [ ] audit events are attributable
90. [ ] restart/redeploy data-loss risk is surfaced

### 91–100 — Security and resilience
91. [ ] CORS is intentional
92. [ ] secrets are server-side
93. [ ] request IDs are generated
94. [ ] POST idempotency is supported
95. [ ] input sizes are bounded
96. [ ] invalid paths return controlled errors
97. [ ] provider failures return controlled errors
98. [ ] external APIs have failure handling
99. [ ] no credentials appear in client bundles
100. [ ] security headers are present where applicable

### 101–110 — Accessibility and mobile
101. [ ] responsive layout
102. [ ] safe-area handling
103. [ ] touch-friendly controls
104. [ ] readable text
105. [ ] visible focus
106. [ ] semantic buttons and links
107. [ ] status messages use accessible regions
108. [ ] reduced-motion consideration
109. [ ] camera and microphone permissions are explicit
110. [ ] wallet deep-link fallback exists

### 111–120 — Commerce and marketplace
111. [ ] listing creation path
112. [ ] listing detail path
113. [ ] purchase path
114. [ ] seller path
115. [ ] buyer path
116. [ ] shipping and fulfillment path
117. [ ] sharing path
118. [ ] category filters
119. [ ] terms/privacy/restricted-items pages
120. [ ] jurisdiction/compliance warnings

### 121–123 — Release gate
121. [ ] run full public regression after rebuild
122. [ ] confirm every changed deployment reaches live status
123. [ ] publish final verified public-app manifest

## Public-app inventory
- stellarnet
- stellarnet-nftqr-public
- stellarnet-nftqr-live
- stellarnet-limited-free
- oeql-quantum-telecom-api
- oeql-quantum-telecom-phone
- oeql-quantum-telecom-live
- oeql-quantum-telecom
- oeql-quantum-telecom-7g-plus
- oeql-bank-forever
- oeql-forever-api
- oeql
- claimflow-oeql
- rollin-marketplace-live
- rollin-marketplace

## Rebuild architecture
- Shared one-tap contract: prepare → review → wallet sign → verify → receipt → recovery.
- Provider and BANKR secrets remain server-side.
- Every action gets pending, success, failure and retry states.
- Critical state must use durable storage before permanent-lock claims.
- Every deployment gets live Render deploy and log verification.
- Every child-module failure falls back to a usable recovery surface.

## Release rule
LIVE means the current deployment is live and the critical one-tap paths have been verified. Historical success does not substitute for current verification.