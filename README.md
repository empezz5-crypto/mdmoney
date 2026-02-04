# 예산 및 자금흐름 관리 시스템

비영리기관의 예산과 자금흐름을 파악할 수 있는 웹서비스입니다. 국민은행 Open Banking API와 연동하여 계좌 정보와 거래내역을 자동으로 동기화합니다.

## 주요 기능

- 계좌 관리: 계좌 등록 및 국민은행 API를 통한 자동 동기화
- 거래내역 조회: 계좌별, 기간별, 카테고리별 거래내역 조회 및 분류
- 예산 관리: 월별 예산 설정 및 예산 대비 지출 현황 분석
- 대시보드: 계좌 잔액, 예산 현황, 최근 거래내역을 한눈에 확인

## 기술 스택

- Frontend: Next.js 14, React, TypeScript, Recharts
- Backend: Node.js, Express
- Database: MongoDB, Mongoose
- API: KB Open Banking API

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/moneyreport
JWT_SECRET=your-secret-key-here
KB_API_BASE_URL=https://openapi.kbstar.com
KB_API_KEY=your-kb-api-key
KB_CLIENT_ID=your-kb-client-id
KB_CLIENT_SECRET=your-kb-client-secret
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. MongoDB 실행

MongoDB가 설치되어 있어야 합니다. 로컬에서 실행하거나 MongoDB Atlas를 사용할 수 있습니다.

### 4. 서버 실행

터미널 1 - 백엔드 서버:
```bash
npm run server
```

터미널 2 - 프론트엔드:
```bash
npm run dev
```

### 5. 접속

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 국민은행 API 연동

국민은행 Open Banking API를 사용하려면:

1. KB Open Banking 개발자 포털에서 앱 등록
2. Client ID와 Client Secret 발급
3. `.env` 파일에 인증 정보 입력

## 사용 방법

1. **계좌 등록**: 계좌 관리 페이지에서 계좌번호와 계좌명을 입력하여 등록
2. **동기화**: 등록한 계좌의 "동기화" 버튼을 클릭하여 최신 잔액과 거래내역 가져오기
3. **예산 설정**: 예산 관리 페이지에서 월별 예산을 카테고리별로 설정
4. **거래내역 분류**: 거래내역 페이지에서 각 거래의 카테고리를 선택하여 예산 분석에 반영

## API 엔드포인트

### 계좌
- `GET /api/accounts` - 계좌 목록 조회
- `POST /api/accounts` - 계좌 등록
- `GET /api/accounts/:id` - 계좌 상세 조회
- `PUT /api/accounts/:id` - 계좌 수정
- `DELETE /api/accounts/:id` - 계좌 삭제

### 거래내역
- `GET /api/transactions` - 거래내역 조회 (필터링 지원)
- `GET /api/transactions/summary` - 거래내역 요약
- `PUT /api/transactions/:id/category` - 거래내역 카테고리 수정

### 예산
- `GET /api/budget` - 예산 목록 조회
- `POST /api/budget` - 예산 등록
- `PUT /api/budget/:id` - 예산 수정
- `DELETE /api/budget/:id` - 예산 삭제
- `GET /api/budget/analysis` - 예산 분석

### 국민은행 연동
- `POST /api/kb/sync/:accountNumber` - 계좌 동기화
- `GET /api/kb/accounts` - KB 계좌 목록 조회

## 라이선스

MIT
