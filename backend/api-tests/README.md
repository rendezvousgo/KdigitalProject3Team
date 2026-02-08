# Backend API Tests

Spring 백엔드(`/api/*`) 엔드포인트를 검증하는 테스트입니다.

## 준비

1. 백엔드 서버 실행 (`http://localhost:8080`)
2. 필요 시 `.env.example`을 복사해 `.env` 생성 후 `BACKEND_BASE_URL` 지정

## 실행

```bash
npm install
npm run test:directions
npm run test:parking
npm run test:no-parking
npm run test:all
```

## 테스트 대상

- `GET /api/directions`
- `GET /api/parking-lots/nearby`
- `GET /api/no-parking-zones`
