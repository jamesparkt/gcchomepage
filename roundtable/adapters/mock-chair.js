import { consensusHint, tally } from '../engine.js';

// 시험용 의장. 실제로는 클로드 코드 세션의 클로드가 이 자리에서 판단한다.
export const mockChair = {
  turn(state, round) {
    if (state.mode === 'vote') return { vote: 'A', reason: '서론의 질문을 결론에서 회수하기 쉽습니다.', intentClue: '목사님은 질문으로 시작해 결단으로 끝나는 설교를 원하십니다.' };
    const texts = [
      '저는 중립에서 듣겠습니다. 초안의 방향은 분명한데, 대지 사이의 경계가 흐립니다.',
      '구조를 합치자는 데는 대체로 모입니다. 남은 쟁점은 결론이 뻔하냐는 그록의 지적입니다.',
      '대지를 하나로 합치고 결론에 구체적인 장면을 넣는 방향으로 정리되는 것 같습니다.',
    ];
    return { stance: round === 1 ? '부분 동의' : '동의', text: texts[Math.min(round, 3) - 1], points: [], intentClue: '목사님은 서론의 질문이 성도의 한 주를 붙잡기를 원하십니다.' };
  },

  report(state) {
    const turns = state.rounds.flatMap((r) => r.turns).filter((t) => t.seat !== 'claude' && !t.absent);
    const last = state.rounds.at(-1);
    if (state.mode === 'vote') {
      const { count, majority, minority } = tally(state);
      const lone = count[minority];
      return {
        summary: [`다섯 표 가운데 ${count[majority].length}표가 ${majority} 방향입니다.`, lone.length ? `그록은 홀로 ${minority}를 골랐습니다. 익숙한 순서가 회의적인 청중을 붙잡는다는 이유입니다.` : '소수 의견은 없었습니다.', `${majority} 방향으로 가시되, 소수 의견의 경고는 서론에 반영할 만합니다.`],
        feedback: state.rounds[0].turns.filter((t) => t.seat !== 'claude').map((t) => ({ seat: t.seat, label: t.vote === majority ? '합당' : '수용 가치 있음', note: t.reason })),
        conclusion: `${majority} 방향을 권합니다.`,
        minority: lone.length ? { seats: lone, reason: state.rounds[0].turns.find((t) => t.seat === lone[0]).reason } : undefined,
        intentClues: state.rounds[0].turns.map((t) => t.intentClue).filter(Boolean).slice(0, 3),
      };
    }
    const hint = consensusHint(last);
    const labels = { chatgpt: '합당', gemini: '놓친 부분', grok: '수용 가치 있음', perplexity: '논리 모순이라 중요' };
    return {
      summary: ['두 번째 대지가 첫 번째를 되풀이하므로 하나로 합치는 것이 좋겠습니다.', '서론의 질문을 결론에서 다시 꺼내 답해야 설교가 닫힙니다.', '출처가 확인되지 않은 배경 설명 한 문장은 빼십시오.'],
      feedback: turns.filter((t) => t.text).slice(0, 4).map((t) => ({ seat: t.seat, label: labels[t.seat], note: t.text })),
      conclusion: '대지를 하나로 합치고, 결론에 성도의 월요일 아침 장면을 하나 넣어 서론의 질문에 답하십시오.',
      revision: '결론 첫 문장 수정안: 「월요일 아침 출근길에서, 오늘 이 질문이 다시 들려올 것입니다.」',
      agreement: state.mode === 'debate'
        ? { all: ['대지를 하나로 합친다', '서론의 질문을 결론에서 회수한다'], some: hint.partial.length ? ['결론의 예화가 충분히 새로운지'] : [], dissent: hint.partial.includes('grok') ? [{ seat: 'grok', reason: '예화가 매끈하면 결론이 다시 뻔해질 수 있다는 우려를 끝까지 거두지 않았습니다.' }] : [] }
        : undefined,
      intentClues: [...new Set(turns.map((t) => t.intentClue).filter(Boolean))].slice(0, 3),
    };
  },
};
