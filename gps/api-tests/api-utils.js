/**
 * SafeParking - API ?좏떥由ы떚 ?⑥닔
 * 
 * ?ㅼ젣 ?깆뿉???ъ슜??API ?섑띁 ?⑥닔??
 */

require('dotenv').config();
const fetch = require('node-fetch');

// API ?ㅼ젙
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
 * 移댁뭅??紐⑤퉴由ы떚 API
 * ============================================
 */

/**
 * ?먮룞李?湲몄갼湲?
 * @param {Object} origin - 異쒕컻吏 { x, y, name? }
 * @param {Object} destination - 紐⑹쟻吏 { x, y, name? }
 * @param {Object} options - ?듭뀡
 * @returns {Promise<Object>} 寃쎈줈 ?뺣낫
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
 * 寃쎈줈 ?붿빟 ?뺣낫 異붿텧
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
    distance: summary.distance, // 誘명꽣
    distanceKm: (summary.distance / 1000).toFixed(1),
    duration: summary.duration, // 珥?
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
  return hours > 0 ? `${hours}?쒓컙 ${remainMins}遺? : `${remainMins}遺?;
}

/**
 * ============================================
 * 怨듦났?곗씠??- 二쇱감??API
 * ============================================
 */

/**
 * 二쇱감??紐⑸줉 議고쉶
 * @param {Object} options - 議고쉶 ?듭뀡
 * @returns {Promise<Object>} 二쇱감??紐⑸줉
 */
async function getParkingLots(options = {}) {
  const params = new URLSearchParams({
    page: options.page || 1,
    perPage: options.perPage || 100,
    serviceKey: CONFIG.parking.apiKey,
  });

  if (options.region) {
    params.append('cond[吏??뎄遺?:EQ]', options.region);
  }
  if (options.subRegion) {
    params.append('cond[吏??뎄遺?sub::EQ]', options.subRegion);
  }

  const response = await fetch(`${CONFIG.parking.baseUrl}?${params}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) throw new Error(`Parking API Error: ${response.status}`);
  return response.json();
}

/**
 * ?뱀젙 醫뚰몴 二쇰? 二쇱감??寃??
 * @param {number} lat - ?꾨룄
 * @param {number} lng - 寃쎈룄
 * @param {number} radiusKm - 寃??諛섍꼍 (km)
 * @param {Object} options - 異붽? ?듭뀡
 */
async function findNearbyParkingLots(lat, lng, radiusKm = 1, options = {}) {
  // ?꾩껜 ?곗씠?곗뿉???꾪꽣留?(怨듦났?곗씠??API???꾩튂寃??誘몄???
  const result = await getParkingLots({
    page: 1,
    perPage: 1000,
    region: options.region,
    subRegion: options.subRegion,
  });

  if (!result.data) return [];

  return result.data
    .map(lot => {
      const lotLat = parseFloat(lot['?꾨룄']);
      const lotLng = parseFloat(lot['寃쎈룄']);
      if (isNaN(lotLat) || isNaN(lotLng)) return null;

      const distance = calculateDistance(lat, lng, lotLat, lotLng);
      return {
        id: lot['二쇱감?κ?由щ쾲??],
        name: lot['二쇱감?λ챸'],
        address: lot['二쇱감?λ룄濡쒕챸二쇱냼'] || lot['二쇱감?μ?踰덉＜??],
        type: lot['二쇱감?κ뎄遺?],
        capacity: parseInt(lot['二쇱감援ы쉷??]) || 0,
        feeInfo: lot['?붽툑?뺣낫'],
        weekdayHours: `${lot['?됱씪?댁쁺?쒖옉?쒓컖'] || '?'} ~ ${lot['?됱씪?댁쁺醫낅즺?쒓컖'] || '?'}`,
        saturdayHours: `${lot['?좎슂?쇱슫?곸떆?묒떆媛?] || '?'} ~ ${lot['?좎슂?쇱슫?곸쥌猷뚯떆媛?] || '?'}`,
        holidayHours: `${lot['怨듯쑕?쇱슫?곸떆?묒떆媛?] || '?'} ~ ${lot['怨듯쑕?쇱슫?곸쥌猷뚯떆媛?] || '?'}`,
        phone: lot['?곕씫泥?],
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
 * ??醫뚰몴 媛?嫄곕━ 怨꾩궛 (Haversine)
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
 * ?듯빀 湲곕뒫
 * ============================================
 */

/**
 * 紐⑹쟻吏 洹쇱쿂 ?덉쟾??二쇱감??李얘린 + 寃쎈줈 ?덈궡
 * (?⑥냽移대찓???뚰뵾 湲곕뒫? 異뷀썑 援ы쁽)
 */
async function findSafeParkingWithRoute(currentLocation, destination, options = {}) {
  // 1. 紐⑹쟻吏 二쇰? 二쇱감??寃??
  const nearbyParkings = await findNearbyParkingLots(
    destination.lat,
    destination.lng,
    options.searchRadius || 0.5 // 湲곕낯 500m
  );

  if (nearbyParkings.length === 0) {
    return { success: false, message: '二쇰? 二쇱감?μ쓣 李얠쓣 ???놁뒿?덈떎.' };
  }

  // 2. 媛?二쇱감?κ퉴吏??寃쎈줈 怨꾩궛
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

  // 3. ?뺣젹 (嫄곕━ + ?뚯슂?쒓컙 怨좊젮)
  const sorted = parkingsWithRoute
    .filter(p => p.route && !p.route.error)
    .sort((a, b) => {
      // ?꾨낫嫄곕━? ?댁쟾?쒓컙 媛以??됯퇏
      const scoreA = a.distance * 0.5 + (a.route.durationMin / 60) * 0.5;
      const scoreB = b.distance * 0.5 + (b.route.durationMin / 60) * 0.5;
      return scoreA - scoreB;
    });

  return {
    success: true,
    totalFound: nearbyParkings.length,
    recommendations: sorted.slice(0, 3),
    message: `${nearbyParkings.length}媛쒖쓽 二쇱감?μ쓣 李얠븯?듬땲??`,
  };
}

// 紐⑤뱢 ?대낫?닿린
module.exports = {
  // 移댁뭅??
  getDirections,
  extractRouteSummary,
  
  // 二쇱감??
  getParkingLots,
  findNearbyParkingLots,
  
  // ?듯빀
  findSafeParkingWithRoute,
  
  // ?좏떥
  calculateDistance,
};
