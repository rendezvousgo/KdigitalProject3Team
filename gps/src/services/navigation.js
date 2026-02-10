/**
 * 移댁뭅?ㅻ궡鍮??곕룞 ?쒕퉬??
 * 
 * ?? 移댁뭅?ㅻ㏊ 湲몄갼湲??섏씠吏 ?닿린
 * 紐⑤컮?? 移댁뭅?ㅻ궡鍮???URL Scheme ???놁쑝硫?移댁뭅?ㅻ㏊ ?뱀쑝濡??대갚
 */
import { Platform, Linking, Alert } from 'react-native';
import { getDirections, formatDistance, formatDuration } from './api';
import { KAKAO_JS_KEY } from '../config/keys';

/**
 * 移댁뭅?ㅻ궡鍮????닿린 (3D ?대퉬寃뚯씠??
 * 
 * @param {object} origin  - { lat, lng, name? }
 * @param {object} dest    - { lat, lng, name? }
 */
export async function openKakaoNavi(origin, dest) {
  const destName = encodeURIComponent(dest.name || '紐⑹쟻吏');

  if (Platform.OS === 'web') {
    // ?뱀뿉?쒕뒗 移댁뭅?ㅻ㏊ 湲몄갼湲??섏씠吏濡?
    const url = `https://map.kakao.com/link/to/${destName},${dest.lat},${dest.lng}`;
    window.open(url, '_blank');
    return;
  }

  // 紐⑤컮?? 移댁뭅?ㅻ㏊ ??URL Scheme
  const kakaoMapUrl =
    `kakaomap://route?sp=${origin.lat},${origin.lng}&ep=${dest.lat},${dest.lng}&by=CAR`;

  // 移댁뭅?ㅻ궡鍮??깆씠 ?ㅼ튂?섏뼱 ?덉쑝硫??깆쑝濡? ?꾨땲硫??뱀쑝濡?
  try {
    const canOpen = await Linking.canOpenURL(kakaoMapUrl);
    if (canOpen) {
      await Linking.openURL(kakaoMapUrl);
    } else {
      // ??誘몄꽕移?????湲몄갼湲?
      const webUrl = `https://map.kakao.com/link/to/${destName},${dest.lat},${dest.lng}`;
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    console.error('移댁뭅?ㅻ궡鍮??닿린 ?ㅽ뙣:', err);
    // 理쒖쥌 ?대갚
    const webUrl = `https://map.kakao.com/link/to/${destName},${dest.lat},${dest.lng}`;
    await Linking.openURL(webUrl);
  }
}

/**
 * 寃쎈줈 醫뚰몴 媛?몄삤湲?(吏?꾩뿉 Polyline 洹몃━湲곗슜)
 * 
 * @param {object} origin - { lat, lng }
 * @param {object} dest   - { lat, lng }
 * @returns {{ path: [{lat, lng}], distance: number, duration: number }}
 */
export async function fetchRoutePath(origin, dest) {
  try {
    const result = await getDirections(origin, dest);

    // sections ??roads ??vertexes ?먯꽌 醫뚰몴 異붿텧
    // vertexes??[lng, lat, lng, lat, ...] ?뺥깭??1李⑥썝 諛곗뿴
    const path = [];
    for (const section of result.sections || []) {
      for (const road of section.roads || []) {
        const v = road.vertexes || [];
        for (let i = 0; i < v.length; i += 2) {
          path.push({ lng: v[i], lat: v[i + 1] });
        }
      }
    }

    return {
      path,
      distance: result.distance, // 誘명꽣
      duration: result.duration, // 珥?
      distanceText: formatDistance(result.distance),
      durationText: formatDuration(result.duration),
    };
  } catch (error) {
    console.error('寃쎈줈 議고쉶 ?ㅽ뙣:', error);
    throw error;
  }
}
