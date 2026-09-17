const { test } = require('node:test');
const assert = require('node:assert');
const { computeRisk } = require('../utils/maintenanceRisk');

const DAY = 1000 * 60 * 60 * 24;

const baseEquipment = {
  usageHours: 0,
  maintenanceIntervalDays: 90,
  lastMaintenanceDate: null,
  nextMaintenanceDue: null,
  maintenanceHistory: [],
  status: 'Available',
};

test('maintenanceRisk: healthy equipment scores 0 and is Low', () => {
  const equipment = {
    ...baseEquipment,
    usageHours: 50,
    lastMaintenanceDate: new Date(Date.now() - 30 * DAY),
    nextMaintenanceDue: new Date(Date.now() + 60 * DAY),
    maintenanceHistory: [{ date: new Date(Date.now() - 30 * DAY) }],
  };
  const risk = computeRisk(equipment);
  assert.strictEqual(risk.riskLevel, 'Low');
  assert.strictEqual(risk.score, 0);
  assert.deepStrictEqual(risk.factors.usage.points, 0);
  assert.strictEqual(risk.insufficientData, false);
});

test('maintenanceRisk: no logged data flags insufficientData honestly', () => {
  const risk = computeRisk({ ...baseEquipment });
  assert.strictEqual(risk.score, 25); // 5 usage + 20 no-last-maintenance
  assert.strictEqual(risk.riskLevel, 'Low');
  assert.strictEqual(risk.insufficientData, true);
});

test('maintenanceRisk: heavy overdue usage is High with explained factors', () => {
  const equipment = {
    ...baseEquipment,
    usageHours: 900, // ratio 2.5 vs effective 360h interval
    lastMaintenanceDate: new Date(Date.now() - 200 * DAY),
    nextMaintenanceDue: new Date(Date.now() - 10 * DAY),
    maintenanceHistory: [{ date: new Date(Date.now() - 200 * DAY) }],
  };
  const risk = computeRisk(equipment);
  assert.strictEqual(risk.riskLevel, 'High');
  assert.strictEqual(risk.score, 90); // 40 usage + 35 time + 15 due
  assert.strictEqual(risk.factors.usage.points, 40);
  assert.strictEqual(risk.factors.timeSinceService.points, 35);
  assert.strictEqual(risk.factors.dueDate.points, 15);
  assert.ok(risk.explanation.length >= 3);
  assert.ok(typeof risk.recommendation === 'string' && risk.recommendation.length > 0);
  assert.ok(typeof risk.suggestedAction === 'string' && risk.suggestedAction.length > 0);
});

test('maintenanceRisk: under-maintenance status adds status points', () => {
  const equipment = { ...baseEquipment, status: 'Maintenance' };
  const risk = computeRisk(equipment);
  assert.strictEqual(risk.factors.status.points, 10);
  assert.strictEqual(risk.score, 35); // 5 usage + 20 time + 10 status
  assert.strictEqual(risk.riskLevel, 'Medium');
});

test('maintenanceRisk: imminently due maintenance adds due points', () => {
  const equipment = {
    ...baseEquipment,
    usageHours: 0,
    nextMaintenanceDue: new Date(Date.now() + 2 * DAY),
    lastMaintenanceDate: new Date(Date.now() - 1 * DAY),
    maintenanceHistory: [{ date: new Date(Date.now() - 1 * DAY) }],
  };
  const risk = computeRisk(equipment);
  assert.strictEqual(risk.factors.dueDate.points, 10);
  assert.strictEqual(risk.riskLevel, 'Low');
});

test('maintenanceRisk: score is clamped to 0-100', () => {
  const equipment = {
    ...baseEquipment,
    usageHours: 99999,
    lastMaintenanceDate: new Date(Date.now() - 999 * DAY),
    nextMaintenanceDue: new Date(Date.now() - 999 * DAY),
    maintenanceHistory: [{ date: new Date(Date.now() - 999 * DAY) }],
  };
  const risk = computeRisk(equipment);
  assert.ok(risk.score >= 0 && risk.score <= 100);
});