import type { AgentInput, AnalysisResult, RiskBand } from "./types.js";
import { clamp, computeRiskDiagnostics, runEventStudy } from "./finance.js";
import { analyzeText, monitoringQuestionsFor } from "./nlp.js";

export function analyzeEvent(input: AgentInput): AnalysisResult {
  const config = {
    eventDate: input.eventDate,
    preEventDays: input.preEventDays,
    postEventDays: input.postEventDays,
    estimationDays: input.estimationDays
  };
  const language = analyzeText(input.eventText);
  const eventStudy = runEventStudy(input.prices, input.benchmarkPrices, config);
  const diagnostics = computeRiskDiagnostics(input.prices, config);
  const riskScore = scoreRisk(language.downsideCount, language.upsideCount, eventStudy, diagnostics, language.eventType);
  const riskBand = bandForScore(riskScore);
  const recommendation = recommendationFor(riskBand, eventStudy.cumulativeAbnormalReturn, language.eventType);
  const monitoringQuestions = monitoringQuestionsFor(language.eventType);

  return {
    ticker: input.ticker,
    sector: input.sector,
    eventDate: input.eventDate,
    language,
    eventStudy,
    diagnostics,
    riskScore,
    riskBand,
    recommendation,
    monitoringQuestions,
    agentTrace: [
      {
        title: "Evidence extraction",
        status: language.evidence.length >= 3 ? "complete" : "warning",
        output: `${language.evidence.length} evidence snippets and ${language.financialClaims.length} numeric claims identified.`
      },
      {
        title: "Event classification",
        status: "complete",
        output: `${language.eventType} event with ${language.sentiment.toLowerCase()} language tone.`
      },
      {
        title: "Event study",
        status: Math.abs(eventStudy.tStat) >= 1.96 ? "warning" : "complete",
        output: `CAR ${formatSigned(eventStudy.cumulativeAbnormalReturn)} from ${eventStudy.windowStartDate} to ${eventStudy.windowEndDate}; beta ${eventStudy.beta.toFixed(2)}.`
      },
      {
        title: "Risk diagnostics",
        status: diagnostics.volatilityRatio > 1.6 || diagnostics.maxDrawdown < -0.12 ? "warning" : "complete",
        output: `VaR ${formatSigned(diagnostics.dailyVaR95)}, drawdown ${formatSigned(diagnostics.maxDrawdown)}, volatility ratio ${diagnostics.volatilityRatio.toFixed(2)}x.`
      },
      {
        title: "Memo synthesis",
        status: riskBand === "High" || riskBand === "Critical" ? "warning" : "complete",
        output: recommendation
      }
    ]
  };
}

export function scoreRisk(
  downsideCount: number,
  upsideCount: number,
  eventStudy: { cumulativeAbnormalReturn: number; abnormalReturnDay0: number; tStat: number },
  diagnostics: { dailyVaR95: number; maxDrawdown: number; volatilityRatio: number; downsideHitRate: number },
  eventType: string
): number {
  const languagePressure = clamp((downsideCount - upsideCount * 0.55) / 11, 0, 1) * 22;
  const abnormalPressure = clamp(Math.abs(eventStudy.cumulativeAbnormalReturn) / 0.18, 0, 1) * 22;
  const eventShock = clamp(Math.abs(eventStudy.abnormalReturnDay0) / 0.09, 0, 1) * 10;
  const drawdownPressure = clamp(Math.abs(diagnostics.maxDrawdown) / 0.24, 0, 1) * 12;
  const volatilityPressure = clamp((diagnostics.volatilityRatio - 1) / 2, 0, 1) * 8;
  const downsideFrequency = clamp(diagnostics.downsideHitRate / 0.6, 0, 1) * 4;
  const eventPremium = eventType === "Credit Risk" ? 5 : eventType === "Regulation" ? 4 : eventType === "Liquidity" ? 5 : 0;
  const statisticalSignal = Math.abs(eventStudy.tStat) >= 1.96 ? 4 : Math.abs(eventStudy.tStat) >= 1.3 ? 2 : 0;

  return Math.round(clamp(18 + languagePressure + abnormalPressure + eventShock + drawdownPressure + volatilityPressure + downsideFrequency + eventPremium + statisticalSignal, 0, 100));
}

export function bandForScore(score: number): RiskBand {
  if (score >= 86) return "Critical";
  if (score >= 62) return "High";
  if (score >= 38) return "Moderate";
  return "Low";
}

function recommendationFor(riskBand: RiskBand, car: number, eventType: string): string {
  if (riskBand === "Critical") {
    return `Escalate this ${eventType.toLowerCase()} event immediately; price reaction and language risk both require follow-up data before any constructive view.`;
  }
  if (riskBand === "High") {
    return `Treat this as a high-priority ${eventType.toLowerCase()} risk event and separate temporary market pressure from durable operating damage.`;
  }
  if (riskBand === "Moderate") {
    return car < 0
      ? "Monitor execution risk closely; the market-adjusted move is negative but not yet severe enough to imply a broken thesis."
      : "Keep the event on watch; current evidence is mixed and requires confirmation from the next disclosure cycle.";
  }
  return "The event appears manageable under current evidence, but continue tracking abnormal returns and the next operating update.";
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}
