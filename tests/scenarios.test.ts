import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BY_ID, LEAVES, NET, articleValue, scenarioTotals } from '../src/lib/data';
import { DEFAULTS } from '../src/lib/settings';
import { buildModel } from '../src/lib/model';
import { isoToDay, FACT_END_DAY, PLAN_END_DAY } from '../src/lib/dates';
const a = BY_ID.get('rev_retail')!;
const value = (s: string, e: string, scenario: any) => (articleValue as any)(a, isoToDay(s), isoToDay(e), isoToDay(s), 'sum', scenario);
test('synthetic scenarios use different numbers on the same article', () => {
  assert.notEqual(value('2026-01-01','2026-01-31','fact'), value('2026-01-01','2026-01-31','budget'));
  assert.notEqual(value('2026-01-01','2026-01-31','plan'), value('2026-01-01','2026-01-31','budget'));
});
test('rolling stitches fact, plan and budget at exact boundaries', () => {
  const expected = value('2026-01-01','2026-03-15','fact') + value('2026-03-16','2026-04-30','plan') + value('2026-05-01','2026-12-31','budget');
  assert.equal(value('2026-01-01','2026-12-31','rolling'), expected);
});
test('rolling leaf columns cover every day once and never split budget months', () => {
  const m = buildModel({...DEFAULTS, scenario:'rolling', from:'2026-01-01',to:'2026-12-31', detail:'day', subtotal:'none',grandTotal:false} as any,'');
  let next = isoToDay('2026-01-01');
  for (const c of m.cols) {
    assert.equal(c.node.s,next); next = c.node.e+1;
    assert.ok(!(c.node.s <= FACT_END_DAY && c.node.e > FACT_END_DAY));
    assert.ok(!(c.node.s <= PLAN_END_DAY && c.node.e > PLAN_END_DAY));
    if(c.node.s > PLAN_END_DAY) assert.equal(c.node.level,'month');
  }
  assert.equal(next,isoToDay('2027-01-01'));
});
test('comparison exposes fact, plan, budget and explicit deviations', () => {
  const m = buildModel({...DEFAULTS,scenario:'compare',comparison:'all',from:'2026-01-01',to:'2026-03-15',levels:['month'],grandTotal:false} as any,'');
  assert.equal(m.cols.length,15);
  const ri = m.rows.findIndex(r=>r.id==='op');
  assert.equal(m.values[ri][3],m.values[ri][0]! - m.values[ri][1]!);
  assert.equal(m.values[ri][4],m.values[ri][0]! - m.values[ri][2]!);
});

test('rolling opening and closing balances stay continuous across source changes', () => {
  const open=BY_ID.get('calc_open')!, close=BY_ID.get('calc_close')!;
  for (const boundary of [FACT_END_DAY,PLAN_END_DAY]) {
    assert.equal(articleValue(close,boundary,boundary,0,'sum','rolling'),articleValue(open,boundary+1,boundary+1,0,'sum','rolling'));
  }
});
test('scenario KPI and leaf breakdown reconcile to net and balances', () => {
  const s=isoToDay('2026-01-01'),e=isoToDay('2026-12-31');
  for(const sc of ['fact','plan','budget','rolling'] as const) {
    const total=LEAVES.reduce((sum,a)=>sum+articleValue(a,s,e,s,'sum',sc)!,0);
    assert.equal(total,articleValue(NET,s,e,s,'sum',sc));
    assert.equal(total,scenarioTotals(s,e,sc).net);
    assert.equal(scenarioTotals(s,e,sc).close,articleValue(BY_ID.get('calc_close')!,s,e,s,'sum',sc));
  }
});
