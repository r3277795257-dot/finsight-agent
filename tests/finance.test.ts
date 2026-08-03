import assert from "node:assert/strict";
import { computeReturns, maxDrawdown, parsePriceCsv, runEventStudy } from "../src/finance.js";
import { scenarios } from "../src/scenarios.js";

const parsed = parsePriceCsv("date,close\n2026-01-01,10\n2026-01-02,11\n");

assert.deepEqual(parsed, [
  { date: "2026-01-01", close: 10 },
  { date: "2026-01-02", close: 11 }
]);

const prices = [
  { date: "2026-01-01", close: 100 },
  { date: "2026-01-02", close: 110 },
  { date: "2026-01-03", close: 99 }
];

assert.equal(round(computeReturns(prices)[0].value), 0.1);
assert.equal(round(maxDrawdown(prices)), -0.1);

const scenario = scenarios[0];
const result = runEventStudy(scenario.prices, scenario.benchmarkPrices, {
  eventDate: scenario.eventDate,
  preEventDays: 5,
  postEventDays: 5,
  estimationDays: 20
});

assert.equal(result.windowStartDate, "2026-07-09");
assert.equal(result.windowEndDate, "2026-07-23");
assert.equal(result.cumulativeAbnormalReturn < 0, true);
assert.equal(Number.isFinite(result.beta), true);

console.log("finance tests passed");

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
