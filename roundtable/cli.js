#!/usr/bin/env node
// 단톡방 진행 도구. 의장(클로드)이 단계마다 불러 쓴다.
//   demo   --mode once|debate|vote            가짜 모델·가짜 의장으로 회의 전체를 돌려 samples/ 에 남긴다
//   start  --input 입력.json --state 상태.json  회의를 연다 (모드, 설교 성격, 초안, 막힌 지점, 배역 바꾸기)
//   round  --state 상태.json --chair 의장발언.json [--note "의장 메모"]  한 라운드를 돌린다
//   board  --state 상태.json                    진행 중인 회의의 보드 HTML만 다시 만든다 (실시간 보기용)
//   finish --state 상태.json --report 보고.json  보고서를 검사하고 보드 HTML·노션 원고를 만든다
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createMeeting, runRound, nextStep, finish, consensusHint } from './engine.js';
import { notionPage, boardHtml } from './render.js';
import { mockAdapters } from './adapters/mock.js';
import { mockChair } from './adapters/mock-chair.js';
import { SAMPLE_INPUT } from './samples/input.js';

const args = Object.fromEntries(
  process.argv.slice(3).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const cmd = process.argv[2];
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2)); };

// 실제 모델 연결은 마지막 단계에서 붙인다. 그 전까지는 가짜 모델만 쓴다.
function adapters() {
  if (process.env.ROUNDTABLE_LIVE) throw new Error('실제 모델 연결은 아직 만들지 않았습니다 (API 키 단계).');
  return mockAdapters();
}

function writeOutputs(state, base) {
  writeJson(`${base}.json`, state);
  writeFileSync(`${base}.board.html`, boardHtml(state));
  const page = notionPage(state);
  writeJson(`${base}.notion.json`, page);
  return page;
}

async function demo(mode) {
  const input = SAMPLE_INPUT[mode];
  const state = createMeeting({ ...input, date: '2026-10-08' });
  state.id = `rt-demo-${mode}`;
  state.test = true;
  while (nextStep(state) === 'round') {
    const n = state.rounds.length + 1;
    const round = await runRound(state, { adapters: adapters(), chairTurn: mockChair.turn(state, n) });
    if (nextStep(state) === 'round') {
      const h = consensusHint(round);
      round.chairNote = `${n}라운드에서는 ${h.against.length ? '반대가 남아 있어' : '아직 판단이 일러'} 한 라운드 더 갑니다.`;
    }
  }
  finish(state, mockChair.report(state));
  const base = join(import.meta.dirname, 'samples', mode);
  writeOutputs(state, base);
  console.log(`${mode}: ${state.rounds.length}라운드, 결과 ${state.outcome.result}${state.outcome.vote ? ` / ${state.outcome.vote}` : ''} → samples/${mode}.*`);
}

const commands = {
  async demo() {
    await demo(args.mode ?? 'debate');
  },
  async start() {
    const state = createMeeting(readJson(args.input));
    writeJson(args.state, state);
    console.log(JSON.stringify({ id: state.id, roles: state.roles, next: nextStep(state) }));
  },
  async round() {
    const state = readJson(args.state);
    const round = await runRound(state, { adapters: adapters(), chairTurn: readJson(args.chair) });
    if (args.note) round.chairNote = args.note;
    writeJson(args.state, state);
    console.log(JSON.stringify({ round: round.n, hint: state.mode === 'vote' ? undefined : consensusHint(round), turns: round.turns, next: nextStep(state) }, null, 2));
  },
  async board() {
    const state = readJson(args.state);
    const out = args.state.replace(/\.json$/, '.board.html');
    writeFileSync(out, boardHtml(state));
    console.log(out);
  },
  async finish() {
    const state = finish(readJson(args.state), readJson(args.report));
    const base = args.state.replace(/\.json$/, '');
    writeOutputs(state, base);
    console.log(JSON.stringify({ outcome: state.outcome, board: `${base}.board.html`, notion: `${base}.notion.json` }));
  },
};

if (!commands[cmd]) {
  console.error('사용법: node cli.js demo|start|round|finish ...');
  process.exit(1);
}
commands[cmd]().catch((e) => { console.error(e.message); process.exit(1); });
