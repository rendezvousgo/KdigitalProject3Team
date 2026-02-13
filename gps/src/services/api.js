/**
 * SafeParking API 서비스
 */

//음성시스템

import { KAKAO_REST_API_KEY, PARKING_API_KEY } from '../config/keys';
import { BACKEND_BASE_URL } from '../config/backend';

const KAKAO_API_KEY = KAKAO_REST_API_KEY;

/**
 * Kakao coord2regioncode: 좌표 -> region_1depth_name
 */
export async function getRegion1DepthName(x, y) {
  const params = new URLSearchParams({ x: String(x), y: String(y) });
  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?${params}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
        },
      }
    );
    if (!response.ok) throw new Error('좌표->행정구역 변환 실패');
    const data = await response.json();
    const doc = data.documents?.[0];
    return doc?.region_1depth_name || null;
  } catch (error) {
    console.error('coord2regioncode API 오류:', error);
    return null;
  }
}

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
    'cond[주차장구분::EQ]': '공영',
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
export async function findNearbyParkingLots(lat, lng, radiusKm = 30) {
  try {
    const region1 = await getRegion1DepthName(lng, lat);
    cachedRegion1 = region1 || cachedRegion1;
    let allLots = await getParkingLots(region1 || '서울특별시');

    // 해당 지역 주차장이 너무 적으면 인접 지역도 검색
    if (allLots.length < 20) {
      const adjacentRegions = getAdjacentRegions(region1);
      for (const adjRegion of adjacentRegions) {
        try {
          const adjLots = await getParkingLots(adjRegion);
          const existingIds = new Set(allLots.map(l => l.id));
          for (const lot of adjLots) {
            if (!existingIds.has(lot.id)) allLots.push(lot);
          }
        } catch (_) {}
      }
    }
    
    const withDist = allLots
      .map(lot => {
        const distance = calculateDistance(lat, lng, lot.lat, lot.lng);
        return { ...lot, distance };
      })
      .filter(lot => lot.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // 중복 제거: 이름+좌표(소수점3자리) 기준
    const seen = new Set();
    const deduped = [];
    for (const lot of withDist) {
      const key = `${lot.name}|${lot.lat?.toFixed(3)}|${lot.lng?.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(lot);
    }

    return deduped.slice(0, 100);
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
    })).sort((a, b) => {
      // ★ 키워드와 정확히 일치하는 이름을 최우선 (예: "천안시청" → "천안시청사" > "천안시티FC")
      const kwLower = keyword.toLowerCase();
      const aExact = a.name.toLowerCase().includes(kwLower) ? 1 : 0;
      const bExact = b.name.toLowerCase().includes(kwLower) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return 0; // 같으면 기존 순서(거리순) 유지
    });
  } catch (error) {
    console.error('장소 검색 오류:', error);
    return [];
  }
}

/**
 * 공영주차장 이름/주소 키워드 검색
 */
let parkingCache = null;
let cachedRegion1 = null;
export async function searchParkingByName(keyword) {
  try {
    if (!parkingCache) {
      parkingCache = await getParkingLots(cachedRegion1 || '서울특별시');
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
 * 인접 지역 매핑 (공공데이터 API 지역구분 기준)
 * 해당 지역에 주차장 데이터가 부족할 때 인접 지역도 함께 검색
 */
function getAdjacentRegions(region) {
  const map = {
    '서울특별시': ['경기도', '인천광역시'],
    '경기도': ['서울특별시', '인천광역시', '충청남도', '충청북도', '강원도'],
    '인천광역시': ['서울특별시', '경기도'],
    '부산광역시': ['경상남도', '울산광역시'],
    '대구광역시': ['경상북도', '경상남도'],
    '대전광역시': ['충청남도', '충청북도', '세종시'],
    '광주광역시': ['전라남도', '전라북도'],
    '울산광역시': ['부산광역시', '경상남도', '경상북도'],
    '세종시': ['대전광역시', '충청남도', '충청북도'],
    '충청남도': ['대전광역시', '세종시', '충청북도', '경기도', '전라북도'],
    '충청북도': ['대전광역시', '세종시', '충청남도', '경기도', '경상북도', '강원도'],
    '전라남도': ['광주광역시', '전라북도', '경상남도'],
    '전라북도': ['광주광역시', '전라남도', '충청남도', '경상남도'],
    '경상남도': ['부산광역시', '울산광역시', '대구광역시', '전라남도', '전라북도'],
    '경상북도': ['대구광역시', '울산광역시', '충청북도', '강원도'],
    '강원도': ['경기도', '충청북도', '경상북도'],
    '제주시': [],
  };
  return map[region] || [];
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

export async function favorite(parkingName) {
  const params = new URLSearchParams({ parkingName: String(parkingName || '') });
  const response = await fetch(`${BACKEND_BASE_URL}/api/favorite/check?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'favorite 요청 실패');
  }
  return response.json();
}

export async function favoriteSave(payload) {
  const body = {
    parkingName: payload?.parkingName || payload?.name || '',
    latitude: payload?.latitude ?? payload?.lat ?? null,
    longitude: payload?.longitude ?? payload?.lng ?? null,
    address: payload?.address || '',
  };

  const response = await fetch(`${BACKEND_BASE_URL}/api/favorite/add`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'favoriteSave 요청 실패');
  }
  const ct = response.headers.get('content-type') || '';
  return ct.includes('application/json') ? response.json() : null;
}

export async function favoriteList(lat, lng) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/favorite/list`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'favoriteList 요청 실패');
  }

  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function favoriteRemove(parkingName) {
  const params = new URLSearchParams({ parkingName: String(parkingName || '') });
  const response = await fetch(`${BACKEND_BASE_URL}/api/favorite/remove?${params.toString()}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'favoriteRemove 요청 실패');
  }
  return true;
}
