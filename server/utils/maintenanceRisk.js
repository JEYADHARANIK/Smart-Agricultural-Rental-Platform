/**
 * Predictive Maintenance Risk Scoring
 *
 * Transparent, rule-based risk scoring of equipment maintenance health.
 * Inputs: usage hours, last maintenance date, maintenance interval,
 * maintenance history, current equipment status.
 *
 * Output: Low / Medium / High risk with a human-readable explanation,
 * recommendation, and suggested action.
 *
 * The scoring logic is isolated so a trained ML model can later replace
 * `computeRisk` while keeping the same output contract.
 */

function computeRisk(equipment) {
  const now = new Date();
  const usageHours = Number(equipment.usageHours) || 0;
  const intervalDays = Number(equipment.maintenanceIntervalDays) || 90;
  const lastMaintenance = equipment.lastMaintenanceDate ? new Date(equipment.lastMaintenanceDate) : null;
  const historyCount = Array.isArray(equipment.maintenanceHistory) ? equipment.maintenanceHistory.length : 0;
  const scheduledDue = equipment.nextMaintenanceDue ? new Date(equipment.nextMaintenanceDue) : null;

  const reasons = [];
  let score = 0;

  // 1. Usage vs service interval heuristic (max 40 pts)
  const effectiveIntervalHours = Math.max(50, Math.round(intervalDays * 4)); // ~4h/day average utilization
  if (historyCount === 0 && usageHours > 0) {
    score += 30;
    reasons.push('Equipment has logged usage hours but no recorded maintenance history.');
  }
  if (usageHours > 0 && effectiveIntervalHours > 0) {
    const usageRatio = usageHours / effectiveIntervalHours;
    if (usageRatio > 1.5) {
      score += 40;
      reasons.push(`Usage (${usageHours} hrs) has exceeded roughly 1.5x the recommended service interval.`);
    } else if (usageRatio > 1.0) {
      score += 25;
      reasons.push(`Usage (${usageHours} hrs) is approaching/exceeding the recommended service interval.`);
    } else if (usageRatio > 0.7) {
      score += 12;
      reasons.push(`Usage is within a reasonable margin of the service interval (${usageHours} hrs logged).`);
    }
  } else {
    score += 5;
    reasons.push('Low or no recorded usage hours.');
  }

  // 2. Time since last maintenance (max 35 pts)
  if (lastMaintenance) {
    const daysSince = Math.floor((now - lastMaintenance) / (1000 * 60 * 60 * 24));
    if (daysSince > intervalDays * 1.5) {
      score += 35;
      reasons.push(`Last maintenance was ${daysSince} days ago (interval ${intervalDays} days).`);
    } else if (daysSince > intervalDays) {
      score += 20;
      reasons.push(`Last maintenance was ${daysSince} days ago, past the ${intervalDays}-day interval.`);
    } else if (daysSince > intervalDays * 0.8) {
      score += 10;
      reasons.push(`Next maintenance is coming up (${intervalDays - daysSince} days remaining).`);
    }
  } else if (historyCount === 0) {
    score += 20;
    reasons.push('No last maintenance date recorded for this equipment.');
  }

  // 3. Scheduled due date (max 15 pts)
  if (scheduledDue) {
    if (scheduledDue < now) {
      score += 15;
      reasons.push('The scheduled maintenance due date has passed.');
    } else {
      const daysToDue = Math.floor((scheduledDue - now) / (1000 * 60 * 60 * 24));
      if (daysToDue <= 3) {
        score += 10;
        reasons.push(`Maintenance is due imminently (${Math.max(0, daysToDue)} day(s)).`);
      }
    }
  }

  // 4. Status indicator (max 10 pts)
  if (equipment.status === 'Maintenance') {
    score += 10;
    reasons.push('Equipment is currently under maintenance.');
  }

  // Clamp 0-100
  score = Math.min(100, Math.max(0, score));

  let level = 'Low';
  if (score >= 60) level = 'High';
  else if (score >= 35) level = 'Medium';

  const recommendation = {
    Low: 'Equipment is in good health. Continue with routine maintenance.',
    Medium: 'Schedule a maintenance check in the near term to avoid downtime.',
    High: 'Equipment requires immediate attention. Inspect and service before next rental.',
  }[level];

  const suggestedAction = {
    Low: 'Continue routine usage; monitor usage hours.',
    Medium: 'Book a service appointment and review the maintenance checklist.',
    High: 'Take out of rental rotation, schedule urgent service, and update usage records.',
  }[level];

  const summary = {
    High: 'High risk — equipment usage has exceeded the recommended service interval.',
    Medium: 'Medium risk — maintenance is due soon; service recommended before peak use.',
    Low: 'Low risk — equipment is within recommended service parameters.',
  }[level];

  return {
    riskLevel: level,
    score,
    summary,
    explanation: reasons,
    recommendation,
    suggestedAction,
  };
}

module.exports = { computeRisk };