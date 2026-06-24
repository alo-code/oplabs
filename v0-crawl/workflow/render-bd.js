/**
 * Beacon — Render: BD brief  (paste into the n8n "Render BD" Code node).
 * Plain-language "what shipped & why it matters" for BD/GTM. Leads with the
 * customer-relevance line. Runs only when the gate passed — and the gate already
 * rejected any "why it matters" line that invents a figure, so this is safe to
 * forward to customers.
 */
const b = $json.brief;

let text = "*" + b.title + " — what shipped this week & why it matters*\n";
for (const s of b.sections || []) {
  for (const x of s.bullets || []) {
    const why = x.whyItMatters ? " — " + x.whyItMatters : "";
    text += "• " + x.text + why + "\n";
  }
}
text += "\n_Every line is grounded in a real, linked source._";

return [{ json: { channel: "#gtm-shipped", text } }];
