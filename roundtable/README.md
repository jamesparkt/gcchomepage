# 설교 단톡방

박경수 목사님이 설교가 막혔을 때만 부르는 멀티 AI 설교 단톡방. 클로드가 의장이고 챗GPT·제미나이·그록·퍼플렉시티가 한 자리씩 앉는다.
목적은 점수가 아니라, 목사님이 말로 다 설명하지 못한 의도를 다른 모델의 결과에서 단서로 찾아내는 것이다.

## 의장(클로드 코드 세션)이 회의를 여는 순서

1. 입력 파일을 `meetings/` 아래에 만든다: 모드(`once`·`debate`·`vote`), 설교 성격(`위로`·`책망`·`교리`·`전도`·`일반`), 초안, 막힌 지점, 필요하면 배역 바꾸기(`roleOverrides`), 투표형이면 `question.A`·`question.B`.
2. `node cli.js start --input meetings/입력.json --state meetings/회의.json`
3. 라운드마다 의장 자신의 발언을 파일로 쓰고 `node cli.js round --state meetings/회의.json --chair meetings/의장.json --note "의장 메모"`
   - 출력의 `next`가 `round`면 한 라운드 더, `finish`면 정리. 토론형은 2라운드부터 합의를 보고, 5라운드에서 반드시 멈춘다.
4. 보고서를 쓰고 `node cli.js finish --state meetings/회의.json --report meetings/보고.json`
   - 세 줄 요약, 딱지 붙인 피드백(합당 / 수용 가치 있음 / 놓친 부분 / 논리 모순이라 중요 / 과해서 무시 가능), 종합 결론이 없으면 닫히지 않는다.
   - 토론형은 전원 합의 / 일부 합의 / 끝까지 반대(모델과 이유), 투표형은 소수 의견이 반드시 있어야 한다.
   - 목사님이 실시간으로 보시겠다면 라운드마다 `node cli.js board --state meetings/회의.json`으로 보드를 다시 만들어 같은 경로로 올린다.
5. 나온 `.board.html`을 아티팩트로 올리고(목사님이 실시간으로 보시겠다고 할 때), `.notion.json`으로 노션 「설교 단톡방」 DB(`collection://ee6a58fa-8172-46d8-99c3-d21ef4f36009`)에 한 행을 만든다.

자세한 의장 절차는 저장소의 `.claude/skills/sermon-group-chat/SKILL.md`에 있다. 휴대폰에서 이 저장소로 클로드 코드 세션을 열고 "설교 단톡방"이라고 하면 그 절차를 따른다.

## 시험

- `npm test` — 진행 규칙 시험
- `npm run demo` — 가짜 모델로 세 모드를 돌려 `samples/`에 보드·노션 원고를 만든다

실제 모델 연결(API 키 4개)은 마지막 단계에서 붙인다. 그 전까지 `ROUNDTABLE_LIVE`를 켜면 멈춘다.
