import type { Evidence, EventCategory, LanguageAnalysis, Sentiment } from "./types.js";
import { clamp } from "./finance.js";

type TermGroup = {
  terms: string[];
  weight: number;
};

const lexicon: Record<string, TermGroup> = {
  upside: {
    weight: 1,
    terms: [
      "raised",
      "growth",
      "exceeded",
      "recover",
      "reduce",
      "improve",
      "guidance",
      "orders",
      "benefit",
      "automation",
      "retention",
      "satisfaction",
      "capital adequacy",
      "coverage"
    ]
  },
  downside: {
    weight: 1.25,
    terms: [
      "fell",
      "risk",
      "volatility",
      "pressure",
      "concentration",
      "inventory",
      "depreciation",
      "warned",
      "decline",
      "regulatory",
      "uncertainty",
      "non-performing",
      "credit cost",
      "provision",
      "liquidity",
      "margin",
      "fee",
      "capital expenditure"
    ]
  }
};

const categoryTerms: Record<EventCategory, string[]> = {
  Earnings: ["revenue", "margin", "profit", "guidance", "cash flow", "earnings"],
  "Supply Chain": ["inventory", "delivery", "client", "customer", "lithium", "orders", "supplier"],
  "AI Productivity": ["ai", "inspection", "automation", "defect", "model", "algorithm", "productivity"],
  "Capital Allocation": ["capex", "capital expenditure", "depreciation", "buyback", "dividend"],
  Regulation: ["policy", "regulation", "license", "compliance", "regulator", "antitrust"],
  "Credit Risk": ["credit", "loan", "liquidity", "provision", "capital adequacy", "npl", "non-performing"],
  Liquidity: ["liquidity", "refinancing", "cash", "working capital", "short-term debt"],
  "Mixed Market Event": []
};

const monitoringLibrary: Record<EventCategory, string[]> = {
  Earnings: ["Which line items drove the surprise: price, volume, mix, or cost?", "Is management guidance supported by order backlog or only narrative language?"],
  "Supply Chain": ["Are inventory days rising because of demand weakness or strategic buffer stock?", "How concentrated are the customers or suppliers behind the event?"],
  "AI Productivity": ["Is the AI workflow already in production, or still a pilot?", "Which productivity metric can be verified over the next two reporting periods?"],
  "Capital Allocation": ["Does the capex plan depress free cash flow before benefits arrive?", "Is depreciation pressure temporary or structural?"],
  Regulation: ["What is the compliance deadline and likely fine/remediation cost?", "Can rule changes alter unit economics or customer retention?"],
  "Credit Risk": ["Are provisions catching up with risk, or still lagging early delinquencies?", "Which credit segment is most exposed under a downside scenario?"],
  Liquidity: ["What maturities or working-capital needs arrive first?", "Is refinancing risk market-wide or issuer-specific?"],
  "Mixed Market Event": ["Which evidence would most change the current risk view?", "What market data confirms or rejects the source narrative?"]
};

export function analyzeText(text: string): LanguageAnalysis {
  const normalized = text.replace(/\s+/g, " ").trim();
  const upsideMatches = matchTerms(normalized, lexicon.upside.terms);
  const downsideMatches = matchTerms(normalized, lexicon.downside.terms);
  const upsideCount = upsideMatches.length;
  const downsideCount = downsideMatches.length;
  const net = upsideCount * lexicon.upside.weight - downsideCount * lexicon.downside.weight;
  const eventType = classifyEvent(normalized);
  const sentiment: Sentiment = net >= 2 ? "Constructive" : net <= -2 ? "Cautious" : "Mixed";
  const evidence = extractEvidence(normalized);
  const financialClaims = extractFinancialClaims(normalized);

  return {
    sentiment,
    eventType,
    upsideCount,
    downsideCount,
    confidence: clamp((evidence.length + financialClaims.length + upsideCount + downsideCount) / 20, 0.35, 0.94),
    riskDrivers: unique([...downsideMatches, ...categoryTerms[eventType]].slice(0, 8)),
    catalysts: unique(upsideMatches.slice(0, 7)),
    financialClaims,
    evidence
  };
}

export function classifyEvent(text: string): EventCategory {
  const scores = (Object.entries(categoryTerms) as Array<[EventCategory, string[]]>)
    .filter(([category]) => category !== "Mixed Market Event")
    .map(([category, terms]) => ({ category, score: matchTerms(text, terms).length }))
    .sort((a, b) => b.score - a.score);

  return scores[0]?.score ? scores[0].category : "Mixed Market Event";
}

export function extractEvidence(text: string): Evidence[] {
  const allTerms = unique([...lexicon.upside.terms, ...lexicon.downside.terms, ...Object.values(categoryTerms).flat()]);
  return splitSentences(text)
    .map((sentence) => {
      const matchedTerms = matchTerms(sentence, allTerms);
      return {
        label: "",
        sentence,
        score: matchedTerms.length + extractFinancialClaims(sentence).length * 1.5,
        matchedTerms
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item, index) => ({ ...item, label: `Evidence ${index + 1}` }));
}

export function extractFinancialClaims(text: string): string[] {
  const patterns = [
    /\b(?:revenue|sales|gross margin|margin|inventory days|npl ratio|non-performing loan ratio|provision coverage|capex|capital expenditure|guidance)\b[^.?!]*?\b\d+(?:\.\d+)?%?/gi,
    /\b\d+(?:\.\d+)?%\b[^.?!]*?\b(?:growth|decline|margin|ratio|coverage|guidance|pressure)\b/gi,
    /\b(?:rose|fell|increased|decreased|improved|lowered|raised)\b[^.?!]*?\b\d+(?:\.\d+)?%?/gi
  ];
  return unique(patterns.flatMap((pattern) => Array.from(text.matchAll(pattern)).map((match) => cleanClaim(match[0])))).slice(0, 8);
}

export function monitoringQuestionsFor(category: EventCategory): string[] {
  return monitoringLibrary[category] ?? monitoringLibrary["Mixed Market Event"];
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function matchTerms(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
  });
}

function cleanClaim(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^[,;:\s]+|[,;:\s]+$/g, "");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
