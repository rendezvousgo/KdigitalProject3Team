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
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchPostDetail, deletePost, fetchComments, addComment, deleteComment } from '../services/communityApi';
import { useAuth } from '../contexts/AuthContext';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { user, isLoggedIn, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const scrollRef = useRef(null);

  const loadPost = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPostDetail(postId);
      setPost(data);
    } catch (e) {
      Alert.alert('불러오기 실패', e.message, [{ text: '확인', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  }, [postId, navigation]);

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchComments(postId);
      setComments(data);
    } catch (e) {
      console.log('댓글 불러오기 실패:', e.message);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [loadPost, loadComments]);

  useFocusEffect(
    useCallback(() => {
      loadPost();
      loadComments();
    }, [loadPost, loadComments])
  );

  // 현재 사용자가 글 작성자인지 확인
  const isPostOwner = isLoggedIn && user && post && (
    user.username === post.writer || user.nickname === post.writer
  );
  const canEditDelete = isPostOwner || isAdmin;

  const handleDeletePost = () => {
    Alert.alert('글 삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
            Alert.alert('삭제 완료', '게시글이 삭제되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
          } catch (e) {
            Alert.alert('삭제 실패', e.message);
          }
        },
      },
    ]);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (!isLoggedIn) {
      Alert.alert('알림', '댓글을 작성하려면 로그인이 필요합니다.');
      return;
    }
    setCommentLoading(true);
    try {
      await addComment(postId, commentText.trim());
      setCommentText('');
      await loadComments();
    } catch (e) {
      Alert.alert('댓글 작성 실패', e.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert('댓글 삭제', '댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(postId, commentId);
            await loadComments();
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
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryName = post?.category?.name || '미분류';
  const dateText = post.createDate ? post.createDate.replace('T', ' ').slice(0, 16) : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>게시글</Text>
        <View style={styles.headerActions}>
          {canEditDelete && (
            <>
              <TouchableOpacity onPress={() => navigation.navigate('PostWrite', { editPost: post })} style={styles.headerActionBtn}>
                <Ionicons name="create-outline" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeletePost} style={styles.headerActionBtn}>
                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              </TouchableOpacity>
            </>
          )}
          {!canEditDelete && <View style={{ width: 48 }} />}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* 글 내용 */}
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

          {/* 댓글 섹션 */}
          <View style={styles.commentSection}>
            <Text style={styles.commentSectionTitle}>
              댓글 <Text style={{ color: '#007AFF' }}>{comments.length}</Text>
            </Text>

            {comments.map((c) => {
              const canDeleteComment = isLoggedIn && user && (user.username === c.writer || isAdmin);
              return (
                <View key={c.id} style={styles.commentItem}>
                  <View style={styles.commentTop}>
                    <View style={styles.commentAuthor}>
                      <Ionicons name="person-circle-outline" size={20} color="#999" />
                      <Text style={styles.commentWriter}>{c.writer || '익명'}</Text>
                    </View>
                    <View style={styles.commentRight}>
                      <Text style={styles.commentDate}>
                        {c.createDate ? c.createDate.replace('T', ' ').slice(0, 16) : ''}
                      </Text>
                      {canDeleteComment && (
                        <TouchableOpacity onPress={() => handleDeleteComment(c.id)} style={styles.commentDeleteBtn}>
                          <Ionicons name="close-circle" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
              );
            })}

            {comments.length === 0 && (
              <Text style={styles.noComments}>아직 댓글이 없습니다</Text>
            )}
          </View>
        </ScrollView>

        {/* 댓글 입력 */}
        <View style={[styles.commentInputBar, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          {isLoggedIn ? (
            <>
              <TextInput
                style={styles.commentInput}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor="#bbb"
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!commentText.trim() || commentLoading) && { opacity: 0.4 }]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || commentLoading}
              >
                {commentLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.loginRequired}>댓글을 작성하려면 로그인이 필요합니다</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#999', fontSize: 15, marginTop: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 24) + 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerActionBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  postCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, marginBottom: 12, backgroundColor: '#E3F2FD' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#007AFF' },
  postTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', lineHeight: 28, marginBottom: 14 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, color: '#666', fontWeight: '500' },
  metaTextLight: { fontSize: 13, color: '#bbb' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  postContent: { fontSize: 15, color: '#333', lineHeight: 24 },

  /* Comments */
  commentSection: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  commentSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  commentItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  commentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentAuthor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentWriter: { fontSize: 13, fontWeight: '600', color: '#555' },
  commentRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentDate: { fontSize: 11, color: '#bbb' },
  commentDeleteBtn: { padding: 2 },
  commentContent: { fontSize: 14, color: '#333', lineHeight: 20, paddingLeft: 26 },
  noComments: { textAlign: 'center', color: '#ccc', paddingVertical: 20, fontSize: 14 },

  /* Comment input */
  commentInputBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 10,
  },
  commentInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#000', maxHeight: 80 },
  commentSendBtn: { backgroundColor: '#007AFF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  loginRequired: { flex: 1, textAlign: 'center', color: '#999', fontSize: 13, paddingVertical: 6 },
});
