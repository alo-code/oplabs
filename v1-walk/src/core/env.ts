// env.ts — a tiny, dependency-free .env loader + writer.
//
// The platform reads credentials from process.env via the central credential registry. loadEnv()
// makes a local `.env` actually populate process.env (so hand-editing OR the in-app "Connect a
// service" flow both work); upsertEnv() lets the control plane persist a pasted token. `.env` is
// gitignored — this is local-dev convenience over the same registry; production uses a vault (OAuth).

import { readFileSync, writeFileSync } from "node:fs";

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key) out[key] = val;
  }
  return out;
}

/** Populate process.env from a .env file, WITHOUT overriding anything already set (the shell wins). */
export function loadEnv(file = ".env"): void {
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return; // no .env is fine
  }
  for (const [k, v] of Object.entries(parseEnv(text))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

/** Upsert keys into a .env file (creating it if absent); uncomments a matching `# KEY=` line. */
export function upsertEnv(file: string, vars: Record<string, string>): string {
  let lines: string[];
  try {
    lines = readFileSync(file, "utf8").split("\n");
  } catch {
    lines = [];
  }
  for (const [k, v] of Object.entries(vars)) {
    const idx = lines.findIndex((l) => {
      const t = l.trim().replace(/^#\s*/, "");
      return t.startsWith(k + "=");
    });
    const line = `${k}=${v}`;
    if (idx >= 0) lines[idx] = line;
    else lines.push(line);
  }
  const text = lines.join("\n");
  writeFileSync(file, text);
  return text;
}
