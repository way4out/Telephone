"use strict";

const LIMITS = Object.freeze({
  targetSubscribers: 1_000_000,
  shards: 128,
  targetEventsPerSecond: 2_000,
  maxBatchSize: 500,
  maxOnchainBatchBytes: 90_000
});

function bool(v){ return String(v ?? "").toLowerCase() === "true"; }

function readiness(env=process.env){
  const checks = {
    database: Boolean(env.SCALE_DATABASE_URL || env.DATABASE_URL),
    queue: Boolean(env.SCALE_QUEUE_URL || env.REDIS_URL),
    idempotency: bool(env.SCALE_IDEMPOTENCY_ENABLED),
    encryption: bool(env.SCALE_ENCRYPTION_ENABLED),
    observability: bool(env.SCALE_OBSERVABILITY_ENABLED),
    disasterRecovery: bool(env.SCALE_DR_ENABLED),
    rateLimits: bool(env.SCALE_RATE_LIMITS_ENABLED),
    onchainRpc: Boolean(env.BASE_RPC_URL),
    onchainSigner: Boolean(env.ONCHAIN_SIGNER_KEY),
    onchainContract: Boolean(env.SUBSCRIBER_REGISTRY_CONTRACT),
    onchainBatching: bool(env.ONCHAIN_BATCHING_ENABLED),
    contractPause: bool(env.ONCHAIN_CONTRACT_PAUSE_ENABLED),
    authorizationRegistry: bool(env.AUTHORITY_REGISTRY_ENABLED)
  };
  const operational = checks.database && checks.queue && checks.idempotency &&
    checks.encryption && checks.observability && checks.disasterRecovery &&
    checks.rateLimits && checks.authorizationRegistry;
  const onchainReady = checks.onchainRpc && checks.onchainSigner &&
    checks.onchainContract && checks.onchainBatching && checks.contractPause;
  return {
    target: LIMITS.targetSubscribers,
    architecture: "sharded-control-plane",
    limits: LIMITS,
    checks,
    operational,
    onchainReady,
    status: operational ? (onchainReady ? "1m_onchain_ready_pending_external_infrastructure" : "1m_control_plane_ready_onchain_pending") : "expansion_gated",
    hardRule: "On-chain records prove service events/entitlements; they do not grant spectrum, carrier, RSP, or RF authority."
  };
}

function shardForSubscriber(id){
  const s = String(id ?? "");
  let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % LIMITS.shards;
}

function eventEnvelope(event){
  return {
    schema:"stellarnet.telecom.event.v1",
    event_id:String(event.event_id || ""),
    subscriber_id:String(event.subscriber_id || ""),
    shard:shardForSubscriber(event.subscriber_id),
    type:String(event.type || "unknown"),
    occurred_at:event.occurred_at || new Date().toISOString(),
    entitlement_hash:String(event.entitlement_hash || ""),
    tx_hash:event.tx_hash || null
  };
}

module.exports={LIMITS,readiness,shardForSubscriber,eventEnvelope};
