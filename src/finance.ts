import type { EventStudyConfig, EventStudyResult, PricePoint, ReturnPoint, RiskDiagnostics } from "./types.js";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizePrices(prices: Array<PricePoint | [string, number]>): PricePoint[] {
  return prices
    .map((point) => (Array.isArray(point) ? { date: point[0], close: Number(point[1]) } : point))
    .filter((point) => point.date && Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function computeReturns(prices: PricePoint[]): ReturnPoint[] {
  const clean = normalizePrices(prices);
  const returns: ReturnPoint[] = [];

  for (let index = 1; index < clean.length; index += 1) {
    const previous = clean[index - 1];
    const current = clean[index];
    returns.push({
      date: current.date,
      value: current.close / previous.close - 1
    });
  }

  return returns;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function quantile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * clamp(percentile, 0, 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function maxDrawdown(prices: PricePoint[]): number {
  let peak = -Infinity;
  let worst = 0;

  normalizePrices(prices).forEach((point) => {
    peak = Math.max(peak, point.close);
    worst = Math.min(worst, point.close / peak - 1);
  });

  return worst;
}

export function parsePriceCsv(content: string): PricePoint[] {
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));

  const dataRows = rows[0]?.some((cell) => /date|close|price|nav|value/i.test(cell)) ? rows.slice(1) : rows;
  return normalizePrices(dataRows.map((row) => ({ date: row[0], close: Number(row[row.length - 1]) })));
}

export function alignReturns(assetPrices: PricePoint[], benchmarkPrices: PricePoint[]) {
  const benchmarkByDate = new Map(computeReturns(benchmarkPrices).map((point) => [point.date, point.value]));
  return computeReturns(assetPrices)
    .map((assetReturn) => {
      const benchmarkReturn = benchmarkByDate.get(assetReturn.date);
      return benchmarkReturn === undefined
        ? null
        : {
            date: assetReturn.date,
            assetReturn: assetReturn.value,
            benchmarkReturn
          };
    })
    .filter((point): point is { date: string; assetReturn: number; benchmarkReturn: number } => point !== null);
}

export function estimateMarketModel(assetReturns: number[], benchmarkReturns: number[]) {
  const benchmarkMean = mean(benchmarkReturns);
  const assetMean = mean(assetReturns);
  const covariance = mean(assetReturns.map((value, index) => (value - assetMean) * (benchmarkReturns[index] - benchmarkMean)));
  const variance = mean(benchmarkReturns.map((value) => (value - benchmarkMean) ** 2));
  const beta = variance === 0 ? 1 : covariance / variance;
  const alpha = assetMean - beta * benchmarkMean;
  const residuals = assetReturns.map((value, index) => value - (alpha + beta * benchmarkReturns[index]));

  return {
    alpha,
    beta,
    residualVolatility: standardDeviation(residuals)
  };
}

export function runEventStudy(assetPrices: PricePoint[], benchmarkPrices: PricePoint[], config: EventStudyConfig): EventStudyResult {
  const aligned = alignReturns(assetPrices, benchmarkPrices);
  const eventIndex = aligned.findIndex((point) => point.date >= config.eventDate);

  if (eventIndex < 0 || aligned.length < 4) {
    return fallbackEventStudy(assetPrices, benchmarkPrices, config);
  }

  const windowStart = Math.max(0, eventIndex - config.preEventDays);
  const windowEnd = Math.min(aligned.length - 1, eventIndex + config.postEventDays);
  const estimationEnd = Math.max(0, windowStart - 1);
  const estimationStart = Math.max(0, estimationEnd - config.estimationDays + 1);
  const estimation = aligned.slice(estimationStart, estimationEnd + 1);
  const usableEstimation = estimation.length >= 6 ? estimation : aligned.slice(0, Math.max(3, eventIndex));
  const model = estimateMarketModel(
    usableEstimation.map((point) => point.assetReturn),
    usableEstimation.map((point) => point.benchmarkReturn)
  );

  const eventWindow = aligned.slice(windowStart, windowEnd + 1);
  const abnormalReturns = eventWindow.map((point) => point.assetReturn - (model.alpha + model.beta * point.benchmarkReturn));
  const cumulativeAbnormalReturn = abnormalReturns.reduce((sum, value) => sum + value, 0);
  const day0 = aligned[eventIndex].assetReturn - (model.alpha + model.beta * aligned[eventIndex].benchmarkReturn);
  const residualVolatility = model.residualVolatility || standardDeviation(aligned.map((point) => point.assetReturn - point.benchmarkReturn));
  const tStat = residualVolatility > 0 ? cumulativeAbnormalReturn / (residualVolatility * Math.sqrt(eventWindow.length)) : 0;

  return {
    eventIndex,
    windowStartDate: eventWindow[0].date,
    windowEndDate: eventWindow[eventWindow.length - 1].date,
    alpha: model.alpha,
    beta: model.beta,
    residualVolatility,
    eventReturn: eventWindow.reduce((sum, point) => sum + point.assetReturn, 0),
    benchmarkReturn: eventWindow.reduce((sum, point) => sum + point.benchmarkReturn, 0),
    abnormalReturnDay0: day0,
    cumulativeAbnormalReturn,
    tStat,
    pValueApprox: twoTailedNormalPValue(tStat)
  };
}

export function computeRiskDiagnostics(prices: PricePoint[], config: EventStudyConfig): RiskDiagnostics {
  const clean = normalizePrices(prices);
  const returns = computeReturns(clean);
  const values = returns.map((point) => point.value);
  const eventIndex = returns.findIndex((point) => point.date >= config.eventDate);
  const preValues = eventIndex >= 0 ? values.slice(Math.max(0, eventIndex - config.preEventDays), eventIndex) : values.slice(0, Math.floor(values.length / 2));
  const postValues = eventIndex >= 0 ? values.slice(eventIndex, Math.min(values.length, eventIndex + config.postEventDays + 1)) : values.slice(Math.floor(values.length / 2));
  const var95 = Math.min(0, quantile(values, 0.05));
  const tail = values.filter((value) => value <= var95);
  const preEventVolatility = standardDeviation(preValues);
  const postEventVolatility = standardDeviation(postValues);

  return {
    dailyVaR95: var95,
    expectedShortfall95: tail.length ? mean(tail) : var95,
    maxDrawdown: maxDrawdown(clean),
    realizedVolatility: standardDeviation(values) * Math.sqrt(252),
    preEventVolatility,
    postEventVolatility,
    volatilityRatio: preEventVolatility > 0 ? postEventVolatility / preEventVolatility : 1,
    downsideHitRate: values.length ? values.filter((value) => value < 0).length / values.length : 0
  };
}

function fallbackEventStudy(assetPrices: PricePoint[], benchmarkPrices: PricePoint[], config: EventStudyConfig): EventStudyResult {
  const assetReturns = computeReturns(assetPrices);
  const benchmarkReturns = computeReturns(benchmarkPrices);
  const aligned = alignReturns(assetPrices, benchmarkPrices);
  const eventIndex = assetReturns.findIndex((point) => point.date >= config.eventDate);
  const safeIndex = Math.max(0, eventIndex);
  const start = Math.max(0, safeIndex - config.preEventDays);
  const end = Math.min(assetReturns.length - 1, safeIndex + config.postEventDays);
  const assetWindow = assetReturns.slice(start, end + 1);
  const benchmarkWindow = benchmarkReturns.slice(start, end + 1);
  const eventReturn = assetWindow.reduce((sum, point) => sum + point.value, 0);
  const benchmarkReturn = benchmarkWindow.reduce((sum, point) => sum + point.value, 0);
  const residualVolatility = standardDeviation(aligned.map((point) => point.assetReturn - point.benchmarkReturn));
  const cumulativeAbnormalReturn = eventReturn - benchmarkReturn;

  return {
    eventIndex: safeIndex,
    windowStartDate: assetWindow[0]?.date ?? config.eventDate,
    windowEndDate: assetWindow[assetWindow.length - 1]?.date ?? config.eventDate,
    alpha: 0,
    beta: 1,
    residualVolatility,
    eventReturn,
    benchmarkReturn,
    abnormalReturnDay0: assetReturns[safeIndex]?.value ?? 0,
    cumulativeAbnormalReturn,
    tStat: residualVolatility > 0 && assetWindow.length ? cumulativeAbnormalReturn / (residualVolatility * Math.sqrt(assetWindow.length)) : 0,
    pValueApprox: 1
  };
}

function twoTailedNormalPValue(tStat: number): number {
  const z = Math.abs(tStat);
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return clamp(2 * (1 - cdf), 0, 1);
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return sign * y;
}
