import { analyzeEvent } from "./agent.js";
import { parsePriceCsv } from "./finance.js";
import { createMarkdownReport, formatPercent } from "./report.js";
import { findScenario, scenarios } from "./scenarios.js";
import type { AnalysisResult, PricePoint } from "./types.js";

const elements = {
  scenario: query<HTMLSelectElement>("#scenarioInput"),
  ticker: query<HTMLInputElement>("#tickerInput"),
  sector: query<HTMLInputElement>("#sectorInput"),
  eventDate: query<HTMLInputElement>("#eventDateInput"),
  preDays: query<HTMLInputElement>("#preDaysInput"),
  postDays: query<HTMLInputElement>("#postDaysInput"),
  estimationDays: query<HTMLInputElement>("#estimationDaysInput"),
  source: query<HTMLTextAreaElement>("#sourceTextInput"),
  textFile: query<HTMLInputElement>("#textFileInput"),
  priceFile: query<HTMLInputElement>("#priceFileInput"),
  benchmarkFile: query<HTMLInputElement>("#benchmarkFileInput"),
  inputStatus: query<HTMLParagraphElement>("#inputStatus"),
  loadDemo: query<HTMLButtonElement>("#loadDemoButton"),
  analyzeButton: query<HTMLButtonElement>("#analyzeButton"),
  exportButton: query<HTMLButtonElement>("#exportButton"),
  score: query<HTMLElement>("#scoreMetric"),
  riskBand: query<HTMLElement>("#bandMetric"),
  car: query<HTMLElement>("#carMetric"),
  day0: query<HTMLElement>("#day0Metric"),
  beta: query<HTMLElement>("#betaMetric"),
  tStat: query<HTMLElement>("#tStatMetric"),
  varMetric: query<HTMLElement>("#varMetric"),
  drawdown: query<HTMLElement>("#drawdownMetric"),
  signals: query<HTMLElement>("#signalStrip"),
  steps: query<HTMLElement>("#agentSteps"),
  riskBars: query<HTMLElement>("#riskBars"),
  report: query<HTMLElement>("#reportOutput"),
  evidence: query<HTMLElement>("#evidenceOutput"),
  canvas: query<HTMLCanvasElement>("#priceCanvas")
};

let activePrices: PricePoint[] = [];
let activeBenchmark: PricePoint[] = [];
let lastReport = "";

init();

function init() {
  elements.scenario.innerHTML = scenarios.map((scenario) => `<option value="${scenario.id}">${escapeHtml(scenario.name)}</option>`).join("");
  elements.scenario.addEventListener("change", () => loadScenario(elements.scenario.value));
  elements.loadDemo.addEventListener("click", () => loadScenario(elements.scenario.value));
  elements.analyzeButton.addEventListener("click", analyze);
  elements.exportButton.addEventListener("click", exportMarkdown);
  elements.textFile.addEventListener("change", loadTextFile);
  elements.priceFile.addEventListener("change", (event) => loadPriceFile(event, "asset"));
  elements.benchmarkFile.addEventListener("change", (event) => loadPriceFile(event, "benchmark"));
  window.addEventListener("resize", () => drawChart(activePrices, activeBenchmark));
  loadScenario("ev");
}

function loadScenario(id: string) {
  const scenario = findScenario(id);
  elements.scenario.value = scenario.id;
  elements.ticker.value = scenario.ticker;
  elements.sector.value = scenario.sector;
  elements.eventDate.value = scenario.eventDate;
  elements.source.value = scenario.eventText;
  activePrices = scenario.prices;
  activeBenchmark = scenario.benchmarkPrices;
  elements.inputStatus.textContent = "Scenario loaded. Run analysis or replace the text/CSV with your own data.";
  analyze();
}

function analyze() {
  const result = analyzeEvent({
    ticker: elements.ticker.value.trim() || "UNKNOWN",
    sector: elements.sector.value.trim() || "Unclassified",
    eventDate: elements.eventDate.value,
    eventText: elements.source.value.trim(),
    prices: activePrices,
    benchmarkPrices: activeBenchmark,
    preEventDays: Number(elements.preDays.value) || 5,
    postEventDays: Number(elements.postDays.value) || 5,
    estimationDays: Number(elements.estimationDays.value) || 20
  });
  render(result);
}

