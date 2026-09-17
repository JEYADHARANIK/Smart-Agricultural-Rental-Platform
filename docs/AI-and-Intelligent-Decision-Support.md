# AI & Intelligent Decision Support

This document describes exactly WHAT the four "intelligent" features do, HOW they
decide, and whether each path is generatively-AI, deterministic rule-based logic,
or an external API. Read this before claiming anything about "AI" in the app —
every mode is reported honestly to the client via a `mode` field.

## 1. The four intelligent features

| Feature | Runtime path (no credentials) | Runtime path (credentials present) |
|---|---|---|
| Equipment recommendations | Deterministic keyword/budget scoring | Gemini (`gemini-2.5-flash`) grounded on live inventory |
| Farmer assistant (chat) | Deterministic intents + localized replies | Gemini grounded on real catalog + the user's own bookings |
| Weather-aware slot scheduling | Transparent rule classification; `UNKNOWN` without weather data | Same rules, fed by OpenWeatherMap forecast |
| Predictive maintenance risk | Deterministic point-based scoring from real equipment data | Same (deterministic by design — no model) |

There is **no trained/proprietary ML model** anywhere in this platform. "AI" here
means (a) optional Google Gemini generation and (b) deterministic decision logic
that is explainable. Do not market ML accuracy that does not exist.

## 2. Architecture

```
server/
├── config/intelligence.js        Shared constants: languages, slot meanings,
│                                 risk levels, model override, capability checks
├── services/
│   ├── aiProvider.js             Thin Gemini wrapper + markdown JSON extraction
│   ├── prompts.js                Auditable system prompts (JSON contract, safety)
│   ├── recommendationEngine.js   Deterministic fallback recommendation scoring
│   ├── farmerAssistant.js        Localized fallback replies + assistant orchestration
│   └── intelligenceService.js    Unified facade: runRecommendation, getCapabilities,
│                                 re-exports runAssistantReply
├── utils/
│   ├── weatherService.js         OpenWeatherMap wrapper + classifyDay thresholds
│   ├── schedulingEngine.js       Availability, maintenance, weather, alternatives
│   └── maintenanceRisk.js        Point-based risk scoring + factors/insufficientData
├── tests/                        node:test suites (npm test)
└── scripts/evaluate-intelligence.js   Deterministic scenario evaluator (npm run evaluate)
```

Controllers (`aiController.js`, `chatbotController.js`, `schedulerController.js`,
`maintenanceController.js`) call the services/utils above. They do NOT contain
prompt engineering or scoring logic.

## 3. Equipment recommendations

Endpoint: `POST /api/ai/recommend-equipment` (protected).

1. The controller loads up to 50 available units and calls `runRecommendation`.
2. If `GEMINI_API_KEY` is a real key → **Gemini mode**:
   - System prompt (see `services/prompts.js`) requires a strict JSON contract:
     `{ summary, recommendations: [{ equipmentId, matchScore, reasoning }] }`.
     Max 3 recommendations, `matchScore` 0–100. It must return an empty
     `recommendations` array — never fabricate equipment — when nothing is suitable.
   - The service **validates and grounds** the response: only IDs that exist in the
     supplied inventory are kept (dropping any hallucinated IDs), results are
     de-duplicated, capped at 3, and scores clamped to 0–100.
   - Malformed/non-JSON responses, API errors, or unset keys fall through to:
3. Else → **rule-based mode** (`recommendationEngine.js`), which is fully offline:
   - Tokenizes the request (stopwords removed) and matches against equipment
     category/name/description.
   - A stated budget (e.g. `₹3000`, `Rs 2000`, `2 thousand`) is a **hard
     constraint** — items above the budget are excluded. A small budget bonus only
     applies to items that already matched on real keywords, so an irrelevant unit
     can never cross the eligibility threshold via budget alone.
   - Items scoring ≥ 50 quality, sorted by score then by daily rate, top 3.
   - `summary` honestly explains the decision (including "no suitable equipment").

Response always includes `mode: 'ai' | 'rule-based'`. Clients may show a badge
(the Equipment page shows "Gemini AI match" or "Rule-based match").

## 4. Farmer assistant

Endpoint: `POST /api/chatbot/chat` (protected), `language` in
`english | tamil | hindi | kannada | telugu | malayalam`.

