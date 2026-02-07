/**
 * 공공데이터포털 - 전국공영주차장 API 테스트
 * 
 * 엔드포인트: GET https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08
 * 데이터: 한국교통안전공단_전국공영주차장정보
 */

require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.DATA_GO_KR_API_KEY;
const BASE_URL = 'https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08';

/**
 * 전국 공영주차장 목록 조회
 */
async function getParkingLots(options = {}) {
  const params = new URLSearchParams({
    page: options.page || 1,
    perPage: options.perPage || 10,
    serviceKey: API_KEY,
  });

  // 조건 검색 (지역명 등)
  // 참고: 공공데이터 API는 cond 파라미터로 필터링 가능
  // 예: cond[지역구분::EQ]=서울특별시
  if (options.region) {
    params.append('cond[지역구분::EQ]', options.region);
  }
  if (options.subRegion) {
    params.append('cond[지역구분_sub::EQ]', options.subRegion);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  
  console.log('\n📍 요청 URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
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
 * 특정 좌표 주변 주차장 찾기 (클라이언트 사이드 필터링)
 * 
 * 공공데이터 API는 위치 기반 검색을 지원하지 않으므로,
 * 전체 데이터를 가져온 후 거리 계산으로 필터링
 */
function filterByDistance(parkingLots, targetLat, targetLng, radiusKm = 1) {
  return parkingLots.filter(lot => {
    const lat = parseFloat(lot['위도']);
    const lng = parseFloat(lot['경도']);
    
    if (isNaN(lat) || isNaN(lng)) return false;
    
    const distance = calculateDistance(targetLat, targetLng, lat, lng);
    lot._distance = distance; // 거리 정보 추가
    return distance <= radiusKm;
  }).sort((a, b) => a._distance - b._distance);
}

/**
 * 두 좌표 간 거리 계산 (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * 주차장 정보 포맷팅 출력
 */
function displayParkingLot(lot, index) {
  console.log(`\n  ${index + 1}. 📍 ${lot['주차장명']}`);
  console.log(`     📌 주소: ${lot['주차장도로명주소'] || lot['주차장지번주소'] || '정보없음'}`);
  console.log(`     🚗 주차구획: ${lot['주차구획수'] || '정보없음'}대`);
  console.log(`     💰 요금: ${lot['요금정보'] || '정보없음'}`);
  console.log(`     🕐 평일: ${lot['평일운영시작시각'] || '?'} ~ ${lot['평일운영종료시각'] || '?'}`);
  console.log(`     🕐 토요일: ${lot['토요일운영시작시각'] || '?'} ~ ${lot['토요일운영종료시각'] || '?'}`);
  console.log(`     🕐 공휴일: ${lot['공휴일운영시작시각'] || '?'} ~ ${lot['공휴일운영종료시각'] || '?'}`);
  console.log(`     📞 연락처: ${lot['연락처'] || '정보없음'}`);
  console.log(`     🗺️  좌표: ${lot['위도']}, ${lot['경도']}`);
  if (lot._distance) {
    console.log(`     📏 거리: ${(lot._distance * 1000).toFixed(0)}m`);
  }
}

/**
 * 응답 데이터 요약 출력
 */
function displaySummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 조회 결과 요약');
  console.log('='.repeat(60));
  console.log(`   📄 현재 페이지: ${data.page}`);
  console.log(`   📊 페이지당 개수: ${data.perPage}`);
  console.log(`   📈 전체 데이터 수: ${data.totalCount?.toLocaleString() || 'N/A'}`);
  console.log(`   🔢 현재 페이지 데이터: ${data.currentCount}개`);
  console.log(`   🎯 검색 조건 일치: ${data.matchCount?.toLocaleString() || data.totalCount?.toLocaleString() || 'N/A'}개`);
}

/**
 * 메인 테스트 함수
 */
async function runTests() {
  console.log('🅿️  전국공영주차장 API 테스트');
  console.log('='.repeat(60));

  if (!API_KEY || API_KEY === 'your_data_go_kr_api_key_here') {
    console.error('❌ DATA_GO_KR_API_KEY가 설정되지 않았습니다.');
    console.log('   .env 파일에 API 키를 입력해주세요.');
    console.log('\n📝 API 키 발급 방법:');
    console.log('   1. https://www.data.go.kr 접속');
    console.log('   2. "전국공영주차장정보" 검색');
    console.log('   3. 활용신청 후 마이페이지에서 API 키 확인');
    return;
  }

  console.log('✅ API 키 확인됨');

  try {
    // 테스트 1: 기본 조회 (첫 페이지 10개)
    console.log('\n\n🧪 테스트 1: 기본 조회 (첫 페이지)');
    const result1 = await getParkingLots({ page: 1, perPage: 10 });
    displaySummary(result1);
    
    if (result1.data && result1.data.length > 0) {
      console.log('\n📋 주차장 목록:');
      result1.data.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));
      if (result1.data.length > 5) {
        console.log(`\n   ... 외 ${result1.data.length - 5}개`);
      }
    }

    // 테스트 2: 서울 지역 필터링
    console.log('\n\n🧪 테스트 2: 서울특별시 주차장 조회');
    const result2 = await getParkingLots({ 
      page: 1, 
      perPage: 10,
      region: '서울특별시'
    });
    displaySummary(result2);
    
    if (result2.data && result2.data.length > 0) {
      console.log('\n📋 서울 주차장 목록:');
      result2.data.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));
    }

    // 테스트 3: 강남구 주차장
    console.log('\n\n🧪 테스트 3: 서울 강남구 주차장 조회');
    const result3 = await getParkingLots({ 
      page: 1, 
      perPage: 20,
      region: '서울특별시',
      subRegion: '강남구'
    });
    displaySummary(result3);
    
    if (result3.data && result3.data.length > 0) {
      console.log('\n📋 강남구 주차장 목록:');
      result3.data.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));

      // 테스트 4: 특정 좌표 주변 주차장 (강남역 기준 1km)
      console.log('\n\n🧪 테스트 4: 강남역 주변 1km 내 주차장');
      const gangnamStation = { lat: 37.497942, lng: 127.027619 };
      const nearbyLots = filterByDistance(
        result3.data, 
        gangnamStation.lat, 
        gangnamStation.lng, 
        1 // 1km 반경
      );
      
      console.log(`\n📍 강남역 (${gangnamStation.lat}, ${gangnamStation.lng}) 기준`);
      console.log(`🔍 반경 1km 내 주차장: ${nearbyLots.length}개`);
      
      if (nearbyLots.length > 0) {
        console.log('\n📋 가까운 순 주차장:');
        nearbyLots.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));
      }
    }

    console.log('\n\n✅ 모든 테스트 완료!');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 인증 오류 해결 방법:');
      console.log('   1. API 키가 올바른지 확인');
      console.log('   2. 공공데이터포털에서 활용신청 완료 여부 확인');
      console.log('   3. 인코딩된 키를 사용해야 할 수 있음');
    }
  }
}

// 실행
runTests();
