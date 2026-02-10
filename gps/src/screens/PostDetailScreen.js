import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// ── 더미 데이터 ──────────────────────────────────
const DUMMY_POSTS = {
  1: {
    id: 1,
    title: '서울시 공영주차장 요금 비교',
    content: '안녕하세요, 서울시 공영주차장 요금을 정리해봤습니다.\n\n1. 종로구 공영주차장 - 10분당 300원\n2. 강남구 공영주차장 - 10분당 500원\n3. 마포구 공영주차장 - 10분당 350원\n4. 영등포구 공영주차장 - 10분당 400원\n\n지역마다 차이가 크니 참고하세요!\n주말에는 무료인 곳도 많으니 공공데이터포털에서 확인해보시는 것도 좋습니다.',
    writer: '홍길동',
    categoryName: '주차 팁',
    date: '2026-02-09 14:30',
    viewCount: 156,
  },
  // 기타 postId는 동적으로 생성
};

const DUMMY_COMMENTS = [
  { id: 1, writer: '김철수', content: '정보 감사합니다! 종로구가 제일 저렴하네요.', date: '2026-02-09 15:00' },
  { id: 2, writer: '이영희', content: '마포구도 생각보다 괜찮네요. 좋은 정보 감사합니다!', date: '2026-02-09 15:30' },
  { id: 3, writer: '박지민', content: '주말 무료 주차장 목록도 정리해주시면 좋겠어요~', date: '2026-02-09 16:10' },
];

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isAuthor, setIsAuthor] = useState(true); // TODO: 실제 로그인 유저와 비교
  const scrollRef = useRef(null);
  const loginUser = '홍길동'; // TODO: 실제 로그인 연동

  useEffect(() => {
    // TODO: 백엔드 API 연동
    const data = DUMMY_POSTS[postId] || {
      id: postId,
      title: `테스트 게시글 ${postId}`,
      content: `이것은 ${postId}번 게시글의 내용입니다.\n\n세이프파킹 커뮤니티에 오신 것을 환영합니다.\n주차 관련 정보를 자유롭게 공유해주세요!`,
      writer: '홍길동',
      categoryName: '자유게시판',
      date: '2026-02-09 12:00',
      viewCount: Math.floor(Math.random() * 200),
    };
    setPost(data);
    setComments(DUMMY_COMMENTS);
    setIsAuthor(data.writer === loginUser);
  }, [postId]);

  const getCategoryColor = (catName) => {
    switch (catName) {
      case '자유게시판': return { bg: '#E3F2FD', text: '#1976D2' };
      case '주차 팁': return { bg: '#E8F5E9', text: '#388E3C' };
      case '단속 정보': return { bg: '#FFF3E0', text: '#F57C00' };
      case '질문답변': return { bg: '#F3E5F5', text: '#7B1FA2' };
      default: return { bg: '#F5F5F5', text: '#666' };
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    // TODO: 백엔드 API 연동
    const newComment = {
      id: Date.now(),
      writer: loginUser,
      content: commentText.trim(),
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setComments(prev => [...prev, newComment]);
    setCommentText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert('댓글 삭제', '댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => setComments(prev => prev.filter(c => c.id !== commentId)),
      },
    ]);
  };

  const handleDeletePost = () => {
    Alert.alert('글 삭제', '정말 삭제하시겠습니까? 댓글도 모두 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => {
          // TODO: 백엔드 API 연동
          navigation.goBack();
        },
      },
    ]);
  };

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const catColor = getCategoryColor(post.categoryName);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>게시글</Text>
        {isAuthor && (
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
        )}
        {!isAuthor && <View style={{ width: 60 }} />}
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
          {/* 게시글 본문 */}
          <View style={styles.postCard}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor.bg }]}>
              <Text style={[styles.categoryText, { color: catColor.text }]}>{post.categoryName}</Text>
            </View>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-circle-outline" size={18} color="#999" />
                <Text style={styles.metaText}>{post.writer}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#bbb" />
                <Text style={styles.metaTextLight}>{post.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={16} color="#bbb" />
                <Text style={styles.metaTextLight}>{post.viewCount}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.postContent}>{post.content}</Text>
          </View>

          {/* 댓글 섹션 */}
          <View style={styles.commentSection}>
            <Text style={styles.commentTitle}>
              댓글 <Text style={{ color: '#007AFF' }}>{comments.length}</Text>
            </Text>
            {comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={36} color="#ddd" />
                <Text style={styles.noCommentText}>아직 댓글이 없습니다</Text>
                <Text style={styles.noCommentSub}>첫 번째 댓글을 작성해보세요!</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthor}>
                      <View style={styles.commentAvatar}>
                        <Ionicons name="person" size={14} color="#fff" />
                      </View>
                      <Text style={styles.commentWriter}>{comment.writer}</Text>
                      <Text style={styles.commentDate}>{comment.date}</Text>
                    </View>
                    {comment.writer === loginUser && (
                      <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                        <Ionicons name="close-circle-outline" size={20} color="#ccc" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* 댓글 입력 */}
        <View style={styles.commentInput}>
          <TextInput
            style={styles.commentTextInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor="#bbb"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.commentSendBtn, !commentText.trim() && styles.commentSendDisabled]}
            onPress={handleAddComment}
            disabled={!commentText.trim()}
          >
            <Ionicons name="send" size={20} color={commentText.trim() ? '#fff' : '#ccc'} />
          </TouchableOpacity>
        </View>
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

  // ── 헤더 ──
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

  // ── 본문 ──
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
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
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

  // ── 댓글 섹션 ──
  commentSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noCommentText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  noCommentSub: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
  commentItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentWriter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#bbb',
  },
  commentContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    marginLeft: 34,
  },

  // ── 댓글 입력 ──
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    maxHeight: 100,
  },
  commentSendBtn: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendDisabled: {
    backgroundColor: '#F0F0F0',
  },
});
