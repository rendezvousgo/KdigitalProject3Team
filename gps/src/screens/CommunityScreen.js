import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// ── 더미 데이터 (백엔드 연결 전) ──────────────────────────
const CATEGORIES = [
  { id: 0, name: '전체' },
  { id: 1, name: '자유게시판' },
  { id: 2, name: '주차 팁' },
  { id: 3, name: '단속 정보' },
  { id: 4, name: '질문답변' },
];

const generateDummyPosts = () => {
  const posts = [];
  const writers = ['홍길동', '김철수', '이영희', '박지민', '최현우'];
  const titles = [
    '강남역 주변 무료주차장 정보 공유합니다',
    '오늘 종로구 단속 정보 알려드려요',
    '주차장에서 문콕 당했을 때 대처법',
    '여의도 IFC몰 주차 팁 공유',
    '초보운전 주차 실력 늘리는 방법',
    '서울시 공영주차장 요금 비교',
    '아파트 주차 분쟁 해결법 아시는 분?',
    '단속 카메라 위치 공유해요',
    '이번 주말 잠실 주차 가능한 곳?',
    '전기차 충전 가능한 주차장 목록',
    '주차장에서 사고났을 때 보험처리',
    '지하주차장 좁은 곳 주차 꿀팁',
    '노상주차 단속 시간대 정리',
    '공영 vs 민영 주차장 비교',
    '하이패스 주차정산 되는 곳 정리',
    '신도림역 근처 저렴한 주차장',
    '세이프파킹 앱 사용 후기!',
    '겨울철 주차 시 주의사항',
    '키즈존 주차장 추천해주세요',
    '장기주차 할인 되는 주차장',
    '명동 주차 가능한 곳 있나요?',
    '주차위반 과태료 이의신청 방법',
    '지하주차장 환기 시설 중요성',
    '자동주차 시스템 있는 주차장',
    '휴일 공영주차장 무료인 곳 정리',
  ];
  for (let i = 25; i >= 1; i--) {
    posts.push({
      id: i,
      title: titles[i - 1] || `테스트 글 ${i}`,
      writer: writers[i % 5],
      categoryId: (i % 4) + 1,
      categoryName: CATEGORIES[(i % 4) + 1].name,
      date: `2026-02-${String(Math.max(1, i)).padStart(2, '0')}`,
      viewCount: Math.floor(Math.random() * 200),
      commentCount: Math.floor(Math.random() * 10),
    });
  }
  return posts;
};

const ALL_POSTS = generateDummyPosts();
const PAGE_SIZE = 10;

