// 원탁의 다섯 자리. 순서가 곧 발언 순서다 (의장은 맨 앞에서 열고 맨 뒤에서 정리한다).
export const SEATS = [
  { id: 'claude', name: '클로드', short: 'C', color: '#d97757', chair: true },
  { id: 'chatgpt', name: '챗GPT', short: 'G', color: '#10a37f' },
  { id: 'gemini', name: '제미나이', short: 'Ge', color: '#4f7cf7' },
  { id: 'grok', name: '그록', short: 'X', color: '#444444' },
  { id: 'perplexity', name: '퍼플렉시티', short: 'P', color: '#20808d', factChecker: true },
];

export const MODES = ['once', 'debate', 'vote'];
export const MODE_LABEL = { once: '일회성', debate: '토론형', vote: '투표형' };

export const MAX_ROUNDS = 5;
// 합의 여부는 2라운드부터 본다 (1라운드는 각자 첫 의견).
export const FIRST_CONSENSUS_CHECK = 2;

export const LABELS = ['합당', '수용 가치 있음', '놓친 부분', '논리 모순이라 중요', '과해서 무시 가능'];

export const seatById = (id) => SEATS.find((s) => s.id === id);
