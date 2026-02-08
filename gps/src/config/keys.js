import { Platform } from 'react-native';

/**
 * SafeParking API key config
 *
 * 카카오 JavaScript 키 (지도 표시용)
 * 카카오 Native App 키 (KNSDK 내비게이션)
 * 백엔드 주소 (앱 -> 스프링 API 호출)
 *
 * 참고:
 * - 카카오 REST API 키 / 공공데이터 API 키는 backend/application.properties 에 설정
 */

// 카카오 JavaScript 키 (지도 표시용)
export const KAKAO_JS_KEY = 'cee5b53c5c7281c8f10ddb637154c719';

// 카카오 Native App 키 (KNSDK 내비게이션)
export const KAKAO_NATIVE_APP_KEY = 'dddfdc16fa2617b16c4ee0125f816293';

// 백엔드 주소
// 안드로이드 에뮬레이터: http://10.0.2.2:8080
// 실기기: http://<내PC-IP>:8080
const ENV_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
const DEFAULT_BACKEND_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export const BACKEND_BASE_URL = ENV_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL;
