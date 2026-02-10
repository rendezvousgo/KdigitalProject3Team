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

// ?뚮옯?쇰퀎 遺꾧린
import KakaoMapWeb from '../components/KakaoMapWeb';
import KakaoMapNative from '../components/KakaoMapNative';
// Android ??WebView 湲곕컲 移댁뭅?ㅻ㏊, Web ??吏곸젒 DOM 移댁뭅?ㅻ㏊
const KakaoMap = Platform.OS === 'web' ? KakaoMapWeb : KakaoMapNative;

const { width, height } = Dimensions.get('window');

// 湲곕낯 醫뚰몴 (?쒖슱?쒖껌) - GPS 嫄곕? ???ъ슜
const DEFAULT_LOCATION = { latitude: 37.5665, longitude: 126.9780 };

export default function HomeScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routePath, setRoutePath] = useState(null);   // Polyline 寃쎈줈 醫뚰몴
  const [routeInfo, setRouteInfo] = useState(null);    // { distanceText, durationText }
  const [routeLoading, setRouteLoading] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);     // 3D 酉??좉?
  const mapRef = useRef(null);
  const kakaoMapRef = useRef(null);
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [myLocationActive, setMyLocationActive] = useState(false);

  // KNSDK ?곹깭 (?붾㈃???쒖떆?섏뿬 ADB ?놁씠???뺤씤 媛??
  const [knsdkStatus, setKnsdkStatus] = useState('珥덇린???湲?);
  const [knsdkReady, setKnsdkReady] = useState(false);
  const [keyHashInfo, setKeyHashInfo] = useState(null);

  // ?꾩튂 沅뚰븳 ??GPS 痍⑤뱷 ??KNSDK 珥덇린??(?쒖꽌 蹂댁옣)
  useEffect(() => {
    if (Platform.OS === 'web') {
      setLocation(DEFAULT_LOCATION);
      return;
    }
    
    (async () => {
      // 1) ?꾩튂 沅뚰븳 ?붿껌
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
            console.log('GPS 痍⑤뱷 ?ㅽ뙣, 湲곕낯 醫뚰몴 ?ъ슜:', e);
            setLocation(DEFAULT_LOCATION);
          }
        } else {
          console.log('?꾩튂 沅뚰븳 嫄곕? ???쒖슱?쒖껌 湲곕낯 醫뚰몴 ?ъ슜');
          setLocation(DEFAULT_LOCATION);
        }
      } catch (e) {
        console.log('Location error:', e);
        setLocation(DEFAULT_LOCATION);
      }

      // 2) ?꾩튂 沅뚰븳 ?띾뱷 ??KNSDK 珥덇린??(C302 諛⑹?)
      if (Platform.OS === 'android') {
        if (!permGranted) {
          setKnsdkStatus('???꾩튂 沅뚰븳 ?꾩슂 (C302)');
          return;
        }
        
        // 2-1) ?고??????댁떆 議고쉶 (?붾쾭源낆슜)
        try {
          const hashInfo = await getKeyHash();
          if (hashInfo) {
            setKeyHashInfo(hashInfo);
            console.log('?고??????댁떆:', JSON.stringify(hashInfo));
          }
        } catch (e) {
          console.log('???댁떆 議고쉶 ?ㅽ뙣:', e);
        }
        
        setKnsdkStatus('珥덇린??以?..');
        try {
          const result = await initKNSDK();
          if (result.success) {
            setKnsdkStatus('??SDK 以鍮??꾨즺');
            setKnsdkReady(true);
            console.log('KNSDK 珥덇린???꾨즺');
          } else {
            setKnsdkStatus(`??${result.error || '珥덇린???ㅽ뙣'}`);
            setKnsdkReady(false);
            console.error('KNSDK 珥덇린???ㅽ뙣:', result.error);
          }
        } catch (err) {
          setKnsdkStatus(`???덉쇅: ${err.message}`);
          setKnsdkReady(false);
        }
      }
    })();
  }, []);

  // SearchScreen?먯꽌 紐⑹쟻吏 ?좏깮 ??吏???대룞
  useEffect(() => {
    const dest = route?.params?.destination;
    const ts = route?.params?.timestamp;
    if (dest && dest.lat && dest.lng) {
      console.log('紐⑹쟻吏 ?섏떊:', dest.name, dest.lat, dest.lng);
      const newCenter = { latitude: dest.lat, longitude: dest.lng };
      setMapCenter(newCenter);
      // ?쎄컙 ?쒕젅?대? 以섏꽌 WebView媛 以鍮꾨맂 ??panTo
      setTimeout(() => {
        if (kakaoMapRef.current) {
          kakaoMapRef.current.panTo(dest.lat, dest.lng);
        }
      }, 500);
    }
  }, [route?.params?.timestamp]);

  // eventBus: SearchScreen?먯꽌 紐⑹쟻吏 ?좏깮 ??吏곸젒 ?섏떊
  useEffect(() => {
    const unsubscribe = on('navigateToDestination', (dest) => {
      if (dest && dest.lat && dest.lng) {
        console.log('[eventBus] 紐⑹쟻吏 ?섏떊:', dest.name, dest.lat, dest.lng);
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

  // ?꾩튂 蹂寃???二쇰? 二쇱감??濡쒕뱶
  useEffect(() => {
    if (!location) return;
    
    const loadNearbyParkings = async () => {
      setLoading(true);
      try {
        const nearby = await findNearbyParkingLots(
          location.latitude, 
          location.longitude, 
          2 // 2km 諛섍꼍
        );
        setParkings(nearby);
        console.log(`二쇰? 二쇱감??${nearby.length}媛?濡쒕뱶??);
      } catch (error) {
        console.error('二쇱감??濡쒕뱶 ?ㅽ뙣:', error);
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

  // 寃쎈줈 誘몃━蹂닿린 (吏?꾩뿉 Polyline 洹몃━湲?
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
      // 吏?꾩뿉 寃쎈줈 洹몃━湲?
      if (kakaoMapRef.current && kakaoMapRef.current.drawRoute) {
        kakaoMapRef.current.drawRoute(result.path);
      }
    } catch (err) {
      console.error('寃쎈줈 誘몃━蹂닿린 ?ㅽ뙣:', err);
      if (Platform.OS === 'web') {
        alert('寃쎈줈瑜?遺덈윭?????놁뒿?덈떎.\n移댁뭅??REST API ?ㅻ? ?뺤씤?섏꽭??');
      } else {
        Alert.alert('?ㅻ쪟', '寃쎈줈瑜?遺덈윭?????놁뒿?덈떎.');
      }
    } finally {
      setRouteLoading(false);
    }
  };

  // ?대퉬寃뚯씠???쒖옉 (Android: KNSDK 3D / Web: 移댁뭅?ㅻ㏊ ??
  const startNavigation = async (parking) => {
    try {
      // ?꾩옱 GPS 醫뚰몴瑜?異쒕컻吏濡??꾨떖
      const startLat = location?.latitude || DEFAULT_LOCATION.latitude;
      const startLng = location?.longitude || DEFAULT_LOCATION.longitude;
      const result = await startKNSDKNavi(
        parking.lat, parking.lng, parking.name,
        startLat, startLng
      );
      console.log('?대퉬 ?쒖옉:', result.method);
    } catch (err) {
      console.error('?대퉬 ?쒖옉 ?ㅽ뙣:', err);
    }
  };

  const goToMyLocation = async () => {
    // ?좉?: ?대? ?쒖꽦?붾맂 ?곹깭硫??꾧린
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
        Alert.alert('?꾩튂 沅뚰븳', '?꾩옱 ?꾩튂瑜??뺤씤?섎젮硫??꾩튂 沅뚰븳???덉슜?댁＜?몄슂.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = loc.coords;
      setLocation(coords);
      setMapCenter({ latitude: coords.latitude, longitude: coords.longitude });
      setMyLocationActive(true);
      if (kakaoMapRef.current) {
        kakaoMapRef.current.panTo(coords.latitude, coords.longitude);
        // ?뚮? ?숆렇?쇰? ?쒖떆
        if (kakaoMapRef.current.showMyLocation) {
          kakaoMapRef.current.showMyLocation(coords.latitude, coords.longitude);
        }
      }
    } catch (e) {
      console.error('?꾩옱?꾩튂 ?대룞 ?ㅽ뙣:', e);
      Alert.alert('?ㅻ쪟', '?꾩옱 ?꾩튂瑜?媛?몄삱 ???놁뒿?덈떎.');
    }
  };

  return (
    <View style={styles.container}>
      {/* 吏???곸뿭 */}
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
              console.log(`二쇰? 二쇱감??${nearbyParkings.length}媛?寃?됰맖`);
            } catch (error) {
              console.error('二쇱감??寃???ㅽ뙣:', error);
            } finally {
              setLoading(false);
            }
          }}
        />
        
        {/* ?곗륫 ?곷떒 濡쒕뵫 諭껋? */}
        {loading && (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}

      {/* ?곷떒 寃?됰컮 */}
      <TouchableOpacity 
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search', { location })}
      >
        <Ionicons name="search" size={20} color="#666" />
        <Text style={styles.searchText}>紐⑹쟻吏瑜?寃?됲븯?몄슂</Text>
        <View style={styles.aiButton}>
          <Text style={styles.aiButtonText}>AI</Text>
        </View>
      </TouchableOpacity>

      {/* ?곗륫 踰꾪듉??*/}
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

      {/* ?섎떒 鍮좊Ⅸ ?≪뀡 */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#E8F8EE' }]}>
            <FontAwesome5 name="parking" size={18} color="#27AE60" />
          </View>
          <Text style={styles.quickActionText}>二쇰? 二쇱감??/Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#FDEEEE' }]}>
            <MaterialIcons name="videocam" size={18} color="#E74C3C" />
          </View>
          <Text style={styles.quickActionText}>?⑥냽移대찓??/Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AIAssistant')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#F0F0F8' }]}>
            <Ionicons name="sparkles" size={18} color="#1A1A2E" />
          </View>
          <Text style={styles.quickActionText}>AI 異붿쿇</Text>
        </TouchableOpacity>
      </View>

      {/* 二쇱감???곸꽭 諛뷀??쒗듃 */}
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
                    <Text style={styles.parkingPrice}>{selectedParking.fee || '?붽툑?뺣낫 ?놁쓬'}</Text>
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
                    <Text style={styles.detailText}>二쇱감援ы쉷: {selectedParking.capacity}?</Text>
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
                
                {/* 寃쎈줈 ?뺣낫 ?쒖떆 */}
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
                  {/* 寃쎈줈媛 ?놁쑝硫?'寃쎈줈 蹂닿린', ?덉쑝硫?'?대퉬 ?쒖옉' */}
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
                        {routeLoading ? '寃쎈줈 寃??以?..' : '寃쎈줈 蹂닿린'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.parkingActionButton, styles.naviButton]}
                      onPress={() => startNavigation(selectedParking)}
                    >
                      <MaterialIcons name="navigation" size={24} color="#fff" />
                      <Text style={styles.parkingActionText}>?대퉬 ?쒖옉</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.parkingActionButton, styles.secondaryButton]}>
                    <MaterialIcons name="favorite-border" size={24} color="#007AFF" />
                    <Text style={[styles.parkingActionText, styles.secondaryButtonText]}>利먭꺼李얘린</Text>
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
  // ?뱀슜 ?ㅽ???
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
  // ?? 寃쎈줈 誘몃━蹂닿린 & ?대퉬 ?ㅽ?????
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
  // ?? 3D ?좉? 踰꾪듉 ??
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
  // ?? KNSDK ?곹깭 ?쒖떆 ??
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
