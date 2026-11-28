# 초기 평가 결과 (2026-11-28)

이 결과를 얻은 뒤 앱의 규칙이나 AI 프롬프트를 바꾸지 않았어요.
기준은 합성 문장 28개예요. 실제 사용자 전체의 정확도나 추정 물가 정확도는 아니에요.

| 실행 | 문장 전체 통과 | 필드 통과 | 오류 / 미실행 |
| --- | --- | --- | --- |
| 규칙 전체 | 22 / 28 (78.6%) | 98 / 104 (94.2%) | 0 / 0 |
| 규칙 취약 문장 3개 | 0 / 3 | 9 / 12 | 0 / 0 |
| Gemini, 같은 취약 문장 3개 | 3 / 3 | 12 / 12 | 0 / 0 |

Gemini는 규칙이 실패한 문장만 선택해 확인했어요. Gemini의 전체 28문장 정확도는 아직 측정하지 않았어요.
모델은 앱의 재시도/대체 정책을 그대로 사용했으므로 특정 모델의 점수라고 단정하지 않아요.

## 규칙이 틀린 문장

| ID | 빠진 판단 |
| --- | --- |
| `people-without-user` | 친구 세 명 + 본인 = 4명 |
| `people-alone` | 혼자 = 1명 |
| `payer-second-round` | 1차 법카와 별개로 2차는 개인 부담 |
| `cost-wedding` | 문장에 명시한 축의금 15만원 유지 |
| `cost-performance` | 문장에 명시한 티켓값 9만원 유지 |
| `cost-free` | 무료 입장료를 유료 티켓으로 추가하지 않기 |

## Gemini 소수 확인

| ID | 확인한 값 | 소요 시간 |
| --- | --- | --- |
| `people-without-user` | 인원 4명 | 1.924초 |
| `payer-second-round` | 2차 술값 개인 부담 30,000원 | 1.298초 |
| `cost-free` | 양수 입장료 없음 | 1.158초 |

모든 입력은 고정한 가상 기준일과 빈 소비 이력을 사용해요. 이 수치는 문장 이해 단계만 평가하며,
`estimateCosts`의 기록 평균 반영과 최종 예산 계산은 포함하지 않아요.

## 재현

```bash
npm run eval:prediction -- --provider rules
npm run eval:prediction -- --provider both --ids people-without-user,payer-second-round,cost-free --limit 3
```

평가 실행 시 코드 커밋 외에 평가 세트와 프롬프트의 해시도 보고서에 기록해요.
위 초기 측정은 평가 도구를 작성 중인 작업 트리에서 실행했으므로 보고서의 `workingTreeDirty`가 true예요.

- 평가 세트 SHA-256: `adec1742afcc8581efc8e380d7a3e617ecf64fbd1e974c925d3a0756d8a14d00`
- 프롬프트 SHA-256: `fc5144e6547d0626e8ed8a763e0c35bc306a9a9de632fe6a3efc1fc662bfb270`
