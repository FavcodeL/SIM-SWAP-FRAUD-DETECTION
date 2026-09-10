const fs = require("fs");
const { parse } = require("csv-parse/sync");

// Load the original CSV, to get the real answers (ground_truth_fraud)
const csvContent = fs.readFileSync("sim_swap_dataset.csv", "utf8");
const originalRows = parse(csvContent, { columns: true, cast: true });

// Load our engine's predictions from the previous step
const results = JSON.parse(fs.readFileSync("results.json", "utf8"));

// Build a quick lookup: event_id -> ground_truth_fraud
const truthMap = {};
for (const row of originalRows) {
  truthMap[row.event_id] = row.ground_truth_fraud;
}

let TP = 0, FP = 0, TN = 0, FN = 0;

for (const result of results) {
  const actualFraud = truthMap[result.event_id] === 1;
  const flaggedFraud = result.risk_level === "High" || result.risk_level === "Medium";

  if (flaggedFraud && actualFraud) TP++;
  else if (flaggedFraud && !actualFraud) FP++;
  else if (!flaggedFraud && actualFraud) FN++;
  else TN++;
}

const precision = TP / (TP + FP);
const recall = TP / (TP + FN);
const f1 = 2 * (precision * recall) / (precision + recall);
const accuracy = (TP + TN) / (TP + FP + TN + FN);
fs.writeFileSync("metrics.json", JSON.stringify({
  TP, FP, TN, FN,
  precision, recall, f1, accuracy
}, null, 2));

console.log("Confusion matrix:");
console.log({ TP, FP, TN, FN });
console.log("");
console.log("Precision:", (precision * 100).toFixed(1) + "%");
console.log("Recall:", (recall * 100).toFixed(1) + "%");
console.log("F1 score:", (f1 * 100).toFixed(1) + "%");
console.log("Accuracy:", (accuracy * 100).toFixed(1) + "%");