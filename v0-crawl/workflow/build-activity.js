/**
 * Beacon — Build activity  (paste into the n8n "Build activity" Code node).
 * Mode: "Run Once for All Items".
 *
 * Normalizes items from every ENABLED source node into one `activity` object the
 * trust gate can check. Each artifact is { kind, source, id, url, label } — the
 * single shape grounding keys off (id or url). GitHub (commits + PRs) is wired;
 * add the Monday/Notion/Slack/Drive mappers when you enable those fetch nodes.
 */
const items = $input.all();
const artifacts = [];

for (const it of items) {
  const j = it.json || {};

  // GitHub commit: { sha, html_url, commit: { message } }
  if (j.sha && j.commit) {
    artifacts.push({ kind: "commit", source: "github", id: String(j.sha).slice(0, 12), url: j.html_url, label: String(j.commit.message).split("\n")[0] });
    continue;
  }
  // GitHub PR: { number, html_url, title }
  if (j.number && j.html_url && j.title) {
    artifacts.push({ kind: "pr", source: "github", id: "#" + j.number, url: j.html_url, label: j.title });
    continue;
  }

  // --- enable these as you turn on each source node ---
  // Monday item:  { id, name }              → url: `https://<org>.monday.com/boards/<board>/pulses/${id}`
  // Notion page:  { id, url, properties }   → label: page title (properties.Name.title[0].plain_text)
  // Slack msg:    { ts, text, permalink }   → id: ts, url: permalink
  // Drive file:   { id, name, webViewLink } → id, url: webViewLink, label: name
}

return [{ json: { activity: { from: $now.minus({ days: 7 }).toISO(), to: $now.toISO(), artifacts } } }];
