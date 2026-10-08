import { readFileSync } from 'node:fs';
import { SEATS, MODE_LABEL, seatById } from './seats.js';
import { ROLES } from './roles.js';
import { tally } from './engine.js';

const esc = (s = '') => String(s).replace(/([\\*~`$\[\]<>{}|^])/g, '\\$1');
const name = (id) => seatById(id).name;
const roleTag = (state, id) => ROLES[state.roles[id]].tag;

export const roleLine = (state) => SEATS.map((s) => `${s.name}=${roleTag(state, s.id)}`).join(', ');

// 노션 "설교 단톡방" DB 한 행의 속성과 본문.
export function notionPage(state, { boardUrl } = {}) {
  const r = state.report;
  const s = state.sermon;
  const properties = {
    제목: `${state.date} ${s.type} ${s.passage} – ${MODE_LABEL[state.mode]}`,
    'date:날짜:start': state.date,
    'date:날짜:is_datetime': 0,
    '설교 유형': s.type,
    본문: s.passage,
    '설교 제목': s.title,
    모드: MODE_LABEL[state.mode],
    '막힌 지점': state.stuck,
    '역할 배정': roleLine(state),
    '라운드 수': state.rounds.length,
    '합의 결과': state.outcome.result,
    '투표 결과': state.outcome.vote ?? '',
    '세 줄 요약': r.summary.join('\n'),
    '의도 단서': (r.intentClues ?? []).join('\n'),
    '원고 문서': s.docUrl ?? null,
    '보드 링크': boardUrl ?? null,
    상태: state.test ? '시험' : '완료',
  };

  const out = [];
  out.push('## 세 줄 요약');
  r.summary.forEach((l, i) => out.push(`${i + 1}. ${esc(l)}`));

  if (state.mode === 'vote') {
    const { count, majority, minority } = tally(state);
    out.push('## 투표 결과');
    out.push(`- A: ${esc(state.question.A)} — ${count.A.length}표 (${count.A.map(name).join(', ') || '없음'})`);
    out.push(`- B: ${esc(state.question.B)} — ${count.B.length}표 (${count.B.map(name).join(', ') || '없음'})`);
    out.push(`- 다수 의견: ${majority}`);
    if (r.minority) out.push(`- 소수 의견(${minority}, ${r.minority.seats.map(name).join(', ')}): ${esc(r.minority.reason)}`);
  }

  if (r.intentClues?.length) {
    out.push('## 목사님 의도의 단서');
    r.intentClues.forEach((c) => out.push(`- ${esc(c)}`));
  }

  out.push('## 걸러낸 피드백');
  for (const f of r.feedback) out.push(`- **[${f.label}]** ${name(f.seat)}: ${esc(f.note)}`);

  if (state.mode === 'debate') {
    const a = r.agreement;
    out.push('## 합의 정리');
    out.push(`- 전원 합의: ${esc(a.all.join(' / ') || '없음')}`);
    out.push(`- 일부 합의: ${esc(a.some.join(' / ') || '없음')}`);
    out.push(`- 끝까지 반대: ${a.dissent.length ? a.dissent.map((d) => `${name(d.seat)} — ${esc(d.reason)}`).join(' / ') : '없음'}`);
  }

  out.push('## 종합 결론');
  out.push(esc(r.conclusion));
  if (r.revision) out.push(`> ${esc(r.revision)}`);

  out.push('## 각 모델 원문');
  for (const round of state.rounds) {
    out.push(`<details>\n<summary>${round.n}라운드 원문</summary>`);
    for (const t of round.turns) out.push(`\t**${name(t.seat)} (${roleTag(state, t.seat)})**\n\t${esc(t.raw ?? t.text)}`);
    out.push('</details>');
  }
  return { properties, content: out.join('\n') };
}

// 보드가 한 탭에 한 장면씩 보여줄 순서.
export function boardSteps(state) {
  const steps = [];
  const open = state.mode === 'vote'
    ? `투표형 단톡방을 엽니다. A와 B 가운데 한 표씩 던지고 이유를 한 줄로 밝혀 주십시오.`
    : `${MODE_LABEL[state.mode]} 단톡방을 엽니다.${state.stuck ? ` 목사님이 막히신 곳은 이렇습니다. ${state.stuck}` : ''}`;
  steps.push({ seat: 'claude', label: '개회', text: open });
  for (const round of state.rounds) {
    const label = state.mode === 'debate' ? `${round.n}라운드` : state.mode === 'vote' ? '투표' : '의견';
    for (const t of round.turns) steps.push({ seat: t.seat, label, stance: t.stance, vote: t.vote, text: t.text });
    if (round.chairNote) steps.push({ seat: 'claude', label, text: round.chairNote });
  }
  if (state.report) steps.push({ seat: 'claude', label: '정리', text: state.report.summary.join(' '), final: true });
  return steps;
}

export function boardHtml(state) {
  const tpl = readFileSync(new URL('./board/board.html', import.meta.url), 'utf8');
  const data = {
    title: `${state.sermon.passage} · ${MODE_LABEL[state.mode]}`,
    sermon: state.sermon.title,
    seats: SEATS.map((s) => ({ ...s, role: roleTag(state, s.id) })),
    steps: boardSteps(state),
    live: state.status === 'open',
    outcome: state.outcome ?? null,
    summary: state.report?.summary ?? [],
    conclusion: state.report?.conclusion ?? '',
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return tpl.replace('/*MEETING*/null', json);
}
