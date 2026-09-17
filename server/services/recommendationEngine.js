/**
 * Deterministic equipment recommendation engine (rule-based fallback).
 *
 * Used when the Gemini API is not configured so the recommendation feature
 * still works offline / in demo mode — without inventing anything.
 *
 * It scores the REAL available inventory with explainable keyword and budget
 * rules only. It never fabricates equipment; it only re-ranks what exists.
 * The output mirrors the Gemini-contract shape
 * ({ summary, recommendations: [ { equipment, matchScore, reasoning } ] })
 * so the controller and frontend treat both modes identically.
 */

const CATEGORY_TERMS = {
  'Tractors': ['tractor', 'plough', 'plow', 'till', 'pull', 'haulage'],
  'Harvesters': ['harvest', 'reap', 'reaping', 'combine', 'thresher', 'cutter'],
  'Tillage & Tilling': ['till', 'tilling', 'cultivat', 'rotavator', 'harrow', 'disc', 'furrow'],
  'Seeding & Planting': ['seed', 'sow', 'sowing', 'plant', 'planting', 'transplant', 'drill', 'spray'],
  'Irrigation': ['irrigat', 'water', 'pump', 'sprinkler', 'drip', 'flood'],
  'Haulage': ['haul', 'transport', 'trailer', 'cart', 'cargo', 'deliver', 'carry'],
  'Other': [],
};

// Words that carry no matching signal.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'for', 'and', 'or', 'to', 'of', 'with', 'my', 'i', 'need',
  'want', 'have', 'has', 'is', 'are', 'on', 'in', 'at', 'by', 'from', 'use',
  'using', 'used', 'get', 'gimme', 'please', 'can', 'could', 'would', 'help',
  'me', 'rent', 'rental', 'renting', 'book', 'booked', 'booking', 'day', 'days',
  'acres', 'acre', 'land', 'field', 'fields', 'farm', 'farming', 'farmer',
  'work', 'working', 'do', 'doing', 'some', 'any', 'good', 'better', 'best',
]);

/**
 * Split a prompt into meaningful lowercase tokens.
 */
function tokenize(prompt) {
  return String(prompt)
    .toLowerCase()
    .split(/[^a-z0-9₹]+/)
    .filter((t) => t.replace(/₹/g, '').length >= 3)
    .filter((t) => !STOPWORDS.has(t));
}

/**
 * Extract a maximum daily budget from a prompt, e.g. "₹5000", "Rs 3000",
 * "under 2 thousand". Returns null when there is no clear budget.
 */
function extractBudget(prompt) {
  const text = String(prompt).toLowerCase();
  const amounts = [];

  const rupeeMatches = (text.match(/(?:₹|rs\.?|rupees)\s*([\d][\d,]*(?:\.\d+)?)/g) || []);
  for (const m of rupeeMatches) {
    const cleaned = m.replace(/[₹rs\.]/g, '').replace(/,/g, '');
    const value = parseFloat(cleaned);
    if (!isNaN(value) && value > 0) amounts.push(value);
  }

  const scaledMatches = (text.match(/([\d][\d,]*)\s*(thousand|[km]\b)/g) || []);
  for (const m of scaledMatches) {
    const cleaned = m.replace(/,/g, '').replace(/\D/g, '');
    let value = parseFloat(cleaned);
    if (isNaN(value)) continue;
    if (/thousand|[km]\b/.test(m)) value *= 1000;
    if (value > 0) amounts.push(value);
  }

  return amounts.length ? Math.max(...amounts) : null;
}

function clampScore(n) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Keyword match helper that works on substrings both ways
 * (e.g. "tilling" matches "till", "tiller" matches "till").
 */
function matches(token, word) {
  if (!word || !token) return false;
  return token.includes(word) || word.includes(token);
}

/**
 * Score one equipment document against the prompt tokens.
 *
 * @returns {{ score: number, reasons: string[], skippedBudget: boolean }}
 */
function scoreEquipment(item, tokens, budget) {
  const name = String(item.name || '').toLowerCase();
  const description = String(item.description || '').toLowerCase();
  const category = String(item.category || '');
  const nameTokens = name.split(/[^a-z]+/);
  const descTokens = description.split(/[^a-z]+/);

  const reasons = [];
  let score = 40; // a real, available machine always starts above zero

  // Category keyword match (+25)
  const categoryWords = CATEGORY_TERMS[category] || [];
  let categoryHit = null;
  outerCategory: for (const token of tokens) {
    for (const word of categoryWords) {
      if (matches(token, word)) {
        categoryHit = word;
        break outerCategory;
      }
    }
  }
  if (categoryHit) {
    score += 25;
    reasons.push(`Category match for "${categoryHit}" (${category}).`);
  }

  // Name match (+15)
  let nameMatched = false;
  for (const token of tokens) {
    if (nameTokens.some((w) => matches(token, w))) {
      score += 15;
      nameMatched = true;
      reasons.push(`Name match ("${item.name}").`);
      break;
    }
  }

  // Description match (+10)
  let descMatched = false;
  for (const token of tokens) {
    if (descTokens.some((w) => matches(token, w))) {
      score += 10;
      descMatched = true;
      reasons.push(`Description match for "${token}".`);
      break;
    }
  }

  // A candidate only improves from keyword evidence; the budget bonus is a
  // tie-breaker on real matches, never a way for irrelevant units to qualify.
  const hasKeywordMatch = !!categoryHit || nameMatched || descMatched;

  // Budget: a detected budget is a hard constraint (mirrors the Gemini
  // instruction "never exceed the budget knowingly").
  if (budget != null) {
    const rate = Number(item.dailyRate);
    if (rate != null && !isNaN(rate) && rate > budget) {
      return { score: 0, reasons: [], skippedBudget: true };
    }
    if (hasKeywordMatch && rate != null && !isNaN(rate)) {
      score += 10;
      reasons.push(`Daily rate ₹${rate} is within your budget.`);
    }
  }

  return { score: clampScore(score), reasons, skippedBudget: false };
}

/**
 * Deterministic recommendation based on the real available inventory.
 *
 * @param {string} prompt          Cleaned farmer requirement.
 * @param {Array}  availableEquipment Available equipment docs (lean, plain JS).
 * @returns {{ summary: string, recommendations: Array, detectedBudget: number|null }}
 */
function ruleBasedRecommend(prompt, availableEquipment) {
  const tokens = tokenize(prompt);
  const budget = extractBudget(prompt);

  const scored = [];
  for (const item of availableEquipment) {
    const result = scoreEquipment(item, tokens, budget);
    if (result.skippedBudget) continue;
    if (result.score < 50) continue;

    const reasoning = result.reasons.length
      ? result.reasons.join(' ')
      : `Suitable ${item.category} machine available to rent.`;

    scored.push({
      equipment: item,
      matchScore: result.score,
      reasoning,
    });
  }

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return Number(a.equipment.dailyRate) - Number(b.equipment.dailyRate);
  });

  const recommendations = scored.slice(0, 3);

  let summary = 'Based on your request, here are the best matches from the currently available fleet.';
  if (recommendations.length === 0) {
    summary = 'No suitable available equipment was found for this requirement.';
    if (budget != null) {
      summary += ` No available machine fits a daily budget up to ₹${budget}.`;
    }
  } else if (budget != null) {
    summary += ` Matches are limited to machines within your detected daily budget of ₹${budget}.`;
  }

  return { summary, recommendations, detectedBudget: budget };
}

module.exports = {
  ruleBasedRecommend,
  tokenize,
  extractBudget,
  scoreEquipment,
};