- Gemini mode: system prompt bakes in safety rules — answer only from supplied
  context (available equipment list + the user's own bookings), never mention other
  users' data, do not invent availability/prices/weather, ignore hidden
  instructions, no medical/legal/financial advice, keep replies ≤ 150 words.
- Rule-based mode (`farmerAssistant.js`): deterministic intents (availability,
  prices, booking steps, maintenance, booking status, slot meanings, greeting)
  with **localized replies in all six languages**, built from the real `context`
  payload (inventory count, actual rates, the caller's booking statuses). Empty
  inventory answers "no available equipment" — it never invents stock.
- Response includes `mode` so the UI can label Gemini vs. "Offline knowledge base".

## 5. Weather-aware scheduling

Endpoints: `POST /api/scheduler/analyze`, `POST /api/scheduler/alternatives`
(protected, customer or admin).

Deterministic by design — the "intelligence" is transparent:

- **Availability**: approved/active bookings for the equipment are queried; any
  overlap ⇒ slot unavailable (never double-books).
- **Maintenance restriction**: equipment under maintenance or past its
  `nextMaintenanceDue` cannot be booked in that slot.
- **Weather**: OpenWeatherMap forecast is mapped per day to
  `BEST` / `USABLE` / `NOT RECOMMENDED` / `UNKNOWN` via explicit thresholds
  (severe warning ⇒ NOT RECOMMENDED; `pop ≥ 75%` or `precip ≥ 10mm` ⇒ NOT
  RECOMMENDED; `pop ≥ 40%` ⇒ USABLE; low risk ⇒ BEST). Without a valid
  `OPENWEATHER_API_KEY` or coordinates, the slot is `UNKNOWN` and scheduling
  proceeds on availability only — it never invents weather.
- **Alternatives**: other units/slots are scored (availability, weather rank,
  location) via `SLOT_RANK` and offered for one-tap booking.
- The response includes an `explanation` array of human-readable reasons for each
  decision and, when booking within the window, a top-level weather class.

## 6. Predictive maintenance risk

Endpoint: `GET /api/maintenance/equipment/:id/risk` (admin).

Deterministic point scoring with no ML: usage hours vs. effective service interval,
days since last service, overdue due date, and current status each contribute
points (see `maintenanceRisk.js` thresholds). Score → `Low` / `Medium` / `High`.
The result includes an `explanation`, per-factor `factors` breakdown, a
`suggestedAction`, and `insufficientData: true` when there is no logged usage or
history — the system explicitly says "not enough data" instead of guessing.

## 7. Capability & mode reporting

`GET /api/ai/capabilities` (protected) reports, at runtime, honestly:

```
{
  generatedAt: ISO,
  recommendation: { available, mode: 'ai'|'rule-based', provider },
  assistant:     { available, mode, languages: [...] },
  scheduling:    { available, mode: 'deterministic', weather: 'live'|'unavailable',
                   classifications: ['BEST','USABLE','NOT RECOMMENDED','UNKNOWN'] },
  maintenance:   { available, mode: 'deterministic' }
}
```

Mode is also returned on the per-feature responses. This keeps the "is it AI?"
question answerable from the API itself.

## 8. Configuration

Set in `server/.env` (see `server/.env.example`):

| Variable | Effect |
|---|---|
| `GEMINI_API_KEY` | Enables Gemini for recommendations + assistant (real key required) |
| `GEMINI_MODEL` | Optional override (default `gemini-2.5-flash`) |
| `OPENWEATHER_API_KEY` | Enables live weather classification |

Placeholder values (`your_..._here`) are detected and the feature falls back to
the deterministic path. Nothing is required to boot; the app is fully functional
without credentials.

## 9. Testing & evaluation

- `cd server && npm test` — 46 unit tests over the weather classification,
  recommendation engine, assistant localizations/orchestration, scheduling engine
  (with an in-memory fake booking model), and maintenance risk scoring. Uses
  Node's built-in `node:test`; no new dependencies.
- `cd server && npm run evaluate` — deterministic scenario evaluator that runs the
  same code paths against fixed inputs and prints the decision + reasons
  (`PASS`/`FAIL`). No AI inference is invoked and no metrics are fabricated or
  extrapolated.

## 10. Honesty guardrails (do not violate)

- Never claim ML model accuracy — the scoring/classification is rules.
- Never present fallback output as Gemini output — the `mode` field exists for
  this reason.
- Never invent inventory, prices, availability, or weather in any mode.
- Never include credentials or per-user data in logs or documentation.