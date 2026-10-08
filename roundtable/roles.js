import { SEATS } from './seats.js';

// 배역 목록. focus 는 모델에게 주는 지시, tag 는 보드 말풍선 꼬리표.
export const ROLES = {
  attack: { tag: '공격', focus: '이 초안의 가장 약한 고리를 찾아 정면으로 반대하십시오.' },
  defend: { tag: '변호', focus: '목사님이 이 초안으로 하려던 말을 가장 선한 뜻으로 읽고 변호하십시오.' },
  neutral: { tag: '중립', focus: '양쪽 주장을 저울질하고 어느 쪽에도 기울지 말고 판단하십시오.' },
  critic: { tag: '비판', focus: '본문 해석과 논리 전개의 정확성을 꼼꼼히 비판하십시오.' },
  strength: { tag: '장점 부각', focus: '이 초안에서 반드시 살려야 할 장점을 찾아 키우십시오.' },
  cynic: { tag: '시니컬', focus: '회의적인 성도의 귀로 듣고, 뻔하거나 공허한 대목을 꼬집으십시오.' },
  optimist: { tag: '낙천', focus: '이 설교가 성도의 삶에서 열매 맺을 가능성을 밝게 그려 보십시오.' },
  comfortProbe: { tag: '위로 검증', focus: '고통 중인 성도가 들을 때 정말 위로가 되는지, 상투적 위로는 아닌지 파고드십시오.' },
  rebukeProbe: { tag: '수위 점검', focus: '책망이 너무 과하거나 정죄로 들리지 않는지, 복음의 은혜가 함께 있는지 짚으십시오.' },
  doctrineProbe: { tag: '교리 점검', focus: '개혁주의 복음주의 신학에 비추어 교리적으로 어긋나는 데가 없는지 점검하십시오.' },
  seekerProbe: { tag: '초신자 귀', focus: '교회에 처음 온 사람이 듣는다고 생각하고, 알아듣기 어려운 말과 걸림돌을 찾으십시오.' },
  factCheck: { tag: '사실 검증', focus: '초안과 다른 참석자들의 주장 가운데 사실·인용·통계·역사 배경의 근거가 실제로 있는지 검색으로 확인하십시오.' },
};

// 설교 성격별 기본 배정. 의장이 상황에 따라 언제든 바꿀 수 있는 출발점이다.
// 퍼플렉시티는 성격과 관계없이 사실 검증을 함께 맡는다.
const PRESETS = {
  위로: { claude: 'neutral', chatgpt: 'comfortProbe', gemini: 'defend', grok: 'cynic', perplexity: 'factCheck' },
  책망: { claude: 'neutral', chatgpt: 'rebukeProbe', gemini: 'defend', grok: 'attack', perplexity: 'factCheck' },
  교리: { claude: 'neutral', chatgpt: 'doctrineProbe', gemini: 'critic', grok: 'seekerProbe', perplexity: 'factCheck' },
  전도: { claude: 'neutral', chatgpt: 'seekerProbe', gemini: 'optimist', grok: 'cynic', perplexity: 'factCheck' },
  일반: { claude: 'neutral', chatgpt: 'attack', gemini: 'defend', grok: 'cynic', perplexity: 'factCheck' },
};

export const SERMON_KINDS = Object.keys(PRESETS);

export function assignRoles(kind = '일반', overrides = {}) {
  const base = PRESETS[kind] ?? PRESETS.일반;
  const roles = { ...base, ...overrides };
  for (const seat of SEATS) {
    if (!ROLES[roles[seat.id]]) throw new Error(`알 수 없는 배역: ${seat.id}=${roles[seat.id]}`);
  }
  return roles;
}
