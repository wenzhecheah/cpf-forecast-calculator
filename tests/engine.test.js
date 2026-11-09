// Run with: node --test
// Loads the app's scripts as the browser does (shared top-level names) and
// checks the calculations against CPF's published rates, rules and examples.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = vm.createContext({});
for (const f of ['cpf-data.js', 'cpf-lookups.js', 'config.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
const run = code => vm.runInContext(code, ctx);
const call = (fn, ...args) => run(fn)(...args);
const config = over => ({ ...run('CPF_CONFIG'), ...over });
// Money to the cent (CPF rounds, the app doesn't, so allow a cent or a dollar).
const near = (actual, expected, within = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= within, `expected ${expected}, got ${actual}`);

test('monthly contributions match CPF\'s 2026 rates and allocation (age 35 and below)', () => {
  // $5,000 salary: employee 20%, employer 17%; to OA 23%, SA 6%, MA 8% of salary.
  const c = call('getMonthlyContribution', 5000, 30, 2026);
  near(c.employee, 1000);
  near(c.employer, 850);
  near(c.total, 1850);
  near(c.oa, 1150, 1);
  near(c.sa, 300, 1);
  near(c.ma, 400, 1);
  near(c.oa + c.sa + c.ma, c.total);
  // Salary above the $8,000 Ordinary Wage ceiling only counts up to it.
  near(call('getMonthlyContribution', 10000, 30, 2026).total, 8000 * 0.37);
});

test('low salaries use CPF\'s lower rates', () => {
  near(call('getMonthlyContribution', 50, 30, 2026).total, 0); // $50 and below: nothing
  const c400 = call('getMonthlyContribution', 400, 30, 2026); // up to $500: employer only
  near(c400.employee, 0);
  near(c400.employer, 68);
  // $500 to $750: employee pays 0.6 x (wage - $500).
  const c600 = call('getMonthlyContribution', 600, 30, 2026);
  near(c600.employee, 60);
  near(c600.employer, 102);
});

test('rates for older workers change by year, including the 2027 increase', () => {
  near(call('getMonthlyContribution', 5000, 58, 2026).total, 5000 * 0.34);  // 18% + 16%
  near(call('getMonthlyContribution', 5000, 58, 2027).total, 5000 * 0.355); // 19% + 16.5%
  near(call('getMonthlyContribution', 5000, 63, 2027).total, 5000 * 0.26);  // 13% + 13%
  near(call('getMonthlyContribution', 5000, 72, 2026).total, 5000 * 0.125); // 5% + 7.5%
});

test('the rate changes the month after the birthday', () => {
  // Turns 55 in June 2026: Jan-Jun at the 55-and-below rate (37%), Jul-Dec at 34%.
  const c = call('contributionsForYear', 55, 2026, 5000, 'full', config(), 1, 6);
  near(c.total, 6 * 1850 + 6 * 1700);
  // A December birthday: the whole year at the lower band's rate.
  near(call('contributionsForYear', 55, 2026, 5000, 'full', config(), 1, 12).total, 12 * 1850);
});

test('bonuses are capped by the $102,000 annual ceiling', () => {
  // $8,000 a month uses $96,000 of the ceiling, so only $6,000 of a $32,000 bonus counts.
  near(call('getBonusContribution', 32000, 8000, 30, 2026).total, 6000 * 0.37);
  near(call('getBonusContribution', 10000, 5000, 30, 2026).total, 10000 * 0.37);
});

test('self-employed MediSave follows CPF\'s 2026 table (below 35)', () => {
  near(call('getSelfEmployedMediSave', 6000, 30), 0);
  near(call('getSelfEmployedMediSave', 12000, 30), 480);   // 4%
  near(call('getSelfEmployedMediSave', 18000, 30), 1440);  // 8%
  near(call('getSelfEmployedMediSave', 60000, 30), 4800);
  near(call('getSelfEmployedMediSave', 200000, 30), 7680); // capped at $96,000 of income
  near(call('getSelfEmployedMediSave', 60000, 50), 6300);  // 50 and above: 10.5%
});

test('extra interest matches CPF\'s examples', () => {
  // Below 55: 1% on the first $60,000, OA counting for at most $20,000.
  const young = call('extraInterest', { oa: 15000, sa: 30000, ma: 20000, life: 0 }, call('getInterestRules', 40));
  near(young.oa, 150);
  near(young.sa, 300);
  near(young.ma, 150); // only $15,000 of MA fits in the first $60,000
  const capped = call('extraInterest', { oa: 50000, sa: 0, ma: 0, life: 0 }, call('getInterestRules', 40));
  near(capped.oa, 200); // OA counts for $20,000 only
  // 55 and above: 2% on the first $30,000, 1% on the next $30,000, RA counted first.
  const older = call('extraInterest', { oa: 5000, sa: 50000, ma: 20000, life: 0 }, call('getInterestRules', 56));
  near(older.sa, 600 + 200);
  near(older.oa, 50);
  near(older.ma, 50);
  near(older.sa + older.oa + older.ma + older.life, 900);
});

test('the BHS is fixed for life from 65', () => {
  assert.equal(call('getBHS', 1980, 2026), 79000);
  assert.equal(call('getBHS', 1960, 2030), 75500); // turned 65 in 2025
  assert.equal(call('getBHS', 1940, 2026), 49800); // already 65 when the BHS started
});

test('the RA is formed at 55 up to the FRS, SA first', () => {
  const sums = call('getRetirementSums', '1971-06-15', 2026);
  assert.deepEqual({ ...sums }, { brs: 110200, frs: 220400, ers: 440800, projected: false });

  const bal = { oa: 100000, sa: 150000, ma: 0, life: 0, lifeJoined: 0 };
  const r = call('formRA', bal, '1971-06-15', config());
  near(bal.sa, 220400);
  near(bal.oa, 100000 - 70400);
  near(r.oaToRA, 70400);
  assert.equal(r.met, 'FRS');
  near(r.withdrawable, 29600); // everything left in OA

  // Short of the FRS: everything goes in, and $5,000 can still be withdrawn.
  const short = { oa: 40000, sa: 60000, ma: 0, life: 0, lifeJoined: 0 };
  const s = call('formRA', short, '1971-06-15', config());
  near(short.sa, 100000);
  near(short.oa, 0);
  assert.equal(s.met, null);
  near(s.withdrawable, 5000);

  // Asking for the ERS without enough to reach it stays at the FRS.
  const ers = call('formRA', { oa: 100000, sa: 150000, ma: 0, life: 0, lifeJoined: 0 }, '1971-06-15', config({ raTarget: 'ers' }));
  assert.equal(ers.ersFellBack, true);
  near(ers.ra, 220400);

  // With a property pledge, savings above the BRS can be withdrawn.
  const pledged = { oa: 100000, sa: 150000, ma: 0, life: 0, lifeJoined: 0 };
  const p = call('formRA', pledged, '1971-06-15', config({ pledged: true, withdrawAboveBRS: true }));
  near(p.withdrawn, 220400 - 110200);
  near(pledged.sa, 110200);
  assert.equal(p.met, 'BRS');
});

test('MediSave above the BHS overflows to SA up to the FRS, then OA', () => {
  const bal = { oa: 0, sa: 10000, ma: 85000, life: 0, lifeJoined: 0 };
  const flow = call('overflowMA', bal, 79000, 220400, config());
  near(flow.toSA, 6000);
  near(bal.ma, 79000);
  near(bal.sa, 16000);
  near(bal.oa, 0);
  const full = { oa: 0, sa: 220400, ma: 85000, life: 0, lifeJoined: 0 };
  near(call('overflowMA', full, 79000, 220400, config()).toOA, 6000);
  near(full.oa, 6000);
  near(full.sa, 220400);
});

test('top-ups stay within CPF\'s limits, and the MRSS matches up to $2,000 a year', () => {
  const sums = call('getCurrentSums', 2026);
  const bal = { oa: 0, sa: 215000, ma: 0, life: 0, lifeJoined: 0 };
  const t = call('addTopUps', bal, 40, sums, 79000, { mrssLeft: 20000 }, config({ topUpSA: 8000 }));
  near(t.cash, 220400 - 215000); // only up to the FRS
  const state = { mrssLeft: 20000 };
  const m = call('addTopUps', { oa: 0, sa: 50000, ma: 0, life: 0, lifeJoined: 0 }, 56, sums, 79000, state,
    config({ topUpSA: 5000, mrssEligible: true }));
  near(m.grant, 2000);
  near(state.mrssLeft, 18000);
});

test('CPF LIFE payouts match CPF\'s published Standard Plan estimates', () => {
  near(call('getCpfLifePayout', 170200, 0).high, 950);
  near(call('getCpfLifePayout', 330100, 0).high, 1780);
  near(call('getCpfLifePayout', 650100, 0).high, 3440);
  // Deferring to 70 raises payouts by up to 7% a year (35%).
  near(call('getCpfLifePayout', 330100, 5).high, 1780 * 1.35);
});

test('housing payments never take OA below zero', () => {
  const bal = { oa: 1000, sa: 0, ma: 0, life: 0, lifeJoined: 0 };
  const paid = call('payHousing', bal, 12000, 2.5, config());
  assert.ok(bal.oa >= -1e-9);
  near(paid.used + paid.short, 12000);
});

test('a forecast year adds interest as CPF does', () => {
  // OA only, no salary: 2.5% on OA, and the 1% extra interest on it goes to SA.
  const rows = call('forecast', { currentAge: 30, birthYear: 1996, birthDate: '1996-03-01', targetAge: 31,
    salary: 0, oa: 10000, sa: 0, ma: 0 }, config());
  assert.equal(rows.length, 2);
  near(rows[1].oa, 10250);
  near(rows[1].sa, 100);
  near(rows[1].ma, 0);
});

test('a forecast year adds a salary\'s contributions', () => {
  const rows = call('forecast', { currentAge: 30, birthYear: 1996, birthDate: '1996-03-01', targetAge: 31,
    salary: 5000, oa: 0, sa: 0, ma: 0 }, config());
  const c = rows[0].contributions;
  near(c.total, 12 * 1850);
  near(c.employee, 12 * 1000);
  // Each month's contribution earns interest from the next month: 5.5 months on average.
  const y = call('getMonthlyContribution', 5000, 30, 2026);
  near(rows[1].oa, 12 * y.oa * (1 + 0.025 * 5.5 / 12));
  near(rows[1].ma, 12 * y.ma * (1 + 0.04 * 5.5 / 12));
  // Only the months still to come count in the first year.
  const part = call('forecast', { currentAge: 30, birthYear: 1996, birthDate: '1996-03-01', targetAge: 31,
    salary: 5000, oa: 0, sa: 0, ma: 0, firstYearMonths: 3 }, config());
  near(part[0].contributions.total, 3 * 1850);
});

test('CPF LIFE starts at the chosen age and the RA moves into it', () => {
  const rows = call('forecast', { currentAge: 64, birthYear: 1962, birthDate: '1962-03-01', targetAge: 66,
    salary: 0, oa: 0, sa: 330100 / 1.04, ma: 79000 }, config({ targetAge: 66 }));
  const at65 = rows.find(r => r.age === 65);
  assert.ok(at65.life, 'payouts start at 65');
  assert.equal(at65.life.source, 'app');
  near(at65.payout.high, call('getCpfLifePayout', at65.life.base.ra, 0).high);
  near(rows.find(r => r.age === 66).sa, 0, 1e-6); // RA used to join CPF LIFE
  // For women the estimate is 7% lower.
  const w = call('forecast', { currentAge: 64, birthYear: 1962, birthDate: '1962-03-01', targetAge: 65,
    salary: 0, oa: 0, sa: 300000, ma: 79000 }, config({ sex: 'female' }));
  const m = call('forecast', { currentAge: 64, birthYear: 1962, birthDate: '1962-03-01', targetAge: 65,
    salary: 0, oa: 0, sa: 300000, ma: 79000 }, config());
  near(w.at(-1).payout.high, m.at(-1).payout.high * 0.93);
});
