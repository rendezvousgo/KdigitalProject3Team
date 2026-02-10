import React, { useMemo, useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPosts } from '../services/communityApi';

const CATEGORIES = [
  { id: 0, name: '전체' },
  { id: 1, name: '자유게시판' },
  { id: 2, name: '주차 팁' },
  { id: 3, name: '속도 정보' },
  { id: 4, name: '질문/답변' },
];

export default function CommunityScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState('title');
  const [showSearchTypeMenu, setShowSearchTypeMenu] = useState(false);

  const resetAndLoad = useCallback(async (categoryId = selectedCategory) => {
    setLoading(true);
    setHasMore(true);
    setPage(0);
    try {
      const data = await fetchPosts({ page: 0, categoryId });
      setPosts(data.content || []);
      setHasMore(!data.last);
    } catch (e) {
      Alert.alert('불러오기 실패', e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      resetAndLoad();
    }, [resetAndLoad])
  );

  const loadMore = async () => {
    if (!hasMore || loading || refreshing) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const data = await fetchPosts({ page: nextPage, categoryId: selectedCategory });
      setPosts(prev => [...prev, ...(data.content || [])]);
      setPage(nextPage);
      setHasMore(!data.last);
    } catch (e) {
      Alert.alert('불러오기 실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSearchText('');
    await resetAndLoad();
    setRefreshing(false);
  }, [resetAndLoad]);

  const filteredPosts = useMemo(() => {
    if (!searchText.trim()) return posts;
    const keyword = searchText.trim().toLowerCase();
    if (searchType === 'title') {
      return posts.filter(p => (p.title || '').toLowerCase().includes(keyword));
    }
    return posts.filter(p => (p.writer || '').toLowerCase().includes(keyword));
  }, [posts, searchText, searchType]);

  const getCategoryName = (post) => {
    const id = post?.category?.id;
    const found = CATEGORIES.find(c => c.id === id);
    return found ? found.name : '미분류';
  };

  const renderPostItem = ({ item }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.postTop}>
        <Text style={styles.categoryBadge}>{getCategoryName(item)}</Text>
        <Text style={styles.postDate}>{item.createDate ? item.createDate.slice(0, 10) : ''}</Text>
      </View>
      <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.postBottom}>
        <View style={styles.postAuthor}>
          <Ionicons name="person-circle-outline" size={16} color="#999" />
          <Text style={styles.postWriter}>{item.writer || '익명'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
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
          onSubmitEditing={() => setShowSearchTypeMenu(false)}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => setShowSearchTypeMenu(false)}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

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
            onPress={() => {
              setSelectedCategory(item.id);
              resetAndLoad(item.id);
            }}
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

      <View style={styles.resultBar}>
        <Text style={styles.resultText}>
          {searchText.trim() ? (
            <>
              <Text style={{ color: '#007AFF', fontWeight: '600' }}>&quot;{searchText}&quot;</Text> 검색결과
            </>
          ) : null}
          {' '}총 <Text style={{ fontWeight: '600' }}>{filteredPosts.length}</Text>건
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color="#ddd" />
      <Text style={styles.emptyText}>게시글이 없습니다</Text>
      <Text style={styles.emptySubText}>첫 글을 작성해보세요.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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

      <FlatList
        data={filteredPosts}
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
          ) : !hasMore && filteredPosts.length > 0 ? (
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
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
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