function render(result: AnalysisResult) {
  elements.score.textContent = `${result.riskScore}/100`;
  elements.riskBand.textContent = result.riskBand;
  elements.car.textContent = formatPercent(result.eventStudy.cumulativeAbnormalReturn);
  elements.day0.textContent = formatPercent(result.eventStudy.abnormalReturnDay0);
  elements.beta.textContent = result.eventStudy.beta.toFixed(2);
  elements.tStat.textContent = `${result.eventStudy.tStat.toFixed(2)} (${result.eventStudy.pValueApprox.toFixed(3)} p)`;
  elements.varMetric.textContent = formatPercent(result.diagnostics.dailyVaR95);
  elements.drawdown.textContent = formatPercent(result.diagnostics.maxDrawdown);

  elements.signals.innerHTML = [
    [result.language.eventType, "neutral"],
    [result.language.sentiment, result.language.sentiment === "Cautious" ? "high" : result.language.sentiment === "Constructive" ? "good" : "neutral"],
    [`CAR ${formatPercent(result.eventStudy.cumulativeAbnormalReturn)}`, result.eventStudy.cumulativeAbnormalReturn < 0 ? "high" : "good"],
    [`Vol ${result.diagnostics.volatilityRatio.toFixed(2)}x`, result.diagnostics.volatilityRatio > 1.35 ? "high" : "neutral"],
    [`Confidence ${(result.language.confidence * 100).toFixed(0)}%`, "neutral"]
  ]
    .map(([label, tone]) => `<span class="signal ${tone}">${escapeHtml(label)}</span>`)
    .join("");

  elements.steps.innerHTML = result.agentTrace
    .map(
      (step, index) => `
        <li class="agent-step ${step.status}">
          <span class="step-index">${index + 1}</span>
          <div>
            <h4>${escapeHtml(step.title)}</h4>
            <p>${escapeHtml(step.output)}</p>
          </div>
        </li>`
    )
    .join("");

  const riskRows = [
    ["Language pressure", Math.min(1, result.language.downsideCount / 9)],
    ["Abnormal return magnitude", Math.min(1, Math.abs(result.eventStudy.cumulativeAbnormalReturn) / 0.16)],
    ["Drawdown pressure", Math.min(1, Math.abs(result.diagnostics.maxDrawdown) / 0.22)],
    ["Volatility regime change", Math.min(1, Math.max(0, result.diagnostics.volatilityRatio - 1) / 1.3)],
    ["Downside hit rate", Math.min(1, result.diagnostics.downsideHitRate / 0.6)]
  ];
  elements.riskBars.innerHTML = riskRows
    .map(
      ([label, value]) => `
        <div class="risk-row">
          <header><span>${escapeHtml(String(label))}</span><span>${Math.round(Number(value) * 100)}%</span></header>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round(Number(value) * 100)}%"></div></div>
        </div>`
    )
    .join("");

  elements.evidence.innerHTML = result.language.evidence.length
    ? result.language.evidence
        .map(
          (item) => `
            <div class="evidence-item">
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.sentence)}</p>
            </div>`
        )
        .join("")
    : "<p>No strong evidence detected. Add a richer event description and rerun the analysis.</p>";

  const report = createMarkdownReport(result);
  lastReport = report;
  elements.report.innerHTML = `
    <h4>Executive View</h4>
    <p>${escapeHtml(result.recommendation)}</p>
    <h4>Diagnostics</h4>
    <ul>
      <li>Market-model CAR: <strong>${formatPercent(result.eventStudy.cumulativeAbnormalReturn)}</strong></li>
      <li>Day-0 abnormal return: <strong>${formatPercent(result.eventStudy.abnormalReturnDay0)}</strong></li>
      <li>Daily 95% VaR: <strong>${formatPercent(result.diagnostics.dailyVaR95)}</strong></li>
      <li>Expected shortfall: <strong>${formatPercent(result.diagnostics.expectedShortfall95)}</strong></li>
    </ul>
    <h4>Monitoring Questions</h4>
    <ul>${result.monitoringQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
  `;

  drawChart(activePrices, activeBenchmark);
}

async function loadTextFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  elements.source.value = await file.text();
  elements.inputStatus.textContent = "Text file loaded. Run analysis to refresh the memo.";
}

