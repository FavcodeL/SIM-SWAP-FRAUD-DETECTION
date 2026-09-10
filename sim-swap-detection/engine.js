function checkLocation(event) {
  if (event.distance_from_home_km >= 200) return 30;
  if (event.distance_from_home_km >= 100) return 20;
  if (event.distance_from_home_km >= 50) return 10;
  return 0;
}
function checkCoolingOff(event) {
  if (event.hours_to_activation < 1) return 20;
  if (event.hours_to_activation < 4) return 12;
  if (event.hours_to_activation < 8) return 5;
  return 0;
}
function checkTransactionBurst(event) {
  let score = 0;
  if (event.txn_attempts_1h >= 3) score += 10;
  else if (event.txn_attempts_1h >= 1) score += 4;

  if (event.txn_value_1h_naira >= 200000) score += 10;
  else if (event.txn_value_1h_naira >= 50000) score += 5;

  return score; // max 20
}
function checkAgentCollusion(event) {
  if (event.agent_recent_swap_count >= 8) return 15;
  if (event.agent_recent_swap_count >= 5) return 8;
  return 0;
}
function checkDeviceChanged(event) {
  return event.device_changed === 1 ? 10 : 0;
}
function checkOddHour(event) {
  const hour = event.hour_of_day;
  return (hour >= 0 && hour <= 5) ? 5 : 0;
}
function scoreEvent(event) {
  const reasons = [];
  let score = 0;

  const locationPoints = checkLocation(event);
  if (locationPoints > 0) {
    score += locationPoints;
    reasons.push(`New SIM activated ${event.distance_from_home_km}km from home`);
  }

  const coolingOffPoints = checkCoolingOff(event);
  if (coolingOffPoints > 0) {
    score += coolingOffPoints;
    reasons.push(`Activated only ${event.hours_to_activation.toFixed(1)} hours after request`);
  }

  const burstPoints = checkTransactionBurst(event);
  if (burstPoints > 0) {
    score += burstPoints;
    reasons.push(`${event.txn_attempts_1h} transaction attempt(s) worth ₦${event.txn_value_1h_naira} within 1 hour`);
  }

  const agentPoints = checkAgentCollusion(event);
  if (agentPoints > 0) {
    score += agentPoints;
    reasons.push(`Agent ${event.agent_id} processed ${event.agent_recent_swap_count} recent swaps`);
  }

  const devicePoints = checkDeviceChanged(event);
  if (devicePoints > 0) {
    score += devicePoints;
    reasons.push("SIM activated on a new/unrecognized device");
  }

  const hourPoints = checkOddHour(event);
  if (hourPoints > 0) {
    score += hourPoints;
    reasons.push(`Swap occurred at an unusual hour (${event.hour_of_day}:00)`);
  }

  let level;
  if (score >= 60) level = "High";
  else if (score >= 35) level = "Medium";
  else level = "Low";

  return {
    event_id: event.event_id,
    account_id: event.account_id,
    risk_score: score,
    risk_level: level,
    reasons,
  };
}

module.exports = { scoreEvent };