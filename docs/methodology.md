# Methodology

FinSight Agent combines text evidence extraction with an event-study style market model. The implementation is intentionally transparent so users can inspect each intermediate output.

## 1. Evidence Extraction

The text engine uses a domain lexicon for upside terms, downside terms, and event categories. It produces:

- event category
- language tone
- evidence snippets
- numeric financial claims
- monitoring questions

The deterministic engine is not meant to replace a large language model. It provides a reliable baseline and a clear place to add an LLM adapter later.

## 2. Event Study

The market model is estimated from pre-event aligned asset and benchmark returns:

```text
asset_return[t] = alpha + beta * benchmark_return[t] + residual[t]
```

For the event window, abnormal return is calculated as:

```text
abnormal_return[t] = asset_return[t] - (alpha + beta * benchmark_return[t])
```

The app reports:

- day-0 abnormal return
- cumulative abnormal return (CAR)
- beta
- residual volatility
- approximate t-statistic
- approximate two-tailed p-value

## 3. Risk Diagnostics

The risk module calculates:

- historical daily 95% VaR
- expected shortfall
- maximum drawdown
- annualized realized volatility
- pre-event and post-event volatility
- downside hit rate

## 4. Risk Score

The composite score combines language pressure, abnormal-return magnitude, event shock, drawdown pressure, volatility regime change, downside frequency, event-type premium, and statistical signal strength. The score is deliberately visible in the source code rather than hidden behind a black box.

## Limitations

- Built-in data is synthetic and designed for demonstration.
- The p-value uses a normal approximation, not a full small-sample event-study test.
- Browser-only deployment should not ship private API keys.
- The tool is not investment advice.
