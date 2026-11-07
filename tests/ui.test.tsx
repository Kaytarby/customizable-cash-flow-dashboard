import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScenarioTabs } from '../src/components/ScenarioTabs';
import { DEFAULTS } from '../src/lib/settings';
import { PivotTable } from '../src/components/PivotTable';
import { buildModel } from '../src/lib/model';
import { Drilldown } from '../src/components/Drilldown';
test('percentage balance cells explain unavailable values instead of showing money as percentages',()=>{
  const st={...DEFAULTS,mode:'pct' as const};
  const model=buildModel(st,'');
  const html=renderToStaticMarkup(<Drilldown model={model} st={st} row={model.rows[0]} column={0} onClose={()=>{}}/>);
  assert.ok(html.includes('Остатки не рассчитываются в процентах'));
  assert.ok(!html.includes('Начальный остаток на 01.01.2024'));
});
test('main-area scenario tabs expose all five sheets',()=>{
  const html = renderToStaticMarkup(<ScenarioTabs st={DEFAULTS} set={()=>{}} />);
  for(const label of ['Факт','Бюджет','Оперплан','Ролинг-форкаст','Сравнение']) assert.ok(html.includes(label));
  assert.ok(html.includes('aria-selected="true"'));
});
test('comparison tab shows rolling vs budget label',()=>{
  const html = renderToStaticMarkup(<ScenarioTabs st={{...DEFAULTS,scenario:'compare'}} set={()=>{}} />);
  assert.ok(html.includes('Ролинг-форкаст − бюджет'));
});
test('pivot amounts provide keyboard-accessible drilldown buttons',()=>{
  const model=buildModel({...DEFAULTS,levels:['month'],grandTotal:false},'');
  const noop=()=>{};
  const html=renderToStaticMarkup(<PivotTable st={DEFAULTS} model={model} query="" handlers={{onToggleRow:noop,onHideRow:noop,onSoloRow:noop,onRestoreKids:noop,onToggleCol:noop}}/>);
  assert.ok(html.includes('Расшифровать'));
});
