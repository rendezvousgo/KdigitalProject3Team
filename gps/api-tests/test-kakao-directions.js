/**
 * 移댁뭅??紐⑤퉴由ы떚 - ?먮룞李?湲몄갼湲?API ?뚯뒪??
 * 
 * ?붾뱶?ъ씤?? GET https://apis-navi.kakaomobility.com/v1/directions
 * 臾몄꽌: https://developers.kakaomobility.com/docs/navi-api/directions/
 */

require('dotenv').config();
const fetch = require('node-fetch');

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const BASE_URL = 'https://apis-navi.kakaomobility.com/v1/directions';

// ?뚯뒪?몄슜 醫뚰몴 (?쒖슱 二쇱슂 吏??
const TEST_LOCATIONS = {
  gangnamStation: { x: 127.027619, y: 37.497942, name: '媛뺣궓?? },
  seoulStation: { x: 126.972559, y: 37.556067, name: '?쒖슱?? },
  cityHall: { x: 126.977829, y: 37.566535, name: '?쒖슱?쒖껌' },
  hongdae: { x: 126.924191, y: 37.556973, name: '?띾??낃뎄?? },
};

/**
 * 湲몄갼湲?API ?몄텧
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

  // 寃쎌쑀吏 異붽?
  if (options.waypoints && options.waypoints.length > 0) {
    const waypointsStr = options.waypoints
      .map(wp => `${wp.x},${wp.y}`)
      .join('|');
    params.append('waypoints', waypointsStr);
  }

  // ?뚰뵾 ?듭뀡 (toll: ?좊즺?꾨줈, motorway: ?먮룞李⑥쟾?⑸룄濡???
  if (options.avoid) {
    params.append('avoid', options.avoid);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  
  console.log('\n?뱧 ?붿껌 URL:', url);
  console.log('?뱧 異쒕컻吏:', origin.name || `${origin.x}, ${origin.y}`);
  console.log('?뱧 紐⑹쟻吏:', destination.name || `${destination.x}, ${destination.y}`);

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
    console.error('???붿껌 ?ㅽ뙣:', error.message);
    throw error;
  }
}

/**
 * ?묐떟 ?곗씠???뚯떛 諛?異쒕젰
 */
function parseAndDisplayResult(data) {
  console.log('\n' + '='.repeat(60));
  console.log('?뱤 湲몄갼湲?寃곌낵');
  console.log('='.repeat(60));

  if (!data.routes || data.routes.length === 0) {
    console.log('??寃쎈줈瑜?李얠쓣 ???놁뒿?덈떎.');
    return;
  }

  data.routes.forEach((route, index) => {
    console.log(`\n?썵截? 寃쎈줈 ${index + 1}: ${route.result_msg}`);
    
    if (route.result_code !== 0) {
      console.log(`   ?좑툘  ?ㅻ쪟 肄붾뱶: ${route.result_code}`);
      return;
    }

    const summary = route.summary;
    
    // 嫄곕━ 蹂??(m -> km)
    const distanceKm = (summary.distance / 1000).toFixed(1);
    
    // ?쒓컙 蹂??(珥?-> 遺?
    const durationMin = Math.round(summary.duration / 60);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationStr = hours > 0 ? `${hours}?쒓컙 ${mins}遺? : `${mins}遺?;

    console.log(`   ?뱩 珥?嫄곕━: ${distanceKm} km`);
    console.log(`   ?깍툘  ?덉긽 ?뚯슂?쒓컙: ${durationStr}`);
    console.log(`   ?뮥 ?앹떆 ?덉긽 ?붽툑: ${summary.fare.taxi.toLocaleString()}??);
    console.log(`   ?썵截? ?듯뻾猷? ${summary.fare.toll.toLocaleString()}??);
    console.log(`   ?렞 ?먯깋 ?듭뀡: ${summary.priority}`);

    // 寃쎌쑀吏 ?뺣낫
    if (summary.waypoints && summary.waypoints.length > 0) {
      console.log(`   ?뱧 寃쎌쑀吏: ${summary.waypoints.length}媛?);
    }

    // 援ш컙蹂??뺣낫
    if (route.sections && route.sections.length > 0) {
      console.log(`\n   ?뱥 援ш컙蹂??뺣낫 (${route.sections.length}媛?援ш컙):`);
      route.sections.forEach((section, sIdx) => {
        const secDistKm = (section.distance / 1000).toFixed(1);
        const secDurMin = Math.round(section.duration / 60);
        console.log(`      援ш컙 ${sIdx + 1}: ${secDistKm}km, ${secDurMin}遺?);
      });
    }
  });

  console.log('\n' + '='.repeat(60));
}

/**
 * 硫붿씤 ?뚯뒪???⑥닔
 */
async function runTests() {
  console.log('?슅 移댁뭅??紐⑤퉴由ы떚 湲몄갼湲?API ?뚯뒪??);
  console.log('='.repeat(60));

  if (!KAKAO_API_KEY || KAKAO_API_KEY === 'your_kakao_rest_api_key_here') {
    console.error('??KAKAO_REST_API_KEY媛 ?ㅼ젙?섏? ?딆븯?듬땲??');
    console.log('   .env ?뚯씪??API ?ㅻ? ?낅젰?댁＜?몄슂.');
    return;
  }

  console.log('??API ???뺤씤??);

  try {
    // ?뚯뒪??1: 湲곕낯 湲몄갼湲?(媛뺣궓?????쒖슱??
    console.log('\n\n?㎦ ?뚯뒪??1: 湲곕낯 湲몄갼湲?(媛뺣궓?????쒖슱??');
    const result1 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.seoulStation
    );
    parseAndDisplayResult(result1);

    // ?뚯뒪??2: 理쒕떒 嫄곕━ ?듭뀡
    console.log('\n\n?㎦ ?뚯뒪??2: 理쒕떒 嫄곕━ ?듭뀡 (媛뺣궓?????쒖슱?쒖껌)');
    const result2 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.cityHall,
      { priority: 'DISTANCE' }
    );
    parseAndDisplayResult(result2);

    // ?뚯뒪??3: 寃쎌쑀吏 ?ы븿 (媛뺣궓?????띾? ???쒖슱??
    console.log('\n\n?㎦ ?뚯뒪??3: 寃쎌쑀吏 ?ы븿 (媛뺣궓?????띾? ???쒖슱??');
    const result3 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.seoulStation,
      { 
        waypoints: [TEST_LOCATIONS.hongdae],
        priority: 'TIME'
      }
    );
    parseAndDisplayResult(result3);

    // ?뚯뒪??4: ?좊즺?꾨줈 ?뚰뵾
    console.log('\n\n?㎦ ?뚯뒪??4: ?좊즺?꾨줈 ?뚰뵾 (媛뺣궓?????쒖슱??');
    const result4 = await getDirections(
      TEST_LOCATIONS.gangnamStation,
      TEST_LOCATIONS.seoulStation,
      { avoid: 'toll' }
    );
    parseAndDisplayResult(result4);

    console.log('\n??紐⑤뱺 ?뚯뒪???꾨즺!');

  } catch (error) {
    console.error('\n???뚯뒪???ㅽ뙣:', error.message);
  }
}

// ?ㅽ뻾
runTests();
