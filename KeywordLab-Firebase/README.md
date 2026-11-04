# KeywordLab — Firebase + Vercel (v2.2)

Next.js + Firebase Authentication + Cloud Firestore + NAVER SearchAd / API HUB. No Python needed.

## 1. Firebase 콘솔 설정

1. https://console.firebase.google.com/ 에서 **새 프로젝트** 만들기 (권장). 프로젝트 이름 예: MyKeywordLab.
2. 프로젝트 개요의 **웹 앱 추가** (`</>`) → 앱 등록 → Firebase SDK 설정의 `apiKey`, `authDomain`, `projectId`, `appId` 복사.
3. **Authentication → Sign-in method → Email/Password 활성화**. 가입 폼은 앱에 없으며, 콘솔에서만 사용자 생성.
4. **Authentication → Users → Add user**에서 관리자 `ryu_ralra@naver.com` 및 비밀번호 등록. 비밀번호는 여기서만 관리.
5. **Build → Firestore Database → Create database** → 가까운 지역 선택 (예: asia-northeast3) → **Production mode** 선택.
6. Firestore → Rules에서 프로젝트의 `firestore.rules` 내용을 붙여넣고 **Publish**. 브라우저에서 DB 직접 접근을 모두 거부하며, 승인·기록·사용량은 Next.js 서버 Admin SDK로만 처리.
7. 일반 사용자 추가: Authentication → Users → Add user로 이메일·비밀번호를 생성. **Firestore → Start collection → `allowed_emails`** → Document ID에 사용자 이메일을 *소문자로* 입력, 필드 `enabled` = Boolean `true`로 저장. (두 절차 모두 필요.) 삭제/차단하려면 `enabled=false`.
   - 관리자 이메일은 코드에서 `ryu_ralra@naver.com`으로 고정되어 별도 허용 문서가 없어도 됨.
8. 프로젝트 설정(톱니) → **Service accounts** → Generate new private key. 내려받은 JSON은 절대 GitHub에 올리지 말고 `project_id`, `client_email`, `private_key` 3개를 Vercel 환경변수로만 등록.

## 2. GitHub 업로드

이 ZIP의 `MyKeywordLab-Firebase/` 폴더 **안의 내용**을 GitHub 새 저장소 루트에 업로드 (`package.json`이 최상위에 보이도록). `.env.local`, `config.env`, 서비스 계정 JSON을 올리지 마세요. 과거 채팅에 올렸던 네이버 키는 재발급을 권장합니다.

## 3. Vercel 배포

https://vercel.com/new → GitHub 저장소 Import → Framework Next.js → Environment Variables에 `.env.example`의 모든 값을 입력. `FIREBASE_PRIVATE_KEY`는 서비스 계정 JSON의 `private_key` 값이며 `\n` 형태로 입력해도 서버가 실제 줄바꿈으로 복원. Vercel에서 Deployment 재배포.

**Firebase Authentication → Settings → Authorized domains**에 배포한 `xxxx.vercel.app` 도메인 추가. (새 Firebase 프로젝트는 `localhost`도 자동 승인되지 않을 수 있음.)

## 4. 이용 정책

- 관리자는 `ryu_ralra@naver.com` 계정으로 로그인할 때 무제한.
- 일반 사용자는 Firebase Auth에 등록되고 `allowed_emails/{소문자 이메일}` 문서의 `enabled=true`인 경우에만 로그인 후 API 이용.
- 일반 사용자는 한국시간(KST) 날짜별로 15회 새 분석 가능. 서버에서 Firestore 트랜잭션으로 선차감하므로 여러 탭을 열어도 제한 적용. 네이버 오류로 실패한 요청도 1회 소진함.
- 검색 기록은 `users/{uid}/history/{documentId}`, 일일 검색량은 `users/{uid}/daily_usage/{YYYY-MM-DD}`에 저장. 서버가 로그인 토큰을 검증하고 UID 경로를 고정하므로 다른 사람 기록에 접근할 수 없음.
- 검색 기록 다시 보기는 0회 차감. 최신 100건을 표시하고, 전체 삭제도 최신 100건씩 수행.
- 검색란 추천 키워드/자동완성 없음.

