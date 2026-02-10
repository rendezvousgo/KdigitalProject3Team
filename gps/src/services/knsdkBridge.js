/**
 * KNSDK ?ㅼ씠?곕툕 紐⑤뱢 釉뚮┸吏
 * 
 * Android: NativeModules.KNSDKModule (Kotlin)
 * Web: 移댁뭅?ㅻ㏊ ??留곹겕濡??대갚
 */
import { NativeModules, Platform, Linking } from 'react-native';

const { KNSDKModule } = NativeModules || {};

/**
 * KNSDK 珥덇린??(Android留?
 * ???쒖옉 ???쒕쾲 ?몄텧
 * @returns {{ success: boolean, error?: string }}
 */
export async function initKNSDK() {
  if (Platform.OS !== 'android' || !KNSDKModule) {
    console.log('KNSDK: ??iOS?먯꽌???ъ슜 遺덇?, ???대갚 ?ъ슜');
    return { success: false, error: '??iOS 誘몄??? };
  }

  try {
    const result = await KNSDKModule.initialize();
    console.log('KNSDK 珥덇린??', result);
    return { success: true };
  } catch (error) {
    console.error('KNSDK 珥덇린???ㅽ뙣:', error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * 3D ?대퉬寃뚯씠???쒖옉
 * 
 * Android: KNSDK 3D ?대퉬 ?붾㈃
 * Web: 移댁뭅?ㅻ㏊ 湲몄갼湲?????
 * 
 * @param {number} destLat - 紐⑹쟻吏 ?꾨룄
 * @param {number} destLng - 紐⑹쟻吏 寃쎈룄
 * @param {string} destName - 紐⑹쟻吏 ?대쫫
 */
export async function startNavigation(destLat, destLng, destName, startLat, startLng) {
  // Android: KNSDK 3D ?대퉬
  if (Platform.OS === 'android' && KNSDKModule) {
    try {
      const result = await KNSDKModule.startNavi(
        destLat, destLng, destName,
        startLat || 0, startLng || 0
      );
      console.log('?대퉬 ?쒖옉:', result);
      return { success: true, method: 'knsdk' };
    } catch (error) {
      console.error('KNSDK ?대퉬 ?ㅽ뙣, ???대갚:', error);
      // KNSDK ?ㅽ뙣 ??移댁뭅?ㅻ㏊ ?깆쑝濡??대갚
      return openKakaoMapFallback(destLat, destLng, destName);
    }
  }

  // Web / iOS: 移댁뭅?ㅻ㏊ ??留곹겕
  return openKakaoMapFallback(destLat, destLng, destName);
}

/**
 * ?대갚: 移댁뭅?ㅻ㏊ ?????닿린
 */
async function openKakaoMapFallback(destLat, destLng, destName) {
  const encodedName = encodeURIComponent(destName || '紐⑹쟻吏');

  if (Platform.OS === 'web') {
    const url = `https://map.kakao.com/link/to/${encodedName},${destLat},${destLng}`;
    window.open(url, '_blank');
    return { success: true, method: 'web' };
  }

  // 紐⑤컮?? 移댁뭅?ㅻ㏊ ??URL Scheme
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
 * KNSDK 珥덇린???곹깭 ?뺤씤
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
 * KNSDK ?곹깭 ?곸꽭 議고쉶 (?붾쾭洹몄슜)
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
 * ?고??????댁떆 議고쉶 (?붾쾭源낆슜)
 * ?깆쓽 ?ㅼ젣 ?쒕챸 ???댁떆瑜?媛?몄???移댁뭅??肄섏넄???깅줉???댁떆? 鍮꾧탳
 * @returns {{ packageName: string, keyHashes: string[], registeredHash: string }}
 */
export async function getKeyHash() {
  if (Platform.OS !== 'android' || !KNSDKModule) {
    return null;
  }
  try {
    return await KNSDKModule.getKeyHash();
  } catch (e) {
    console.error('???댁떆 議고쉶 ?ㅽ뙣:', e);
    return null;
  }
}
