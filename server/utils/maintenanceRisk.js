/**
 * Predictive Maintenance Risk Scoring
 *
 * Transparent, rule-based risk scoring of equipment maintenance health.
 * Inputs: usage hours, last maintenance date, maintenance interval,
 * maintenance history, current equipment status.
 *
 * Output: Low / Medium / High risk with a human-readable explanation,
 * per-factor point breakdown (so the score is fully auditable),
 * a recommendation, and a suggested action.
 *
 * The scoring logic is isolated so a trained ML model can later replace
 * `computeRisk` while keeping the same output contract.
 */

/**
 * Compute a deterministic maintenance risk report for one equipment document.
 *
 * @param {Object} equipment - Equipment document/lean object.
 * @returns {{
 *   riskLevel: 'Low'|'Medium'|'High',
 *   score: number,
 *   summary: string,
 *   explanation: string[],
 *   factors: { usage, timeSinceService, dueDate, status },
 *   recommendation: string,
 *   suggestedAction: string,
 *   insufficientData: boolean,
 * }}
 */
function computeRisk(equipment) {
  const now = new Date();
  const usageHours = Number(equipment.usageHours) || 0;
  const intervalDays = Number(equipment.maintenanceIntervalDays) || 90;
  const lastMaintenance = equipment.lastMaintenanceDate ? new Date(equipment.lastMaintenanceDate) : null;
  const historyCount = Array.isArray(equipment.maintenanceHistory) ? equipment.maintenanceHistory.length : 0;
  const scheduledDue = equipment.nextMaintenanceDue ? new Date(equipment.nextMaintenanceDue) : null;

  const factors = {
    usage: { points: 0, note: 'No usage adjustment.' },
    timeSinceService: { points: 0, note: 'No time-since-service adjustment.' },
    dueDate: { points: 0, note: 'No due-date adjustment.' },
    status: { points: 0, note: 'Equipment is not flagged as under maintenance.' },
  };

  const explanation = [];

  // 1. Usage vs service interval heuristic (max 40 pts)
  const effectiveIntervalHours = Math.max(50, Math.round(intervalDays * 4)); // ~4h/day average utilization
  if (historyCount === 0 && usageHours > 0) {
    factors.usage = { points: 30, note: 'Equipment has logged usage hours but no recorded maintenance history.' };
    explanation.push(factors.usage.note);
  } else if (usageHours > 0 && effectiveIntervalHours > 0) {
    const usageRatio = usageHours / effectiveIntervalHours;
    if (usageRatio > 1.5) {
      factors.usage = {
        points: 40,
        note: `Usage (${usageHours} hrs) has exceeded roughly 1.5x the recommended service interval.`,
      };
    } else if (usageRatio > 1.0) {
      factors.usage = {
        points: 25,
        note: `Usage (${usageHours} hrs) is approaching/exceeding the recommended service interval.`,
      };
    } else if (usageRatio > 0.7) {
      factors.usage = {
        points: 12,
        note: `Usage is within a reasonable margin of the service interval (${usageHours} hrs logged).`,
      };
    }
    if (factors.usage.points > 0) explanation.push(factors.usage.note);
  } else {
    factors.usage = { points: 5, note: 'Low or no recorded usage hours.' };
    explanation.push(factors.usage.note);
  }

  // 2. Time since last maintenance (max 35 pts)
  if (lastMaintenance) {
    const daysSince = Math.floor((now - lastMaintenance) / (1000 * 60 * 60 * 24));
    if (daysSince > intervalDays * 1.5) {
      factors.timeSinceService = {
        points: 35,
        note: `Last maintenance was ${daysSince} days ago (interval ${intervalDays} days).`,
      };
    } else if (daysSince > intervalDays) {
      factors.timeSinceService = {
        points: 20,
        note: `Last maintenance was ${daysSince} days ago, past the ${intervalDays}-day interval.`,
      };
    } else if (daysSince > intervalDays * 0.8) {
      factors.timeSinceService = {
        points: 10,
        note: `Next maintenance is coming up (${intervalDays - daysSince} days remaining).`,
      };
    }
    if (factors.timeSinceService.points > 0) explanation.push(factors.timeSinceService.note);
  } else if (historyCount === 0) {
    factors.timeSinceService = { points: 20, note: 'No last maintenance date recorded for this equipment.' };
    explanation.push(factors.timeSinceService.note);
  }

  // 3. Scheduled due date (max 15 pts)
  if (scheduledDue) {
    if (scheduledDue < now) {
      factors.dueDate = { points: 15, note: 'The scheduled maintenance due date has passed.' };
      explanation.push(factors.dueDate.note);
    } else {
      const daysToDue = Math.floor((scheduledDue - now) / (1000 * 60 * 60 * 24));
      if (daysToDue <= 3) {
        factors.dueDate = {
          points: 10,
          note: `Maintenance is due imminently (${Math.max(0, daysToDue)} day(s)).`,
        };
        explanation.push(factors.dueDate.note);
      }
    }
  }

  // 4. Status indicator (max 10 pts)
  if (equipment.status === 'Maintenance') {
    factors.status = { points: 10, note: 'Equipment is currently under maintenance.' };
    explanation.push(factors.status.note);
  }

  const score = Math.min(
    100,
    Math.max(
      0,
      factors.usage.points +
        factors.timeSinceService.points +
        factors.dueDate.points +
        factors.status.points
    )
  );

  let level = 'Low';
  if (score >= 60) level = 'High';
  else if (score >= 35) level = 'Medium';

  // Honest "not enough data to assess" flag: no usage, no history, no last
  // service date, and no scheduled due date merely means we lack signals,
  // not that the equipment is healthy.
  const insufficientData =
    usageHours === 0 && historyCount === 0 && !lastMaintenance && !scheduledDue;

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
    explanation,
    factors,
    recommendation,
    suggestedAction,
    insufficientData,
  };
}

module.exports = { computeRisk };