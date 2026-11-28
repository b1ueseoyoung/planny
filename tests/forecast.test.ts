import assert from 'node:assert/strict';
import test from 'node:test';
import { computeMonthForecast, dailySpend } from '../src/lib/forecast';
import { weekSummary } from '../src/lib/home-summary';
import type { AppData, CalendarEvent, Transaction } from '../src/lib/types';

const today = '2026-11-28';
function event(id: string, date = today): CalendarEvent {
  return { id, title: id, startDate: date, endDate: date, eventType: 'friends',
    location: null, source: 'mock', prediction: {title:id, startDate:date, endDate:date,
      eventType:'friends', location:null, items:[{category:'meal',label:'식사',amount:120000}], reasons:[],savingTips:[]} };
}
function transaction(id: string, amount: number, eventId?: string): Transaction {
  return {id,date:today,amount,category:'meal',merchant:'식사',eventId};
}
function data(events: CalendarEvent[], transactions: Transaction[] = []): AppData {
  return {userName:'나',budget:1000000,events,transactions};
}

test('오늘 미결제 일정이 일별·주간·월말 예측에 모두 포함된다', () => {
  const d = data([event('pending')]);
  const day = dailySpend(d,today,today,today)[0];
  assert.equal(day.amount,120000);
  assert.equal(day.actualAmount,0);
  assert.equal(day.kind,'predicted');
  assert.equal(weekSummary(d,today).total,120000);
  assert.equal(computeMonthForecast(d,'2026-11',today).eventsProjected,120000);
});

test('실지출이 연결된 오늘 일정은 예측과 중복 계산하지 않는다', () => {
  const d=data([event('paid')],[transaction('bill',90000,'paid')]);
  const day=dailySpend(d,today,today,today)[0];
  assert.equal(day.amount,90000);
  assert.equal(day.actualAmount,90000);
  assert.equal(day.kind,'actual');
  assert.equal(computeMonthForecast(d,'2026-11',today).eventsProjected,0);
});

test('오늘 실지출과 아직 남은 일정은 합치되 실제 금액을 구분한다', () => {
  const d=data([event('paid'),event('pending')],[transaction('bill',90000,'paid'),transaction('lunch',10000)]);
  const day=dailySpend(d,today,today,today)[0];
  assert.equal(day.amount,220000);
  assert.equal(day.actualAmount,100000);
  assert.equal(day.kind,'predicted');
  const f=computeMonthForecast(d,'2026-11',today);
  assert.equal(day.amount,f.spent+f.eventsProjected);
});

test('지난 일정의 미사용 예측을 오늘 금액에 다시 더하지 않는다', () => {
  assert.equal(dailySpend(data([event('past','2026-11-27')]),today,today,today)[0].amount,0);
});

test('여러 날 일정 비용은 시작일에 한 번만 포함한다', () => {
  const e=event('trip'); e.endDate='2026-11-30';
  const days=dailySpend(data([e]),today,'2026-11-30',today);
  assert.deepEqual(days.map(d=>d.amount),[120000,0,0]);
});

test('아직 남은 오늘 일정 여러 개를 빠짐없이 더한다', () => {
  assert.equal(dailySpend(data([event('one'),event('two')]),today,today,today)[0].amount,240000);
});

test('그래프 실선은 오늘 실지출까지만 그린다', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { ForecastTiles } = await import('../src/components/home/ForecastTiles');
  const render = (d: AppData) => renderToStaticMarkup(createElement(ForecastTiles, {
    data: d, today, forecast: computeMonthForecast(d,'2026-11',today),
  }));
  const before = render(data([]));
  const after = render(data([event('pending')]));
  // actual area path is first: pending event must never be painted as money already spent.
  assert.equal(after.match(/<path d="([^"]+)"/)?.[1],before.match(/<path d="([^"]+)"/)?.[1]);
  assert.match(after,/누적 지출 12만원 예상/);
  assert.match(after,/stroke-dasharray="5 5"/);
});
