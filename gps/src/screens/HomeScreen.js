import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { findNearbyParkingLots, formatDistance, formatDuration } from '../services/api';
import { openKakaoNavi, fetchRoutePath } from '../services/navigation';
import { initKNSDK, startNavigation as startKNSDKNavi, getKNSDKStatus, getKeyHash } from '../services/knsdkBridge';
import { on } from '../services/eventBus';

// 플랫폼별 분기
import KakaoMapWeb from '../components/KakaoMapWeb';
import KakaoMapNative from '../components/KakaoMapNative';
// Android → WebView 기반 카카오맵, Web → 직접 DOM 카카오맵
const KakaoMap = Platform.OS === 'web' ? KakaoMapWeb : KakaoMapNative;

const { width, height } = Dimensions.get('window');

// 기본 좌표 (서울시청) - GPS 거부 시 사용
const DEFAULT_LOCATION = { latitude: 37.5665, longitude: 126.9780 };

export default function HomeScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routePath, setRoutePath] = useState(null);   // Polyline 경로 좌표
  const [routeInfo, setRouteInfo] = useState(null);    // { distanceText, durationText }
  const [routeLoading, setRouteLoading] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);     // 3D 뷰 토글
  const mapRef = useRef(null);
  const kakaoMapRef = useRef(null);
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [myLocationActive, setMyLocationActive] = useState(false);

  // KNSDK 상태 (화면에 표시하여 ADB 없이도 확인 가능)
  const [knsdkStatus, setKnsdkStatus] = useState('초기화 대기');
  const [knsdkReady, setKnsdkReady] = useState(false);
  const [keyHashInfo, setKeyHashInfo] = useState(null);

  // 위치 권한 → GPS 취득 → KNSDK 초기화 (순서 보장)
  useEffect(() => {
    if (Platform.OS === 'web') {
      setLocation(DEFAULT_LOCATION);
      return;
    }
    
    (async () => {
      // 1) 위치 권한 요청
      let permGranted = false;
      try {
        const Location = require('expo-location');
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          permGranted = true;
          try {
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
            setMapCenter({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          } catch (e) {
            console.log('GPS 취득 실패, 기본 좌표 사용:', e);
            setLocation(DEFAULT_LOCATION);
          }
        } else {
          console.log('위치 권한 거부 → 서울시청 기본 좌표 사용');
          setLocation(DEFAULT_LOCATION);
        }
      } catch (e) {
        console.log('Location error:', e);
        setLocation(DEFAULT_LOCATION);
      }

      // 2) 위치 권한 획득 후 KNSDK 초기화 (C302 방지)
      if (Platform.OS === 'android') {
        if (!permGranted) {
          setKnsdkStatus('❌ 위치 권한 필요 (C302)');
          return;
        }
        
        // 2-1) 런타임 키 해시 조회 (디버깅용)
        try {
          const hashInfo = await getKeyHash();
          if (hashInfo) {
            setKeyHashInfo(hashInfo);
            console.log('런타임 키 해시:', JSON.stringify(hashInfo));
          }
        } catch (e) {
          console.log('키 해시 조회 실패:', e);
        }
        
        setKnsdkStatus('초기화 중...');
        try {
          const result = await initKNSDK();
          if (result.success) {
            setKnsdkStatus('✅ SDK 준비 완료');
            setKnsdkReady(true);
            console.log('KNSDK 초기화 완료');
          } else {
            setKnsdkStatus(`❌ ${result.error || '초기화 실패'}`);
            setKnsdkReady(false);
            console.error('KNSDK 초기화 실패:', result.error);
          }
        } catch (err) {
          setKnsdkStatus(`❌ 예외: ${err.message}`);
          setKnsdkReady(false);
        }
      }
    })();
  }, []);

  // SearchScreen에서 목적지 선택 시 지도 이동
  useEffect(() => {
    const dest = route?.params?.destination;
    const ts = route?.params?.timestamp;
    if (dest && dest.lat && dest.lng) {
      console.log('목적지 수신:', dest.name, dest.lat, dest.lng);
      const newCenter = { latitude: dest.lat, longitude: dest.lng };
      setMapCenter(newCenter);
      // 약간 딜레이를 줘서 WebView가 준비된 후 panTo
      setTimeout(() => {
        if (kakaoMapRef.current) {
          kakaoMapRef.current.panTo(dest.lat, dest.lng);
        }
      }, 500);
    }
  }, [route?.params?.timestamp]);

  // eventBus: SearchScreen에서 목적지 선택 시 직접 수신
  useEffect(() => {
    const unsubscribe = on('navigateToDestination', (dest) => {
      if (dest && dest.lat && dest.lng) {
        console.log('[eventBus] 목적지 수신:', dest.name, dest.lat, dest.lng);
        const newCenter = { latitude: dest.lat, longitude: dest.lng };
        setMapCenter(newCenter);
        setTimeout(() => {
          if (kakaoMapRef.current) {
            kakaoMapRef.current.panTo(dest.lat, dest.lng);
          }
        }, 600);
      }
    });
    return unsubscribe;
  }, []);

  // 위치 변경 시 주변 주차장 로드
  useEffect(() => {
    if (!location) return;
    
    const loadNearbyParkings = async () => {
      setLoading(true);
      try {
        const nearby = await findNearbyParkingLots(
          location.latitude, 
          location.longitude, 
          2 // 2km 반경
        );
        setParkings(nearby);
        console.log(`주변 주차장 ${nearby.length}개 로드됨`);
      } catch (error) {
        console.error('주차장 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadNearbyParkings();
  }, [location]);


  const showBottomSheet = (parking) => {
    setSelectedParking(parking);
    Animated.spring(bottomSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hideBottomSheet = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedParking(null);
      setRoutePath(null);
      setRouteInfo(null);
      if (kakaoMapRef.current && kakaoMapRef.current.clearRoute) {
        kakaoMapRef.current.clearRoute();
      }
    });
  };

  // 경로 미리보기 (지도에 Polyline 그리기)
  const showRoutePreview = async (parking) => {
    const origin = location || { latitude: 37.5665, longitude: 126.9780 };
    setRouteLoading(true);
    try {
      const result = await fetchRoutePath(
        { lat: origin.latitude, lng: origin.longitude },
        { lat: parking.lat, lng: parking.lng }
      );
      setRoutePath(result.path);
      setRouteInfo({ distanceText: result.distanceText, durationText: result.durationText });
      // 지도에 경로 그리기
      if (kakaoMapRef.current && kakaoMapRef.current.drawRoute) {
        kakaoMapRef.current.drawRoute(result.path);
      }
    } catch (err) {
      console.error('경로 미리보기 실패:', err);
      if (Platform.OS === 'web') {
        alert('경로를 불러올 수 없습니다.\n카카오 REST API 키를 확인하세요.');
      } else {
        Alert.alert('오류', '경로를 불러올 수 없습니다.');
      }
    } finally {
      setRouteLoading(false);
    }
  };

  // 내비게이션 시작 (Android: KNSDK 3D / Web: 카카오맵 웹)
  const startNavigation = async (parking) => {
    try {
      // 현재 GPS 좌표를 출발지로 전달
      const startLat = location?.latitude || DEFAULT_LOCATION.latitude;
      const startLng = location?.longitude || DEFAULT_LOCATION.longitude;
      const result = await startKNSDKNavi(
        parking.lat, parking.lng, parking.name,
        startLat, startLng
      );
      console.log('내비 시작:', result.method);
    } catch (err) {
      console.error('내비 시작 실패:', err);
    }
  };

  const goToMyLocation = async () => {
    // 토글: 이미 활성화된 상태면 끄기
    if (myLocationActive) {
      setMyLocationActive(false);
      if (kakaoMapRef.current?.hideMyLocation) {
        kakaoMapRef.current.hideMyLocation();
      }
      return;
    }

    try {
      const Location = require('expo-location');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한', '현재 위치를 확인하려면 위치 권한을 허용해주세요.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = loc.coords;
      setLocation(coords);
      setMapCenter({ latitude: coords.latitude, longitude: coords.longitude });
      setMyLocationActive(true);
      if (kakaoMapRef.current) {
        kakaoMapRef.current.panTo(coords.latitude, coords.longitude);
        // 파란 동그라미 표시
        if (kakaoMapRef.current.showMyLocation) {
          kakaoMapRef.current.showMyLocation(coords.latitude, coords.longitude);
        }
      }
    } catch (e) {
      console.error('현재위치 이동 실패:', e);
      Alert.alert('오류', '현재 위치를 가져올 수 없습니다.');
    }
  };

  return (
    <View style={styles.container}>
      {/* 지도 영역 */}
      <View style={styles.mapArea}>
        <KakaoMap 
          ref={kakaoMapRef}
          center={mapCenter}
          parkings={parkings}
          routePath={routePath}
          is3D={is3DMode}
          onMarkerClick={showBottomSheet}
          onMapIdle={async (lat, lng) => {
            setLoading(true);
            try {
              const nearbyParkings = await findNearbyParkingLots(lat, lng, 2);
              setParkings(nearbyParkings);
              console.log(`주변 주차장 ${nearbyParkings.length}개 검색됨`);
            } catch (error) {
              console.error('주차장 검색 실패:', error);
            } finally {
              setLoading(false);
            }
          }}
        />
        
        {/* 우측 상단 로딩 뱃지 */}
        {loading && (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}

      {/* 상단 검색바 */}
      <TouchableOpacity 
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search', { location })}
      >
        <Ionicons name="search" size={20} color="#666" />
        <Text style={styles.searchText}>목적지를 검색하세요</Text>
        <View style={styles.aiButton}>
          <Text style={styles.aiButtonText}>AI</Text>
        </View>
      </TouchableOpacity>

      {/* 우측 버튼들 */}
      <View style={styles.rightButtons}>
        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={[styles.mapButton, is3DMode && styles.mapButtonActive]}
            onPress={() => setIs3DMode(prev => !prev)}
          >
            <Text style={[styles.threeDText, is3DMode && styles.threeDTextActive]}>
              3D
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.mapButton, myLocationActive && styles.mapButtonMyLocActive]}
          onPress={goToMyLocation}
        >
          <MaterialIcons name="my-location" size={24} color={myLocationActive ? '#fff' : '#007AFF'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => navigation.navigate('AIAssistant')}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      </View>

      {/* 하단 빠른 액션 */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#E8F8EE' }]}>
            <FontAwesome5 name="parking" size={18} color="#27AE60" />
          </View>
          <Text style={styles.quickActionText}>주변 주차장</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#FDEEEE' }]}>
            <MaterialIcons name="videocam" size={18} color="#E74C3C" />
          </View>
          <Text style={styles.quickActionText}>단속카메라</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AIAssistant')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#F0F0F8' }]}>
            <Ionicons name="sparkles" size={18} color="#1A1A2E" />
          </View>
          <Text style={styles.quickActionText}>AI 추천</Text>
        </TouchableOpacity>
      </View>

      {/* 주차장 상세 바텀시트 */}
      {selectedParking && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={hideBottomSheet}
        >
          <Animated.View 
            style={[
              styles.bottomSheet,
              {
                transform: [{
                  translateY: bottomSheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.bottomSheetHandle} />
              <View style={styles.parkingInfo}>
                <View style={styles.parkingHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parkingName}>{selectedParking.name}</Text>
                    <Text style={styles.parkingAddress}>{selectedParking.address}</Text>
                    <Text style={styles.parkingPrice}>{selectedParking.fee || '요금정보 없음'}</Text>
                  </View>
                  {selectedParking.distance && (
                    <View style={styles.distanceBadge}>
                      <MaterialIcons name="directions-walk" size={14} color="#666" />
                      <Text style={styles.distanceText}>
                        {formatDistance(selectedParking.distance * 1000)}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.parkingDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="local-parking" size={18} color="#666" />
                    <Text style={styles.detailText}>주차구획: {selectedParking.capacity}대</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={18} color="#666" />
                    <Text style={styles.detailText}>{selectedParking.weekdayHours}</Text>
                  </View>
                  {selectedParking.phone && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="phone" size={18} color="#666" />
                      <Text style={styles.detailText}>{selectedParking.phone}</Text>
                    </View>
                  )}
                </View>
                
                {/* 경로 정보 표시 */}
                {routeInfo && (
                  <View style={styles.routeInfoBar}>
                    <View style={styles.routeInfoItem}>
                      <MaterialIcons name="directions-car" size={18} color="#3366FF" />
                      <Text style={styles.routeInfoText}>{routeInfo.distanceText}</Text>
                    </View>
                    <View style={styles.routeInfoDivider} />
                    <View style={styles.routeInfoItem}>
                      <MaterialIcons name="schedule" size={18} color="#3366FF" />
                      <Text style={styles.routeInfoText}>{routeInfo.durationText}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.parkingActions}>
                  {/* 경로가 없으면 '경로 보기', 있으면 '내비 시작' */}
                  {!routeInfo ? (
                    <TouchableOpacity
                      style={styles.parkingActionButton}
                      onPress={() => showRoutePreview(selectedParking)}
                      disabled={routeLoading}
                    >
                      {routeLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MaterialIcons name="directions" size={24} color="#fff" />
                      )}
                      <Text style={styles.parkingActionText}>
                        {routeLoading ? '경로 검색 중...' : '경로 보기'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.parkingActionButton, styles.naviButton]}
                      onPress={() => startNavigation(selectedParking)}
                    >
                      <MaterialIcons name="navigation" size={24} color="#fff" />
                      <Text style={styles.parkingActionText}>내비 시작</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.parkingActionButton, styles.secondaryButton]}>
                    <MaterialIcons name="favorite-border" size={24} color="#007AFF" />
                    <Text style={[styles.parkingActionText, styles.secondaryButtonText]}>즐겨찾기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: width,
    height: height,
  },
  searchBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 24) + 12,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  searchText: {
    flex: 1,
    marginLeft: 14,
    fontSize: 15,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  aiButton: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  cameraMarker: {
    backgroundColor: '#E74C3C',
    padding: 10,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  parkingMarker: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  parkingMarkerOverlay: {
    alignItems: 'center',
  },
  markerLabel: {
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerLabelText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
    maxWidth: 100,
  },
  parkingCount: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  dangerAlert: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  dangerAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dangerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerAlertText: {
    flex: 1,
    marginLeft: 14,
  },
  dangerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  dangerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 3,
  },
  alternativeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  alternativeButtonText: {
    color: '#1A1A2E',
    fontWeight: '600',
    fontSize: 13,
  },
  swipeHint: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 0,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  rightButtons: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
  mapButton: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  parkingInfo: {
    paddingHorizontal: 24,
  },
  parkingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  parkingName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  parkingAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  parkingPrice: {
    fontSize: 14,
    color: '#27AE60',
    marginTop: 6,
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  parkingDetails: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  availabilityBadge: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  availabilityText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  availabilityLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  parkingActions: {
    flexDirection: 'row',
  },
  parkingActionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  parkingActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
  },
  secondaryButtonText: {
    color: '#1A1A2E',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  loadingBadge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 58 : 110,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(39,174,96,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 100,
  },
  // 웹용 스타일
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8E8E8',
  },
  webMapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(180deg, #C8D6E5 0%, #D5E5D5 100%)',
  },
  myLocationMarker: {
    position: 'absolute',
    top: '45%',
    left: '45%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // ── 경로 미리보기 & 내비 스타일 ──
  routeInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3366FF',
    marginLeft: 6,
  },
  routeInfoDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#C5CDE8',
    marginHorizontal: 16,
  },
  naviButton: {
    backgroundColor: '#3366FF',
  },
  // ── 3D 토글 버튼 ──
  mapButtonActive: {
    backgroundColor: '#1A1A2E',
  },
  mapButtonMyLocActive: {
    backgroundColor: '#4285F4',
    shadowColor: '#4285F4',
    shadowOpacity: 0.4,
    elevation: 6,
  },
  threeDText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#007AFF',
  },
  threeDTextActive: {
    color: '#fff',
  },
  // ── KNSDK 상태 표시 ──
  sdkStatusBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sdkStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sdkStatusReady: {
    color: '#4CAF50',
  },
  sdkStatusError: {
    color: '#FF9800',
  },
});
