/**
 * KNSDK 네이티브 모듈 브릿지
 * 
 * Android: NativeModules.KNSDKModule (Kotlin)
 * Web: 카카오맵 웹 링크로 폴백
 */
import { NativeModules, Platform, Linking } from 'react-native';

const { KNSDKModule } = NativeModules || {};

/**
 * KNSDK 초기화 (Android만)
 * 앱 시작 시 한번 호출
 * @returns {{ success: boolean, error?: string }}
 */
export async function initKNSDK() {
  if (Platform.OS !== 'android' || !KNSDKModule) {
    console.log('KNSDK: 웹/iOS에서는 사용 불가, 웹 폴백 사용');
    return { success: false, error: '웹/iOS 미지원' };
  }

  try {
    const result = await KNSDKModule.initialize();
    console.log('KNSDK 초기화:', result);
    return { success: true };
  } catch (error) {
    console.error('KNSDK 초기화 실패:', error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * 3D 내비게이션 시작
 * 
 * Android: KNSDK 3D 내비 화면
 * Web: 카카오맵 길찾기 새 탭
 * 
 * @param {number} destLat - 목적지 위도
 * @param {number} destLng - 목적지 경도
 * @param {string} destName - 목적지 이름
 */
export async function startNavigation(destLat, destLng, destName, startLat, startLng) {
  // Android: KNSDK 3D 내비
  if (Platform.OS === 'android' && KNSDKModule) {
    try {
      const result = await KNSDKModule.startNavi(
        destLat, destLng, destName,
        startLat || 0, startLng || 0
      );
      console.log('내비 시작:', result);
      return { success: true, method: 'knsdk' };
    } catch (error) {
      console.error('KNSDK 내비 실패, 웹 폴백:', error);
      // KNSDK 실패 시 카카오맵 앱으로 폴백
      return openKakaoMapFallback(destLat, destLng, destName);
    }
  }

  // Web / iOS: 카카오맵 웹 링크
  return openKakaoMapFallback(destLat, destLng, destName);
}

/**
 * 폴백: 카카오맵 웹/앱 열기
 */
async function openKakaoMapFallback(destLat, destLng, destName) {
  const encodedName = encodeURIComponent(destName || '목적지');

  if (Platform.OS === 'web') {
    const url = `https://map.kakao.com/link/to/${encodedName},${destLat},${destLng}`;
    window.open(url, '_blank');
    return { success: true, method: 'web' };
  }

  // 모바일: 카카오맵 앱 URL Scheme
  const kakaoMapUrl = `kakaomap://route?sp=&ep=${destLat},${destLng}&by=CAR`;
  const webUrl = `https://map.kakao.com/link/to/${encodedName},${destLat},${destLng}`;

  try {
    const canOpen = await Linking.canOpenURL(kakaoMapUrl);
    if (canOpen) {
      await Linking.openURL(kakaoMapUrl);
      return { success: true, method: 'kakaomap_app' };
    }
  } catch (e) {
    // ignore
  }

  await Linking.openURL(webUrl);
  return { success: true, method: 'web' };
}

/**
 * KNSDK 초기화 상태 확인
 */
export async function isKNSDKReady() {
  if (Platform.OS !== 'android' || !KNSDKModule) return false;
  try {
    return await KNSDKModule.isReady();
  } catch {
    return false;
  }
}

/**
 * KNSDK 상태 상세 조회 (디버그용)
 * @returns {{ initialized: boolean, error: string|null }}
 */
export async function getKNSDKStatus() {
  if (Platform.OS !== 'android' || !KNSDKModule) {
    return { initialized: false, error: 'Not Android' };
  }
  try {
    return await KNSDKModule.getInitStatus();
  } catch (e) {
    return { initialized: false, error: e.message };
  }
}

/**
 * 런타임 키 해시 조회 (디버깅용)
 * 앱의 실제 서명 키 해시를 가져와서 카카오 콘솔에 등록된 해시와 비교
 * @returns {{ packageName: string, keyHashes: string[], registeredHash: string }}
 */
export async function getKeyHash() {
  if (Platform.OS !== 'android' || !KNSDKModule) {
    return null;
  }
  try {
    return await KNSDKModule.getKeyHash();
  } catch (e) {
    console.error('키 해시 조회 실패:', e);
    return null;
  }
}
