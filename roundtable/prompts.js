import { ROLES } from './roles.js';
import { seatById } from './seats.js';

const COMMON = `당신은 개혁주의 복음주의 교회 담임목사의 설교 초안을 함께 검토하는 단톡방에 참여하고 있습니다.
성경은 개역개정, 찬송가는 새찬송가 기준입니다. 존댓말로, 짧고 분명하게 말하십시오.
이 회의의 진짜 목적은 점수를 매기는 것이 아니라, 목사님이 말로 다 설명하지 못한 의도를 함께 찾아내는 것입니다.
그래서 매번 "목사님이 이 초안으로 정말 하려던 말은 무엇인가"에 대한 당신의 추측을 함께 적으십시오.`;

function transcript(state) {
  return state.rounds
    .map((r) =>
      [`[${r.n}라운드]`, ...r.turns.map((t) => `- ${seatById(t.seat).name}(${ROLES[t.role].tag}): ${t.text}`)].join('\n'),
    )
    .join('\n\n');
}

// 한 자리에 보낼 프롬프트를 만든다. 응답은 JSON 하나로 받는다.
export function buildPrompt(state, seatId, round) {
  const role = ROLES[state.roles[seatId]];
  const s = state.sermon;
  const head = [
    COMMON,
    `당신의 배역: ${role.tag} — ${role.focus}`,
    seatById(seatId).factChecker && state.roles[seatId] !== 'factCheck'
      ? `추가 임무: ${ROLES.factCheck.focus}`
      : '',
    `설교: ${s.type} / ${s.passage} / 「${s.title}」`,
    state.stuck ? `목사님이 막힌 지점: ${state.stuck}` : '',
    `설교 초안:\n${s.draft}`,
  ];

  if (state.mode === 'vote') {
    return [
      ...head,
      `목사님의 질문: 다음 두 방향 가운데 하나에 표를 던지십시오.\nA: ${state.question.A}\nB: ${state.question.B}`,
      '응답 형식(JSON만): {"vote":"A 또는 B","reason":"한 줄 이유","intentClue":"목사님 의도에 대한 추측 한 줄"}',
    ].filter(Boolean).join('\n\n');
  }

  const debate = state.mode === 'debate' && round > 1;
  return [
    ...head,
    debate ? `지금까지의 토론:\n${transcript(state)}\n\n${round}라운드입니다. 다른 자리의 말에 반론하거나 보태고, 합의할 수 있는 지점은 분명히 합의하십시오.` : '',
    '응답 형식(JSON만): {"stance":"동의 | 부분 동의 | 반대","text":"말풍선에 띄울 발언 3~5문장","points":[{"claim":"구체적 지적","where":"초안의 어느 대목"}],"intentClue":"목사님 의도에 대한 추측 한 줄"}',
    '"stance"는 지금까지 모인 방향(첫 라운드면 초안의 방향)에 대한 당신의 입장입니다.',
  ].filter(Boolean).join('\n\n');
}
