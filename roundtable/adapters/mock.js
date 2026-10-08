// 가짜 모델. 실제 API를 붙이기 전에 흐름·보드·노션 기록을 시험하는 용도다.
// 라운드가 진행될수록 입장이 모이도록 짜 두어서, 토론형이 3라운드에서 멈추는 장면을 볼 수 있다.
const STANCES = {
  chatgpt: ['반대', '부분 동의', '동의', '동의', '동의'],
  gemini: ['동의', '동의', '동의', '동의', '동의'],
  grok: ['반대', '반대', '부분 동의', '부분 동의', '부분 동의'],
  perplexity: ['부분 동의', '동의', '동의', '동의', '동의'],
};

const LINES = {
  chatgpt: [
    '두 번째 대지가 첫 번째 대지를 다른 말로 반복하고 있습니다. 성도 입장에서는 같은 이야기를 두 번 듣는 셈입니다.',
    '구조 문제는 대지를 하나로 합치면 풀립니다. 다만 결론의 적용은 아직 막연합니다.',
    '대지를 합치고 결론에 월요일 아침의 장면 하나를 넣는 안이면 동의합니다.',
  ],
  gemini: [
    '목사님이 서론에서 던진 질문이 이 설교의 심장입니다. 이 질문은 반드시 살려야 합니다.',
    '대지를 합치더라도 서론의 질문을 결론에서 다시 꺼내 답하는 흐름은 지켜야 합니다.',
    '합의된 방향이면 서론의 질문이 결론에서 회수됩니다. 좋습니다.',
  ],
  grok: [
    '솔직히 이 결론은 교회에서 백 번 들은 말입니다. 회의적인 사람은 여기서 귀를 닫습니다.',
    '대지를 합쳐도 결론이 뻔하면 소용없습니다. 왜 오늘 이 말이 필요한지가 안 보입니다.',
    '월요일 장면을 넣는다면 조금 낫습니다. 그래도 예화가 너무 매끈하면 또 뻔해질 겁니다.',
  ],
  perplexity: [
    '초안의 역사 배경 설명 가운데 한 대목은 출처를 찾지 못했습니다. 확인되기 전에는 빼시는 편이 안전합니다.',
    '나머지 배경 설명은 일반적인 주석서 설명과 일치합니다. 확인되지 않은 한 문장만 고치면 됩니다.',
    '사실 관계는 정리됐습니다. 합의된 방향에 동의합니다.',
  ],
};

const CLUES = {
  chatgpt: '목사님은 설명보다 결단의 순간을 만들고 싶으신 것 같습니다.',
  gemini: '서론의 질문 자체가 목사님이 성도에게 정말 묻고 싶은 질문으로 보입니다.',
  grok: '목사님도 결론이 뻔하다고 느끼셔서 막히신 것 아닐까 싶습니다.',
  perplexity: '목사님은 정확한 배경 위에서 담대하게 선포하고 싶으신 것 같습니다.',
};

const VOTES = { chatgpt: ['A', '구조가 단순해집니다.'], gemini: ['A', '서론의 질문이 살아납니다.'], grok: ['B', '익숙한 순서가 오히려 회의적인 귀를 붙잡습니다.'], perplexity: ['A', '본문 흐름과 더 맞습니다.'] };

export function mockAdapter(seat) {
  return {
    async ask({ round, state }) {
      if (state.mode === 'vote') {
        const [vote, reason] = VOTES[seat];
        return { vote, reason, intentClue: CLUES[seat] };
      }
      const i = Math.min(round, 3) - 1;
      return {
        stance: STANCES[seat][round - 1],
        text: LINES[seat][i],
        points: [{ claim: LINES[seat][i], where: seat === 'perplexity' ? '서론의 배경 설명' : '두 번째 대지와 결론' }],
        intentClue: CLUES[seat],
      };
    },
  };
}

export const mockAdapters = () => Object.fromEntries(['chatgpt', 'gemini', 'grok', 'perplexity'].map((s) => [s, mockAdapter(s)]));
