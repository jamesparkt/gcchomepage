import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMeeting, runRound, nextStep, finish } from '../engine.js';
import { assignRoles } from '../roles.js';
import { buildPrompt } from '../prompts.js';
import { notionPage, boardHtml } from '../render.js';
import { mockAdapters } from '../adapters/mock.js';
import { mockChair } from '../adapters/mock-chair.js';
import { SAMPLE_INPUT } from '../samples/input.js';

const always = (stance) => Object.fromEntries(['chatgpt', 'gemini', 'grok', 'perplexity'].map((s) => [s, { ask: async () => ({ stance, text: `${s} 발언`, points: [] }) }]));
const chair = (stance = '동의') => ({ stance, text: '의장 발언', points: [] });

async function play(state, adapters) {
  while (nextStep(state) === 'round') await runRound(state, { adapters, chairTurn: mockChair.turn(state, state.rounds.length + 1) });
  return state;
}

test('토론형은 1라운드에서 합의가 보여도 멈추지 않는다', async () => {
  const s = createMeeting(SAMPLE_INPUT.debate);
  await runRound(s, { adapters: always('동의'), chairTurn: chair() });
  assert.equal(nextStep(s), 'round');
  await runRound(s, { adapters: always('동의'), chairTurn: chair() });
  assert.equal(nextStep(s), 'finish');
});

test('토론형은 합의가 안 되면 5라운드에서 멈춘다', async () => {
  const s = await play(createMeeting(SAMPLE_INPUT.debate), always('반대'));
  assert.equal(s.rounds.length, 5);
  await assert.rejects(runRound(s, { adapters: always('반대'), chairTurn: chair() }));
});

test('의장이 합의라고 판단하면 반대 신호가 있어도 멈출 수 있다', async () => {
  const s = createMeeting(SAMPLE_INPUT.debate);
  await runRound(s, { adapters: always('반대'), chairTurn: chair() });
  await runRound(s, { adapters: always('반대'), chairTurn: chair() });
  assert.equal(nextStep(s, { chairSaysAgreed: true }), 'finish');
});

test('일회성·투표형은 한 라운드로 끝난다', async () => {
  for (const mode of ['once', 'vote']) {
    const s = await play(createMeeting(SAMPLE_INPUT[mode]), mockAdapters());
    assert.equal(s.rounds.length, 1, mode);
  }
});

test('한 모델이 응답하지 않아도 회의는 이어진다', async () => {
  const a = always('동의');
  a.grok = { ask: async () => { throw new Error('시간 초과'); } };
  const s = createMeeting(SAMPLE_INPUT.once);
  const r = await runRound(s, { adapters: a, chairTurn: chair() });
  assert.equal(r.turns.find((t) => t.seat === 'grok').absent, true);
});

test('투표형 보고에 소수 의견이 빠지면 닫지 않는다', async () => {
  const s = await play(createMeeting(SAMPLE_INPUT.vote), mockAdapters());
  s.rounds[0].turns[0] = { ...s.rounds[0].turns[0], vote: 'A' };
  const report = mockChair.report(s);
  delete report.minority;
  assert.throws(() => finish(s, report), /소수 의견/);
});

test('토론형 보고는 끝까지 반대한 모델의 이유까지 요구한다', async () => {
  const s = await play(createMeeting(SAMPLE_INPUT.debate), mockAdapters());
  const report = mockChair.report(s);
  report.agreement.dissent = [{ seat: 'grok' }];
  assert.throws(() => finish(s, report), /이유/);
});

test('딱지는 정해진 다섯 가지만 쓴다', async () => {
  const s = await play(createMeeting(SAMPLE_INPUT.once), mockAdapters());
  const report = mockChair.report(s);
  report.feedback[0].label = '좋음';
  assert.throws(() => finish(s, report), /딱지/);
});

test('설교 성격에 따라 배역이 바뀌고, 의장이 덮어쓸 수 있다', () => {
  assert.equal(assignRoles('위로').chatgpt, 'comfortProbe');
  assert.equal(assignRoles('책망').chatgpt, 'rebukeProbe');
  assert.equal(assignRoles('위로', { grok: 'optimist' }).grok, 'optimist');
  assert.throws(() => assignRoles('일반', { grok: '없는배역' }));
});

test('퍼플렉시티는 다른 배역을 받아도 사실 검증을 함께 맡는다', () => {
  const s = createMeeting({ ...SAMPLE_INPUT.once, roleOverrides: { perplexity: 'critic' } });
  assert.match(buildPrompt(s, 'perplexity', 1), /추가 임무/);
});

test('2라운드부터는 앞선 토론이 프롬프트에 들어간다', async () => {
  const s = createMeeting(SAMPLE_INPUT.debate);
  await runRound(s, { adapters: always('반대'), chairTurn: chair() });
  assert.match(buildPrompt(s, 'grok', 2), /지금까지의 토론/);
  assert.doesNotMatch(buildPrompt(s, 'grok', 1), /지금까지의 토론/);
});

test('노션 기록은 원문을 접어 두고, 보드는 데이터를 품는다', async () => {
  const s = await play(createMeeting(SAMPLE_INPUT.debate), mockAdapters());
  finish(s, mockChair.report(s));
  const { properties, content } = notionPage(s);
  assert.equal(properties.모드, '토론형');
  assert.match(content, /<details>/);
  assert.match(content, /끝까지 반대/);
  const html = boardHtml(s);
  assert.doesNotMatch(html, /\/\*MEETING\*\/null/);
  assert.match(html, /정리/);
});

test('진행 중인 회의도 보드를 만들 수 있다 (실시간 보기)', async () => {
  const s = createMeeting(SAMPLE_INPUT.debate);
  await runRound(s, { adapters: mockAdapters(), chairTurn: mockChair.turn(s, 1) });
  const html = boardHtml(s);
  assert.match(html, /"live":true/);
  assert.doesNotMatch(html, /"final":true/);
});
