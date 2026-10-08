// 시험용 가짜 입력. 실제 설교 원고가 아니다.
const sermon = {
  type: '새벽설교',
  passage: '요한복음 2장',
  title: '포도주가 떨어졌을 때 (시험용)',
  draft: '[시험용 가짜 초안] 서론: 잔치에 포도주가 떨어진 장면에서 "내 삶에 무엇이 떨어졌습니까?"라고 묻는다. 1대지: 부족함을 주님께 가져가라. 2대지: 부족함 속에서 주님을 신뢰하라. 결론: 주님께 맡기면 채워 주신다.',
};
export const SAMPLE_INPUT = {
  once: { mode: 'once', kind: '위로', sermon, stuck: '결론이 너무 뻔하게 느껴집니다.' },
  debate: { mode: 'debate', kind: '일반', sermon, stuck: '두 대지가 같은 말을 하는 것 같습니다.' },
  vote: { mode: 'vote', kind: '일반', sermon, question: { A: '서론의 질문으로 시작해 결론에서 답한다', B: '본문 순서대로 따라가며 마지막에 질문을 던진다' } },
};
