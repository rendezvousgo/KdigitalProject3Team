import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPost, updatePost } from '../services/communityApi';
import { fetchCategories } from '../services/authApi';
import { useAuth } from '../contexts/AuthContext';

export default function PostWriteScreen({ route, navigation }) {
  const { user, isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const editPost = route.params?.editPost || null;
  const presetCategoryId = route.params?.categoryId || null;

  const [title, setTitle] = useState('');
  const [writer, setWriter] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  const isEdit = !!editPost;

  useEffect(() => {
    loadCategories();
    if (editPost) {
      setTitle(editPost.title || '');
      setWriter(editPost.writer || '');
      setContent(editPost.content || '');
      if (editPost?.category?.id) setSelectedCategoryId(editPost.category.id);
    } else if (presetCategoryId) {
      setSelectedCategoryId(presetCategoryId);
    }
    // 로그인 사용자면 writer를 자동 설정
    if (isLoggedIn && user && !editPost) {
      setWriter(user.nickname || user.username);
    }
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (e) {
      // fallback
      setCategories([
        { id: 1, name: '자유게시판' },
        { id: 2, name: '주차 팁' },
        { id: 3, name: '동네 소식' },
        { id: 4, name: '질문/답변' },
      ]);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleSubmit = async () => {
    if (!selectedCategoryId) { Alert.alert('알림', '카테고리를 선택해주세요.'); return; }
    if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
    if (!content.trim()) { Alert.alert('알림', '내용을 입력해주세요.'); return; }

    const finalWriter = isLoggedIn ? (user.nickname || user.username) : (writer.trim() || '익명');

    setSubmitting(true);
    try {
      if (isEdit) {
        await updatePost(editPost.id, { title: title.trim(), content: content.trim(), writer: finalWriter, categoryId: selectedCategoryId });
        Alert.alert('수정 완료', '게시글이 수정되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
      } else {
        await createPost({ title: title.trim(), content: content.trim(), writer: finalWriter, categoryId: selectedCategoryId });
        Alert.alert('작성 완료', '게시글이 등록되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      Alert.alert('요청 실패', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      Alert.alert('작성 취소', '작성 중인 내용이 삭제됩니다. 취소하시겠습니까?', [
        { text: '계속 작성', style: 'cancel' },
        { text: '취소', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '글 수정' : '글 작성'}</Text>
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || !title.trim() || !content.trim() || !selectedCategoryId) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim() || !selectedCategoryId}
        >
          <Text style={[styles.submitText, (submitting || !title.trim() || !content.trim() || !selectedCategoryId) && styles.submitTextDisabled]}>
            {isEdit ? '수정' : '등록'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={styles.label}>카테고리</Text>
            <TouchableOpacity style={styles.categorySelector} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
              <Text style={[styles.categorySelectorText, !selectedCategory && styles.placeholder]}>
                {selectedCategory ? selectedCategory.name : '카테고리를 선택해주세요'}
              </Text>
              <Ionicons name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#999" />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryOption, selectedCategoryId === cat.id && styles.categoryOptionActive]}
                    onPress={() => { setSelectedCategoryId(cat.id); setShowCategoryPicker(false); }}
                  >
                    <Text style={[styles.categoryOptionText, selectedCategoryId === cat.id && styles.categoryOptionTextActive]}>{cat.name}</Text>
                    {selectedCategoryId === cat.id && <Ionicons name="checkmark" size={18} color="#007AFF" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {!isLoggedIn && (
            <View style={styles.formSection}>
              <Text style={styles.label}>작성자</Text>
              <TextInput style={styles.titleInput} placeholder="작성자명을 입력하세요 (비우면 익명)" placeholderTextColor="#bbb" value={writer} onChangeText={setWriter} maxLength={30} />
            </View>
          )}

          {isLoggedIn && (
            <View style={styles.formSection}>
              <Text style={styles.label}>작성자</Text>
              <View style={styles.writerInfo}>
                <Ionicons name="person-circle" size={20} color="#007AFF" />
                <Text style={styles.writerInfoText}>{user.nickname || user.username}</Text>
              </View>
            </View>
          )}

          <View style={styles.formSection}>
            <Text style={styles.label}>제목</Text>
            <TextInput style={styles.titleInput} placeholder="제목을 입력하세요" placeholderTextColor="#bbb" value={title} onChangeText={setTitle} maxLength={100} />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>내용</Text>
            <TextInput style={styles.contentInput} placeholder="내용을 입력하세요" placeholderTextColor="#bbb" value={content} onChangeText={setContent} multiline textAlignVertical="top" maxLength={5000} />
            <Text style={styles.charCount}>{content.length}/5000</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 24) + 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 16, color: '#666' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  submitBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  submitBtnDisabled: { backgroundColor: '#E0E0E0' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  submitTextDisabled: { color: '#bbb' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 + (Platform.OS === 'android' ? 24 : 0) },
  formSection: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  categorySelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F8F8', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  categorySelectorText: { fontSize: 15, color: '#333' },
  placeholder: { color: '#bbb' },
  categoryPicker: { marginTop: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  categoryOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  categoryOptionActive: { backgroundColor: '#E3F2FD' },
  categoryOptionText: { fontSize: 15, color: '#333' },
  categoryOptionTextActive: { color: '#007AFF', fontWeight: '600' },
  titleInput: { backgroundColor: '#F8F8F8', padding: 14, borderRadius: 10, fontSize: 15, color: '#000', borderWidth: 1, borderColor: '#f0f0f0' },
  charCount: { textAlign: 'right', fontSize: 12, color: '#ccc', marginTop: 6 },
  contentInput: { backgroundColor: '#F8F8F8', padding: 14, borderRadius: 10, fontSize: 15, color: '#000', minHeight: 250, borderWidth: 1, borderColor: '#f0f0f0', lineHeight: 22 },
  writerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F8FF', padding: 14, borderRadius: 10 },
  writerInfoText: { fontSize: 15, color: '#007AFF', fontWeight: '500' },
});
