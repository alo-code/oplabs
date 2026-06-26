/**
 * Beacon — Build activity  (paste into the n8n "Build activity" Code node).
 * Mode: "Run Once for All Items".
 *
 * Normalizes items from every CONNECTED source node into one `activity` object the
 * trust gate can check. Each artifact is { kind, source, id, url, label } — the
 * single shape grounding keys off (id or url). One mapper per source; a source
 * that's missing/empty/degraded (onError: continue) simply adds nothing, so the
 * brief degrades gracefully. Adding a source never changes the trust gate — it
 * just enlarges the citable pool.
 *
 * Wired now: GitHub (commits + PRs), Notion, Slack, Google Drive.
 * Stubs handled too (enable the node + connect it): Calendar, HubSpot.
 *
 * Configurable, no ids baked in. For clickable Slack permalinks set:
 *   $env.SLACK_WORKSPACE   (your-workspace, from your-workspace.slack.com)
 *   $env.SLACK_CHANNEL_ID  (the same channel id the Slack node reads)
 */
const items = $input.all();
const artifacts = [];
const seen = new Set();
function add(a) {
  const key = a.id || a.url;
  if (!key || seen.has(key)) return; // de-dupe (e.g. a commit reachable from two repos)
  seen.add(key);
  artifacts.push(a);
}

for (const it of items) {
  const j = it.json || {};
  if (j.error) continue; // a source that degraded gracefully (onError: continue)

  // GitHub commit: { sha, html_url, commit: { message } }
  if (j.sha && j.commit) {
    add({ kind: "commit", source: "github", id: String(j.sha).slice(0, 12), url: j.html_url, label: String(j.commit.message || "").split("\n")[0] });
    continue;
  }
  // GitHub PR: { number, html_url, title }
  if (j.number && j.html_url && j.title) {
    add({ kind: "pr", source: "github", id: "#" + j.number, url: j.html_url, label: j.title });
    continue;
  }

  // Notion page (native databasePage:getAll). URL contains notion.so. Title may be a
  // simplified `name`, or live under a `title`-typed property.
  if (j.id && String(j.url || "").includes("notion.so")) {
    let label = j.name;
    if (!label && j.properties) {
      for (const k in j.properties) {
        const p = j.properties[k];
        if (p && p.type === "title" && p.title && p.title[0]) { label = p.title[0].plain_text; break; }
      }
    }
    add({ kind: "page", source: "notion", id: String(j.id), url: j.url, label: label || "Notion page" });
    continue;
  }

  // Slack message (native channel:history): { ts, text, ... }. Build a permalink from
  // $env.SLACK_WORKSPACE + $env.SLACK_CHANNEL_ID when both are set; else cite by ts.
  if (j.ts && typeof j.text === "string") {
    const ts = String(j.ts);
    const ws = $env.SLACK_WORKSPACE;
    const ch = $env.SLACK_CHANNEL_ID;
    const url = ws && ch ? "https://" + ws + ".slack.com/archives/" + ch + "/p" + ts.replace(".", "") : undefined;
    add({ kind: "message", source: "slack", id: ts, url, label: (j.text || "").replace(/\s+/g, " ").trim().slice(0, 140) });
    continue;
  }

  // Drive file (native fileFolder:search): { id, name, webViewLink, mimeType }
  if (j.id && (j.webViewLink || j.mimeType || j.kind === "drive#file")) {
    add({ kind: "file", source: "drive", id: String(j.id), url: j.webViewLink || "https://drive.google.com/file/d/" + j.id + "/view", label: j.name || "Drive file" });
    continue;
  }

  // Google Calendar event (stub): { id, summary, htmlLink, start }
  if (j.id && j.summary && (j.htmlLink || j.start)) {
    add({ kind: "event", source: "calendar", id: String(j.id), url: j.htmlLink, label: j.summary });
    continue;
  }
  // HubSpot deal (CRM): { id, properties: { dealname|name, dealstage, amount, ... } }.
  // Primary source for the deal decision-log. Build a clickable deal URL when
  // $env.HUBSPOT_PORTAL_ID is set, and fold stage/amount into the label so a
  // decision-log line that mentions them stays grounded (the figure is in a cited label).
  if (j.id && j.properties && (j.properties.dealname || j.properties.name)) {
    const p = j.properties;
    const portal = $env.HUBSPOT_PORTAL_ID;
    const url = portal ? "https://app.hubspot.com/contacts/" + portal + "/deal/" + j.id : undefined;
    const bits = [p.dealname || p.name];
    if (p.dealstage) bits.push("stage: " + p.dealstage);
    if (p.amount) bits.push("amount: " + p.amount);
    add({ kind: "deal", source: "hubspot", id: String(j.id), url, label: bits.filter(Boolean).join(" — ") });
    continue;
  }
}

return [{ json: { activity: { from: $now.minus({ days: 7 }).toISO(), to: $now.toISO(), artifacts } } }];
