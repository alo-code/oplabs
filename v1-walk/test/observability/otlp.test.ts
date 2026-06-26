import { describe, it, expect } from "vitest";
import { toOtlpMetrics } from "../../src/observability/otlp";

describe("otlp export", () => {
  it("encodes a metric snapshot as OTLP/JSON", () => {
    const p = toOtlpMetrics([{ name: "connector_requests_total", labels: { connector: "github" }, count: 2, sum: 2 }]) as {
      resourceMetrics: Array<{ resource: { attributes: Array<{ value: { stringValue: string } }> }; scopeMetrics: Array<{ metrics: Array<{ name: string; sum: { dataPoints: Array<{ asDouble: number; attributes: unknown[] }> } }> }> }>;
    };
    const rm = p.resourceMetrics[0]!;
    expect(rm.resource.attributes[0]!.value.stringValue).toBe("beacon-walk");
    const m = rm.scopeMetrics[0]!.metrics[0]!;
    expect(m.name).toBe("connector_requests_total");
    expect(m.sum.dataPoints[0]!.asDouble).toBe(2);
    expect(m.sum.dataPoints[0]!.attributes[0]).toEqual({ key: "connector", value: { stringValue: "github" } });
  });
});
