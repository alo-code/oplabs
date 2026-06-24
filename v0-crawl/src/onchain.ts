/**
 * Real onchain read — OP Mainnet, READ-ONLY, no keys, no transactions.
 *
 * Two things: (1) it produces a groundable `Artifact` for the brief — the n8n onchain node
 * would call this same shape, so the brief can cite real onchain activity; (2) it shows the
 * V2 spend-gate — the same gate-before-act, applied to money (illustrative; NO transaction
 * is ever signed or sent here).
 *
 *   cd v0-crawl && npm install && npm run onchain
 */
import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";
import type { Artifact } from "./trust/schema";

const client = createPublicClient({ chain: optimism, transport: http() });

async function main(): Promise<void> {
  const block = await client.getBlock(); // latest OP Mainnet block — a real, public read
  const n = block.number;

  const artifact: Artifact = {
    kind: "onchain",
    source: "optimism",
    id: `op-block-${n}`,
    url: `https://optimistic.etherscan.io/block/${n}`,
    label: `OP Mainnet block ${n} — ${block.transactions.length} txns, gas used ${block.gasUsed}`,
  };

  console.log("Real onchain read (OP Mainnet · read-only · no keys):\n");
  console.log(JSON.stringify(artifact, null, 2));
  console.log("\n→ a 6th groundable source; the trust gate cites it by URL like any other artifact.\n");

  // V2 seed: the same gate-before-act shape, applied to spend. Illustrative — no tx is signed.
  const policy = { budgetUsd: 50, allowlistedPayee: true };
  const intents = [
    { desc: "pay $12 to an allowlisted payee", amountUsd: 12, payeeOk: true },
    { desc: "pay $80 (over budget)", amountUsd: 80, payeeOk: true },
    { desc: "pay $5 to a non-allowlisted payee", amountUsd: 5, payeeOk: false },
  ];
  console.log("V2 spend-gate (the trust gate, for money):");
  for (const i of intents) {
    const allow = i.payeeOk && i.amountUsd <= policy.budgetUsd;
    console.log(`  ${i.desc}: ${allow ? "ALLOW — sign w/ scoped session key" : "BLOCK — held, logged"}`);
  }
  console.log(`\n(policy: budget $${policy.budgetUsd}, payee allowlist enforced — grounding, for spend.)`);
}

main().catch((e) => {
  console.error("onchain read failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
