import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { KAKAO_JS_KEY } from '../config/keys';
const SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;

/**
 * 카카오맵 웹 컴포넌트 - 직접 스크립트 로딩 방식
 *
 * 1) <script> 태그를 document.head에 추가
 * 2) script.onload → kakao.maps.load(callback)
 * 3) callback 안에서 Map, Marker 등 사용
 */

/* ── SDK 로딩 (싱글턴) ── */
let sdkPromise = null;

function loadKakaoSDK() {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    // 이미 로드된 경우
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
          '카카오 SDK 스크립트가 로드되었지만 kakao.maps 객체가 없습니다.\n' +
          '→ 카카오 개발자 콘솔에서 "지도/로컬" 서비스를 활성화했는지 확인하세요.\n' +
          '→ 플랫폼 → Web → 사이트 도메인에 현재 주소를 등록했는지 확인하세요.'
        ));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    script.onerror = () => {
      sdkPromise = null; // 재시도 허용
      reject(new Error(
        '카카오맵 SDK 스크립트 다운로드 실패.\n' +
        '→ 네트워크 연결을 확인하세요.\n' +
        '→ 브라우저의 광고 차단 / 추적 방지 기능을 확인하세요.'
      ));
    };

    document.head.appendChild(script);
  });

  // 실패 시 재시도 가능하도록
  sdkPromise.catch(() => { sdkPromise = null; });

  return sdkPromise;
}

/* ── 컴포넌트 ── */
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

  /* ── 경로 그리기/지우기 내부 함수 ── */
  function _clearRoute() {
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (startMarkerRef.current) { startMarkerRef.current.setMap(null); startMarkerRef.current = null; }
    if (endMarkerRef.current) { endMarkerRef.current.setMap(null); endMarkerRef.current = null; }
  }

  function _drawRoute(path) {
    if (!mapRef.current || !window.kakao || !path || path.length < 2) return;
    _clearRoute();
    const kakao = window.kakao;

    // Polyline 좌표
    const linePath = path.map(p => new kakao.maps.LatLng(p.lat, p.lng));

    // 경로선
    polylineRef.current = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 6,
      strokeColor: '#3366FF',
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
    });
    polylineRef.current.setMap(mapRef.current);

    // 출발 마커 (파란 원)
    startMarkerRef.current = new kakao.maps.CustomOverlay({
      position: linePath[0],
      content: '<div style="width:18px;height:18px;border-radius:50%;background:#3366FF;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      yAnchor: 0.5,
      xAnchor: 0.5,
    });
    startMarkerRef.current.setMap(mapRef.current);

    // 도착 마커 (빨간 핀)
    endMarkerRef.current = new kakao.maps.CustomOverlay({
      position: linePath[linePath.length - 1],
      content: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#E74C3C;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>',
      yAnchor: 1,
      xAnchor: 0.5,
    });
    endMarkerRef.current.setMap(mapRef.current);

    // 경로가 보이도록 지도 영역 조정
    const bounds = new kakao.maps.LatLngBounds();
    linePath.forEach(p => bounds.extend(p));
    mapRef.current.setBounds(bounds, 80, 80, 80, 80);
  }

  // panTo / drawRoute / clearRoute / relayout 외부 호출
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

  // 3D 모드 전환 시 지도 relayout
  useEffect(() => {
    if (status === 'ready' && mapRef.current) {
      setTimeout(() => mapRef.current.relayout(), 100);
    }
  }, [is3D, status]);

  // SDK 로딩 + 지도 초기화
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

        // 초기 idle 콜백
        if (cbIdle.current) cbIdle.current(center.latitude, center.longitude);
      } catch (err) {
        if (!cancelled) {
          console.error('카카오맵 초기화 실패:', err);
          setErrorMsg(err.message || '알 수 없는 오류');
          setStatus('error');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []); // 한번만 실행

  // 마커 업데이트
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.kakao) return;
    const kakao = window.kakao;

    // 기존 마커 제거
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

  // routePath 변경 시 Polyline 업데이트
  useEffect(() => {
    if (status !== 'ready') return;
    if (routePath && routePath.length >= 2) {
      _drawRoute(routePath);
    } else {
      _clearRoute();
    }
  }, [routePath, status]);

  // panTo on center change (지도 생성 이후)
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
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>카카오맵을 불러올 수 없습니다</Text>
        <Text style={styles.errorBody}>{errorMsg}</Text>
        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>✅ 확인 사항:</Text>
          <Text style={styles.helpText}>
            1. developers.kakao.com → 내 애플리케이션 → 세이프파킹{'\n'}
            2. 제품 설정 → <Text style={styles.bold}>지도/로컬 → 활성화(ON)</Text>{'\n'}
            3. 플랫폼 → Web → 사이트 도메인에{'\n'}
               <Text style={styles.bold}>http://localhost:8081</Text> 등록
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
          <Text style={styles.loadingText}>카카오맵 로딩 중...</Text>
        </View>
      )}
      {/* 3D 퍼스펙티브 래퍼 */}
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
      {/* 3D 모드 상단 그라데이션 (하늘 효과) */}
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
