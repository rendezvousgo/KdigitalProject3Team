import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPostDetail, deletePost } from '../services/communityApi';

const CATEGORIES = [
  { id: 1, name: '자유게시판' },
  { id: 2, name: '주차 팁' },
  { id: 3, name: '속도 정보' },
  { id: 4, name: '질문/답변' },
];

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const getCategoryName = (postData) => {
    const id = postData?.category?.id;
    const found = CATEGORIES.find(c => c.id === id);
    return found ? found.name : '미분류';
  };

  const loadPost = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPostDetail(postId);
      setPost(data);
    } catch (e) {
      Alert.alert('불러오기 실패', e.message, [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [postId, navigation]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useFocusEffect(
    useCallback(() => {
      loadPost();
    }, [loadPost])
  );

  const handleDeletePost = () => {
    Alert.alert('글 삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
            Alert.alert('삭제 완료', '게시글이 삭제되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() },
            ]);
          } catch (e) {
            Alert.alert('삭제 실패', e.message);
          }
        },
      },
    ]);
  };

  if (loading || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryName = getCategoryName(post);
  const dateText = post.createDate ? post.createDate.replace('T', ' ').slice(0, 16) : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>게시글</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PostWrite', { editPost: post })}
            style={styles.headerActionBtn}
          >
            <Ionicons name="create-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePost} style={styles.headerActionBtn}>
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.postCard}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-circle-outline" size={18} color="#999" />
                <Text style={styles.metaText}>{post.writer || '익명'}</Text>
              </View>
              {dateText ? (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#bbb" />
                  <Text style={styles.metaTextLight}>{dateText}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.divider} />
            <Text style={styles.postContent}>{post.content}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 15,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerActionBtn: {
    padding: 4,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: '#E3F2FD',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    lineHeight: 28,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metaTextLight: {
    fontSize: 13,
    color: '#bbb',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
});
