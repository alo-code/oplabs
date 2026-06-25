// registry-default.ts — the default set of connectors Beacon ships.
//
// GitHub + onchain run with zero keys; Slack / Notion / Monday come online the moment their token
// (and, for Slack/Monday, a target) is set — same interface, zero bespoke auth/metrics code. This is
// the single place the demo and the control plane both read, so they always show the same sources.

import { ConnectorRegistry } from "./registry";
import { makeGitHubConnector } from "./github";
import { makeOnchainConnector } from "./onchain";
import { makeSlackConnector } from "./slack";
import { makeNotionConnector } from "./notion";
import { makeMondayConnector } from "./monday";

export function defaultRegistry(): ConnectorRegistry {
  return new ConnectorRegistry()
    .register(makeGitHubConnector())
    .register(makeOnchainConnector())
    .register(makeSlackConnector())
    .register(makeNotionConnector())
    .register(makeMondayConnector());
}
