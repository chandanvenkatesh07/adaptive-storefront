# Adaptive Storefront Evaluation

The repository has no live-model evaluation dataset. This focused evaluator measures the deterministic boundary around the model: tool schemas, product-ID grounding, and no-key fallbacks. It deliberately does not convert those checks into a claim about model tool-selection quality.

## Reproduce

```bash
npm ci
npm run evaluate
npm run build
```

Measured on commit `2daf5a` plus the evaluator, with Node 22.22.2 on Apple Silicon/macOS. No `OPENAI_API_KEY` was available.

## Results

| Check | Result |
|---|---:|
| Typed valid/invalid tool cases | 10/10 expected outcomes |
| Invalid product IDs remaining after grounding | 0 |
| Deterministic fallback runs | 200/200 successful |
| Fallback presets covered | 8 |
| Invalid product references in fallback output | 0 |
| In-process fallback latency | p50 0.041 ms; p95 0.113 ms |

The latency measures direct route execution and stream parsing inside one Node process. They exclude browser rendering, network transit, cold starts, and provider latency.

## Finding: duplicate product IDs

`groundedIds()` filters nonexistent IDs but does not deduplicate valid ones. A comparison containing the same real product ID twice currently satisfies the two-ID minimum. The evaluator records this current behavior rather than calling it correct. Deduplication and a distinct-product invariant remain reliability gaps.

## What remains unmeasured

- live model tool-selection correctness;
- full-page tool order, hero uniqueness, and completeness at the server boundary;
- schema-valid rate across real model responses;
- provider and end-to-end response latency;
- intent-drift precision, false-switch rate, and recovery from a failed background generation;
- token usage and cost per successful page;
- MCP authentication or misuse resistance.

The environment had no model key and the application does not record token usage, so a defensible model-cost calculation is not possible. The live-cluster path also accepts any non-empty validated block set; it does not run the explicit-persona path's full-page completeness check.
