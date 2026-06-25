import { describe, it, expect } from "vitest";
import { makeOnchainConnector, type OnchainClient } from "../../src/connectors/onchain";

// A fake chain — the MAPPING is tested offline; the real OP Mainnet read runs in `npm run connectors`.
function fakeChain(head: bigint): OnchainClient {
  return {
    getBlockNumber: async () => head,
    getBlock: async ({ blockNumber }) => ({
      transactions: Array.from({ length: Number(blockNumber % 5n) }, (_, i) => `0xtx${i}`),
      gasUsed: 1_000n + blockNumber,
    }),
  };
}

describe("onchain connector", () => {
  it("summarizes recent OP Mainnet blocks as grounded artifacts", async () => {
    const oc = makeOnchainConnector({ client: fakeChain(100n) });
    const activity = await oc.fetch({ blocks: 2 });

    expect(activity.source).toBe("optimism");
    expect(activity.artifacts).toHaveLength(2);
    expect(activity.artifacts[0]).toMatchObject({ kind: "onchain", source: "optimism", id: "op-block-100" });
    expect(activity.artifacts[1].id).toBe("op-block-99");
    expect(activity.artifacts[0].url).toContain("optimistic.etherscan.io/block/100");
    expect(activity.artifacts[0].label).toContain("txns");
  });

  it("defaults to one block", async () => {
    const oc = makeOnchainConnector({ client: fakeChain(42n) });
    const activity = await oc.fetch({});
    expect(activity.artifacts).toHaveLength(1);
    expect(activity.artifacts[0].id).toBe("op-block-42");
  });

  it("healthcheck reports the chain head", async () => {
    const oc = makeOnchainConnector({ client: fakeChain(153_000_000n) });
    const h = await oc.healthcheck();
    expect(h).toMatchObject({ connector: "onchain", ok: true });
    expect(h.detail).toContain("153000000");
  });
});
