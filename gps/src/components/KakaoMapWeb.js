import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { KAKAO_JS_KEY } from '../config/keys';
const SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;

/**
 * 移댁뭅?ㅻ㏊ ??而댄룷?뚰듃 - 吏곸젒 ?ㅽ겕由쏀듃 濡쒕뵫 諛⑹떇
 *
 * 1) <script> ?쒓렇瑜?document.head??異붽?
 * 2) script.onload ??kakao.maps.load(callback)
 * 3) callback ?덉뿉??Map, Marker ???ъ슜
 */

/* ?? SDK 濡쒕뵫 (?깃??? ?? */
let sdkPromise = null;

function loadKakaoSDK() {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    // ?대? 濡쒕뱶??寃쎌슦
    if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;

    script.onload = () => {
      if (!window.kakao || !window.kakao.maps) {
        reject(new Error(
          '移댁뭅??SDK ?ㅽ겕由쏀듃媛 濡쒕뱶?섏뿀吏留?kakao.maps 媛앹껜媛 ?놁뒿?덈떎.\n' +
          '??移댁뭅??媛쒕컻??肄섏넄?먯꽌 "吏??濡쒖뺄" ?쒕퉬?ㅻ? ?쒖꽦?뷀뻽?붿? ?뺤씤?섏꽭??\n' +
          '???뚮옯????Web ???ъ씠???꾨찓?몄뿉 ?꾩옱 二쇱냼瑜??깅줉?덈뒗吏 ?뺤씤?섏꽭??'
        ));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    script.onerror = () => {
      sdkPromise = null; // ?ъ떆???덉슜
      reject(new Error(
        '移댁뭅?ㅻ㏊ SDK ?ㅽ겕由쏀듃 ?ㅼ슫濡쒕뱶 ?ㅽ뙣.\n' +
        '???ㅽ듃?뚰겕 ?곌껐???뺤씤?섏꽭??\n' +
        '??釉뚮씪?곗???愿묎퀬 李⑤떒 / 異붿쟻 諛⑹? 湲곕뒫???뺤씤?섏꽭??'
      ));
    };

    document.head.appendChild(script);
  });

  // ?ㅽ뙣 ???ъ떆??媛?ν븯?꾨줉
  sdkPromise.catch(() => { sdkPromise = null; });

  return sdkPromise;
}

