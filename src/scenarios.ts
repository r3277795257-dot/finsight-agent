import type { Scenario } from "./types.js";
import { normalizePrices } from "./finance.js";

const evPrices: Array<[string, number]> = [["2026-06-18",37.2],["2026-06-19",37.8],["2026-06-22",38.1],["2026-06-23",37.7],["2026-06-24",38.5],["2026-06-25",39.1],["2026-06-26",38.8],["2026-06-29",39.6],["2026-06-30",40.4],["2026-07-01",40.1],["2026-07-02",40.7],["2026-07-03",41.3],["2026-07-06",42.0],["2026-07-07",41.5],["2026-07-08",41.9],["2026-07-09",42.6],["2026-07-10",43.1],["2026-07-13",43.5],["2026-07-14",44.2],["2026-07-15",43.6],["2026-07-16",41.2],["2026-07-17",40.7],["2026-07-20",41.1],["2026-07-21",40.2],["2026-07-22",39.4],["2026-07-23",40.1],["2026-07-24",39.7],["2026-07-27",38.9],["2026-07-28",39.3],["2026-07-29",40.0]];

const platformPrices: Array<[string, number]> = [["2026-06-22",82.1],["2026-06-23",81.4],["2026-06-24",82.8],["2026-06-25",83.5],["2026-06-26",84.2],["2026-06-29",83.9],["2026-06-30",85.1],["2026-07-01",86.0],["2026-07-02",85.6],["2026-07-03",86.3],["2026-07-06",87.5],["2026-07-07",88.0],["2026-07-08",87.4],["2026-07-09",86.8],["2026-07-10",80.9],["2026-07-13",79.4],["2026-07-14",80.2],["2026-07-15",78.9],["2026-07-16",79.6],["2026-07-17",80.1],["2026-07-20",81.2],["2026-07-21",80.8],["2026-07-22",81.5]];

const bankPrices: Array<[string, number]> = [["2026-06-18",12.4],["2026-06-19",12.5],["2026-06-22",12.6],["2026-06-23",12.55],["2026-06-24",12.7],["2026-06-25",12.78],["2026-06-26",12.74],["2026-06-29",12.81],["2026-06-30",12.86],["2026-07-01",12.92],["2026-07-02",12.88],["2026-07-03",12.96],["2026-07-06",13.02],["2026-07-07",12.98],["2026-07-08",12.51],["2026-07-09",12.38],["2026-07-10",12.43],["2026-07-13",12.31],["2026-07-14",12.28],["2026-07-15",12.35],["2026-07-16",12.42],["2026-07-17",12.39],["2026-07-20",12.46]];

const benchmarkA: Array<[string, number]> = evPrices.map(([date], index) => [date, 100 + index * 0.18 + Math.sin(index / 2.8) * 0.8]);
const benchmarkB: Array<[string, number]> = platformPrices.map(([date], index) => [date, 100 + index * 0.12 + Math.sin(index / 3) * 0.6]);
const benchmarkC: Array<[string, number]> = bankPrices.map(([date], index) => [date, 100 + index * 0.08 + Math.sin(index / 3.2) * 0.35]);

export const scenarios: Scenario[] = [
  {
    id: "ev",
    name: "EV supply-chain margin pressure",
    ticker: "EVCO",
    sector: "EV supply chain",
    eventDate: "2026-07-16",
    eventText: "BlueChip EV Components released a mid-year update after market close. Management raised full-year revenue guidance by 9% because orders from two battery clients exceeded the April plan. However, gross margin fell from 22.4% to 18.7% due to lithium price volatility, faster equipment depreciation, and aggressive pricing. Inventory days increased to 83 days, compared with 61 days one year ago. A new AI-based inspection line may reduce defect rates in the next two quarters. Several sell-side notes warned that the near-term benefit could be offset by capital expenditure pressure and customer concentration risk.",
    prices: normalizePrices(evPrices),
    benchmarkPrices: normalizePrices(benchmarkA)
  },
  {
    id: "platform",
    name: "Internet platform regulation",
    ticker: "PLAT",
    sector: "Internet platform",
    eventDate: "2026-07-10",
    eventText: "An internet platform announced that regulators required the company to adjust its ad recommendation algorithm and merchant fee rules within three months. The company will expand its compliance team and lower selected service fees. Management expects slower near-term revenue growth, while user retention and merchant satisfaction may improve. Investors are concerned about margin pressure and regulatory uncertainty, but also watch for stronger trust after platform governance improves.",
    prices: normalizePrices(platformPrices),
    benchmarkPrices: normalizePrices(benchmarkB)
  },
  {
    id: "bank",
    name: "Bank credit risk update",
    ticker: "HCBK",
    sector: "Banking",
    eventDate: "2026-07-08",
    eventText: "HuaCity Bank disclosed its second-quarter asset quality update. Net interest margin improved slightly, but the non-performing loan ratio for property-related loans rose to 2.6%. Management raised provision coverage and plans to reduce high-risk developer loan exposure. A rating agency noted that capital adequacy remains above regulatory requirements, but credit cost may continue rising. Investors should monitor provision pressure, liquidity conditions, and local financing vehicle risk.",
    prices: normalizePrices(bankPrices),
    benchmarkPrices: normalizePrices(benchmarkC)
  }
];

export function findScenario(id: string): Scenario {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0];
}
