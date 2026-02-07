# SafeParking API 테스트

## 테스트할 API 목록

### 1. 카카오 모빌리티 - 길찾기 API
- **엔드포인트**: `GET https://apis-navi.kakaomobility.com/v1/directions`
- **인증**: `Authorization: KakaoAK ${REST_API_KEY}`
- **용도**: 출발지→목적지 경로 탐색, 소요시간/거리/요금 정보

### 2. 공공데이터포털 - 전국공영주차장 API ✅
- **엔드포인트**: `GET https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08`
- **인증**: `serviceKey={API_KEY}`
- **용도**: 전국 공영주차장 위치, 요금, 운영시간 정보
- **현황**: 전국 12,805개 주차장 데이터 (서울 963개)

### 3. 공공데이터포털 - 전국주정차금지구역 API ⏸️
- **상태**: API 키 미발급 (별도 신청 필요)
- **용도**: 주정차 단속구역 위치 및 시간 정보
- **대안**: 
  - 서울시 TOPIS API (무인단속카메라)
  - 지자체별 공공데이터 활용
  - 크롤링 + 직접 DB 구축

---

## 환경 설정

1. `.env` 파일 생성 후 API 키 입력:
```
KAKAO_REST_API_KEY=your_kakao_api_key
DATA_GO_KR_API_KEY=12c33f1f2031e472d53c16e17a495f09d6d47184c0de9d1508a199265d36b56f
```

2. 의존성 설치:
```bash
npm install
```

3. 테스트 실행:
```bash
npm run test:parking    # 공영주차장 API (작동확인 ✅)
npm run test:kakao       # 카카오 길찾기 (API 키 필요)
```

---

## 테스트 결과

### ✅ 공영주차장 API
- 전국 12,805개 주차장
- 지역/구 필터링 가능
- 위치기반 검색은 클라이언트 사이드 처리 (거리계산)
