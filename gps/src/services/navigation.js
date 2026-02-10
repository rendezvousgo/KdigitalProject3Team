/**
 * 카카오내비 연동 서비스
 * 
 * 웹: 카카오맵 길찾기 페이지 열기
 * 모바일: 카카오내비 앱 URL Scheme → 없으면 카카오맵 웹으로 폴백
 */
import { Platform, Linking, Alert } from 'react-native';
import { getDirections, formatDistance, formatDuration } from './api';
import { KAKAO_JS_KEY } from '../config/keys';

/**
 * 카카오내비 앱 열기 (3D 내비게이션)
 * 
 * @param {object} origin  - { lat, lng, name? }
 * @param {object} dest    - { lat, lng, name? }
 */
export async function openKakaoNavi(origin, dest) {
  const destName = encodeURIComponent(dest.name || '목적지');

  if (Platform.OS === 'web') {
    // 웹에서는 카카오맵 길찾기 페이지로
    const url = `https://map.kakao.com/link/to/${destName},${dest.lat},${dest.lng}`;
    window.open(url, '_blank');
    return;
  }

  // 모바일: 카카오맵 앱 URL Scheme
  const kakaoMapUrl =
    `kakaomap://route?sp=${origin.lat},${origin.lng}&ep=${dest.lat},${dest.lng}&by=CAR`;

  // 카카오내비 앱이 설치되어 있으면 앱으로, 아니면 웹으로
  try {
    const canOpen = await Linking.canOpenURL(kakaoMapUrl);
    if (canOpen) {
      await Linking.openURL(kakaoMapUrl);
    } else {
      // 앱 미설치 → 웹 길찾기
      const webUrl = `https://map.kakao.com/link/to/${destName},${dest.lat},${dest.lng}`;
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    console.error('카카오내비 열기 실패:', err);
    // 최종 폴백
    const webUrl = `https://map.kakao.com/link/to/${destName},${dest.lat},${dest.lng}`;
    await Linking.openURL(webUrl);
  }
}

/**
 * 경로 좌표 가져오기 (지도에 Polyline 그리기용)
 * 
 * @param {object} origin - { lat, lng }
 * @param {object} dest   - { lat, lng }
 * @returns {{ path: [{lat, lng}], distance: number, duration: number }}
 */
export async function fetchRoutePath(origin, dest) {
  try {
    const result = await getDirections(origin, dest);

    // sections → roads → vertexes 에서 좌표 추출
    // vertexes는 [lng, lat, lng, lat, ...] 형태의 1차원 배열
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
      distance: result.distance, // 미터
      duration: result.duration, // 초
      distanceText: formatDistance(result.distance),
      durationText: formatDuration(result.duration),
    };
  } catch (error) {
    console.error('경로 조회 실패:', error);
    throw error;
  }
}
