/**
 * KakaoMapNative - Android용 카카오맵 (react-native-webview 기반)
 * 
 * WebView 안에서 카카오맵 JS SDK를 로드하여 지도를 표시합니다.
 * 마커 클릭, 지도 이동 등의 이벤트를 postMessage로 RN에 전달합니다.
 */
import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { KAKAO_JS_KEY } from '../config/keys';

function generateHTML(lat, lng) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <style>
    * { margin:0; padding:0; }
    html, body, #map { width:100%; height:100%; }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.6); opacity: 0.15; }
      100% { transform: scale(1); opacity: 0.6; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"></script>
  <script>
    var map, markers = [], polyline = null, startOverlay = null, endOverlay = null;
    var idleTimer = null;

    kakao.maps.load(function() {
      var container = document.getElementById('map');
      map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(${lat}, ${lng}),
        level: 4
      });

      kakao.maps.event.addListener(map, 'idle', function() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(function() {
          var c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'idle',
            lat: c.getLat(),
            lng: c.getLng()
          }));
        }, 300);
      });

      // 초기 idle
      var c = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'idle',
        lat: c.getLat(),
        lng: c.getLng()
      }));

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    });

    // RN에서 호출하는 함수들
    function updateMarkers(parkingsJSON) {
      // 기존 마커 제거
      for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
      }
      markers = [];

      var parkings = JSON.parse(parkingsJSON);
      for (var i = 0; i < parkings.length; i++) {
        (function(p, idx) {
          var marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(p.lat, p.lng),
            map: map
          });
          kakao.maps.event.addListener(marker, 'click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'markerClick',
              index: idx,
              parking: p
            }));
          });
          markers.push(marker);
        })(parkings[i], i);
      }
    }

    function panTo(lat, lng) {
      if (map) map.panTo(new kakao.maps.LatLng(lat, lng));
    }

    function drawRoute(pathJSON) {
      clearRoute();
      var path = JSON.parse(pathJSON);
      if (!path || path.length < 2) return;

      var linePath = path.map(function(p) {
        return new kakao.maps.LatLng(p.lat, p.lng);
      });

      polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 6,
        strokeColor: '#3366FF',
        strokeOpacity: 0.85,
        strokeStyle: 'solid'
      });
      polyline.setMap(map);

      // 출발 마커
      startOverlay = new kakao.maps.CustomOverlay({
        position: linePath[0],
        content: '<div style="width:18px;height:18px;border-radius:50%;background:#3366FF;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
        yAnchor: 0.5, xAnchor: 0.5
      });
      startOverlay.setMap(map);

      // 도착 마커
      endOverlay = new kakao.maps.CustomOverlay({
        position: linePath[linePath.length - 1],
        content: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#E74C3C;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>',
        yAnchor: 1, xAnchor: 0.5
      });
      endOverlay.setMap(map);

      // 경로 영역 맞추기
      var bounds = new kakao.maps.LatLngBounds();
      linePath.forEach(function(p) { bounds.extend(p); });
      map.setBounds(bounds, 80, 80, 80, 80);
    }

    function clearRoute() {
      if (polyline) { polyline.setMap(null); polyline = null; }
      if (startOverlay) { startOverlay.setMap(null); startOverlay = null; }
      if (endOverlay) { endOverlay.setMap(null); endOverlay = null; }
    }

    var myLocOverlay = null;
    function showMyLocation(lat, lng) {
      hideMyLocation();
      var pos = new kakao.maps.LatLng(lat, lng);
      var html = '<div style="position:relative;width:44px;height:44px;">' +
        '<div style="position:absolute;top:0;left:0;width:44px;height:44px;border-radius:50%;background:rgba(66,133,244,0.15);animation:pulse 2s infinite;"></div>' +
        '<div style="position:absolute;top:12px;left:12px;width:20px;height:20px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 2px 8px rgba(66,133,244,0.5);"></div>' +
        '</div>';
      myLocOverlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: html,
        yAnchor: 0.5, xAnchor: 0.5,
        zIndex: 999
      });
      myLocOverlay.setMap(map);
    }
    function hideMyLocation() {
      if (myLocOverlay) { myLocOverlay.setMap(null); myLocOverlay = null; }
    }
  </script>
</body>
</html>`;
}

const KakaoMapNative = forwardRef(function KakaoMapNative(
  { center, parkings, routePath, is3D, onMarkerClick, onMapIdle },
  ref
) {
  const webViewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const parkingsRef = useRef(parkings);
  parkingsRef.current = parkings;

  useImperativeHandle(ref, () => ({
    panTo: (lat, lng) => {
      webViewRef.current?.injectJavaScript(`panTo(${lat}, ${lng}); true;`);
    },
    drawRoute: (path) => {
      webViewRef.current?.injectJavaScript(`drawRoute('${JSON.stringify(path)}'); true;`);
    },
    clearRoute: () => {
      webViewRef.current?.injectJavaScript(`clearRoute(); true;`);
    },
    showMyLocation: (lat, lng) => {
      webViewRef.current?.injectJavaScript(`showMyLocation(${lat}, ${lng}); true;`);
    },
    hideMyLocation: () => {
      webViewRef.current?.injectJavaScript(`hideMyLocation(); true;`);
    },
    relayout: () => {},
  }));

  // 마커 업데이트
  useEffect(() => {
    if (!ready || !webViewRef.current) return;
    const json = JSON.stringify(parkings || []);
    webViewRef.current.injectJavaScript(`updateMarkers('${json.replace(/'/g, "\\'")}'); true;`);
  }, [parkings, ready]);

  // 경로 업데이트
  useEffect(() => {
    if (!ready || !webViewRef.current) return;
    if (routePath && routePath.length >= 2) {
      const json = JSON.stringify(routePath);
      webViewRef.current.injectJavaScript(`drawRoute('${json.replace(/'/g, "\\'")}'); true;`);
    } else {
      webViewRef.current.injectJavaScript(`clearRoute(); true;`);
    }
  }, [routePath, ready]);

  // center 변경 시 panTo
  useEffect(() => {
    if (!ready || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(`panTo(${center.latitude}, ${center.longitude}); true;`);
  }, [center.latitude, center.longitude, ready]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setReady(true);
      } else if (data.type === 'idle' && onMapIdle) {
        onMapIdle(data.lat, data.lng);
      } else if (data.type === 'markerClick' && onMarkerClick) {
        // parkingsRef에서 원본 parking 객체를 찾아서 전달
        const p = parkingsRef.current?.[data.index] || data.parking;
        onMarkerClick(p);
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateHTML(center.latitude, center.longitude) }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#27AE60" />
            <Text style={styles.loadingText}>카카오맵 로딩 중...</Text>
          </View>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: { marginTop: 10, fontSize: 14, color: '#666' },
});

export default KakaoMapNative;