/* ?? 而댄룷?뚰듃 ?? */
const KakaoMapWeb = forwardRef(function KakaoMapWeb(
  { center, parkings, routePath, is3D, onMarkerClick, onMapIdle },
  ref
) {
  const mapContainerRef = useRef(null);
  const mapWrapperRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  const cbIdle = useRef(onMapIdle);
  const cbClick = useRef(onMarkerClick);
  cbIdle.current = onMapIdle;
  cbClick.current = onMarkerClick;

  /* ?? 寃쎈줈 洹몃━湲?吏?곌린 ?대? ?⑥닔 ?? */
  function _clearRoute() {
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (startMarkerRef.current) { startMarkerRef.current.setMap(null); startMarkerRef.current = null; }
    if (endMarkerRef.current) { endMarkerRef.current.setMap(null); endMarkerRef.current = null; }
  }

  function _drawRoute(path) {
    if (!mapRef.current || !window.kakao || !path || path.length < 2) return;
    _clearRoute();
    const kakao = window.kakao;

    // Polyline 醫뚰몴
    const linePath = path.map(p => new kakao.maps.LatLng(p.lat, p.lng));

    // 寃쎈줈??
    polylineRef.current = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 6,
      strokeColor: '#3366FF',
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
    });
    polylineRef.current.setMap(mapRef.current);

    // 異쒕컻 留덉빱 (?뚮? ??
    startMarkerRef.current = new kakao.maps.CustomOverlay({
      position: linePath[0],
      content: '<div style="width:18px;height:18px;border-radius:50%;background:#3366FF;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      yAnchor: 0.5,
      xAnchor: 0.5,
    });
    startMarkerRef.current.setMap(mapRef.current);

    // ?꾩갑 留덉빱 (鍮④컙 ?)
    endMarkerRef.current = new kakao.maps.CustomOverlay({
      position: linePath[linePath.length - 1],
      content: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#E74C3C;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>',
      yAnchor: 1,
      xAnchor: 0.5,
    });
    endMarkerRef.current.setMap(mapRef.current);

    // 寃쎈줈媛 蹂댁씠?꾨줉 吏???곸뿭 議곗젙
    const bounds = new kakao.maps.LatLngBounds();
    linePath.forEach(p => bounds.extend(p));
    mapRef.current.setBounds(bounds, 80, 80, 80, 80);
  }

  // panTo / drawRoute / clearRoute / relayout ?몃? ?몄텧
  useImperativeHandle(ref, () => ({
    panTo: (lat, lng) => {
      if (mapRef.current && window.kakao) {
        mapRef.current.panTo(new window.kakao.maps.LatLng(lat, lng));
      }
    },
    drawRoute: (path) => _drawRoute(path),
    clearRoute: () => _clearRoute(),
    relayout: () => {
      if (mapRef.current) mapRef.current.relayout();
    },
  }));

  // 3D 紐⑤뱶 ?꾪솚 ??吏??relayout
  useEffect(() => {
    if (status === 'ready' && mapRef.current) {
      setTimeout(() => mapRef.current.relayout(), 100);
    }
  }, [is3D, status]);

  // SDK 濡쒕뵫 + 吏??珥덇린??
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus('loading');
        const kakao = await loadKakaoSDK();
        if (cancelled || !mapContainerRef.current) return;

        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: new kakao.maps.LatLng(center.latitude, center.longitude),
          level: 4,
        });
        mapRef.current = map;

        kakao.maps.event.addListener(map, 'idle', () => {
          const c = map.getCenter();
          if (cbIdle.current) cbIdle.current(c.getLat(), c.getLng());
        });

        setStatus('ready');

        // 珥덇린 idle 肄쒕갚
        if (cbIdle.current) cbIdle.current(center.latitude, center.longitude);
      } catch (err) {
        if (!cancelled) {
          console.error('移댁뭅?ㅻ㏊ 珥덇린???ㅽ뙣:', err);
          setErrorMsg(err.message || '?????녿뒗 ?ㅻ쪟');
          setStatus('error');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []); // ?쒕쾲留??ㅽ뻾

  // 留덉빱 ?낅뜲?댄듃
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.kakao) return;
    const kakao = window.kakao;

    // 湲곗〈 留덉빱 ?쒓굅
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    (parkings || []).forEach((p) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(p.lat, p.lng),
        map: mapRef.current,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        if (cbClick.current) cbClick.current(p);
      });
      markersRef.current.push(marker);
    });
  }, [parkings, status]);

  // routePath 蹂寃???Polyline ?낅뜲?댄듃
  useEffect(() => {
    if (status !== 'ready') return;
    if (routePath && routePath.length >= 2) {
      _drawRoute(routePath);
    } else {
      _clearRoute();
    }
  }, [routePath, status]);

  // panTo on center change (吏???앹꽦 ?댄썑)
  useEffect(() => {
    if (status === 'ready' && mapRef.current && window.kakao) {
      mapRef.current.panTo(
        new window.kakao.maps.LatLng(center.latitude, center.longitude)
      );
    }
  }, [center.latitude, center.longitude, status]);

  if (status === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>?좑툘</Text>
        <Text style={styles.errorTitle}>移댁뭅?ㅻ㏊??遺덈윭?????놁뒿?덈떎</Text>
        <Text style={styles.errorBody}>{errorMsg}</Text>
        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>???뺤씤 ?ы빆:</Text>
          <Text style={styles.helpText}>
            1. developers.kakao.com ?????좏뵆由ъ??댁뀡 ???몄씠?꾪뙆??'\n'}
            2. ?쒗뭹 ?ㅼ젙 ??<Text style={styles.bold}>吏??濡쒖뺄 ???쒖꽦??ON)</Text>{'\n'}
            3. ?뚮옯????Web ???ъ씠???꾨찓?몄뿉{'\n'}
               <Text style={styles.bold}>http://localhost:8081</Text> ?깅줉
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>移댁뭅?ㅻ㏊ 濡쒕뵫 以?..</Text>
        </View>
      )}
      {/* 3D ?쇱뒪?숉떚釉??섑띁 */}
      <div
        ref={mapWrapperRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          perspective: is3D ? '800px' : 'none',
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: is3D ? '140%' : '100%',
            transformOrigin: 'center bottom',
            transform: is3D ? 'rotateX(40deg)' : 'none',
            transition: 'transform 0.6s ease, height 0.6s ease',
          }}
        />
      </div>
      {/* 3D 紐⑤뱶 ?곷떒 洹몃씪?곗씠??(?섎뒛 ?④낵) */}
      {is3D && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '25%',
            background: 'linear-gradient(180deg, rgba(135,180,230,0.7) 0%, rgba(135,180,230,0) 100%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 10,
  },
  loadingText: { marginTop: 10, fontSize: 14, color: '#666' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  errorBody: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  helpBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  helpTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  helpText: { fontSize: 13, color: '#555', lineHeight: 22 },
  bold: { fontWeight: 'bold', color: '#007AFF' },
});

export default KakaoMapWeb;
