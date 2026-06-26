/**
 * prospect-intel — onchain enrichment (REAL reads, READ-ONLY, no keys, no transactions).
 *
 * Given a prospect's address or ENS name, this reads their public footprint on
 * Ethereum L1 *and* OP Mainnet and emits groundable `Artifact`s — the same
 * { kind, source, id, url, label } shape the trust core checks. The skill folds
 * these into the Prospect Brief so every onchain claim cites a real, clickable
 * block explorer link instead of a guess.
 *
 * Why this is the skill's backbone: OP Labs sells L2 infra, so a prospect's onchain
 * seriousness *is* qualifying signal. This is the part of prospect-intel that is
 * genuinely non-mocked — it talks to public RPCs on a fresh clone, no API key.
 *
 *   cd v0-crawl && npm run prospect:onchain -- vitalik.eth
 *   cd v0-crawl && npm run prospect:onchain -- 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
 *
 * (no arg → uses vitalik.eth as a live example so you can see it work.)
 */
import { createPublicClient, http, isAddress, formatEther, type Address } from "viem";
import { mainnet, optimism } from "viem/chains";
import type { Artifact } from "../../../src/trust/schema";

const l1 = createPublicClient({ chain: mainnet, transport: http() });
const op = createPublicClient({ chain: optimism, transport: http() });

// Just the two read actions we need — typed structurally so the L1 and OP clients
// (different Chain types, so different concrete PublicClient types) both satisfy it.
type ChainReader = {
  getBalance: (args: { address: Address }) => Promise<bigint>;
  getTransactionCount: (args: { address: Address }) => Promise<number>;
};

/** Resolve an .eth name on L1, or accept a 0x-address as-is. */
async function resolveTarget(input: string): Promise<{ address: Address; ens?: string }> {
  if (input.toLowerCase().endsWith(".eth")) {
    const address = await l1.getEnsAddress({ name: input });
    if (!address) throw new Error(`ENS name "${input}" did not resolve on L1`);
    return { address, ens: input };
  }
  if (isAddress(input)) return { address: input as Address };
  throw new Error(`"${input}" is neither a 0x-address nor an .eth name`);
}

/** One chain's footprint → a groundable artifact (or a noted skip if the RPC fails). */
async function readChain(
  client: ChainReader,
  opts: { source: string; explorer: string; chainLabel: string },
  address: Address,
): Promise<Artifact | { skipped: string }> {
  try {
    const [balance, nonce] = await Promise.all([
      client.getBalance({ address }),
      client.getTransactionCount({ address }), // total txns sent = an activity signal
    ]);
    const eth = Number(formatEther(balance)).toFixed(4);
    return {
      kind: "onchain",
      source: opts.source,
      id: `${opts.source}-${address}`,
      url: `${opts.explorer}/address/${address}`,
      label: `${opts.chainLabel}: ${eth} ETH balance, ${nonce} txns sent`,
    };
  } catch (e) {
    return { skipped: `${opts.chainLabel} read failed: ${e instanceof Error ? e.message : e}` };
  }
}

async function main(): Promise<void> {
  const input = process.argv[2] || "vitalik.eth";
  console.error(`prospect-intel · onchain footprint for "${input}" (read-only, public RPCs)\n`);

  const { address, ens } = await resolveTarget(input);
  if (ens) console.error(`  resolved ${ens} → ${address}`);

  // Read both chains; degrade gracefully — a failed RPC skips, never crashes the brief.
  const results = await Promise.all([
    readChain(l1, { source: "ethereum", explorer: "https://etherscan.io", chainLabel: "Ethereum L1" }, address),
    readChain(op, { source: "optimism", explorer: "https://optimistic.etherscan.io", chainLabel: "OP Mainnet" }, address),
  ]);

  const artifacts = results.filter((r): r is Artifact => "kind" in r);
  const skipped = results.filter((r): r is { skipped: string } => "skipped" in r).map((r) => r.skipped);

  // What the skill consumes: an `activity`-shaped block of real, citable onchain artifacts.
  const out = {
    prospect: ens ? { ens, address } : { address },
    artifacts,
    ...(skipped.length ? { skipped } : {}),
  };
  console.log(JSON.stringify(out, null, 2));
  console.error(
    `\n→ ${artifacts.length} onchain artifact(s). Fold these into the Prospect Brief; ` +
      `every onchain line then cites a real block-explorer URL.`,
  );
  if (skipped.length) console.error(`  (skipped: ${skipped.join("; ")})`);
}

main().catch((e) => {
  console.error("onchain-intel failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
