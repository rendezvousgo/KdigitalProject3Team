/**
 * SafeParking API 서비스
 */
import { KAKAO_REST_API_KEY, PARKING_API_KEY } from '../config/keys';

const KAKAO_API_KEY = KAKAO_REST_API_KEY;

/**
 * 카카오 모빌리티 - 길찾기
 */
export async function getDirections(origin, destination, options = {}) {
  const params = new URLSearchParams({
    origin: `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    priority: options.priority || 'RECOMMEND',
  });

  if (options.waypoints) {
    params.append('waypoints', options.waypoints.map(w => `${w.lng},${w.lat}`).join('|'));
  }

  try {
    const response = await fetch(
      `https://apis-navi.kakaomobility.com/v1/directions?${params}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) throw new Error('길찾기 실패');
    
    const data = await response.json();
    const route = data.routes?.[0];
    
    if (!route || route.result_code !== 0) {
      throw new Error(route?.result_msg || '경로를 찾을 수 없습니다');
    }

    return {
      distance: route.summary.distance, // 미터
      duration: route.summary.duration, // 초
      fare: route.summary.fare,
      sections: route.sections,
    };
  } catch (error) {
    console.error('길찾기 API 오류:', error);
    throw error;
  }
}

/**
 * 공영주차장 목록 조회
 */
export async function getParkingLots(region = null, subRegion = null) {
  const params = new URLSearchParams({
    page: 1,
    perPage: 1000,
    serviceKey: PARKING_API_KEY,
  });

  if (region) {
    params.append('cond[지역구분::EQ]', region);
  }
  if (subRegion) {
    params.append('cond[지역구분_sub::EQ]', subRegion);
  }

  try {
    const response = await fetch(
      `https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08?${params}`
    );

    if (!response.ok) throw new Error('주차장 조회 실패');
    
    const data = await response.json();
    
    return (data.data || []).map(lot => ({
      id: lot['주차장관리번호'],
      name: lot['주차장명'],
      address: lot['주차장도로명주소'] || lot['주차장지번주소'],
      lat: parseFloat(lot['위도']),
      lng: parseFloat(lot['경도']),
      capacity: parseInt(lot['주차구획수']) || 0,
      fee: lot['요금정보'],
      weekdayHours: `${lot['평일운영시작시각'] || '?'} ~ ${lot['평일운영종료시각'] || '?'}`,
      phone: lot['연락처'],
    })).filter(lot => !isNaN(lot.lat) && !isNaN(lot.lng));
  } catch (error) {
    console.error('주차장 API 오류:', error);
    throw error;
  }
}

/**
 * 특정 좌표 주변 주차장 찾기
 */
export async function findNearbyParkingLots(lat, lng, radiusKm = 1) {
  try {
    // 서울 데이터만 가져오기 (전체는 너무 많음)
    const allLots = await getParkingLots('서울특별시');
    
    return allLots
      .map(lot => {
        const distance = calculateDistance(lat, lng, lot.lat, lot.lng);
        return { ...lot, distance };
      })
      .filter(lot => lot.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // 최대 20개
  } catch (error) {
    console.error('주변 주차장 검색 오류:', error);
    return [];
  }
}

/**
 * 카카오 Local 키워드 검색 (장소 검색)
 */
export async function searchPlaces(keyword, lat, lng) {
  const params = new URLSearchParams({
    query: keyword,
    size: '15',
  });
  if (lat && lng) {
    params.append('y', String(lat));
    params.append('x', String(lng));
    params.append('sort', 'distance');
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
        },
      }
    );

    if (!response.ok) throw new Error('장소 검색 실패');
    const data = await response.json();

    return (data.documents || []).map(doc => ({
      id: doc.id,
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      category: doc.category_group_name || '',
      phone: doc.phone || '',
      distance: doc.distance ? parseInt(doc.distance) : null,
      type: 'place',
    }));
  } catch (error) {
    console.error('장소 검색 오류:', error);
    return [];
  }
}

/**
 * 공영주차장 이름/주소 키워드 검색
 */
let parkingCache = null;
export async function searchParkingByName(keyword) {
  try {
    if (!parkingCache) {
      parkingCache = await getParkingLots('서울특별시');
    }
    const kw = keyword.toLowerCase();
    return parkingCache
      .filter(lot => lot.name.toLowerCase().includes(kw) || (lot.address && lot.address.toLowerCase().includes(kw)))
      .slice(0, 15)
      .map(lot => ({ ...lot, type: 'parking' }));
  } catch (error) {
    console.error('주차장 검색 오류:', error);
    return [];
  }
}

/**
 * 두 좌표 간 거리 계산 (km)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * 거리 포맷팅
 */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 시간 포맷팅
 */
export function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return hours > 0 ? `${hours}시간 ${remainMins}분` : `${remainMins}분`;
}
