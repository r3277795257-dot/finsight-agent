import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist/data", { recursive: true, force: true });
await mkdir("dist/data", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("styles.css", "dist/styles.css");
await cp("data/sample-news.txt", "dist/data/sample-news.txt");
await cp("data/sample-prices.csv", "dist/data/sample-prices.csv");
await cp("data/sample-benchmark.csv", "dist/data/sample-benchmark.csv");
