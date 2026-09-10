const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { scoreEvent } = require("./engine");

// Read and parse the CSV, same as before
const fileContent = fs.readFileSync("sim_swap_dataset.csv", "utf8");
const records = parse(fileContent, {
  columns: true,
  cast: true,
});

// Run every row through the engine
const results = records.map(scoreEvent);

// Save the results to a new JSON file
fs.writeFileSync("results.json", JSON.stringify(results, null, 2));

console.log("Scored", results.length, "events.");
console.log("Sample result:", results[0]);

// Quick breakdown of how many fell into each risk level
const counts = { High: 0, Medium: 0, Low: 0 };
for (const r of results) counts[r.risk_level]++;
console.log("Risk level breakdown:", counts);