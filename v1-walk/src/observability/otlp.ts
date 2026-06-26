// otlp.ts — minimal, dependency-free OTLP/HTTP (JSON) metrics export, behind the facade.
//
// ADR 0003: instrument once, choose the destination later. This is that destination seam — OFF by
// default; when OTEL_EXPORTER_OTLP_ENDPOINT is set, the in-memory metrics are periodically POSTed as
// OTLP/JSON to <endpoint>/v1/metrics, where any OTLP-compatible backend (a Collector, SigNoz, Grafana,
// Langfuse) ingests them. No OTel SDK, no extra containers in the demo — the production form swaps
// this for the SDK + a Collector at the same call site.

import { metrics, type MetricSample } from "./telemetry";

/** Encode the in-memory metric snapshot as an OTLP/JSON ExportMetricsServiceRequest. */
export function toOtlpMetrics(samples: MetricSample[], serviceName = "beacon-walk"): unknown {
  return {
    resourceMetrics: [
      {
        resource: { attributes: [{ key: "service.name", value: { stringValue: serviceName } }] },
        scopeMetrics: [
          {
            scope: { name: "beacon" },
            metrics: samples.map((s) => ({
              name: s.name,
              sum: {
                aggregationTemporality: 2, // CUMULATIVE
                isMonotonic: true,
                dataPoints: [
                  {
                    asDouble: s.sum,
                    attributes: Object.entries(s.labels).map(([k, v]) => ({ key: k, value: { stringValue: v } })),
                  },
                ],
              },
            })),
          },
        ],
      },
    ],
  };
}

export function startOtlpExport(endpoint: string, intervalMs = 15_000): void {
  const url = endpoint.replace(/\/$/, "") + "/v1/metrics";
  const tick = async (): Promise<void> => {
    const samples = metrics.snapshot();
    if (!samples.length) return;
    try {
      await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(toOtlpMetrics(samples)) });
    } catch {
      // best-effort: telemetry export must never break the app
    }
  };
  setInterval(() => void tick(), intervalMs).unref?.();
}
