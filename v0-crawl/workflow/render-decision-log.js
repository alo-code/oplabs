/**
 * Beacon — Render: deal decision-log  (paste into the n8n "Render decision-log" Code node).
 *
 * The deal decision-log is the SAME grounded-brief machine as the exec brief, pointed at
 * CRM/deal sources with a "what did we decide, and why" framing. It reuses build-activity.js
 * and the tested trust-node.js unchanged — only the Claude prompt and this render differ.
 * Runs only when the gate passed, so every line is grounded and carries no invented figure.
 *
 * Each bullet:  the decision (text) — the rationale / next step (whyItMatters)  (citation)
 * The citation is the HubSpot deal (or Slack/Notion/Calendar artifact) the decision rests on,
 * so a reader can click straight through to the deal.
 */
const b = $json.brief;
const e = $json.eval || {};

let text = "*" + b.title + "*  _(deal decision-log · eval " + (e.score != null ? e.score : "?") + ")_\n";
for (const s of b.sections || []) {
  text += "\n*" + s.heading + "*\n";
  for (const x of s.bullets || []) {
    const why = x.whyItMatters ? " — " + x.whyItMatters : "";
    const cite = (x.citations || []).join(", ");
    text += "• " + x.text + why + (cite ? "  (" + cite + ")" : "") + "\n";
  }
}

const grounded = Math.round(((($json.grounding || {}).groundedRatio) || 0) * 100);
const deals = (($json.activity || {}).artifacts || []).length;
text += "\n_run metrics — eval " + (e.score != null ? e.score : "?") + " · grounded " + grounded + "% · " + deals + " artifacts cited_";

return [{ json: { channel: "#deal-log", text } }];
