import assert from "node:assert/strict";
import { analyzeEvent } from "../src/agent.js";
import { scenarios } from "../src/scenarios.js";

const scenario = scenarios[0];
const result = analyzeEvent({
  ticker: scenario.ticker,
  sector: scenario.sector,
  eventDate: scenario.eventDate,
  eventText: scenario.eventText,
  prices: scenario.prices,
  benchmarkPrices: scenario.benchmarkPrices,
  preEventDays: 5,
  postEventDays: 5,
  estimationDays: 20
});

assert.equal(result.language.evidence.length >= 3, true);
assert.equal(result.language.eventType, "Supply Chain");
assert.equal(result.eventStudy.cumulativeAbnormalReturn < 0, true);
assert.equal(result.agentTrace.length, 5);
assert.equal(result.riskScore > 40, true);

console.log("agent workflow tests passed");