## 5. 주의 및 검사

- 로컬 설치 시 Node.js LTS를 설치하고 `npm install`, `npm run dev`를 실행하세요.
- Vercel 무료 플랜 함수 실행 시간, Firebase 무료 쿼터/Firestore 비용, NAVER API 사용량 제한을 모니터링하세요. 최근 30일 블로그 확인 건수는 최신 검색 결과 최대 1,000건의 작성일을 확인한 참고치이며 전체 월간 발행량이 아닙니다. 카페 API는 글 작성일을 주지 않으므로 정확한 월간 카페 발행량을 표시하지 않습니다.
- 검색 분석은 외부 API 호출 전 차감되며, API 호출에 실패해도 차감됩니다. 중요한 사용 정책이므로 사용자에게 안내되어 있습니다.
- UI와 API 코드는 작성되었지만 실제 Firebase 프로젝트/네이버 인증키를 이용한 종단 간 동작은 배포 후 검증이 필요합니다.


## 6. 이번 업데이트: 데이터 기능 및 화면

- 월간 PC / 모바일 / 합계 검색량: 기존 NAVER 검색광고 API (`monthlyPcQcCnt`, `monthlyMobileQcCnt`).
- 최근 30일 블로그 확인 건수: 기존 최신순 블로그 API 최대 1,000개에서 작성일이 기간에 들어오는 글을 계산한 **제한된 확인 건수**입니다. 정확한 전체 발행량이 아닙니다.
- 최근 30일 카페 발행량: **미지원**. 네이버 카페글 검색 API는 작성일(`postdate`)을 제공하지 않아 계산할 수 없습니다. 화면에 `—`를 표시합니다.
- 블로그·카페 **전체 검색 결과수**: 검색 API `total` 필드. 월간 발행량과 혼동하지 마세요.
- 상단 안내·장식 문구는 간소화했고 모바일에서는 화면 제목 옆 메뉴 버튼으로 사이드바를 사용할 수 있습니다.
- 검색·로그인·15회 사용량 제한·히스토리·비교·CSV 기능을 유지했습니다. 오래된 히스토리의 카페 수치는 `—`로 보입니다.

### GitHub 업로드 — 이 프로젝트에서 업로드할 파일

이 폴더 **안의 내용 전체**를 GitHub 저장소 최상단에 올려주세요. 특히 다음 파일이 중요합니다.

```text
app/api/analyze/route.ts
app/api/history/route.ts
app/globals.css
app/layout.tsx
app/page.tsx
components/auth-gate.tsx
components/dashboard.tsx
components/login-form.tsx
lib/firebase/access.ts
lib/firebase/admin.ts
lib/firebase/client.ts
lib/keyword.ts
lib/naver.ts
firestore.rules
package.json
next.config.ts
tsconfig.json
next-env.d.ts
.gitignore
.env.example
README.md
```

주의: `.env`, `.env.local`, `node_modules/`, `.next/`, Firebase 서비스 계정 JSON과 실제 API 키를 넣은 파일은 **업로드 금지**입니다. `.env.example`은 이름만 적힌 템플릿이라 업로드 가능합니다. GitHub에서 `package.json`이 저장소 루트에 보이도록 업로드하고, Vercel 환경변수 값은 기존 설정을 유지하세요. 새 환경변수는 필요하지 않습니다.

### 검증 범위

실제 네이버/Firebase 인증 정보가 프로젝트에 동봉되지 않았으므로, 외부 API 호출 및 실제 배포 동작은 해당 계정 환경에서 확인해야 합니다. 소스의 TS/TSX 문법 검사는 별도로 수행했습니다.
