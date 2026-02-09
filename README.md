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
   - 키 해시: 아래 방법으로 추출한 값을 등록
3. **키 해시 추출 방법** (레포에 포함된 `debug.keystore` 사용):
   ```bash
   # Linux / Mac
   keytool -exportcert -alias androiddebugkey -keystore android/app/debug.keystore -storepass android | openssl dgst -sha1 -binary | openssl base64

   # Windows (PowerShell)
   keytool -exportcert -alias androiddebugkey -keystore android\app\debug.keystore -storepass android | openssl dgst -sha1 -binary | openssl base64
   ```
   > 레포에 포함된 keystore의 키 해시: `Xo8WBi6jzSxKDVR4drqm84yr9iU=`
   > 이 키 해시를 카카오 개발자 콘솔에 등록하면 별도 keystore 없이 바로 사용 가능합니다.

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

[src/config/keys.js](src/config/keys.js) 파일을 열어 키값을 본인 것으로 교체:

```javascript
export const KAKAO_JS_KEY = '본인_카카오_JavaScript_키';
export const KAKAO_REST_API_KEY = '본인_카카오_REST_API_키';
export const KAKAO_NATIVE_APP_KEY = '본인_카카오_Native_앱_키';
export const PARKING_API_KEY = '본인_공공데이터_주차장_API_키';
```

**방법 B — KNSDK Native 키 변경** (내비게이션 사용 시)

[android/app/src/main/java/com/triceratops/safeparking/KNSDKModule.kt](android/app/src/main/java/com/triceratops/safeparking/KNSDKModule.kt)에서:

```kotlin
const val KAKAO_NATIVE_APP_KEY = "본인_카카오_Native_앱_키"
```

### 3. 빌드 및 실행

> ⚠️ `npx expo prebuild`는 **실행하지 마세요**. `android/` 디렉토리가 이미 레포에 포함되어 있으며, KNSDK 네이티브 모듈이 들어있어 prebuild를 실행하면 커스텀 코드가 모두 초기화됩니다.

```bash
# 1. assets 디렉토리 생성 (없을 경우)
mkdir -p android/app/src/main/assets

# 2. JS 번들 생성
npx expo export:embed --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# 3. APK 빌드
cd android
./gradlew assembleDebug          # Linux / Mac
.\gradlew.bat assembleDebug      # Windows

# 4. 디바이스에 설치 (USB 디버깅 연결 필요)
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**Windows PowerShell에서 빌드하는 경우:**
```powershell
# assets 디렉토리 생성
New-Item -ItemType Directory -Path "android\app\src\main\assets" -Force

# JS 번들 생성
npx expo export:embed --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# APK 빌드
cd android
.\gradlew.bat assembleDebug
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
- **레포에 포함된 `debug.keystore`의 키 해시**: `Xo8WBi6jzSxKDVR4drqm84yr9iU=`

## 🔧 트러블슈팅

### npm install 후 expo가 설치되지 않는 경우
```bash
# node_modules와 lock 파일 삭제 후 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### "export:embed is not an expo command" 오류
글로벌 레거시 `expo-cli`가 설치되어 있으면 로컬 expo를 가립니다:
```bash
# 글로벌 expo-cli 제거 (반드시!)
npm uninstall -g expo-cli
npm uninstall -g @expo/cli
```

### CMake "Permission denied" 오류 (Gradle 빌드 시)
이전 빌드에서 남은 캐시 파일 충돌:
```bash
# reanimated 빌드 캐시 삭제
rm -rf node_modules/react-native-reanimated/android/.cxx
rm -rf node_modules/react-native-reanimated/android/build
# Gradle 데몬 종료 후 재빌드
cd android && ./gradlew --stop && ./gradlew assembleDebug
```

### C 드라이브 용량 부족 시 Gradle 빌드 환경변수
```powershell
$env:GRADLE_USER_HOME="D:\gradle-home"
$env:TEMP="D:\build-temp"
$env:TMP="D:\build-temp"
$env:GRADLE_OPTS="-Djava.io.tmpdir=D:\build-temp -Xmx1536m"
```

## 📋 빌드 필수 환경 요약

| 항목 | 버전/설정 |
|------|-----------|
| Node.js | 18+ (v20 LTS 권장, v24는 호환성 이슈 가능) |
| Java | JDK 21 |
| Android SDK | compileSdk 35, minSdk 26 |
| NDK | 27.1.12297006 (Android Studio에서 설치) |
| CMake | 3.22.1 (Android Studio SDK Manager에서 설치) |
| Gradle | 8.14.3 (gradlew가 자동 다운로드) |
| Kotlin | 2.1.20 |
| expo-cli (글로벌) | **설치하면 안 됨** — 로컬 expo만 사용 |

## 📄 라이선스

이 프로젝트는 학습 목적으로 제작되었습니다.
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
