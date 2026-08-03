export type PricePoint = {
  date: string;
  close: number;
};

export type ReturnPoint = {
  date: string;
  value: number;
};

export type MarketPoint = {
  date: string;
  assetClose: number;
  benchmarkClose: number;
};

export type EventStudyConfig = {
  eventDate: string;
  preEventDays: number;
  postEventDays: number;
  estimationDays: number;
};

export type EventStudyResult = {
  eventIndex: number;
  windowStartDate: string;
  windowEndDate: string;
  alpha: number;
  beta: number;
  residualVolatility: number;
  eventReturn: number;
  benchmarkReturn: number;
  abnormalReturnDay0: number;
  cumulativeAbnormalReturn: number;
  tStat: number;
  pValueApprox: number;
};

export type RiskDiagnostics = {
  dailyVaR95: number;
  expectedShortfall95: number;
  maxDrawdown: number;
  realizedVolatility: number;
  preEventVolatility: number;
  postEventVolatility: number;
  volatilityRatio: number;
  downsideHitRate: number;
};

export type Evidence = {
  label: string;
  sentence: string;
  score: number;
  matchedTerms: string[];
};

export type EventCategory =
  | "Earnings"
  | "Supply Chain"
  | "AI Productivity"
  | "Capital Allocation"
  | "Regulation"
  | "Credit Risk"
  | "Liquidity"
  | "Mixed Market Event";

export type Sentiment = "Constructive" | "Mixed" | "Cautious";

export type LanguageAnalysis = {
  sentiment: Sentiment;
  eventType: EventCategory;
  upsideCount: number;
  downsideCount: number;
  confidence: number;
  riskDrivers: string[];
  catalysts: string[];
  financialClaims: string[];
  evidence: Evidence[];
};

export type AgentInput = {
  ticker: string;
  sector: string;
  eventDate: string;
  eventText: string;
  prices: PricePoint[];
  benchmarkPrices: PricePoint[];
  preEventDays: number;
  postEventDays: number;
  estimationDays: number;
};

export type RiskBand = "Low" | "Moderate" | "High" | "Critical";

export type AnalysisResult = {
  ticker: string;
  sector: string;
  eventDate: string;
  language: LanguageAnalysis;
  eventStudy: EventStudyResult;
  diagnostics: RiskDiagnostics;
  riskScore: number;
  riskBand: RiskBand;
  recommendation: string;
  monitoringQuestions: string[];
  agentTrace: AgentTraceStep[];
};

export type AgentTraceStep = {
  title: string;
  status: "complete" | "warning";
  output: string;
};

export type Scenario = {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  eventDate: string;
  eventText: string;
  prices: PricePoint[];
  benchmarkPrices: PricePoint[];
};
