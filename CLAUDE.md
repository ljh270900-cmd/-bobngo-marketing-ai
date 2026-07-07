# CLAUDE.md — 밥앤고 마케팅 AI 프로젝트 가이드

이 문서는 Claude Code가 이 저장소에서 작업할 때 참고하는 컨텍스트입니다.

## 프로젝트 개요
- 브랜드: 밥앤고 (네이버 스마트스토어 간편식 브랜드, 1인 가구·직장인 타깃)
- 목적: 광고 성과 분석 → 마케팅 제안 → 광고 카피 생성 → (2단계) 광고 자동 집행
- 스택: React 18 + Vite / Recharts / Vercel 서버리스 함수(api/) / Anthropic API

## 구조
- `src/App.jsx` — 전체 UI와 로직 (대시보드, AI 분석, 캠페인 플래너, 콘텐츠 스튜디오)
- `api/claude.js` — Anthropic API 프록시. 환경변수 `ANTHROPIC_API_KEY` 필요
- 데이터 저장: 브라우저 localStorage (`bng-rows-v1`)

## 코드 규칙
- UI 텍스트는 전부 한국어, 따뜻하고 담백한 톤 (과장·영어 남발 금지)
- 색상 토큰은 `src/App.jsx` 상단 `C` 객체만 사용
- AI 응답은 항상 JSON으로 받고 `askClaude()`에서 파싱. 프롬프트 수정 시 JSON 스키마 유지
- 새 서버 기능은 `api/` 폴더에 파일 추가 (Vercel 서버리스 규칙)

## 2단계 로드맵 (요청 시 진행)
1. **네이버 커머스 API 연동** — 주문·유입 데이터 자동 수집, 수동 입력 대체
   - `api/naver-commerce.js` 신설, 키는 환경변수 `NAVER_COMMERCE_CLIENT_ID/SECRET`
2. **네이버 검색광고 API 연동** — 키워드별 성과 리포트 수집, 입찰가 조정
   - 서명 방식: HMAC-SHA256 (X-Timestamp, X-API-KEY, X-Customer, X-Signature 헤더)
3. **메타 마케팅 API 연동** — 광고 세트 성과 수집, 예산 조정
4. **자동 실행 규칙 엔진** — Vercel Cron으로 매일 오전 실행
   - 예: ROAS 300% 미만 3일 지속 → 입찰가 20% 인하 제안/실행
   - 모든 자동 집행은 실행 전 로그를 남기고, 처음엔 "제안만" 모드로 시작할 것

## 주의
- API 키는 절대 프론트엔드 코드나 저장소에 넣지 말 것 (환경변수만 사용)
- 자동 집행 기능은 반드시 dry-run(제안 모드) 기본값으로 구현할 것
- 광고 카피에 과장 표현(최고, 100%, 질병 효능) 금지 — 식품 광고 심의 준수
