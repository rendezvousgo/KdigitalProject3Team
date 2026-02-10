import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { id: 1, name: '자유게시판' },
  { id: 2, name: '주차 팁' },
  { id: 3, name: '단속 정보' },
  { id: 4, name: '질문답변' },
];

export default function PostWriteScreen({ route, navigation }) {
  const editPost = route.params?.editPost || null;
  const presetCategoryId = route.params?.categoryId || null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const isEdit = !!editPost;

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setContent(editPost.content);
      const found = CATEGORIES.find(c => c.name === editPost.categoryName);
      if (found) setSelectedCategoryId(found.id);
    } else if (presetCategoryId) {
      setSelectedCategoryId(presetCategoryId);
    }
  }, []);

  const selectedCategory = CATEGORIES.find(c => c.id === selectedCategoryId);

  const handleSubmit = () => {
    if (!selectedCategoryId) {
      Alert.alert('알림', '카테고리를 선택해주세요.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    // TODO: 백엔드 API 연동
    if (isEdit) {
      Alert.alert('수정 완료', '게시글이 수정되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('작성 완료', '게시글이 등록되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      Alert.alert(
        '작성 취소',
        '작성 중인 내용이 삭제됩니다. 취소하시겠습니까?',
        [
          { text: '계속 작성', style: 'cancel' },
          { text: '취소', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '글 수정' : '새 글 작성'}</Text>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!title.trim() || !content.trim() || !selectedCategoryId) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !content.trim() || !selectedCategoryId}
        >
          <Text
            style={[
              styles.submitText,
              (!title.trim() || !content.trim() || !selectedCategoryId) && styles.submitTextDisabled,
            ]}
          >
            {isEdit ? '수정' : '등록'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 카테고리 선택 */}
          <View style={styles.formSection}>
            <Text style={styles.label}>카테고리</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={[styles.categorySelectorText, !selectedCategory && styles.placeholder]}>
                {selectedCategory ? selectedCategory.name : '카테고리를 선택하세요'}
              </Text>
              <Ionicons
                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      selectedCategoryId === cat.id && styles.categoryOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(cat.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        selectedCategoryId === cat.id && styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {selectedCategoryId === cat.id && (
                      <Ionicons name="checkmark" size={18} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 제목 */}
          <View style={styles.formSection}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="제목을 입력하세요"
              placeholderTextColor="#bbb"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* 내용 */}
          <View style={styles.formSection}>
            <Text style={styles.label}>내용</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="내용을 입력하세요"
              placeholderTextColor="#bbb"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <Text style={styles.charCount}>{content.length}/5000</Text>
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
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  submitBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  submitTextDisabled: {
    color: '#bbb',
  },

  // ── 폼 ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── 카테고리 ──
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categorySelectorText: {
    fontSize: 15,
    color: '#333',
  },
  placeholder: {
    color: '#bbb',
  },
  categoryPicker: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#333',
  },
  categoryOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // ── 제목 ──
  titleInput: {
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#ccc',
    marginTop: 6,
  },

  // ── 내용 ──
  contentInput: {
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    color: '#000',
    minHeight: 250,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    lineHeight: 22,
  },
});
