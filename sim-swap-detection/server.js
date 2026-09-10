const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 4000;

app.use(cors());

app.get("/api/results", (req, res) => {
  const data = fs.readFileSync("results.json", "utf8");
  res.json(JSON.parse(data));
});

app.get("/api/metrics", (req, res) => {
  const data = fs.readFileSync("metrics.json", "utf8");
  res.json(JSON.parse(data));
});

app.get("/api/download-csv", (req, res) => {
  const results = JSON.parse(fs.readFileSync("results.json", "utf8"));

  const headers = ["event_id", "account_id", "risk_score", "risk_level", "reasons"];
  const lines = [headers.join(",")];

  for (const r of results) {
    const reasonsText = r.reasons.join(" | ").replace(/,/g, ";"); // avoid breaking CSV commas
    lines.push([r.event_id, r.account_id, r.risk_score, r.risk_level, `"${reasonsText}"`].join(","));
  }

  const csv = lines.join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=sim_swap_full_results.csv");
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});