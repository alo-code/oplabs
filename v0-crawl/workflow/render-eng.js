/**
 * Beacon — Render: eng digest  (paste into the n8n "Render eng" Code node).
 * Technical "what shipped this week" for engineering leadership. Each bullet shows
 * its citations so the reader can click through. Runs only when the gate passed.
 */
const b = $json.brief;
const e = $json.eval || {};

let text = "*" + b.title + "*  _(eval " + (e.score != null ? e.score : "?") + ")_\n";
for (const s of b.sections || []) {
  text += "\n*" + s.heading + "*\n";
  for (const x of s.bullets || []) {
    const cite = (x.citations || []).join(", ");
    text += "• " + x.text + (cite ? "  (" + cite + ")" : "") + "\n";
  }
}

return [{ json: { channel: "#eng-updates", text } }];
