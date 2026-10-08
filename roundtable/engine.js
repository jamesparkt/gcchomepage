import { SEATS, MODES, MAX_ROUNDS, FIRST_CONSENSUS_CHECK, LABELS, seatById } from './seats.js';
import { assignRoles } from './roles.js';
import { buildPrompt } from './prompts.js';

export function createMeeting({ mode, kind = '일반', roleOverrides = {}, sermon, stuck = '', question, date }) {
  if (!MODES.includes(mode)) throw new Error(`모드는 ${MODES.join('/')} 중 하나여야 합니다: ${mode}`);
  if (!sermon?.draft) throw new Error('설교 초안(sermon.draft)이 없습니다.');
  if (mode === 'vote' && !(question?.A && question?.B)) throw new Error('투표형은 question.A 와 question.B 가 필요합니다.');
  return {
    id: `rt-${(date ?? new Date().toISOString()).slice(0, 10)}-${Math.random().toString(36).slice(2, 7)}`,
    date: (date ?? new Date().toISOString()).slice(0, 10),
    mode,
    kind,
    sermon,
    stuck,
    question: mode === 'vote' ? question : undefined,
    roles: assignRoles(kind, roleOverrides),
    rounds: [],
    pastorNotes: [],
    status: 'open',
  };
}

// 목사님이 회의 도중 하신 말씀. 다음 라운드 앞에 놓이고, 그 라운드부터 모든 모델에게 그대로 전달된다.
export function addPastorNote(state, text) {
  if (state.status !== 'open') throw new Error('이미 끝난 회의입니다.');
  if (!text?.trim()) throw new Error('목사님 말씀이 비어 있습니다.');
  state.pastorNotes ??= [];
  const note = { beforeRound: state.rounds.length + 1, text: text.trim() };
  state.pastorNotes.push(note);
  return note;
}

export const notesBefore = (state, n) => (state.pastorNotes ?? []).filter((p) => p.beforeRound === n);

export const roundLimit = (state) => (state.mode === 'debate' ? MAX_ROUNDS : 1);

// 의장(클로드) 자리를 뺀 네 자리를 한꺼번에 부른다. 의장 발언은 chairTurn 으로 받는다.
export async function runRound(state, { adapters, chairTurn }) {
  if (state.status !== 'open') throw new Error('이미 끝난 회의입니다.');
  const n = state.rounds.length + 1;
  if (n > roundLimit(state)) throw new Error(`이 모드는 ${roundLimit(state)}라운드까지입니다.`);
  if (!chairTurn) throw new Error('의장 발언(chairTurn)이 필요합니다.');

  const others = SEATS.filter((s) => !s.chair);
  const settled = await Promise.allSettled(
    others.map((s) => adapters[s.id].ask({ seat: s.id, round: n, prompt: buildPrompt(state, s.id, n), state })),
  );
  const turns = [normalize(state, 'claude', chairTurn)];
  settled.forEach((r, i) => {
    const seat = others[i].id;
    turns.push(
      r.status === 'fulfilled'
        ? normalize(state, seat, r.value)
        : { seat, role: state.roles[seat], absent: true, text: `(응답 없음: ${r.reason?.message ?? r.reason})`, points: [] },
    );
  });
  state.rounds.push({ n, turns });
  return state.rounds.at(-1);
}

function normalize(state, seat, raw) {
  const t = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const base = { seat, role: state.roles[seat], intentClue: t.intentClue ?? '', raw: t.raw ?? null };
  if (state.mode === 'vote') {
    if (!['A', 'B'].includes(t.vote)) throw new Error(`${seatById(seat).name}의 표가 A/B가 아닙니다: ${t.vote}`);
    return { ...base, vote: t.vote, reason: t.reason ?? '', text: `${t.vote}에 한 표. ${t.reason ?? ''}`.trim() };
  }
  return { ...base, stance: t.stance ?? '부분 동의', text: t.text ?? '', points: t.points ?? [] };
}

