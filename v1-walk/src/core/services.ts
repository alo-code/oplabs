// services.ts — the catalog of services you can authenticate locally.
//
// One source of truth shared by the in-app "Connect a service" endpoint AND the `./beacon setup`
// CLI wizard, so the two onboarding paths can't drift. (The browser page keeps its own copy since it
// can't import TS.) Maps a service to the env var(s) it sets; the central credential registry then
// reads those — connectors never touch process.env directly.

export interface ServiceSpec {
  source: string; // "slack" — matches the connector name where one exists
  label: string;
  tokenEnv: string; // env var the token is written to
  tokenLabel: string;
  help: string; // where to get the token
  targetEnv?: string; // optional second value (channel / board)
  targetLabel?: string;
  isConnector: boolean; // false for anthropic (it's the summarizer, not a source)
}

export const SERVICES: ServiceSpec[] = [
  { source: "slack", label: "Slack", tokenEnv: "SLACK_TOKEN", tokenLabel: "Bot token (xoxb-…), scope channels:history", help: "https://api.slack.com/apps", targetEnv: "SLACK_CHANNEL", targetLabel: "Channel ID (e.g. C0123ABCD)", isConnector: true },
  { source: "notion", label: "Notion", tokenEnv: "NOTION_TOKEN", tokenLabel: "Internal integration token (secret_…)", help: "https://www.notion.so/my-integrations", isConnector: true },
  { source: "monday", label: "Monday", tokenEnv: "MONDAY_TOKEN", tokenLabel: "API v2 token", help: "https://developer.monday.com/api-reference/docs/authentication", targetEnv: "MONDAY_BOARD_ID", targetLabel: "Board ID", isConnector: true },
  { source: "github", label: "GitHub (optional — lifts the public rate limit)", tokenEnv: "GITHUB_TOKEN", tokenLabel: "Read-only personal access token", help: "https://github.com/settings/tokens", isConnector: true },
  { source: "anthropic", label: "Anthropic (optional — Claude narrative on the report)", tokenEnv: "ANTHROPIC_API_KEY", tokenLabel: "API key (sk-ant-…)", help: "https://console.anthropic.com/settings/keys", isConnector: false },
];

export function serviceBySource(source: string): ServiceSpec | undefined {
  return SERVICES.find((s) => s.source === source);
}

/** The env vars a connect/setup writes, given a token and (optional) target. Blanks are dropped. */
export function envVarsFor(spec: ServiceSpec, token: string, target?: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (token && token.trim()) vars[spec.tokenEnv] = token.trim();
  if (spec.targetEnv && target && target.trim()) vars[spec.targetEnv] = target.trim();
  return vars;
}
