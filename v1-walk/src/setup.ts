/**
 * ./beacon setup — interactive CLI to authenticate your services locally (the terminal twin of the
 * control plane's "Connect a service"). Prompts for each service's token, writes them to a gitignored
 * v1-walk/.env, verifies each connector, and prints next steps. In a real terminal, token input is
 * hidden (like sudo) so it won't leak on a screen-share. Piped input works too (scriptable).
 *
 *   cd v1-walk && npm run setup      (or, from the repo root: ./beacon setup)
 */
import * as readline from "node:readline";
import { loadEnv, upsertEnv } from "./core/env";
import { SERVICES, envVarsFor } from "./core/services";
import { defaultRegistry } from "./connectors/registry-default";

loadEnv(); // so "already set" reflects an existing .env

interface Asker {
  ask(query: string, hidden?: boolean): Promise<string>;
  close(): void;
}

async function makeAsker(): Promise<Asker> {
  // Non-interactive (piped): consume all of stdin up front and feed it line by line. Deterministic,
  // and avoids the readline-emits-everything-then-closes race that drops lines on a pipe.
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    const lines = Buffer.concat(chunks).toString("utf8").split("\n");
    let i = 0;
    return {
      ask: async (query) => {
        process.stdout.write(query + "\n");
        return (lines[i++] ?? "").trim();
      },
      close: () => {},
    };
  }
  // Interactive terminal: readline, with token echo suppressed while "muted".
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const rlAny = rl as unknown as { muted: boolean; output: { write(s: string): void }; _writeToOutput: (s: string) => void };
  rlAny._writeToOutput = (str) => {
    if (rlAny.muted) {
      if (/[\r\n]/.test(str)) rlAny.output.write(str);
    } else {
      rlAny.output.write(str);
    }
  };
  return {
    ask: (query, hidden = false) =>
      new Promise<string>((resolve) => {
        rl.question(query, (a) => {
          rlAny.muted = false;
          resolve(a.trim());
        });
        rlAny.muted = !!hidden;
      }),
    close: () => rl.close(),
  };
}

async function main(): Promise<void> {
  console.log("\nBeacon — connect your services");
  console.log("Saved locally to v1-walk/.env (gitignored), applied on next ./beacon up. Enter to skip any.\n");

  const asker = await makeAsker();
  const registry = defaultRegistry();
  const collected: Record<string, string> = {};

  for (const svc of SERVICES) {
    console.log(`── ${svc.label}${process.env[svc.tokenEnv] ? "  ✓ already set" : ""}`);
    console.log(`   ${svc.tokenLabel}`);
    console.log(`   ${svc.help}`);
    const token = await asker.ask("   token (hidden · Enter to skip): ", true);
    if (!token) {
      console.log("   skipped\n");
      continue;
    }
    let target = "";
    if (svc.targetEnv) target = await asker.ask(`   ${svc.targetLabel}: `);
    const vars = envVarsFor(svc, token, target);
    Object.assign(collected, vars);
    for (const [k, v] of Object.entries(vars)) process.env[k] = v;

    if (svc.isConnector) {
      const connector = registry.get(svc.source);
      const health = connector ? await connector.healthcheck() : undefined;
      console.log(health?.ok ? `   ✓ connected — ${health.detail}\n` : `   ✗ ${health?.detail ?? "saved, but could not verify"}\n`);
    } else {
      console.log("   ✓ saved\n");
    }
  }
  asker.close();

  if (Object.keys(collected).length) {
    upsertEnv(".env", collected);
    console.log(`Saved ${Object.keys(collected).length} value(s) to v1-walk/.env`);
    console.log("Next:  ./beacon up   →  http://localhost:7878   (then click Create Report)\n");
  } else {
    console.log("Nothing entered — you can also connect services in the app: ./beacon up\n");
  }
}

main().catch((e) => {
  console.error("setup failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
