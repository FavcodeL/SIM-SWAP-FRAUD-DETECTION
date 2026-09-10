// generate_dataset.js
//
// Purpose: generate a synthetic SIM-swap event dataset for the seminar/final-year
// project, since no public dataset of real SIM-swap events exists (telecom/fintech
// operators do not release this kind of identity-fraud data, for obvious privacy
// and security reasons).
//
// Methodology note (for your report): features are modeled on the fraud indicators
// described in the literature reviewed for this project -- location mismatch between
// old and new SIM registration, bypassed cooling-off periods, agent-collusion
// signals (unusually high swap volume handled by one agent), and post-swap
// transaction bursts. Legitimate and fraudulent events are generated from different
// (but deliberately overlapping/noisy) distributions, so that no single feature
// perfectly separates the two classes -- reflecting the fact that real fraud
// detection is genuinely difficult, not a trivial threshold check.
//
// The fraud rate here (5%) is intentionally elevated compared to real-world SIM-swap
// prevalence (which is far lower, well under 1%), to ensure enough positive examples
// exist to meaningfully evaluate a detection engine. This is common practice in
// synthetic fraud-research datasets, where using the true real-world rate would
// leave too few fraud cases to draw statistically meaningful conclusions from.

const fs = require("fs");
const path = require("path");

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, d = 1) { return parseFloat((Math.random() * (max - min) + min).toFixed(d)); }
function choice(arr) { return arr[randInt(0, arr.length - 1)]; }
function gaussianNoise(mean, stdDev) {
  // Box-Muller transform, used to add realistic noise around a central tendency
  // rather than sampling from a flat/uniform range, which would look artificial.
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

const CITY_CENTERS = [
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Abuja", lat: 9.0765, lng: 7.3986 },
  { name: "Kano", lat: 12.0022, lng: 8.5920 },
  { name: "Ibadan", lat: 7.3775, lng: 3.9470 },
  { name: "Port Harcourt", lat: 4.8156, lng: 7.0498 },
];

const AGENTS = Array.from({ length: 40 }, (_, i) => `AG-${1000 + i}`);
const COMPROMISED_AGENTS = AGENTS.slice(0, 5); // 5 of 40 agents are collusion-prone

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function jitterCoord(base, maxKm) {
  const deg = maxKm / 111;
  return { lat: base.lat + randFloat(-deg, deg, 4), lng: base.lng + randFloat(-deg, deg, 4) };
}

function generateEvent(id, isFraud) {
  const homeCity = choice(CITY_CENTERS);
  const accountId = `ACC-${100000 + id}`;
  const agent = choice(AGENTS);
  const usingCompromisedAgent = COMPROMISED_AGENTS.includes(agent);

  let distanceKm, deviceChanged, hoursToActivation, txnAttempts1h, txnValue1h, hourOfDay, agentRecentSwapCount;

  if (isFraud) {
    // Fraud pattern, with noise so it's not perfectly clean-cut
    distanceKm = Math.max(0, gaussianNoise(300, 180));
    deviceChanged = Math.random() < 0.8;
    hoursToActivation = Math.max(0, gaussianNoise(1, 1.2));
    txnAttempts1h = Math.max(0, Math.round(gaussianNoise(4, 2)));
    txnValue1h = Math.max(0, Math.round(gaussianNoise(300000, 200000)));
    hourOfDay = Math.random() < 0.45 ? randInt(0, 5) : randInt(0, 23);
    agentRecentSwapCount = usingCompromisedAgent ? randInt(5, 16) : Math.max(0, Math.round(gaussianNoise(3, 2)));
  } else {
    // Legitimate pattern, with its own noise (occasional traveler, occasional fast reactivation)
    distanceKm = Math.max(0, gaussianNoise(25, 30));
    deviceChanged = Math.random() < 0.3;
    hoursToActivation = Math.max(0, gaussianNoise(14, 10));
    txnAttempts1h = Math.max(0, Math.round(gaussianNoise(0.5, 1)));
    txnValue1h = Math.random() < 0.75 ? 0 : Math.max(0, Math.round(gaussianNoise(10000, 8000)));
    hourOfDay = randInt(6, 22);
    agentRecentSwapCount = Math.max(0, Math.round(gaussianNoise(1.5, 1.5)));
  }

  const newCoord = jitterCoord(homeCity, distanceKm);
  const actualDistance = haversineKm(homeCity.lat, homeCity.lng, newCoord.lat, newCoord.lng);

  return {
    event_id: id,
    account_id: accountId,
    home_city: homeCity.name,
    timestamp: new Date(Date.now() - randInt(0, 90) * 86400000).toISOString(),
    agent_id: agent,
    agent_recent_swap_count: agentRecentSwapCount,
    distance_from_home_km: parseFloat(actualDistance.toFixed(1)),
    device_changed: deviceChanged ? 1 : 0,
    hours_to_activation: parseFloat(hoursToActivation.toFixed(2)),
    txn_attempts_1h: txnAttempts1h,
    txn_value_1h_naira: txnValue1h,
    hour_of_day: hourOfDay,
    ground_truth_fraud: isFraud ? 1 : 0, // withhold this from the detection engine; evaluation-only label
  };
}

function generateDataset(count, fraudRate) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push(generateEvent(i, Math.random() < fraudRate));
  }
  return rows;
}

function toCsv(rows) {
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => row[h]).join(","));
  }
  return lines.join("\n");
}

// ---- Run ----
const COUNT = 8000;
const FRAUD_RATE = 0.05;

const dataset = generateDataset(COUNT, FRAUD_RATE);
const csv = toCsv(dataset);

const outPath = path.join(__dirname, "sim_swap_dataset.csv");
fs.writeFileSync(outPath, csv);

const fraudCount = dataset.filter((r) => r.ground_truth_fraud === 1).length;
console.log(`Generated ${dataset.length} rows -> ${outPath}`);
console.log(`Fraud cases: ${fraudCount} (${((fraudCount / dataset.length) * 100).toFixed(1)}%)`);
console.log(`Legitimate cases: ${dataset.length - fraudCount}`);
