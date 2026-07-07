# 밥앤고 마케팅 AI

밥앤고 전용 AI 광고 마케팅 에이전시 웹앱입니다.
성과 대시보드, AI 성과 진단, 캠페인 플래너, 광고 카피 생성을 한곳에서 처리합니다.

- 프론트엔드: React + Vite + Recharts
- AI: Anthropic API (Vercel 서버리스 함수 `/api/claude` 경유 — 키는 서버에만 저장)
- 데이터: 브라우저 localStorage 자동 저장

---

## 상시 사용 링크 만들기 (Vercel 무료 배포, 약 10분)

준비물: GitHub 계정, Vercel 계정(GitHub으로 가입), Anthropic API 키

### 1. GitHub에 코드 올리기
1. github.com 접속 → New repository → 이름 `bobngo-marketing-ai` → Create
2. "uploading an existing file" 클릭 → 이 폴더의 파일 전체를 드래그해서 업로드 → Commit
   (node_modules, dist 폴더는 올리지 않아도 됩니다. 없어도 정상)

### 2. Anthropic API 키 발급
1. console.anthropic.com 접속 → 로그인 → API Keys → Create Key
2. 키를 복사해 둡니다. (사용량만큼 소액 과금됩니다. 결제 수단 등록 필요)

### 3. Vercel 배포
1. vercel.com 접속 → GitHub으로 로그인 → Add New → Project
2. `bobngo-marketing-ai` 저장소 선택 → Import
3. **Environment Variables**에 추가:
   - Name: `ANTHROPIC_API_KEY`
   - Value: 2번에서 복사한 키
4. Deploy 클릭 → 1~2분 후 완료

### 4. 완료
`https://bobngo-marketing-ai.vercel.app` 형태의 상시 사용 링크가 생성됩니다.
휴대폰, 아이맥 어디서든 접속 가능하고, 코드를 GitHub에 수정 업로드하면 자동으로 재배포됩니다.

---

## 로컬에서 화면만 미리 보기 (선택)

```bash
npm install
npm run dev
```
※ AI 기능(`/api/claude`)은 Vercel 환경에서 동작합니다. 로컬에서 AI까지 테스트하려면 `npm i -g vercel` 후 `vercel dev`를 사용하세요.

## 폴더 구조

```
api/claude.js     ← Anthropic API 프록시 (서버리스 함수)
src/App.jsx       ← 앱 전체 화면과 로직
src/main.jsx      ← 엔트리
index.html
```

## 다음 단계 (2단계 자동화)

CLAUDE.md 파일에 Claude Code로 진행할 자동 집행 로드맵이 정리되어 있습니다.