// 의장이 멈출지 판단할 때 참고하는 신호. 반대가 하나도 없으면 합의 후보.
export function consensusHint(round) {
  const present = round.turns.filter((t) => !t.absent);
  const against = present.filter((t) => t.stance === '반대').map((t) => t.seat);
  const partial = present.filter((t) => t.stance === '부분 동의').map((t) => t.seat);
  return { reached: against.length === 0, against, partial };
}

// 다음에 할 일: 'round'(한 라운드 더) 또는 'finish'(정리).
export function nextStep(state, { chairSaysAgreed } = {}) {
  const n = state.rounds.length;
  if (n === 0) return 'round';
  if (state.mode !== 'debate') return 'finish';
  if (n >= MAX_ROUNDS) return 'finish';
  // 목사님이 말씀을 보태셨으면 합의 여부와 상관없이 모두가 그 말씀에 답하는 라운드를 한 번 더 연다.
  if (notesBefore(state, n + 1).length) return 'round';
  if (n >= FIRST_CONSENSUS_CHECK) {
    const agreed = chairSaysAgreed ?? consensusHint(state.rounds.at(-1)).reached;
    if (agreed) return 'finish';
  }
  return 'round';
}

export function tally(state) {
  const turns = state.rounds[0]?.turns ?? [];
  const count = { A: [], B: [] };
  for (const t of turns) if (t.vote) count[t.vote].push(t.seat);
  const majority = count.A.length > count.B.length ? 'A' : 'B';
  const minority = majority === 'A' ? 'B' : 'A';
  return { count, majority, minority };
}

// 의장의 종합 보고를 검사하고 회의를 닫는다. 보고 형식이 빠지면 닫지 않는다.
export function finish(state, report) {
  const errs = [];
  if (!Array.isArray(report.summary) || report.summary.length !== 3) errs.push('세 줄 요약은 정확히 세 줄이어야 합니다.');
  if (!Array.isArray(report.feedback) || report.feedback.length === 0) errs.push('걸러낸 피드백이 없습니다.');
  for (const f of report.feedback ?? []) {
    if (!LABELS.includes(f.label)) errs.push(`딱지는 ${LABELS.join(' / ')} 중 하나여야 합니다: ${f.label}`);
    if (!seatById(f.seat)) errs.push(`알 수 없는 자리: ${f.seat}`);
  }
  if (!report.conclusion) errs.push('종합 결론이 없습니다.');
  if (state.mode === 'debate') {
    const a = report.agreement;
    if (!a || !Array.isArray(a.all) || !Array.isArray(a.some) || !Array.isArray(a.dissent))
      errs.push('토론형은 전원 합의 / 일부 합의 / 끝까지 반대(모델과 이유)를 모두 적어야 합니다.');
    for (const d of a?.dissent ?? []) if (!seatById(d.seat) || !d.reason) errs.push('끝까지 반대한 모델에는 자리와 이유가 모두 필요합니다.');
  }
  if (state.mode === 'vote') {
    const { count, minority } = tally(state);
    if (count[minority].length > 0 && !report.minority) errs.push('소수 의견(minority)을 반드시 함께 올려야 합니다.');
  }
  if (errs.length) throw new Error(errs.join('\n'));

  state.report = report;
  state.status = 'closed';
  state.outcome = outcome(state);
  return state;
}

function outcome(state) {
  if (state.mode === 'vote') {
    const { count, majority } = tally(state);
    return { result: '해당 없음', vote: `A ${count.A.length} : B ${count.B.length} → ${majority}` };
  }
  if (state.mode === 'once') return { result: '해당 없음' };
  const a = state.report.agreement;
  const result = a.dissent.length === 0 && a.some.length === 0 ? '전원 합의' : a.all.length || a.some.length ? '일부 합의' : '합의 실패';
  return { result };
}