async function loadPriceFile(event: Event, kind: "asset" | "benchmark") {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const parsed = parsePriceCsv(await file.text());
  if (parsed.length < 8) {
    elements.inputStatus.textContent = "CSV rejected: provide at least 8 valid rows using date,close format.";
    return;
  }
  if (kind === "asset") activePrices = parsed;
  else activeBenchmark = parsed;
  elements.inputStatus.textContent = `${kind === "asset" ? "Asset" : "Benchmark"} prices loaded. Run analysis to refresh.`;
}

function exportMarkdown() {
  if (!lastReport) analyze();
  const blob = new Blob([lastReport], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "finsight-risk-memo.md";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function drawChart(assetPrices: PricePoint[], benchmarkPrices: PricePoint[]) {
  const canvas = elements.canvas;
  const context = canvas.getContext("2d");
  if (!context || assetPrices.length < 2) return;

  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.round(rect.width * ratio));
  canvas.height = Math.max(180, Math.round(rect.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 24, right: 28, bottom: 34, left: 46 };
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fbfdfc";
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height, padding);

  const normalizedAsset = normalizeSeries(assetPrices);
  const normalizedBenchmark = normalizeSeries(benchmarkPrices);
  const allValues = [...normalizedAsset, ...normalizedBenchmark].map((point) => point.value);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;

  drawSeries(context, normalizedBenchmark, min, span, padding, width, height, "#87928f", 2);
  drawSeries(context, normalizedAsset, min, span, padding, width, height, "#0f766e", 3);
  drawEventLine(context, normalizedAsset, min, span, padding, width, height);

  context.fillStyle = "#68736f";
  context.font = "12px Inter, sans-serif";
  context.fillText(`${max.toFixed(1)} indexed`, 8, padding.top + 4);
  context.fillText(min.toFixed(1), 8, height - padding.bottom);
  context.fillText(assetPrices[0].date, padding.left, height - 10);
  context.fillText(assetPrices[assetPrices.length - 1].date, Math.max(padding.left, width - 112), height - 10);
  drawLegend(context, width);
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number }
) {
  context.strokeStyle = "#d8dfdd";
  context.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / 4) * index;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }
}

function drawSeries(
  context: CanvasRenderingContext2D,
  points: Array<{ date: string; value: number }>,
  min: number,
  span: number,
  padding: { top: number; right: number; bottom: number; left: number },
  width: number,
  height: number,
  color: string,
  lineWidth: number
) {
  if (!points.length) return;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  points.forEach((point, index) => {
    const x = padding.left + (chartWidth * index) / Math.max(1, points.length - 1);
    const y = padding.top + chartHeight - ((point.value - min) / span) * chartHeight;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function drawEventLine(
  context: CanvasRenderingContext2D,
  points: Array<{ date: string; value: number }>,
  min: number,
  span: number,
  padding: { top: number; right: number; bottom: number; left: number },
  width: number,
  height: number
) {
  const eventIndex = points.findIndex((point) => point.date >= elements.eventDate.value);
  if (eventIndex < 0) return;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const point = points[eventIndex];
  const x = padding.left + (chartWidth * eventIndex) / Math.max(1, points.length - 1);
  const y = padding.top + chartHeight - ((point.value - min) / span) * chartHeight;

  context.strokeStyle = "#d85c4a";
  context.lineWidth = 2;
  context.setLineDash([6, 5]);
  context.beginPath();
  context.moveTo(x, padding.top);
  context.lineTo(x, height - padding.bottom);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#d85c4a";
  context.beginPath();
  context.arc(x, y, 5, 0, Math.PI * 2);
  context.fill();
}

function drawLegend(context: CanvasRenderingContext2D, width: number) {
  context.font = "12px Inter, sans-serif";
  context.fillStyle = "#0f766e";
  context.fillRect(width - 172, 18, 18, 3);
  context.fillText("Asset", width - 146, 23);
  context.fillStyle = "#87928f";
  context.fillRect(width - 88, 18, 18, 3);
  context.fillText("Benchmark", width - 62, 23);
}

function normalizeSeries(prices: PricePoint[]): Array<{ date: string; value: number }> {
  if (!prices.length) return [];
  const base = prices[0].close;
  return prices.map((point) => ({ date: point.date, value: (point.close / base) * 100 }));
}

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
