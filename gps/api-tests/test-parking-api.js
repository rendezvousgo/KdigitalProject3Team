/**
 * 怨듦났?곗씠?고룷??- ?꾧뎅怨듭쁺二쇱감??API ?뚯뒪??
 * 
 * ?붾뱶?ъ씤?? GET https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08
 * ?곗씠?? ?쒓뎅援먰넻?덉쟾怨듬떒_?꾧뎅怨듭쁺二쇱감?μ젙蹂?
 */

require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.DATA_GO_KR_API_KEY;
const BASE_URL = 'https://api.odcloud.kr/api/15050093/v1/uddi:d19c8e21-4445-43fe-b2a6-865dff832e08';

/**
 * ?꾧뎅 怨듭쁺二쇱감??紐⑸줉 議고쉶
 */
async function getParkingLots(options = {}) {
  const params = new URLSearchParams({
    page: options.page || 1,
    perPage: options.perPage || 10,
    serviceKey: API_KEY,
  });

  // 議곌굔 寃??(吏??챸 ??
  // 李멸퀬: 怨듦났?곗씠??API??cond ?뚮씪誘명꽣濡??꾪꽣留?媛??
  // ?? cond[吏??뎄遺?:EQ]=?쒖슱?밸퀎??
  if (options.region) {
    params.append('cond[吏??뎄遺?:EQ]', options.region);
  }
  if (options.subRegion) {
    params.append('cond[吏??뎄遺?sub::EQ]', options.subRegion);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  
  console.log('\n?뱧 ?붿껌 URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

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
    console.error('???붿껌 ?ㅽ뙣:', error.message);
    throw error;
  }
}

/**
 * ?뱀젙 醫뚰몴 二쇰? 二쇱감??李얘린 (?대씪?댁뼵???ъ씠???꾪꽣留?
 * 
 * 怨듦났?곗씠??API???꾩튂 湲곕컲 寃?됱쓣 吏?먰븯吏 ?딆쑝誘濡?
 * ?꾩껜 ?곗씠?곕? 媛?몄삩 ??嫄곕━ 怨꾩궛?쇰줈 ?꾪꽣留?
 */
function filterByDistance(parkingLots, targetLat, targetLng, radiusKm = 1) {
  return parkingLots.filter(lot => {
    const lat = parseFloat(lot['?꾨룄']);
    const lng = parseFloat(lot['寃쎈룄']);
    
    if (isNaN(lat) || isNaN(lng)) return false;
    
    const distance = calculateDistance(targetLat, targetLng, lat, lng);
    lot._distance = distance; // 嫄곕━ ?뺣낫 異붽?
    return distance <= radiusKm;
  }).sort((a, b) => a._distance - b._distance);
}

/**
 * ??醫뚰몴 媛?嫄곕━ 怨꾩궛 (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 吏援?諛섏?由?(km)
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
 * 二쇱감???뺣낫 ?щ㎎??異쒕젰
 */
function displayParkingLot(lot, index) {
  console.log(`\n  ${index + 1}. ?뱧 ${lot['二쇱감?λ챸']}`);
  console.log(`     ?뱦 二쇱냼: ${lot['二쇱감?λ룄濡쒕챸二쇱냼'] || lot['二쇱감?μ?踰덉＜??] || '?뺣낫?놁쓬'}`);
  console.log(`     ?슅 二쇱감援ы쉷: ${lot['二쇱감援ы쉷??] || '?뺣낫?놁쓬'}?`);
  console.log(`     ?뮥 ?붽툑: ${lot['?붽툑?뺣낫'] || '?뺣낫?놁쓬'}`);
  console.log(`     ?븧 ?됱씪: ${lot['?됱씪?댁쁺?쒖옉?쒓컖'] || '?'} ~ ${lot['?됱씪?댁쁺醫낅즺?쒓컖'] || '?'}`);
  console.log(`     ?븧 ?좎슂?? ${lot['?좎슂?쇱슫?곸떆?묒떆媛?] || '?'} ~ ${lot['?좎슂?쇱슫?곸쥌猷뚯떆媛?] || '?'}`);
  console.log(`     ?븧 怨듯쑕?? ${lot['怨듯쑕?쇱슫?곸떆?묒떆媛?] || '?'} ~ ${lot['怨듯쑕?쇱슫?곸쥌猷뚯떆媛?] || '?'}`);
  console.log(`     ?뱸 ?곕씫泥? ${lot['?곕씫泥?] || '?뺣낫?놁쓬'}`);
  console.log(`     ?뿺截? 醫뚰몴: ${lot['?꾨룄']}, ${lot['寃쎈룄']}`);
  if (lot._distance) {
    console.log(`     ?뱩 嫄곕━: ${(lot._distance * 1000).toFixed(0)}m`);
  }
}

/**
 * ?묐떟 ?곗씠???붿빟 異쒕젰
 */
function displaySummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('?뱤 議고쉶 寃곌낵 ?붿빟');
  console.log('='.repeat(60));
  console.log(`   ?뱞 ?꾩옱 ?섏씠吏: ${data.page}`);
  console.log(`   ?뱤 ?섏씠吏??媛쒖닔: ${data.perPage}`);
  console.log(`   ?뱢 ?꾩껜 ?곗씠???? ${data.totalCount?.toLocaleString() || 'N/A'}`);
  console.log(`   ?뵢 ?꾩옱 ?섏씠吏 ?곗씠?? ${data.currentCount}媛?);
  console.log(`   ?렞 寃??議곌굔 ?쇱튂: ${data.matchCount?.toLocaleString() || data.totalCount?.toLocaleString() || 'N/A'}媛?);
}

