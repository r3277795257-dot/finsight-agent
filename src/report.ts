import type { AnalysisResult } from "./types.js";

export function createMarkdownReport(result: AnalysisResult): string {
  return `# FinSight Agent Risk Memo

## Executive View

${result.recommendation}

## Event Context

- Asset: ${result.ticker}
- Sector: ${result.sector}
- Event date: ${result.eventDate}
- Event type: ${result.language.eventType}
- Risk band: ${result.riskBand}
- Risk score: ${result.riskScore}/100

## Event-Study Diagnostics

- Cumulative abnormal return: ${formatPercent(result.eventStudy.cumulativeAbnormalReturn)}
- Day-0 abnormal return: ${formatPercent(result.eventStudy.abnormalReturnDay0)}
- Benchmark-adjusted beta: ${result.eventStudy.beta.toFixed(2)}
- Approximate t-statistic: ${result.eventStudy.tStat.toFixed(2)}
- Approximate p-value: ${result.eventStudy.pValueApprox.toFixed(3)}
- Event window: ${result.eventStudy.windowStartDate} to ${result.eventStudy.windowEndDate}

## Risk Metrics

- Daily 95% VaR: ${formatPercent(result.diagnostics.dailyVaR95)}
- Expected shortfall 95%: ${formatPercent(result.diagnostics.expectedShortfall95)}
- Max drawdown: ${formatPercent(result.diagnostics.maxDrawdown)}
- Realized volatility: ${formatPercent(result.diagnostics.realizedVolatility)}
- Volatility ratio: ${result.diagnostics.volatilityRatio.toFixed(2)}x

## Evidence Used

${result.language.evidence.map((item) => `- ${item.sentence}`).join("\n") || "- No strong textual evidence detected."}

## Monitoring Questions

${result.monitoringQuestions.map((question) => `- ${question}`).join("\n")}

## Disclaimer

This memo is for research and product demonstration only. It is not investment advice.
`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}
