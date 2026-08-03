# Product Decisions

## Why browser-first?

The app is easy to review from GitHub Pages, works without a backend, and keeps the first demo frictionless. This makes it useful for portfolio review, classroom discussion, and early product feedback.

## Why deterministic first?

Financial analysis should be traceable. A deterministic baseline makes it possible to inspect the path from source text to evidence, diagnostics, and memo. An LLM can later improve extraction quality, but the core workflow should remain auditable.

## Why event study instead of only sentiment?

Sentiment alone misses the actual market response. Event-study diagnostics bring financial engineering into the workflow by separating asset movement from benchmark movement.

## What would be next?

- Add a server-side LLM adapter with JSON schema validation.
- Connect a market data provider.
- Add PDF and earnings-call transcript ingestion.
- Add portfolio-level exposure aggregation.
- Add backtesting across a library of historical events.
