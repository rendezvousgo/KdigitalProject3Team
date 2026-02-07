/**
 * 공공데이터포털 - 전국주정차금지(지정)구역 API 테스트
 * 
 * 엔드포인트: GET https://api.data.go.kr/openapi/tn_pubr_public_prkstop_prhibt_area_api
 * 데이터: 전국주정차금지(지정)구역표준데이터
 */

require('dotenv').config();
const fetch = require('node-fetch');
const https = require('https');

const API_KEY = process.env.NO_PARKING_ZONE_API_KEY;
// HTTP 사용 (HTTPS는 www 리다이렉트 DNS 문제 있음)
const BASE_URL = 'http://api.data.go.kr/openapi/tn_pubr_public_prkstop_prhibt_area_api';

// SSL 에러 무시 (개발용)
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * 주정차금지구역 목록 조회
 */
async function getNoParakingZones(options = {}) {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: options.pageNo || 1,
    numOfRows: options.numOfRows || 10,
    type: options.type || 'json', // json 또는 xml
  });

  // 조건 검색
  if (options.ctprvnNm) {
    params.append('ctprvnNm', options.ctprvnNm); // 시도명
  }
  if (options.signguNm) {
    params.append('signguNm', options.signguNm); // 시군구명
  }
  if (options.rdnmadr) {
    params.append('rdnmadr', options.rdnmadr); // 도로명주소
  }
  if (options.lnmadr) {
    params.append('lnmadr', options.lnmadr); // 지번주소
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
 * 특정 좌표 주변 금지구역 찾기
 */
function filterByDistance(zones, targetLat, targetLng, radiusKm = 0.5) {
  return zones.filter(zone => {
    const lat = parseFloat(zone.latitude);
    const lng = parseFloat(zone.longitude);
    
    if (isNaN(lat) || isNaN(lng)) return false;
    
    const distance = calculateDistance(targetLat, targetLng, lat, lng);
    zone._distance = distance;
    zone._distanceM = Math.round(distance * 1000);
    return distance <= radiusKm;
  }).sort((a, b) => a._distance - b._distance);
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
 * 금지구역 정보 출력
 */
function displayZone(zone, index) {
  console.log(`\n  ${index + 1}. 🚫 ${zone.prhibtAreaNm || '(이름없음)'}`);
  console.log(`     📌 도로명: ${zone.rdnmadr || '정보없음'}`);
  console.log(`     📌 지번: ${zone.lnmadr || '정보없음'}`);
  console.log(`     🏛️  시도: ${zone.ctprvnNm || ''} ${zone.signguNm || ''}`);
  console.log(`     📋 금지유형: ${zone.prhibtSeNm || '정보없음'}`);
  console.log(`     ⏰ 금지시간: ${zone.operBeginHhmm || '?'} ~ ${zone.operEndHhmm || '?'}`);
  console.log(`     📅 금지요일: ${zone.prhibtDayNm || '정보없음'}`);
  console.log(`     📝 사유: ${zone.prhibtRsnCn || '정보없음'}`);
  console.log(`     🗺️  좌표: ${zone.latitude || '?'}, ${zone.longitude || '?'}`);
  if (zone._distanceM) {
    console.log(`     📏 거리: ${zone._distanceM}m`);
  }
  console.log(`     ℹ️  관리기관: ${zone.institutionNm || '정보없음'}`);
  console.log(`     📞 연락처: ${zone.phoneNumber || '정보없음'}`);
}

/**
 * 응답 요약
 */
function displaySummary(response) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 조회 결과 요약');
  console.log('='.repeat(60));
  
  if (response.response && response.response.header) {
    const header = response.response.header;
    console.log(`   📄 결과코드: ${header.resultCode}`);
    console.log(`   📝 결과메시지: ${header.resultMsg}`);
  }
  
  if (response.response && response.response.body) {
    const body = response.response.body;
    console.log(`   📊 전체 데이터: ${body.totalCount?.toLocaleString() || 'N/A'}개`);
    console.log(`   📄 현재 페이지: ${body.pageNo || 1}`);
    console.log(`   🔢 페이지당 개수: ${body.numOfRows || 10}`);
  }
}

/**
 * 메인 테스트
 */
async function runTests() {
  console.log('🚫 전국주정차금지구역 API 테스트');
  console.log('='.repeat(60));

  if (!API_KEY || API_KEY === 'your_no_parking_zone_api_key_here') {
    console.error('❌ NO_PARKING_ZONE_API_KEY가 설정되지 않았습니다.');
    console.log('   .env 파일에 API 키를 입력해주세요.');
    return;
  }

  console.log('✅ API 키 확인됨');

  try {
    // 테스트 1: 기본 조회
    console.log('\n\n🧪 테스트 1: 기본 조회 (첫 페이지 10개)');
    const result1 = await getNoParakingZones({ pageNo: 1, numOfRows: 10 });
    displaySummary(result1);
    
    const items1 = result1.response?.body?.items || [];
    if (items1.length > 0) {
      console.log('\n📋 주정차금지구역 목록:');
      items1.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));
      if (items1.length > 5) {
        console.log(`\n   ... 외 ${items1.length - 5}개`);
      }
    } else {
      console.log('\n⚠️  데이터가 없습니다.');
      console.log('   응답 구조:', JSON.stringify(result1, null, 2).slice(0, 500));
    }

    // 테스트 2: 서울시 조회
    console.log('\n\n🧪 테스트 2: 서울특별시 주정차금지구역');
    const result2 = await getNoParakingZones({ 
      pageNo: 1, 
      numOfRows: 20,
      ctprvnNm: '서울특별시'
    });
    displaySummary(result2);
    
    const items2 = result2.response?.body?.items || [];
    if (items2.length > 0) {
      console.log('\n📋 서울시 금지구역 목록:');
      items2.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));
    }

    // 테스트 3: 강남구 조회
    console.log('\n\n🧪 테스트 3: 서울 강남구 주정차금지구역');
    const result3 = await getNoParakingZones({ 
      pageNo: 1, 
      numOfRows: 50,
      ctprvnNm: '서울특별시',
      signguNm: '강남구'
    });
    displaySummary(result3);
    
    const items3 = result3.response?.body?.items || [];
    if (items3.length > 0) {
      console.log('\n📋 강남구 금지구역 목록:');
      items3.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));

      // 테스트 4: 특정 좌표 주변 금지구역
      console.log('\n\n🧪 테스트 4: 강남역 주변 500m 내 금지구역');
      const gangnamStation = { lat: 37.497942, lng: 127.027619 };
      const nearbyZones = filterByDistance(items3, gangnamStation.lat, gangnamStation.lng, 0.5);
      
      console.log(`\n📍 강남역 (${gangnamStation.lat}, ${gangnamStation.lng}) 기준`);
      console.log(`🔍 반경 500m 내 금지구역: ${nearbyZones.length}개`);
      
      if (nearbyZones.length > 0) {
        console.log('\n📋 가까운 순 금지구역:');
        nearbyZones.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));
      }
    }

    console.log('\n\n✅ 모든 테스트 완료!');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 인증 오류 - Encoding/Decoding 키 둘 다 시도해보세요.');
    }
  }
}

// 실행
runTests();