export default function CommunityScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [displayPosts, setDisplayPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState('title'); // 'title' | 'writer'
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showSearchTypeMenu, setShowSearchTypeMenu] = useState(false);

  // 초기 로드
  useEffect(() => {
    loadPosts();
  }, []);

  // 카테고리/검색 변경 시 필터링
  useEffect(() => {
    filterPosts();
  }, [selectedCategory, posts]);

  const loadPosts = () => {
    // TODO: 백엔드 API 연동 시 fetch로 교체
    setPosts(ALL_POSTS);
  };

  const filterPosts = () => {
    let result = [...posts];

    if (selectedCategory !== 0) {
      result = result.filter(p => p.categoryId === selectedCategory);
    }

    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      if (searchType === 'title') {
        result = result.filter(p => p.title.toLowerCase().includes(keyword));
      } else {
        result = result.filter(p => p.writer.toLowerCase().includes(keyword));
      }
    }

    setFilteredPosts(result);
    setDisplayPosts(result.slice(0, PAGE_SIZE));
    setPage(0);
    setHasMore(result.length > PAGE_SIZE);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    setLoading(true);
    const nextPage = page + 1;
    const start = nextPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const more = filteredPosts.slice(start, end);

    if (more.length > 0) {
      setDisplayPosts(prev => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(end < filteredPosts.length);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts();
    setSearchText('');
    setSelectedCategory(0);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleSearch = () => {
    filterPosts();
  };

  const getCategoryColor = (catName) => {
    switch (catName) {
      case '자유게시판': return { bg: '#E3F2FD', text: '#1976D2' };
      case '주차 팁': return { bg: '#E8F5E9', text: '#388E3C' };
      case '단속 정보': return { bg: '#FFF3E0', text: '#F57C00' };
      case '질문답변': return { bg: '#F3E5F5', text: '#7B1FA2' };
      default: return { bg: '#F5F5F5', text: '#666' };
    }
  };

  // ── 게시글 아이템 렌더 ──
  const renderPostItem = ({ item }) => {
    const catColor = getCategoryColor(item.categoryName);
    return (
      <TouchableOpacity
        style={styles.postItem}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.postTop}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: catColor.text }]}>{item.categoryName}</Text>
          </View>
          <Text style={styles.postDate}>{item.date}</Text>
        </View>
        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.postBottom}>
          <View style={styles.postAuthor}>
            <Ionicons name="person-circle-outline" size={16} color="#999" />
            <Text style={styles.postWriter}>{item.writer}</Text>
          </View>
          <View style={styles.postStats}>
            <View style={styles.statRow}>
              <Ionicons name="eye-outline" size={14} color="#bbb" />
              <Text style={styles.statText}>{item.viewCount}</Text>
            </View>
            <View style={styles.statRow}>
              <Ionicons name="chatbubble-outline" size={13} color="#bbb" />
              <Text style={styles.statText}>{item.commentCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── 헤더: 카테고리 탭 ──
  const renderHeader = () => (
    <View>
      {/* 검색 바 */}
      <View style={styles.searchBar}>
        <TouchableOpacity
          style={styles.searchTypeBtn}
          onPress={() => setShowSearchTypeMenu(!showSearchTypeMenu)}
        >
          <Text style={styles.searchTypeText}>
            {searchType === 'title' ? '제목' : '작성자'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="검색어를 입력하세요"
          placeholderTextColor="#bbb"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 검색 타입 드롭다운 */}
      {showSearchTypeMenu && (
        <View style={styles.searchTypeMenu}>
          <TouchableOpacity
            style={[styles.searchTypeOption, searchType === 'title' && styles.searchTypeActive]}
            onPress={() => { setSearchType('title'); setShowSearchTypeMenu(false); }}
          >
            <Text style={[styles.searchTypeOptionText, searchType === 'title' && styles.searchTypeActiveText]}>제목</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchTypeOption, searchType === 'writer' && styles.searchTypeActive]}
            onPress={() => { setSearchType('writer'); setShowSearchTypeMenu(false); }}
          >
            <Text style={[styles.searchTypeOptionText, searchType === 'writer' && styles.searchTypeActiveText]}>작성자</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 카테고리 탭 */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryTab,
              selectedCategory === item.id && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(item.id)}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === item.id && styles.categoryTabTextActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* 검색 결과 / 게시글 수 */}
      <View style={styles.resultBar}>
        <Text style={styles.resultText}>
          {searchText.trim() ? (
            <>
              <Text style={{ color: '#007AFF', fontWeight: '600' }}>"{searchText}"</Text> 검색 결과{' '}
            </>
          ) : null}
          총 <Text style={{ fontWeight: '600' }}>{filteredPosts.length}</Text>개
        </Text>
      </View>
    </View>
  );

  // ── 빈 목록 ──
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color="#ddd" />
      <Text style={styles.emptyText}>게시글이 없습니다</Text>
      <Text style={styles.emptySubText}>첫 번째 글을 작성해보세요!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>커뮤니티</Text>
        <TouchableOpacity
          style={styles.writeBtn}
          onPress={() => navigation.navigate('PostWrite', { categoryId: selectedCategory !== 0 ? selectedCategory : null })}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.writeBtnText}>글쓰기</Text>
        </TouchableOpacity>
      </View>

      {/* 게시글 목록 */}
      <FlatList
        data={displayPosts}
        keyExtractor={item => String(item.id)}
        renderItem={renderPostItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : !hasMore && displayPosts.length > 0 ? (
            <Text style={styles.endText}>모든 게시글을 불러왔습니다</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  writeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },

  // ── 검색 ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    gap: 8,
  },
  searchTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  searchTypeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    color: '#000',
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
  },
  searchTypeMenu: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  searchTypeOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchTypeActive: {
    backgroundColor: '#E3F2FD',
  },
  searchTypeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  searchTypeActiveText: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // ── 카테고리 탭 ──
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  categoryTabActive: {
    backgroundColor: '#007AFF',
  },
  categoryTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── 결과 바 ──
  resultBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultText: {
    fontSize: 13,
    color: '#999',
  },

  // ── 게시글 아이템 ──
  postItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  postTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
    color: '#bbb',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    lineHeight: 22,
    marginBottom: 10,
  },
  postBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postWriter: {
    fontSize: 13,
    color: '#999',
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    color: '#bbb',
  },

  // ── 빈 상태 ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 6,
  },

  // ── 로딩 / 끝 ──
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
    color: '#ccc',
  },
});
