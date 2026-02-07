# 🅿️ SafeParking

실시간 공영주차장 검색 및 KNSDK 3D 내비게이션을 지원하는 안드로이드 앱입니다.

## 📱 주요 기능

- **카카오맵 지도** — 주변 주차장 마커 표시, 경로 미리보기
- **장소 검색** — 카카오 로컬 API 통합 (주차장 + 일반 장소)
- **공영주차장 정보** — 공공데이터포털 API 연동 (전국 주차장)
- **KNSDK 3D 내비게이션** — 카카오모빌리티 턴바이턴 내비
- **AI 추천** — 주차장 AI 어시스턴트
- **현재 위치** — GPS 기반 내 위치 표시

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | React Native + Expo SDK 54 (bare workflow) |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Map | Kakao Maps JS SDK (WebView) |
| Navigation SDK | KNSDK UI SDK v1.12.7 |
| API | Kakao Local, Kakao Mobility, 공공데이터포털 |
| Build | Java 21, Kotlin 2.1.20, Gradle 8.14.3 |
| Target | Android (minSdk 26, targetSdk 35) |

## 📋 사전 준비

### 1. API 키 발급

| 키 | 발급처 | 용도 |
|----|--------|------|
| Kakao JavaScript 키 | [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 앱 키 | 지도 표시 |
| Kakao REST API 키 | 위와 동일 | 장소 검색, 길찾기 |
| Kakao Native App 키 | 위와 동일 | KNSDK 내비게이션 |
| 공공데이터 주차장 키 | [공공데이터포털](https://www.data.go.kr) → 국토교통부_전국 주차장 정보 | 주차장 데이터 |

### 2. 카카오 개발자 콘솔 설정

1. [Kakao Developers](https://developers.kakao.com)에서 애플리케이션 생성
2. **플랫폼** → Android 추가:
   - 패키지명: `com.triceratops.safeparking`
   - 키 해시: 본인 `debug.keystore`에서 추출한 값 등록
3. **키 해시 추출 방법**:
   ```bash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android | openssl dgst -sha1 -binary | openssl base64
   ```

### 3. 환경 설정

- **Java 21** 설치
- **Node.js 18+** 설치
- **Android SDK** (compileSdk 35)

## 🚀 설치 및 실행

### 1. 클론 및 의존성 설치
```bash
git clone https://github.com/rendezvousgo/KdigitalProject3Team.git
cd KdigitalProject3Team/gps
npm install
```

### 2. API 키 설정

**방법 A — `keys.js` 직접 수정 (간편)**

[gps/src/config/keys.js](gps/src/config/keys.js) 파일을 열어 키값을 본인 것으로 교체:

```javascript
export const KAKAO_JS_KEY = '본인_카카오_JavaScript_키';
export const KAKAO_REST_API_KEY = '본인_카카오_REST_API_키';
export const KAKAO_NATIVE_APP_KEY = '본인_카카오_Native_앱_키';
export const PARKING_API_KEY = '본인_공공데이터_주차장_API_키';
```

**방법 B — KNSDK Native 키 변경** (내비게이션 사용 시)

[gps/android/app/src/main/java/com/triceratops/safeparking/KNSDKModule.kt](gps/android/app/src/main/java/com/triceratops/safeparking/KNSDKModule.kt)에서:

```kotlin
const val KAKAO_NATIVE_APP_KEY = "본인_카카오_Native_앱_키"
```

### 3. 빌드 및 실행

```bash
# Expo prebuild (네이티브 프로젝트 생성)
npx expo prebuild --platform android --clean

# JS 번들 생성
npx expo export:embed --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# APK 빌드
cd android
./gradlew assembleDebug

# 디바이스에 설치 (USB 연결 필요)
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 📁 프로젝트 구조

```
KdigitalProject3Team/
├── README.md
├── backend/
└── gps/
    ├── src/
    │   ├── config/
    │   │   └── keys.js              # ⚠️ API 키 설정 (이 파일 수정)
    │   ├── components/
    │   │   ├── KakaoMapNative.js    # Android 카카오맵 (WebView)
    │   │   └── KakaoMapWeb.js       # Web 카카오맵
    │   ├── screens/
    │   │   ├── HomeScreen.js        # 메인 지도 화면
    │   │   ├── SearchScreen.js      # 검색 화면
    │   │   ├── AIAssistantScreen.js # AI 추천
    │   │   └── ProfileScreen.js     # 프로필
    │   ├── navigation/
    │   │   └── AppNavigator.js      # Stack + Tab 네비게이션
    │   └── services/
    │       ├── api.js               # API 호출 (카카오, 공공데이터)
    │       ├── navigation.js        # 카카오내비 연동
    │       ├── knsdkBridge.js       # KNSDK 브릿지
    │       └── eventBus.js          # 화면 간 이벤트 통신
    ├── android/
    │   └── app/src/main/java/com/triceratops/safeparking/
    │       ├── KNSDKModule.kt       # KNSDK 네이티브 모듈
    │       ├── KNNaviActivity.kt    # 내비 Activity
    │       └── MainApplication.kt   # KNSDK 초기화
    ├── .env.example                 # 환경변수 템플릿
    ├── app.config.js                # Expo 설정
    └── package.json
```

## ⚠️ 주의사항

- KNSDK 내비게이션을 사용하려면 **카카오 개발자 콘솔에 본인의 키 해시를 반드시 등록**해야 합니다.
- `debug.keystore`가 다르면 키 해시가 달라져 KNSDK 인증 실패(C103)가 발생합니다.
- 공공데이터 API는 일일 호출 제한(1,000건)이 있습니다.

## 📄 라이선스

이 프로젝트는 학습 목적으로 제작되었습니다.