/**
 * 硫붿씤 ?뚯뒪???⑥닔
 */
async function runTests() {
  console.log('?끏截? ?꾧뎅怨듭쁺二쇱감??API ?뚯뒪??);
  console.log('='.repeat(60));

  if (!API_KEY || API_KEY === 'your_data_go_kr_api_key_here') {
    console.error('??DATA_GO_KR_API_KEY媛 ?ㅼ젙?섏? ?딆븯?듬땲??');
    console.log('   .env ?뚯씪??API ?ㅻ? ?낅젰?댁＜?몄슂.');
    console.log('\n?뱷 API ??諛쒓툒 諛⑸쾿:');
    console.log('   1. https://www.data.go.kr ?묒냽');
    console.log('   2. "?꾧뎅怨듭쁺二쇱감?μ젙蹂? 寃??);
    console.log('   3. ?쒖슜?좎껌 ??留덉씠?섏씠吏?먯꽌 API ???뺤씤');
    return;
  }

  console.log('??API ???뺤씤??);

  try {
    // ?뚯뒪??1: 湲곕낯 議고쉶 (泥??섏씠吏 10媛?
    console.log('\n\n?㎦ ?뚯뒪??1: 湲곕낯 議고쉶 (泥??섏씠吏)');
    const result1 = await getParkingLots({ page: 1, perPage: 10 });
    displaySummary(result1);
    
    if (result1.data && result1.data.length > 0) {
      console.log('\n?뱥 二쇱감??紐⑸줉:');
      result1.data.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));
      if (result1.data.length > 5) {
        console.log(`\n   ... ??${result1.data.length - 5}媛?);
      }
    }

    // ?뚯뒪??2: ?쒖슱 吏???꾪꽣留?
    console.log('\n\n?㎦ ?뚯뒪??2: ?쒖슱?밸퀎??二쇱감??議고쉶');
    const result2 = await getParkingLots({ 
      page: 1, 
      perPage: 10,
      region: '?쒖슱?밸퀎??
    });
    displaySummary(result2);
    
    if (result2.data && result2.data.length > 0) {
      console.log('\n?뱥 ?쒖슱 二쇱감??紐⑸줉:');
      result2.data.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));
    }

    // ?뚯뒪??3: 媛뺣궓援?二쇱감??
    console.log('\n\n?㎦ ?뚯뒪??3: ?쒖슱 媛뺣궓援?二쇱감??議고쉶');
    const result3 = await getParkingLots({ 
      page: 1, 
      perPage: 20,
      region: '?쒖슱?밸퀎??,
      subRegion: '媛뺣궓援?
    });
    displaySummary(result3);
    
    if (result3.data && result3.data.length > 0) {
      console.log('\n?뱥 媛뺣궓援?二쇱감??紐⑸줉:');
      result3.data.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));

      // ?뚯뒪??4: ?뱀젙 醫뚰몴 二쇰? 二쇱감??(媛뺣궓??湲곗? 1km)
      console.log('\n\n?㎦ ?뚯뒪??4: 媛뺣궓??二쇰? 1km ??二쇱감??);
      const gangnamStation = { lat: 37.497942, lng: 127.027619 };
      const nearbyLots = filterByDistance(
        result3.data, 
        gangnamStation.lat, 
        gangnamStation.lng, 
        1 // 1km 諛섍꼍
      );
      
      console.log(`\n?뱧 媛뺣궓??(${gangnamStation.lat}, ${gangnamStation.lng}) 湲곗?`);
      console.log(`?뵇 諛섍꼍 1km ??二쇱감?? ${nearbyLots.length}媛?);
      
      if (nearbyLots.length > 0) {
        console.log('\n?뱥 媛源뚯슫 ??二쇱감??');
        nearbyLots.slice(0, 5).forEach((lot, idx) => displayParkingLot(lot, idx));
      }
    }

    console.log('\n\n??紐⑤뱺 ?뚯뒪???꾨즺!');

  } catch (error) {
    console.error('\n???뚯뒪???ㅽ뙣:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n?뮕 ?몄쬆 ?ㅻ쪟 ?닿껐 諛⑸쾿:');
      console.log('   1. API ?ㅺ? ?щ컮瑜몄? ?뺤씤');
      console.log('   2. 怨듦났?곗씠?고룷?몄뿉???쒖슜?좎껌 ?꾨즺 ?щ? ?뺤씤');
      console.log('   3. ?몄퐫?⑸맂 ?ㅻ? ?ъ슜?댁빞 ?????덉쓬');
    }
  }
}

// ?ㅽ뻾
runTests();
