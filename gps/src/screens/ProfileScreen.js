import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { fetchCategories, createCategory, deleteCategory } from '../services/authApi';

/* LoginForm */
function LoginForm({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('알림', '아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      Alert.alert('로그인 성공', '환영합니다!');
    } catch (e) {
      Alert.alert('로그인 실패', '아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.authContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.authLogo}>
        <View style={styles.logoCircle}>
          <Ionicons name="car-sport" size={48} color="#007AFF" />
        </View>
        <Text style={styles.logoTitle}>SafeParking</Text>
        <Text style={styles.logoSubtitle}>안전한 주차의 시작</Text>
      </View>
      <View style={styles.authCard}>
        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput style={styles.authInput} placeholder="아이디" placeholderTextColor="#bbb" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput style={[styles.authInput, { flex: 1 }]} placeholder="비밀번호" placeholderTextColor="#bbb" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.authButton, loading && styles.authButtonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>로그인</Text>}
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.switchBtn} onPress={onSwitchToRegister}>
        <Text style={styles.switchText}>계정이 없으신가요? <Text style={styles.switchLink}>회원가입</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* RegisterForm */
function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!username.trim()) { Alert.alert('알림', '아이디를 입력해주세요.'); return; }
    if (!password.trim()) { Alert.alert('알림', '비밀번호를 입력해주세요.'); return; }
    if (password !== passwordConfirm) { Alert.alert('알림', '비밀번호가 일치하지 않습니다.'); return; }
    if (!nickname.trim()) { Alert.alert('알림', '이름(닉네임)을 입력해주세요.'); return; }
    if (!email.trim()) { Alert.alert('알림', '이메일을 입력해주세요.'); return; }

    setLoading(true);
    try {
      await register({ username: username.trim(), password, nickname: nickname.trim(), email: email.trim() });
      Alert.alert('가입 완료', '회원가입이 완료되었습니다!');
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('username exists') || msg.includes('CONFLICT')) {
        Alert.alert('가입 실패', '이미 사용 중인 아이디입니다.');
      } else {
        Alert.alert('가입 실패', msg || '회원가입에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.authContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.authLogo}>
        <View style={styles.logoCircle}>
          <Ionicons name="person-add" size={44} color="#007AFF" />
        </View>
        <Text style={styles.logoTitle}>회원가입</Text>
        <Text style={styles.logoSubtitle}>SafeParking에 가입하세요</Text>
      </View>
      <View style={styles.authCard}>
        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput style={styles.authInput} placeholder="아이디" placeholderTextColor="#bbb" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput style={[styles.authInput, { flex: 1 }]} placeholder="비밀번호" placeholderTextColor="#bbb" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
          </TouchableOpacity>
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput style={styles.authInput} placeholder="비밀번호 확인" placeholderTextColor="#bbb" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry={!showPassword} />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="text-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput style={styles.authInput} placeholder="이름 (닉네임)" placeholderTextColor="#bbb" value={nickname} onChangeText={setNickname} />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput style={styles.authInput} placeholder="이메일" placeholderTextColor="#bbb" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <TouchableOpacity style={[styles.authButton, loading && styles.authButtonDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>회원가입</Text>}
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.switchBtn} onPress={onSwitchToLogin}>
        <Text style={styles.switchText}>이미 계정이 있으신가요? <Text style={styles.switchLink}>로그인</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ProfileView (logged in) */
function ProfileView() {
  const { user, isAdmin, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catLoading, setCatLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (e) {
      Alert.alert('오류', '카테고리를 불러올 수 없습니다.');
    }
  };

  const handleToggleCategoryManager = () => {
    if (!showCategoryManager) loadCategories();
    setShowCategoryManager(!showCategoryManager);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) { Alert.alert('알림', '카테고리 이름을 입력해주세요.'); return; }
    setCatLoading(true);
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      await loadCategories();
      Alert.alert('완료', '카테고리가 생성되었습니다.');
    } catch (e) {
      Alert.alert('실패', e.message || '카테고리 생성 실패');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    Alert.alert('카테고리 삭제', '"' + cat.name + '" 카테고리를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try { await deleteCategory(cat.id); await loadCategories(); }
          catch (e) { Alert.alert('삭제 실패', e.message || '삭제할 수 없습니다.'); }
        },
      },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isAdmin && { backgroundColor: '#FF9500' }]}>
            <Ionicons name={isAdmin ? 'shield-checkmark' : 'person'} size={40} color="#fff" />
          </View>
        </View>
        <Text style={styles.userName}>{user.nickname || user.username}</Text>
        <Text style={styles.userEmail}>{user.email || ''}</Text>
        <View style={styles.userIdBadge}>
          <Ionicons name="at" size={14} color="#666" />
          <Text style={styles.userIdText}>{user.username}</Text>
        </View>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield" size={14} color="#FF9500" />
            <Text style={styles.adminBadgeText}>관리자</Text>
          </View>
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>내 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>아이디</Text>
          <Text style={styles.infoValue}>{user.username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>이름</Text>
          <Text style={styles.infoValue}>{user.nickname || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>이메일</Text>
          <Text style={styles.infoValue}>{user.email || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>등급</Text>
          <Text style={styles.infoValue}>{isAdmin ? '관리자' : '일반회원'}</Text>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.adminMenuHeader} onPress={handleToggleCategoryManager}>
            <Text style={styles.menuSectionTitle}>게시판 카테고리 관리</Text>
            <Ionicons name={showCategoryManager ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>
          {showCategoryManager && (
            <View style={styles.categoryManager}>
              <View style={styles.addCategoryRow}>
                <TextInput style={styles.addCategoryInput} placeholder="새 카테고리 이름" placeholderTextColor="#bbb" value={newCategoryName} onChangeText={setNewCategoryName} />
                <TouchableOpacity style={[styles.addCategoryBtn, catLoading && { opacity: 0.5 }]} onPress={handleCreateCategory} disabled={catLoading}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.categoryItem}>
                  <Text style={styles.categoryItemText}>{cat.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              {categories.length === 0 && <Text style={styles.emptyCategoryText}>카테고리가 없습니다</Text>}
            </View>
          )}
        </View>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>설정</Text>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="notifications" size={22} color="#34C759" />
          </View>
          <Text style={styles.menuText}>알림 설정</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="car" size={22} color="#9C27B0" />
          </View>
          <Text style={styles.menuText}>내 차량 정보</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#F5F5F5' }]}>
            <Ionicons name="help-circle" size={22} color="#666" />
          </View>
          <Text style={styles.menuText}>도움말 / FAQ</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>SafeParking v1.0.0</Text>
        <Text style={styles.appCopyright}>© 2026 트리케라톱스팀</Text>
      </View>
    </ScrollView>
  );
}

/* Main */
export default function ProfileScreen({ navigation }) {
  const { isLoggedIn, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>마이페이지</Text>
          {isLoggedIn && (
            <TouchableOpacity>
              <Ionicons name="settings-outline" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>
        {isLoggedIn ? (
          <ProfileView />
        ) : authMode === 'login' ? (
          <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 24) + 15,
    paddingBottom: 16, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  authContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  authLogo: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoTitle: { fontSize: 26, fontWeight: 'bold', color: '#111' },
  logoSubtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  authCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 12, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  authInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#000' },
  eyeBtn: { padding: 4 },
  authButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  authButtonDisabled: { opacity: 0.6 },
  authButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { alignItems: 'center', marginTop: 24 },
  switchText: { fontSize: 14, color: '#666' },
  switchLink: { color: '#007AFF', fontWeight: '600' },
  profileCard: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 24, marginBottom: 12 },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#666', marginBottom: 8 },
  userIdBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  userIdText: { fontSize: 13, color: '#666', marginLeft: 4 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  adminBadgeText: { color: '#FF8F00', fontWeight: '600', marginLeft: 4, fontSize: 13 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 14, color: '#999' },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '500' },
  menuSection: { backgroundColor: '#fff', marginBottom: 12, paddingVertical: 8 },
  menuSectionTitle: { fontSize: 13, fontWeight: '600', color: '#666', paddingHorizontal: 20, paddingVertical: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuText: { flex: 1, fontSize: 16, color: '#000' },
  adminMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  categoryManager: { paddingHorizontal: 20, paddingBottom: 12 },
  addCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  addCategoryInput: { flex: 1, backgroundColor: '#F8F8F8', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: '#000', borderWidth: 1, borderColor: '#f0f0f0' },
  addCategoryBtn: { backgroundColor: '#007AFF', width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  categoryItemText: { fontSize: 15, color: '#333' },
  emptyCategoryText: { fontSize: 14, color: '#ccc', textAlign: 'center', paddingVertical: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 16, marginBottom: 12, gap: 8 },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
  appInfo: { alignItems: 'center', paddingVertical: 24 },
  appVersion: { fontSize: 13, color: '#999', marginBottom: 4 },
  appCopyright: { fontSize: 12, color: '#ccc' },
});
