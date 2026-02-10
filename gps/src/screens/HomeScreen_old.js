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
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { findNearbyParkingLots, formatDistance } from '../services/api';
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');

// ?붾? ?곗씠??- ?섏쨷??API濡??泥?
const DUMMY_CAMERAS = [
  { id: 1, latitude: 37.5665, longitude: 126.9780, name: '?몄쥌?濡??⑥냽移대찓?? },
  { id: 2, latitude: 37.5645, longitude: 126.9770, name: '?쒗룊濡??⑥냽移대찓?? },
  { id: 3, latitude: 37.5685, longitude: 126.9800, name: '醫낅줈 ?⑥냽移대찓?? },
];

const DUMMY_PARKINGS = [
  { id: 1, latitude: 37.5655, longitude: 126.9760, name: '?쒖껌 怨듭쁺二쇱감??, available: 23, total: 50, price: '10遺?500?? },
  { id: 2, latitude: 37.5675, longitude: 126.9790, name: '?몄쥌臾명솕?뚭? 二쇱감??, available: 45, total: 100, price: '10遺?600?? },
  { id: 3, latitude: 37.5640, longitude: 126.9810, name: '?꾨젅?ㅼ꽱??二쇱감??, available: 12, total: 80, price: '10遺?700?? },
];

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const [region, setRegion] = useState({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // 珥덇린 二쇱감??寃??
  useEffect(() => {
    searchNearbyParkings(region.latitude, region.longitude);
  }, []);

  // 二쇱감??寃???⑥닔
  const searchNearbyParkings = async (lat, lng) => {
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
  };

  // 吏???대룞 ?꾨즺 ??二쇱감???ш???
  const onRegionChangeComplete = (newRegion) => {
    setRegion(newRegion);
    searchNearbyParkings(newRegion.latitude, newRegion.longitude);
  };

  // ?꾩튂 沅뚰븳 諛?珥덇린 ?꾩튂 ?ㅼ젙
  useEffect(() => {
    if (Platform.OS === 'web') {
      setLocation({ latitude: 37.5665, longitude: 126.9780 });
      return;
    }
    
    (async () => {
      try {
        const Location = require('expo-location');
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      } catch (e) {
        console.log('Location error:', e);
      }
    })();
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
    }).start(() => setSelectedParking(null));
  };

  const goToMyLocation = () => {
    if (location) {
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      if (mapRef.current && Platform.OS !== 'web') {
        mapRef.current.animateToRegion(newRegion);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* 吏??- Google Maps (??+ 紐⑤컮???숈씪) */}
      {Platform.OS === 'web' ? (
        <View style={styles.webMapContainer}>
          <iframe
            style={{
              width: '100%',
              height: '100%',
              border: 0,
            }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_KEY}&center=${region.latitude},${region.longitude}&zoom=15&maptype=roadmap`}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#27AE60" />
              <Text style={styles.loadingText}>二쇱감??寃??以?..</Text>
            </View>
          )}
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* 二쇱감??留덉빱 - ?ㅼ젣 API ?곗씠??*/}
          {parkings.map((parking) => (
            <Marker
              key={parking.id}
              coordinate={{ latitude: parking.lat, longitude: parking.lng }}
              title={parking.name}
              description={`二쇱감 媛?? ${parking.capacity || '?'}?`}
              onPress={() => showBottomSheet(parking)}
              pinColor="#27AE60"
            />
          ))}
        </MapView>
      )}

      {/* 濡쒕뵫 ?몃뵒耳?댄꽣 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#27AE60" />
          <Text style={styles.loadingText}>二쇰? 二쇱감??寃??以?..</Text>
        </View>
      )}

      {/* ?곷떒 寃?됰컮 */}
      <TouchableOpacity 
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search')}
      >
        <Ionicons name="search" size={20} color="#666" />
        <Text style={styles.searchText}>紐⑹쟻吏瑜?寃?됲븯?몄슂</Text>
        <View style={styles.aiButton}>
          <Text style={styles.aiButtonText}>AI</Text>
        </View>
      </TouchableOpacity>

      {/* ?곗륫 踰꾪듉??*/}
      <View style={styles.rightButtons}>
        <TouchableOpacity style={styles.mapButton} onPress={goToMyLocation}>
          <MaterialIcons name="my-location" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => navigation.navigate('AIAssistant')}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#007AFF" />
        </TouchableOpacity>
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
                
                <View style={styles.parkingActions}>
                  <TouchableOpacity style={styles.parkingActionButton}>
                    <MaterialIcons name="directions" size={24} color="#fff" />
                    <Text style={styles.parkingActionText}>寃쎈줈 ?덈궡</Text>
                  </TouchableOpacity>
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
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
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
    bottom: 200,
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
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  // ?뱀슜 ?ㅽ???
  webMapContainer: {
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
});
