import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { searchPlaces, searchParkingByName, findNearbyParkingLots } from '../services/api';
import { emit } from '../services/eventBus';

export default function SearchScreen({ navigation, route }) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'parking'
  const userLocation = route?.params?.location || null;

  // 디바운스 검색
  useEffect(() => {
    if (searchText.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => doSearch(searchText), 400);
    return () => clearTimeout(timer);
  }, [searchText, activeTab]);

  const doSearch = async (keyword) => {
    setSearching(true);
    try {
      if (activeTab === 'parking') {
        // 공영주차장만 검색
        const parkingResults = await searchParkingByName(keyword);
        setResults(parkingResults);
      } else {
        // 장소 + 주차장 동시 검색
        const [placeResults, parkingResults] = await Promise.all([
          searchPlaces(keyword, userLocation?.latitude, userLocation?.longitude),
          searchParkingByName(keyword),
        ]);
        // 주차장 먼저, 장소 나중에
        setResults([...parkingResults.slice(0, 5), ...placeResults]);
      }
    } catch (error) {
      console.error('검색 오류:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (item) => {
    // eventBus로 HomeScreen에 직접 목적지 전달 (navigation params 우회)
    emit('navigateToDestination', item);
    // Home 화면의 HomeTab으로 이동 (Stack modal 닫기 + Tab 전환)
    const rootNav = navigation.getParent?.() || navigation;
    rootNav.navigate('Home', { screen: 'HomeTab' });
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleSelectResult(item)}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: item.type === 'parking' ? '#E8F5E9' : '#E3F2FD' }
      ]}>
        {item.type === 'parking' ? (
          <FontAwesome5 name="parking" size={18} color="#34C759" />
        ) : (
          <MaterialIcons name="place" size={22} color="#007AFF" />
        )}
      </View>
      <View style={styles.resultInfo}>
        <View style={styles.resultNameRow}>
          <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
          {item.type === 'parking' && (
            <View style={styles.parkingBadge}>
              <Text style={styles.parkingBadgeText}>공영</Text>
            </View>
          )}
          {item.category ? (
            <Text style={styles.categoryText}>{item.category}</Text>
          ) : null}
        </View>
        <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
        {item.distance != null && (
          <Text style={styles.distanceLabel}>
            {item.distance < 1000 ? `${item.distance}m` : `${(item.distance / 1000).toFixed(1)}km`}
          </Text>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* 상단 검색바 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="목적지 또는 주차장 검색"
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 탭 필터 */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>전체</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'parking' && styles.tabActive]}
            onPress={() => setActiveTab('parking')}
          >
            <FontAwesome5 name="parking" size={12} color={activeTab === 'parking' ? '#fff' : '#27AE60'} style={{ marginRight: 4 }} />
            <Text style={[styles.tabText, activeTab === 'parking' && styles.tabTextActive]}>공영주차장</Text>
          </TouchableOpacity>
        </View>

        {/* AI 추천 배너 */}
        {searchText.length === 0 && (
          <TouchableOpacity 
            style={styles.aiBanner}
            onPress={() => navigation.navigate('AIAssistant')}
          >
            <View style={styles.aiIconContainer}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <View style={styles.aiBannerText}>
              <Text style={styles.aiBannerTitle}>AI에게 물어보기</Text>
              <Text style={styles.aiBannerSubtitle}>"시청 근처 단속 없는 주차장 추천해줘"</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#5856D6" />
          </TouchableOpacity>
        )}

        {/* 검색 결과 */}
        {searching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#27AE60" />
            <Text style={styles.loadingText}>검색 중...</Text>
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={(item, idx) => `${item.type}-${item.id || idx}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        ) : searchText.length >= 2 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
          </View>
        ) : (
          <View style={styles.section}>
            {/* 빠른 카테고리 */}
            <View style={styles.categories}>
              <TouchableOpacity style={styles.categoryButton} onPress={() => setSearchText('주차장')}>
                <View style={[styles.categoryIcon, { backgroundColor: '#E8F5E9' }]}>
                  <FontAwesome5 name="parking" size={18} color="#34C759" />
                </View>
                <Text style={styles.categoryBtnText}>주변 주차장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton} onPress={() => setSearchText('주유소')}>
                <View style={[styles.categoryIcon, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialIcons name="local-gas-station" size={18} color="#FF9500" />
                </View>
                <Text style={styles.categoryBtnText}>주유소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton} onPress={() => setSearchText('충전소')}>
                <View style={[styles.categoryIcon, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialIcons name="ev-station" size={18} color="#007AFF" />
                </View>
                <Text style={styles.categoryBtnText}>충전소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton} onPress={() => setSearchText('병원')}>
                <View style={[styles.categoryIcon, { backgroundColor: '#FFEBEE' }]}>
                  <MaterialIcons name="local-hospital" size={18} color="#FF3B30" />
                </View>
                <Text style={styles.categoryBtnText}>병원</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  tabActive: {
    backgroundColor: '#27AE60',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#F3F2FF',
    borderRadius: 12,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#5856D6',
  },
  aiBannerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  categories: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  categoryButton: {
    alignItems: 'center',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBtnText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#999',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flexShrink: 1,
  },
  resultAddress: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  distanceLabel: {
    fontSize: 12,
    color: '#27AE60',
    marginTop: 2,
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 11,
    color: '#888',
    marginLeft: 6,
  },
  parkingBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  parkingBadgeText: {
    fontSize: 11,
    color: '#27AE60',
    fontWeight: '700',
  },
});
