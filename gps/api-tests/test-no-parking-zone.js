/**
 * 怨듦났?곗씠?고룷??- ?꾧뎅二쇱젙李④툑吏(吏??援ъ뿭 API ?뚯뒪??
 * 
 * ?붾뱶?ъ씤?? GET https://api.data.go.kr/openapi/tn_pubr_public_prkstop_prhibt_area_api
 * ?곗씠?? ?꾧뎅二쇱젙李④툑吏(吏??援ъ뿭?쒖??곗씠??
 */

require('dotenv').config();
const fetch = require('node-fetch');
const https = require('https');

const API_KEY = process.env.NO_PARKING_ZONE_API_KEY;
// HTTP ?ъ슜 (HTTPS??www 由щ떎?대젆??DNS 臾몄젣 ?덉쓬)
const BASE_URL = 'http://api.data.go.kr/openapi/tn_pubr_public_prkstop_prhibt_area_api';

// SSL ?먮윭 臾댁떆 (媛쒕컻??
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * 二쇱젙李④툑吏援ъ뿭 紐⑸줉 議고쉶
 */
async function getNoParakingZones(options = {}) {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: options.pageNo || 1,
    numOfRows: options.numOfRows || 10,
    type: options.type || 'json', // json ?먮뒗 xml
  });

  // 議곌굔 寃??
  if (options.ctprvnNm) {
    params.append('ctprvnNm', options.ctprvnNm); // ?쒕룄紐?
  }
  if (options.signguNm) {
    params.append('signguNm', options.signguNm); // ?쒓뎔援щ챸
  }
  if (options.rdnmadr) {
    params.append('rdnmadr', options.rdnmadr); // ?꾨줈紐낆＜??
  }
  if (options.lnmadr) {
    params.append('lnmadr', options.lnmadr); // 吏踰덉＜??
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
 * ?뱀젙 醫뚰몴 二쇰? 湲덉?援ъ뿭 李얘린
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
 * 湲덉?援ъ뿭 ?뺣낫 異쒕젰
 */
function displayZone(zone, index) {
  console.log(`\n  ${index + 1}. ?슟 ${zone.prhibtAreaNm || '(?대쫫?놁쓬)'}`);
  console.log(`     ?뱦 ?꾨줈紐? ${zone.rdnmadr || '?뺣낫?놁쓬'}`);
  console.log(`     ?뱦 吏踰? ${zone.lnmadr || '?뺣낫?놁쓬'}`);
  console.log(`     ?룢截? ?쒕룄: ${zone.ctprvnNm || ''} ${zone.signguNm || ''}`);
  console.log(`     ?뱥 湲덉??좏삎: ${zone.prhibtSeNm || '?뺣낫?놁쓬'}`);
  console.log(`     ??湲덉??쒓컙: ${zone.operBeginHhmm || '?'} ~ ${zone.operEndHhmm || '?'}`);
  console.log(`     ?뱟 湲덉??붿씪: ${zone.prhibtDayNm || '?뺣낫?놁쓬'}`);
  console.log(`     ?뱷 ?ъ쑀: ${zone.prhibtRsnCn || '?뺣낫?놁쓬'}`);
  console.log(`     ?뿺截? 醫뚰몴: ${zone.latitude || '?'}, ${zone.longitude || '?'}`);
  if (zone._distanceM) {
    console.log(`     ?뱩 嫄곕━: ${zone._distanceM}m`);
  }
  console.log(`     ?뱄툘  愿由ш린愿: ${zone.institutionNm || '?뺣낫?놁쓬'}`);
  console.log(`     ?뱸 ?곕씫泥? ${zone.phoneNumber || '?뺣낫?놁쓬'}`);
}

/**
 * ?묐떟 ?붿빟
 */
function displaySummary(response) {
  console.log('\n' + '='.repeat(60));
  console.log('?뱤 議고쉶 寃곌낵 ?붿빟');
  console.log('='.repeat(60));
  
  if (response.response && response.response.header) {
    const header = response.response.header;
    console.log(`   ?뱞 寃곌낵肄붾뱶: ${header.resultCode}`);
    console.log(`   ?뱷 寃곌낵硫붿떆吏: ${header.resultMsg}`);
  }
  
  if (response.response && response.response.body) {
    const body = response.response.body;
    console.log(`   ?뱤 ?꾩껜 ?곗씠?? ${body.totalCount?.toLocaleString() || 'N/A'}媛?);
    console.log(`   ?뱞 ?꾩옱 ?섏씠吏: ${body.pageNo || 1}`);
    console.log(`   ?뵢 ?섏씠吏??媛쒖닔: ${body.numOfRows || 10}`);
  }
}

/**
 * 硫붿씤 ?뚯뒪??
 */
async function runTests() {
  console.log('?슟 ?꾧뎅二쇱젙李④툑吏援ъ뿭 API ?뚯뒪??);
  console.log('='.repeat(60));

  if (!API_KEY || API_KEY === 'your_no_parking_zone_api_key_here') {
    console.error('??NO_PARKING_ZONE_API_KEY媛 ?ㅼ젙?섏? ?딆븯?듬땲??');
    console.log('   .env ?뚯씪??API ?ㅻ? ?낅젰?댁＜?몄슂.');
    return;
  }

  console.log('??API ???뺤씤??);

  try {
    // ?뚯뒪??1: 湲곕낯 議고쉶
    console.log('\n\n?㎦ ?뚯뒪??1: 湲곕낯 議고쉶 (泥??섏씠吏 10媛?');
    const result1 = await getNoParakingZones({ pageNo: 1, numOfRows: 10 });
    displaySummary(result1);
    
    const items1 = result1.response?.body?.items || [];
    if (items1.length > 0) {
      console.log('\n?뱥 二쇱젙李④툑吏援ъ뿭 紐⑸줉:');
      items1.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));
      if (items1.length > 5) {
        console.log(`\n   ... ??${items1.length - 5}媛?);
      }
    } else {
      console.log('\n?좑툘  ?곗씠?곌? ?놁뒿?덈떎.');
      console.log('   ?묐떟 援ъ“:', JSON.stringify(result1, null, 2).slice(0, 500));
    }

    // ?뚯뒪??2: ?쒖슱??議고쉶
    console.log('\n\n?㎦ ?뚯뒪??2: ?쒖슱?밸퀎??二쇱젙李④툑吏援ъ뿭');
    const result2 = await getNoParakingZones({ 
      pageNo: 1, 
      numOfRows: 20,
      ctprvnNm: '?쒖슱?밸퀎??
    });
    displaySummary(result2);
    
    const items2 = result2.response?.body?.items || [];
    if (items2.length > 0) {
      console.log('\n?뱥 ?쒖슱??湲덉?援ъ뿭 紐⑸줉:');
      items2.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));
    }

    // ?뚯뒪??3: 媛뺣궓援?議고쉶
    console.log('\n\n?㎦ ?뚯뒪??3: ?쒖슱 媛뺣궓援?二쇱젙李④툑吏援ъ뿭');
    const result3 = await getNoParakingZones({ 
      pageNo: 1, 
      numOfRows: 50,
      ctprvnNm: '?쒖슱?밸퀎??,
      signguNm: '媛뺣궓援?
    });
    displaySummary(result3);
    
    const items3 = result3.response?.body?.items || [];
    if (items3.length > 0) {
      console.log('\n?뱥 媛뺣궓援?湲덉?援ъ뿭 紐⑸줉:');
      items3.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));

      // ?뚯뒪??4: ?뱀젙 醫뚰몴 二쇰? 湲덉?援ъ뿭
      console.log('\n\n?㎦ ?뚯뒪??4: 媛뺣궓??二쇰? 500m ??湲덉?援ъ뿭');
      const gangnamStation = { lat: 37.497942, lng: 127.027619 };
      const nearbyZones = filterByDistance(items3, gangnamStation.lat, gangnamStation.lng, 0.5);
      
      console.log(`\n?뱧 媛뺣궓??(${gangnamStation.lat}, ${gangnamStation.lng}) 湲곗?`);
      console.log(`?뵇 諛섍꼍 500m ??湲덉?援ъ뿭: ${nearbyZones.length}媛?);
      
      if (nearbyZones.length > 0) {
        console.log('\n?뱥 媛源뚯슫 ??湲덉?援ъ뿭:');
        nearbyZones.slice(0, 5).forEach((zone, idx) => displayZone(zone, idx));
      }
    }

    console.log('\n\n??紐⑤뱺 ?뚯뒪???꾨즺!');

  } catch (error) {
    console.error('\n???뚯뒪???ㅽ뙣:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n?뮕 ?몄쬆 ?ㅻ쪟 - Encoding/Decoding ???????쒕룄?대낫?몄슂.');
    }
  }
}

// ?ㅽ뻾
runTests();
