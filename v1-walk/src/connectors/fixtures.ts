// fixtures.ts — recorded API payloads for the demo runthrough, replayed through the REAL connectors.
//
// We don't have OP Labs' Slack/Notion/Monday tokens, so for the demo these three sources replay
// representative payloads — but through the exact same connector mapping, grounding shape, dedup,
// shared memory, and control plane as the live GitHub + onchain sources. It's replay, not fake data,
// and it's labeled "demo data" everywhere it shows. GitHub + onchain stay fully live.

import { ConnectorRegistry } from "./registry";
import { CredentialRegistry } from "./credentials";
import { makeGitHubConnector } from "./github";
import { makeOnchainConnector } from "./onchain";
import { makeSlackConnector } from "./slack";
import { makeNotionConnector } from "./notion";
import { makeMondayConnector } from "./monday";
import type { FetchLike } from "./http";

// --- recorded payloads (the shape each real API returns) ---------------------
const SLACK_HISTORY = {
  ok: true,
  messages: [
    { type: "message", ts: "1750000003.000300", user: "priya", text: "🚀 Upgrade 19 (Holocene) is live on OP Mainnet — fault proofs enabled for 3 more chains" },
    { type: "message", ts: "1750000002.000200", user: "marcus", text: "Customer ping: Base team asking about the Sequencer Defined Metering rollout timeline" },
    { type: "message", ts: "1750000001.000100", user: "dana", text: "GTM: we close the Acme Chain launch this week 🎉" },
  ],
};
const NOTION_SEARCH = {
  results: [
    { id: "notion-upgrade19", url: "https://www.notion.so/op/Upgrade-19-Launch-Notes", properties: { Name: { type: "title", title: [{ plain_text: "Upgrade 19 — Launch Notes (updated)" }] } } },
    { id: "notion-acme", url: "https://www.notion.so/op/Acme-Onboarding", properties: { Name: { type: "title", title: [{ plain_text: "Customer: Acme Chain onboarding" }] } } },
    { id: "notion-q3gtm", url: "https://www.notion.so/op/Q3-GTM-Plan", properties: { Name: { type: "title", title: [{ plain_text: "Q3 GTM Plan" }] } } },
  ],
};
const MONDAY_BOARDS = {
  data: {
    boards: [
      {
        id: "1234567",
        name: "GTM Pipeline",
        items_page: {
          items: [
            { id: "deal-acme", name: "Acme Chain — L2 launch (moved to: Won)" },
            { id: "deal-globex", name: "Globex — evaluating OP Stack (Discovery)" },
            { id: "deal-initech", name: "Initech — contract sent" },
          ],
        },
      },
    ],
  },
};

function jsonRes(payload: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => payload, text: async () => JSON.stringify(payload) };
}

// Each fixture fetch branches the same way the real API routes auth vs data, so the connectors'
// healthcheck AND fetch both work (and report healthy) in demo mode.
const slackFixture = (): FetchLike => async (url) =>
  url.includes("auth.test") ? jsonRes({ ok: true, team: "OP Labs (demo)" }) : jsonRes(SLACK_HISTORY);
const notionFixture = (): FetchLike => async (url) =>
  url.includes("/users/me") ? jsonRes({}) : jsonRes(NOTION_SEARCH);
const mondayFixture = (): FetchLike => async (_url, init) =>
  (init?.body ?? "").includes("boards(") ? jsonRes(MONDAY_BOARDS) : jsonRes({ data: { me: { name: "Beacon Demo" } } });

/** The 5-source registry for the demo: GitHub + onchain live; Slack/Notion/Monday replay fixtures
 *  (fake creds + a default channel/board) through the real connector code. */
export function fixtureRegistry(): ConnectorRegistry {
  const creds = new CredentialRegistry({ SLACK_TOKEN: "fixture", NOTION_TOKEN: "fixture", MONDAY_TOKEN: "fixture" });
  if (!process.env.SLACK_CHANNEL) process.env.SLACK_CHANNEL = "C-GTM-SHIPPED";
  if (!process.env.MONDAY_BOARD_ID) process.env.MONDAY_BOARD_ID = "1234567";
  return new ConnectorRegistry()
    .register(makeGitHubConnector())
    .register(makeOnchainConnector())
    .register(makeSlackConnector({ creds, fetchImpl: slackFixture() }))
    .register(makeNotionConnector({ creds, fetchImpl: notionFixture() }))
    .register(makeMondayConnector({ creds, fetchImpl: mondayFixture() }));
}
