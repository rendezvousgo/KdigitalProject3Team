/**
 * SafeParking - API 유틸리티 함수
 * 
 * 실제 앱에서 사용할 API 래퍼 함수들
 */

require('dotenv').config();
const fetch = require('node-fetch');

// API 설정
const CONFIG = {
  kakao: {
    baseUrl: 'https://apis-navi.kakaomobility.com/v1',
    apiKey: process.env.KAKAO_REST_API_KEY,
  },
  parking: {
    baseUrl: 'https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08',
    apiKey: process.env.DATA_GO_KR_API_KEY,
  },
};

/**
 * ============================================
 * 카카오 모빌리티 API
 * ============================================
 */

/**
 * 자동차 길찾기
 * @param {Object} origin - 출발지 { x, y, name? }
 * @param {Object} destination - 목적지 { x, y, name? }
 * @param {Object} options - 옵션
 * @returns {Promise<Object>} 경로 정보
 */
async function getDirections(origin, destination, options = {}) {
  const params = new URLSearchParams({
    origin: `${origin.x},${origin.y}`,
    destination: `${destination.x},${destination.y}`,
    priority: options.priority || 'RECOMMEND',
    car_fuel: options.carFuel || 'GASOLINE',
    car_hipass: String(options.hipass || false),
    alternatives: String(options.alternatives || false),
    summary: String(options.summary || false),
  });

  if (options.waypoints) {
    params.append('waypoints', options.waypoints.map(w => `${w.x},${w.y}`).join('|'));
  }
  if (options.avoid) {
    params.append('avoid', options.avoid);
  }

  const response = await fetch(`${CONFIG.kakao.baseUrl}/directions?${params}`, {
    headers: {
      'Authorization': `KakaoAK ${CONFIG.kakao.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error(`Kakao API Error: ${response.status}`);
  return response.json();
}

/**
 * 경로 요약 정보 추출
 */
function extractRouteSummary(directionsResult) {
  if (!directionsResult.routes || directionsResult.routes.length === 0) {
    return null;
  }

  const route = directionsResult.routes[0];
  if (route.result_code !== 0) {
    return { error: route.result_msg };
  }

  const summary = route.summary;
  return {
    distance: summary.distance, // 미터
    distanceKm: (summary.distance / 1000).toFixed(1),
    duration: summary.duration, // 초
    durationMin: Math.round(summary.duration / 60),
    durationText: formatDuration(summary.duration),
    taxiFare: summary.fare.taxi,
    tollFare: summary.fare.toll,
    priority: summary.priority,
  };
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return hours > 0 ? `${hours}시간 ${remainMins}분` : `${remainMins}분`;
}

/**
 * ============================================
 * 공공데이터 - 주차장 API
 * ============================================
 */

/**
 * 주차장 목록 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 주차장 목록
 */
async function getParkingLots(options = {}) {
  const params = new URLSearchParams({
    page: options.page || 1,
    perPage: options.perPage || 100,
    serviceKey: CONFIG.parking.apiKey,
  });

  if (options.region) {
    params.append('cond[지역구분::EQ]', options.region);
  }
  if (options.subRegion) {
    params.append('cond[지역구분_sub::EQ]', options.subRegion);
  }

  const response = await fetch(`${CONFIG.parking.baseUrl}?${params}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) throw new Error(`Parking API Error: ${response.status}`);
  return response.json();
}

/**
 * 특정 좌표 주변 주차장 검색
 * @param {number} lat - 위도
 * @param {number} lng - 경도
 * @param {number} radiusKm - 검색 반경 (km)
 * @param {Object} options - 추가 옵션
 */
async function findNearbyParkingLots(lat, lng, radiusKm = 1, options = {}) {
  // 전체 데이터에서 필터링 (공공데이터 API는 위치검색 미지원)
  const result = await getParkingLots({
    page: 1,
    perPage: 1000,
    region: options.region,
    subRegion: options.subRegion,
  });

  if (!result.data) return [];

  return result.data
    .map(lot => {
      const lotLat = parseFloat(lot['위도']);
      const lotLng = parseFloat(lot['경도']);
      if (isNaN(lotLat) || isNaN(lotLng)) return null;

      const distance = calculateDistance(lat, lng, lotLat, lotLng);
      return {
        id: lot['주차장관리번호'],
        name: lot['주차장명'],
        address: lot['주차장도로명주소'] || lot['주차장지번주소'],
        type: lot['주차장구분'],
        capacity: parseInt(lot['주차구획수']) || 0,
        feeInfo: lot['요금정보'],
        weekdayHours: `${lot['평일운영시작시각'] || '?'} ~ ${lot['평일운영종료시각'] || '?'}`,
        saturdayHours: `${lot['토요일운영시작시각'] || '?'} ~ ${lot['토요일운영종료시각'] || '?'}`,
        holidayHours: `${lot['공휴일운영시작시각'] || '?'} ~ ${lot['공휴일운영종료시각'] || '?'}`,
        phone: lot['연락처'],
        lat: lotLat,
        lng: lotLng,
        distance: distance, // km
        distanceM: Math.round(distance * 1000), // m
      };
    })
    .filter(lot => lot && lot.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * 두 좌표 간 거리 계산 (Haversine)
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
 * ============================================
 * 통합 기능
 * ============================================
 */

/**
 * 목적지 근처 안전한 주차장 찾기 + 경로 안내
 * (단속카메라 회피 기능은 추후 구현)
 */
async function findSafeParkingWithRoute(currentLocation, destination, options = {}) {
  // 1. 목적지 주변 주차장 검색
  const nearbyParkings = await findNearbyParkingLots(
    destination.lat,
    destination.lng,
    options.searchRadius || 0.5 // 기본 500m
  );

  if (nearbyParkings.length === 0) {
    return { success: false, message: '주변 주차장을 찾을 수 없습니다.' };
  }

  // 2. 각 주차장까지의 경로 계산
  const parkingsWithRoute = await Promise.all(
    nearbyParkings.slice(0, 5).map(async (parking) => {
      try {
        const directions = await getDirections(
          { x: currentLocation.lng, y: currentLocation.lat },
          { x: parking.lng, y: parking.lat },
          { priority: options.priority || 'RECOMMEND' }
        );
        const routeSummary = extractRouteSummary(directions);
        return { ...parking, route: routeSummary };
      } catch (error) {
        return { ...parking, route: null };
      }
    })
  );

  // 3. 정렬 (거리 + 소요시간 고려)
  const sorted = parkingsWithRoute
    .filter(p => p.route && !p.route.error)
    .sort((a, b) => {
      // 도보거리와 운전시간 가중 평균
      const scoreA = a.distance * 0.5 + (a.route.durationMin / 60) * 0.5;
      const scoreB = b.distance * 0.5 + (b.route.durationMin / 60) * 0.5;
      return scoreA - scoreB;
    });

  return {
    success: true,
    totalFound: nearbyParkings.length,
    recommendations: sorted.slice(0, 3),
    message: `${nearbyParkings.length}개의 주차장을 찾았습니다.`,
  };
}

// 모듈 내보내기
module.exports = {
  // 카카오
  getDirections,
  extractRouteSummary,
  
  // 주차장
  getParkingLots,
  findNearbyParkingLots,
  
  // 통합
  findSafeParkingWithRoute,
  
  // 유틸
  calculateDistance,
};
