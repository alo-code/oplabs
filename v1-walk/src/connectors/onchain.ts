// onchain.ts — the second real connector. A READ-ONLY OP Mainnet call via viem: no key, no
// transaction, zero setup. It's the OP-specific differentiator (a groundable onchain source) and
// the natural bridge toward case-study Option 2 (agent spend through the same trust spine).

import { z } from "zod";
import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";
import { defineConnector } from "./base";
import { Activity, type Artifact } from "./artifact";

export const OnchainParams = z.object({
  blocks: z.number().int().positive().max(10).optional(), // how many recent blocks to summarize
});

/** Just the two reads we need — lets a test inject a fake chain with no network. */
export interface OnchainClient {
  getBlockNumber(): Promise<bigint>;
  getBlock(args: { blockNumber: bigint }): Promise<{ transactions: readonly unknown[]; gasUsed: bigint }>;
}

export function makeOnchainConnector(opts: { client?: OnchainClient } = {}) {
  // RPC URL is non-secret config (not a credential), so it's read directly; default = viem's public
  // OP Mainnet endpoint, which needs no key.
  const viemClient = createPublicClient({ chain: optimism, transport: http(process.env.OP_MAINNET_RPC_URL) });
  const client: OnchainClient =
    opts.client ?? {
      getBlockNumber: () => viemClient.getBlockNumber(),
      getBlock: ({ blockNumber }) =>
        viemClient.getBlock({ blockNumber }).then((b) => ({ transactions: b.transactions, gasUsed: b.gasUsed })),
    };

  return defineConnector({
    name: "onchain",
    capabilities: ["read:blocks"],
    paramsSchema: OnchainParams,
    resultSchema: Activity,
    healthcheck: async () => {
      const head = await client.getBlockNumber();
      return { ok: true, detail: `OP Mainnet head ${head}` };
    },
    fetch: async ({ blocks }) => {
      const count = blocks ?? 1;
      const head = await client.getBlockNumber();
      const artifacts: Artifact[] = [];
      for (let i = 0; i < count; i++) {
        const num = head - BigInt(i);
        const block = await client.getBlock({ blockNumber: num });
        artifacts.push({
          kind: "onchain",
          source: "optimism",
          id: `op-block-${num}`,
          url: `https://optimistic.etherscan.io/block/${num}`,
          label: `OP Mainnet block ${num} — ${block.transactions.length} txns, gas used ${block.gasUsed}`,
        });
      }
      const now = new Date().toISOString();
      return { source: "optimism", window: { from: now, to: now }, artifacts };
    },
  });
}
