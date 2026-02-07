/**
 * 카카오 모빌리티 - 자동차 길찾기 API 테스트
 * 
 * 엔드포인트: GET https://apis-navi.kakaomobility.com/v1/directions
 * 문서: https://developers.kakaomobility.com/docs/navi-api/directions/
 */

require('dotenv').config();
const fetch = require('node-fetch');

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const BASE_URL = 'https://apis-navi.kakaomobility.com/v1/directions';

// 테스트용 좌표 (서울 주요 지점)
const TEST_LOCATIONS = {
  gangnamStation: { x: 127.027619, y: 37.497942, name: '강남역' },
  seoulStation: { x: 126.972559, y: 37.556067, name: '서울역' },
  cityHall: { x: 126.977829, y: 37.566535, name: '서울시청' },
  hongdae: { x: 126.924191, y: 37.556973, name: '홍대입구역' },
};

/**
 * 길찾기 API 호출
 */
async function getDirections(origin, destination, options = {}) {
  const params = new URLSearchParams({
    origin: `${origin.x},${origin.y}`,
    destination: `${destination.x},${destination.y}`,
    priority: options.priority || 'RECOMMEND', // RECOMMEND, TIME, DISTANCE
    car_fuel: options.carFuel || 'GASOLINE',
    car_hipass: options.hipass || 'false',
    alternatives: options.alternatives || 'false',
    road_details: options.roadDetails || 'false',
    summary: options.summary || 'false',
  });

  // 경유지 추가
  if (options.waypoints && options.waypoints.length > 0) {
    const waypointsStr = options.waypoints
      .map(wp => `${wp.x},${wp.y}`)
      .join('|');
    params.append('waypoints', waypointsStr);
  }

  // 회피 옵션 (toll: 유료도로, motorway: 자동차전용도로 등)
  if (options.avoid) {
    params.append('avoid', options.avoid);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  
  console.log('\n📍 요청 URL:', url);
  console.log('📍 출발지:', origin.name || `${origin.x}, ${origin.y}`);
  console.log('📍 목적지:', destination.name || `${destination.x}, ${destination.y}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ 요청 실패:', error.message);
    throw error;
  }
}

/**
 * 응답 데이터 파싱 및 출력
 */
function parseAndDisplayResult(data) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 길찾기 결과');
  console.log('='.repeat(60));

  if (!data.routes || data.routes.length === 0) {
    console.log('❌ 경로를 찾을 수 없습니다.');
    return;
  }

  data.routes.forEach((route, index) => {
    console.log(`\n🛣️  경로 ${index + 1}: ${route.result_msg}`);
    
    if (route.result_code !== 0) {
      console.log(`   ⚠️  오류 코드: ${route.result_code}`);
      return;
    }

    const summary = route.summary;
    
    // 거리 변환 (m -> km)
    const distanceKm = (summary.distance / 1000).toFixed(1);
    
    // 시간 변환 (초 -> 분)
    const durationMin = Math.round(summary.duration / 60);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;

    console.log(`   📏 총 거리: ${distanceKm} km`);
    console.log(`   ⏱️  예상 소요시간: ${durationStr}`);
    console.log(`   💰 택시 예상 요금: ${summary.fare.taxi.toLocaleString()}원`);
    console.log(`   🛣️  통행료: ${summary.fare.toll.toLocaleString()}원`);
    console.log(`   🎯 탐색 옵션: ${summary.priority}`);

    // 경유지 정보
    if (summary.waypoints && summary.waypoints.length > 0) {
      console.log(`   📍 경유지: ${summary.waypoints.length}개`);
    }

    // 구간별 정보
    if (route.sections && route.sections.length > 0) {
      console.log(`\n   📋 구간별 정보 (${route.sections.length}개 구간):`);
      route.sections.forEach((section, sIdx) => {
        const secDistKm = (section.distance / 1000).toFixed(1);
        const secDurMin = Math.round(section.duration / 60);
        console.log(`      구간 ${sIdx + 1}: ${secDistKm}km, ${secDurMin}분`);
      });
    }
  });

  console.log('\n' + '='.repeat(60));
}

/**
 * 메인 테스트 함수
 */
async function runTests() {
  console.log('🚗 카카오 모빌리티 길찾기 API 테스트');
  console.log('='.repeat(60));

  if (!KAKAO_API_KEY || KAKAO_API_KEY === 'your_kakao_rest_api_key_here') {
    console.error('❌ KAKAO_REST_API_KEY가 설정되지 않았습니다.');
    console.log('   .env 파일에 API 키를 입력해주세요.');
    return;
  }

  console.log('✅ API 키 확인됨');

  try {
    // 테스트 1: 기본 길찾기 (강남역 → 서울역)
    console.log('\n\n🧪 테스트 1: 기본 길찾기 (강남역 → 서울역)');
    const result1 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.seoulStation
    );
    parseAndDisplayResult(result1);

    // 테스트 2: 최단 거리 옵션
    console.log('\n\n🧪 테스트 2: 최단 거리 옵션 (강남역 → 서울시청)');
    const result2 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.cityHall,
      { priority: 'DISTANCE' }
    );
    parseAndDisplayResult(result2);

    // 테스트 3: 경유지 포함 (강남역 → 홍대 → 서울역)
    console.log('\n\n🧪 테스트 3: 경유지 포함 (강남역 → 홍대 → 서울역)');
    const result3 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.seoulStation,
      { 
        waypoints: [TEST_LOCATIONS.hongdae],
        priority: 'TIME'
      }
    );
    parseAndDisplayResult(result3);

    // 테스트 4: 유료도로 회피
    console.log('\n\n🧪 테스트 4: 유료도로 회피 (강남역 → 서울역)');
    const result4 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.seoulStation,
      { avoid: 'toll' }
    );
    parseAndDisplayResult(result4);

    console.log('\n✅ 모든 테스트 완료!');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
  }
}

// 실행
runTests();
