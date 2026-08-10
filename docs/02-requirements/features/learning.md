---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related: []
---
# Learning

## 현재 사용자 가치

입문자는 회전 표기와 단계별 해법을 배우고, 숙련을 시작한 사용자는 CFOP case를 탐색할 수 있다.

## 현재 동작

- WCA 3x3 scramble notation 중심의 회전 기호 안내
- 초보자 8단계 학습 탭
- F2L, OLL, PLL case와 대표 algorithm
- VisualCube URL을 이용한 case image
- tab과 case 탐색

## 요구사항

- 표기, case 수, algorithm, image mapping의 중복과 누락을 test로 방지한다.
- 외부 표준이나 algorithm 출처를 사용할 때 출처와 기준 시점을 관리한다.
- 대표 algorithm은 유일한 정답으로 오해시키지 않는다.
- 학습 콘텐츠 변경은 화면과 정적 데이터 test를 함께 갱신한다.

현재 학습 콘텐츠는 사용자 진도 저장이나 개인화 curriculum을 제공하지 않는다.
