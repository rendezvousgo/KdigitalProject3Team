import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Modal,
  Vibration,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';
import * as Location from 'expo-location';
import { formatDistance } from '../services/api';
import { processUserMessage, resetConversation } from '../services/gptParkingService';
import { emit } from '../services/eventBus';
import { startNavigation as startKNSDKNavi } from '../services/knsdkBridge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 기본 AI 안내
const INITIAL_MESSAGES = [
  {
    id: 1,
    type: 'ai',
    text: '안녕하세요. SafeParking AI입니다.\n목적지 또는 주차장 검색 조건을 말씀해주세요.',
    time: '방금',
  },
];

const QUICK_QUESTIONS = [
  '근처 주차장 찾아줘',
  '무료 공영 주차장',
  '가까운 순으로 5개',
  '시청 근처 주차장',
];

// ── 마스코트 호출어 ──
const WAKE_WORD = '파키';
const WAKE_PATTERNS = ['파키야', '파키아', '파키 야', '파키 아', '빠키야', '빠키아', '바키야', '바키아', '파 키야', '팍이야', '파키여'];

// ── 거리 포맷 헬퍼 ──
function formatDistKm(distKm) {
  if (distKm == null || isNaN(distKm)) return '거리 정보 없음';
  if (distKm < 0.01) return '근처';
  if (distKm < 1) return `${Math.round(distKm * 1000)}m`;
  return `${distKm.toFixed(1)}km`;
}
function formatDistMeters(distM) {
  if (distM == null || isNaN(distM)) return '거리 정보 없음';
  if (distM < 1000) return `${Math.round(distM)}m`;
  return `${(distM / 1000).toFixed(1)}km`;
}

export default function AIAssistantScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wakeWordMode, setWakeWordMode] = useState(false);
  const [conversationMode, setConversationMode] = useState(false); // 1분 대화 모드
  const [userLocation, setUserLocation] = useState(null);
  const flatListRef = useRef(null);
  const typingDots = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const recognizedTextRef = useRef('');
  const sendMessageRef = useRef(null);
  const wakeWordModeRef = useRef(false);
  const wakeWordRestartTimer = useRef(null);
  const conversationTimer = useRef(null); // 1분 대화모드 타이머
  const conversationModeRef = useRef(false);
  const voiceModalVisibleRef = useRef(false); // ★ STT 이벤트에서 modal 상태 참조용
  const voiceStartTimeRef = useRef(0); // ★ 음성 시작 시각 (레이스 컨디션 방지)

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingDots, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(typingDots, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isTyping]);

  // 음성 듣기 애니메이션
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening]);

  // ── 호출어 감지 헬퍼 ──
  const extractWakeWordCommand = (text) => {
    if (!text) return null;
    // "파키야", "파키 야", "빠키야", "바키야" 등 호출어 감지 후 뒤의 명령어 추출
    const match = text.match(/[파빠바]\s*키\s*[야아여]/i);
    if (match) {
      const cmd = text.slice(match.index + match[0].length).trim();
      return cmd || null;
    }
    return null;
  };

  // ── 호출어 모드: 조용히 계속 듣기 ──
  const startWakeWordListening = async () => {
    if (!wakeWordModeRef.current) return;
    try {
      try { await Voice.cancel(); } catch (_) {}
      await new Promise(r => setTimeout(r, 150));
      await Voice.start('ko-KR');
      console.log('[WakeWord] 대기 중...');
    } catch (err) {
      console.log('[WakeWord] 재시작 실패:', err);
      // 잠시 후 재시도
      if (wakeWordModeRef.current) {
        wakeWordRestartTimer.current = setTimeout(() => startWakeWordListening(), 2000);
      }
    }
  };

  const toggleWakeWordMode = async () => {
    const next = !wakeWordMode;
    setWakeWordMode(next);
    wakeWordModeRef.current = next;
    if (next) {
      Vibration.vibrate(100);
      startWakeWordListening();
    } else {
      if (wakeWordRestartTimer.current) clearTimeout(wakeWordRestartTimer.current);
      try { await Voice.cancel(); } catch (_) {}
      // 대화모드도 같이 끄기
      stopConversationMode();
    }
  };

  // ── 1분 대화 모드: 파키야 없이도 음성 자동 수신 ──
  const startConversationMode = () => {
    if (!wakeWordModeRef.current) return; // 호출어 모드가 켜져있을 때만
    console.log('[ConvMode] 1분 대화 모드 시작');
    setConversationMode(true);
    conversationModeRef.current = true;
    // 이전 타이머 클리어
    if (conversationTimer.current) clearTimeout(conversationTimer.current);
    // 60초 후 자동 해제
    conversationTimer.current = setTimeout(() => {
      console.log('[ConvMode] 1분 경과 → 대화 모드 종료');
      stopConversationMode();
    }, 60000);
  };

  const stopConversationMode = () => {
    setConversationMode(false);
    conversationModeRef.current = false;
    if (conversationTimer.current) {
      clearTimeout(conversationTimer.current);
      conversationTimer.current = null;
    }
  };

  // 대화모드에서 호출어없이 직접 청취 시작
  const startConversationListening = async () => {
    if (!conversationModeRef.current || !wakeWordModeRef.current) return;
    try {
      try { await Voice.cancel(); } catch (_) {}
      await new Promise(r => setTimeout(r, 150));
      await Voice.start('ko-KR');
      console.log('[ConvMode] 대화 청취 중...');
    } catch (err) {
      console.log('[ConvMode] 청취 시작 실패:', err);
      if (conversationModeRef.current) {
        wakeWordRestartTimer.current = setTimeout(() => startConversationListening(), 2000);
      }
    }
  };

  // 화면 떠날 때 호출어 모드 정리
  useEffect(() => {
    return () => {
      wakeWordModeRef.current = false;
      conversationModeRef.current = false;
      if (wakeWordRestartTimer.current) clearTimeout(wakeWordRestartTimer.current);
      if (conversationTimer.current) clearTimeout(conversationTimer.current);
      Voice.destroy().catch(() => {});
    };
  }, []);

  // ★ voiceModalVisible ref 동기화
  useEffect(() => {
    voiceModalVisibleRef.current = voiceModalVisible;
  }, [voiceModalVisible]);

  // STT 이벤트 처리 (★ 의존성 [] — 한 번만 등록, ref로 상태 참조)
  useEffect(() => {
    Voice.onSpeechStart = () => {
      console.log('STT: onSpeechStart');
    };

    Voice.onSpeechResults = (event) => {
      const text = event?.value?.[0] ?? '';
      console.log('STT: onSpeechResults -', text);

      // ── 대화 모드: 호출어 없이도 직접 전송 ──
      if (conversationModeRef.current && wakeWordModeRef.current && !voiceModalVisibleRef.current) {
        if (text && text.trim()) {
          console.log('[ConvMode] 대화 모드 입력:', text);
          Vibration.vibrate([0, 100, 50, 100]);
          const cmd = extractWakeWordCommand(text);
          const finalText = cmd || text;
          setInputText(finalText);
          sendMessageRef.current?.(finalText);
          startConversationMode();
        } else {
          wakeWordRestartTimer.current = setTimeout(() => startConversationListening(), 500);
        }
        return;
      }

      // ── 호출어 모드: 호출어 감지 시 명령 처리 ──
      if (wakeWordModeRef.current && !voiceModalVisibleRef.current) {
        const cmd = extractWakeWordCommand(text);
        if (cmd) {
          console.log('[WakeWord] 명령 감지:', cmd);
          Vibration.vibrate([0, 100, 50, 100]);
          setInputText(cmd);
          sendMessageRef.current?.(cmd);
        } else {
          console.log('[WakeWord] 호출어 없음, 재시작');
        }
        wakeWordRestartTimer.current = setTimeout(() => startWakeWordListening(), 500);
        return;
      }

      // ── 일반 STT 모드 ──
      recognizedTextRef.current = text;
      setInputText(text);
      setIsListening(false);
      setVoiceModalVisible(false);
      if (text && text.trim()) {
        const cmd = extractWakeWordCommand(text);
        sendMessageRef.current?.(cmd || text);
      }
    };

    Voice.onSpeechPartialResults = (event) => {
      const text = event?.value?.[0] ?? '';
      if (wakeWordModeRef.current && !voiceModalVisibleRef.current) return;
      console.log('STT: partial -', text);
      if (text) {
        recognizedTextRef.current = text;
        setInputText(text);
      }
    };

    Voice.onSpeechEnd = () => {
      console.log('STT: onSpeechEnd');
      if (conversationModeRef.current && wakeWordModeRef.current && !voiceModalVisibleRef.current) {
        return;
      }
      if (wakeWordModeRef.current && !voiceModalVisibleRef.current) {
        return;
      }
      // ★ 모달이 열린 직후 바로 end가 날아오는 경우 무시 (800ms 이내)
      if (voiceModalVisibleRef.current && Date.now() - voiceStartTimeRef.current < 800) {
        console.log('STT: onSpeechEnd 무시 (너무 빠른 종료)');
        // 재시작 시도
        setTimeout(async () => {
          try { await Voice.start('ko-KR'); } catch(_) {}
        }, 300);
        return;
      }
      setIsListening(false);
      // ★ Voice.destroy() 제거 — cancel만 수행 (2회차 STT 오류 방지)
      Voice.cancel().catch(() => {});
    };

    Voice.onSpeechError = (e) => {
      console.log('STT: onSpeechError', JSON.stringify(e));
      const code = e?.error?.code ?? e?.error ?? '';

      if (conversationModeRef.current && wakeWordModeRef.current && !voiceModalVisibleRef.current) {
        wakeWordRestartTimer.current = setTimeout(() => startConversationListening(), 1000);
        return;
      }

      if (wakeWordModeRef.current && !voiceModalVisibleRef.current) {
        wakeWordRestartTimer.current = setTimeout(() => startWakeWordListening(), 1000);
        return;
      }

      // ★ 모달이 열린 직후 에러가 날아오는 경우 다시 시도 (800ms 이내)
      if (voiceModalVisibleRef.current && Date.now() - voiceStartTimeRef.current < 800) {
        console.log('STT: onSpeechError 무시 (너무 빠른 에러), 재시도');
        setTimeout(async () => {
          try { await Voice.start('ko-KR'); } catch(_) {}
        }, 300);
        return;
      }

      setIsListening(false);
      setVoiceModalVisible(false);
      // ★ 무해한 에러 코드 무시 (7=no match, 6=speech timeout, 2=network, 5=client, 11=not recognized)
      const ignoreCodes = ['2', '5', '6', '7', '11', '12', '13'];
      if (!ignoreCodes.includes(String(code))) {
        Alert.alert('음성 인식 오류', `음성 인식 중 오류가 발생했습니다. (코드: ${code})`);
      }
    };

    return () => {
      Voice.removeAllListeners();
    };
  }, []); // ★ 의존성 제거 — 리스너 한 번만 등록

  // TTS로 응답 읽기
  const speakResponse = async (text) => {
    if (!voiceEnabled) return;
    
    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'ko-KR',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.log('TTS Error:', error);
      setIsSpeaking(false);
    }
  };

  // TTS 중지
  const stopSpeaking = async () => {
    await Speech.stop();
    setIsSpeaking(false);
  };

  const startVoiceInputReal = async () => {
    try {
      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert('음성 인식 불가', '이 기기에서 음성 인식을 사용할 수 없습니다.\n설정 > Google > 음성 인식에서 확인해주세요.');
        return;
      }
    } catch (checkErr) {
      console.log('STT: isAvailable 체크 실패:', checkErr);
    }

    // ★ 이전 세션 정리 (두 번째 클릭 오류 방지)
    try {
      await Voice.stop();
    } catch (_) {}
    try {
      await Voice.cancel();
    } catch (_) {}
    // ★ Voice.destroy() 제거 — destroy하면 네이티브 인식기가 파괴되어 2회차 실패
    await new Promise(r => setTimeout(r, 200));

    setVoiceModalVisible(true);
    setIsListening(true);
    voiceStartTimeRef.current = Date.now(); // ★ 시작 시각 기록 (레이스 컨디션 방지)
    Vibration.vibrate(50);

    recognizedTextRef.current = '';
    setInputText('');

    try {
      await Voice.start('ko-KR');
      console.log('STT: Voice.start() 성공');
    } catch (error) {
      console.log('STT: Voice.start() 에러:', error);
      setIsListening(false);
      setVoiceModalVisible(false);

      const msg = error?.message || String(error);
      if (msg.includes('startSpeech') || msg.includes('null')) {
        Alert.alert('음성 인식 오류', '음성 인식 모듈을 초기화할 수 없습니다.\n앱을 완전히 종료 후 다시 시작해주세요.');
      } else if (msg.includes('permission') || msg.includes('Permission')) {
        Alert.alert('권한 필요', '마이크 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
      } else {
        Alert.alert('음성 인식 오류', `음성 인식 시작 실패: ${msg}`);
      }
    }
  };

  const cancelVoiceInputReal = async () => {
    setIsListening(false);
    setVoiceModalVisible(false);
    setInputText('');
    recognizedTextRef.current = '';

    try {
      await Voice.cancel();
    } catch (error) {
      // noop
    }

    // 호출어 모드가 켜져있으면 다시 대기 시작
    if (wakeWordModeRef.current) {
      wakeWordRestartTimer.current = setTimeout(() => startWakeWordListening(), 500);
    }
  };

  // (시뮬레이션 코드 제거됨 — 실제 STT만 사용)
   const ensureLocation = async () => {
    if (userLocation) return userLocation;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('위치 권한이 필요합니다.');
    }
    const loc = await Location.getCurrentPositionAsync({});
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coords);
    return coords;
  };

  // 최근 대화 맥락 생성 (GPT에 전달용, 최근 4개 메시지)
  const buildConversationContext = () => {
    return messages
      .slice(-4)
      .map(m => `${m.type === 'user' ? '사용자' : 'AI'}: ${m.text.slice(0, 120)}`)
      .join('\n');
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // ★ 호출어 접두사 제거 (텍스트 입력에서도 "파키야" 처리)
    const wakeCmd = extractWakeWordCommand(text);
    const cleanText = wakeCmd || text;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: text,
      time: '방금',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const coords = await ensureLocation();
      const ctx = buildConversationContext();

      // GPT 파이프라인: 분류(Nano) → 검증 → 데이터 조회 → 답변(Mini)
      const result = await processUserMessage(
        cleanText,
        coords.latitude,
        coords.longitude,
        ctx,
      );

      // 주차장 추천 카드 빌드 (route_set은 경로 카드만 표시, 주차장 카드 생략)
      const skipRecommendations = result.action === 'navigateToMap' || result.table?.intent === 'route_set';
      const recommendations = (!skipRecommendations && result.parkingList?.length > 0)
        ? result.parkingList.filter(p => p.type !== 'place').map(p => ({
            name: p.name || '주차장',
            distance: formatDistKm(p.distance),
            available: p.capacity || null,
            price: p.fee || null,
            safe: true,
            lat: p.lat,
            lng: p.lng,
          }))
        : null;

      // 경로 정보가 있으면 메시지에 포함
      const routeInfo = result.routeInfo || null;

      const aiResponse = {
        id: Date.now(),
        type: 'ai',
        text: result.text,
        recommendations: recommendations?.length > 0 ? recommendations : null,
        routeInfo,
        time: '방금',
      };

      setIsTyping(false);
      setMessages(prev => [...prev, aiResponse]);

      // ★ 재요청/롤백 응답 → 대화 모드 시작 (파키야 없이 1분 청취)
      if (result.needsClarification) {
        if (voiceEnabled) {
          speakResponse(aiResponse.text);
        }
        // 호출어 모드가 켜져있으면 대화 모드 시작
        if (wakeWordModeRef.current) {
          startConversationMode();
          // TTS 끝난 후 청취 시작 (1.5초 여유)
          setTimeout(() => startConversationListening(), 1500);
        }
        return;
      }

      // route_set → 3D 네비게이션 바로 시작 (KNSDK)
      if (result.action === 'navigateToMap' && result.routeInfo) {
        const ri = result.routeInfo;
        // TTS 안내
        if (voiceEnabled) {
          speakResponse(aiResponse.text);
        }
        // 경유지 좌표 수집
        const waypoints = (ri.waypointCoords || []).map((wp, i) => ({
          lat: wp.lat,
          lng: wp.lng,
          name: ri.waypointNames?.[i] || `경유지${i + 1}`,
        }));
        // 내비 3D 시작
        setTimeout(async () => {
          try {
            await startKNSDKNavi(
              ri.destLat, ri.destLng, ri.destName || '목적지',
              coords.latitude, coords.longitude,
              waypoints,
            );
            console.log('AI → KNSDK 3D 네비 시작', waypoints.length > 0 ? `(경유지 ${waypoints.length}곳)` : '');
          } catch (navErr) {
            console.log('KNSDK 시작 실패, 지도로 폴백:', navErr);
            emit('navigateToDestination', { name: ri.destName, lat: ri.destLat, lng: ri.destLng });
            navigation.navigate('HomeTab');
          }
        }, 500);
        return;
      }

      if (voiceEnabled) {
        speakResponse(aiResponse.text);
      }

      // ★ 일반 응답이어도 호출어 모드 + 대화 모드면 계속 청취
      if (conversationModeRef.current && wakeWordModeRef.current) {
        // TTS 끝난 후 재청취
        setTimeout(() => startConversationListening(), 1500);
      }
    } catch (error) {
      console.log('GPT pipeline error:', error?.message, error);
      setIsTyping(false);

      let displayText;
      if (error.message?.includes('GPT API')) {
        // 상세 에러 내용 표시 (디버깅용)
        const detail = error.message.replace('GPT API ', '');
        displayText = `AI 서비스 연결 오류가 발생했습니다.\n(${detail})\n잠시 후 다시 시도해주세요.`;
      } else if (error.message?.includes('위치')) {
        displayText = error.message;
      } else {
        displayText = error.message || '요청을 처리하지 못했습니다.';
      }

      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: displayText,
        time: '방금',
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // sendMessageRef를 항상 최신 sendMessage로 동기화
  sendMessageRef.current = sendMessage;

  const renderMessage = ({ item }) => {
    if (item.type === 'user') {
      return (
        <View style={styles.userMessageContainer}>
          <View style={styles.userMessage}>
            <Text style={styles.userMessageText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.aiMessageContainer}>
        <View style={styles.aiAvatar}>
          <Ionicons name="navigate" size={20} color="#fff" />
        </View>
        <View style={styles.aiMessageContent}>
          <View style={styles.aiMessage}>
            <Text style={styles.aiMessageText}>{item.text}</Text>
          </View>
          
          {/* 경로 안내 카드 */}
          {item.routeInfo && item.routeInfo.distance != null && (
            <View style={styles.routeInfoCard}>
              <View style={styles.routeInfoHeader}>
                <MaterialIcons name="directions-car" size={18} color="#007AFF" />
                <Text style={styles.routeInfoTitle}>{item.routeInfo.destName} 경로</Text>
              </View>
              {item.routeInfo.waypointNames?.length > 0 && (
                <View style={styles.routeInfoItem}>
                  <Ionicons name="flag-outline" size={14} color="#FF9500" />
                  <Text style={styles.routeInfoText}>경유: {item.routeInfo.waypointNames.join(' → ')}</Text>
                </View>
              )}
              <View style={styles.routeInfoDetails}>
                <View style={styles.routeInfoItem}>
                  <Ionicons name="speedometer-outline" size={14} color="#666" />
                  <Text style={styles.routeInfoText}>{formatDistMeters(item.routeInfo.distance)}</Text>
                </View>
                <View style={styles.routeInfoItem}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.routeInfoText}>약 {Math.round(item.routeInfo.duration / 60)}분</Text>
                </View>
              </View>
            </View>
          )}

          {/* 주차장 추천 카드*/}
          {item.recommendations && (
            <View style={styles.recommendationsContainer}>
              {item.recommendations.map((rec, index) => (
                <TouchableOpacity key={index} style={styles.recommendationCard}>
                  <View style={styles.recHeader}>
                    <FontAwesome5 name="parking" size={16} color="#34C759" />
                    <Text style={styles.recName}>{rec.name}</Text>
                  </View>
                  <View style={styles.recDetails}>
                    <View style={styles.recDetailItem}>
                      <Ionicons name="location-outline" size={14} color="#666" />
                      <Text style={styles.recDetail}>{rec.distance}</Text>
                    </View>
                    {rec.available !== null && rec.available !== undefined && (
                      <View style={styles.recDetailItem}>
                        <Ionicons name="car-outline" size={14} color="#666" />
                        <Text style={styles.recDetail}>{rec.available}자리</Text>
                      </View>
                    )}
                    {!!rec.price && (
                      <View style={styles.recDetailItem}>
                        <Ionicons name="card-outline" size={14} color="#666" />
                        <Text style={styles.recDetail}>{rec.price}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.navigateButton}
                    onPress={async () => {
                      try {
                        const loc = await ensureLocation();
                        await startKNSDKNavi(
                          rec.lat, rec.lng, rec.name,
                          loc.latitude, loc.longitude,
                        );
                      } catch (err) {
                        console.log('카드 내비 시작 실패:', err);
                        emit('navigateToDestination', { name: rec.name, lat: rec.lat, lng: rec.lng });
                        navigation.navigate('HomeTab');
                      }
                    }}
                  >
                    <MaterialIcons name="directions" size={18} color="#fff" />
                    <Text style={styles.navigateButtonText}>경로 안내</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>SafeParking AI</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>온라인</Text>
            </View>
            {wakeWordMode && (
              <View style={[styles.statusBadge, { backgroundColor: conversationMode ? '#E8F5E9' : '#FFF3E0', marginLeft: 6 }]}>
                <MaterialIcons name="record-voice-over" size={10} color={conversationMode ? '#4CAF50' : '#FF9500'} />
                <Text style={[styles.statusText, { color: conversationMode ? '#4CAF50' : '#FF9500' }]}>
                  {conversationMode ? '대화 중' : '"파키야" 대기'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.headerButton, wakeWordMode && styles.wakeWordHeaderBtnActive]}
          onPress={toggleWakeWordMode}
          onLongPress={() => Alert.alert('호출어 안내', '"파키야"라고 부르면 자동으로 음성 인식이 시작됩니다.\n\n예시: "파키야 근처 공영주차장 찾아줘"')}
        >
          <MaterialIcons 
            name="record-voice-over" 
            size={22} 
            color={wakeWordMode ? "#FF9500" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      {/* 메시지 리스트 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingContainer}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={20} color="#fff" />
              </View>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>입력 중..</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* 빠른 질문 */}
      {messages.length <= 2 && (
        <View style={styles.quickQuestions}>
          <Text style={styles.quickQuestionsTitle}>이렇게 물어보세요</Text>
          <View style={styles.quickQuestionsGrid}>
            {QUICK_QUESTIONS.map((question, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.quickQuestionChip}
                onPress={() => sendMessage(question)}
              >
                <Text style={styles.quickQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 입력창 */}
        <View style={styles.inputContainer}>
          {/* 음성/TTS 토글 */}
          <TouchableOpacity 
            style={[styles.voiceToggle, voiceEnabled && styles.voiceToggleActive]}
            onPress={() => {
              setVoiceEnabled(!voiceEnabled);
              if (isSpeaking) stopSpeaking();
            }}
          >
            <Ionicons 
              name={voiceEnabled ? "volume-high" : "volume-mute"} 
              size={20} 
              color={voiceEnabled ? "#27AE60" : "#999"} 
            />
          </TouchableOpacity>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="메시지를 입력하세요.."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            
            {/* 마이크 버튼 */}
            <TouchableOpacity 
              style={styles.micButton}
              onPress={startVoiceInputReal}
            >
              <Ionicons name="mic" size={22} color="#27AE60" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sendButton,
                inputText.trim() ? styles.sendButtonActive : null
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={inputText.trim() ? '#fff' : '#ccc'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 음성 입력 모달 */}
      <Modal
        visible={voiceModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelVoiceInputReal}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalContent}>
            <Text style={styles.voiceModalTitle}>
              {isListening ? '듣고 있습니다...' : '인식 중..'}
            </Text>
            <Text style={styles.voiceModalSubtitle}>
              목적지나 조건을 말씀해 주세요
            </Text>
            
            {/* 음성 시각화 */}
            <View style={styles.voiceVisualizer}>
              <Animated.View 
                style={[
                  styles.voicePulse,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              />
              <View style={styles.voiceCircle}>
                <Ionicons name="mic" size={40} color="#fff" />
              </View>
            </View>

            {/* 인식 중인 텍스트 */}
            {inputText ? (
              <View style={styles.recognizedTextContainer}>
                <Text style={styles.recognizedText}>"{inputText}"</Text>
              </View>
            ) : null}

            {/* 음성 웨이브 */}
            <View style={styles.voiceWaves}>
              {[0.3, 0.5, 0.7, 1, 0.7, 0.5, 0.3].map((height, i) => (
                <Animated.View 
                  key={i}
                  style={[
                    styles.voiceWaveBar,
                    { 
                      height: 20 + (height * 30 * (isListening ? 1 : 0.3)),
                      opacity: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      })
                    }
                  ]}
                />
              ))}
            </View>

            {/* 취소 버튼 */}
            <TouchableOpacity 
              style={styles.cancelVoiceButton}
              onPress={cancelVoiceInputReal}
            >
              <Text style={styles.cancelVoiceText}>취소</Text>
            </TouchableOpacity>

            {/* 예시 문구 */}
            <View style={styles.voiceExamples}>
              <Text style={styles.voiceExampleTitle}>이렇게 말해보세요</Text>
              <Text style={styles.voiceExampleText}>"강남역 근처 30분 주차장 찾아줘"</Text>
              <Text style={styles.voiceExampleText}>"여기서 가까운 무료 주차장"</Text>
              <Text style={styles.voiceExampleText}>"단속 없는 안전한 곳으로 안내해줘"</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* TTS 재생 중 표시 */}
      {isSpeaking && (
        <TouchableOpacity 
          style={styles.speakingIndicator}
          onPress={stopSpeaking}
        >
          <Ionicons name="volume-high" size={16} color="#fff" />
          <Text style={styles.speakingText}>재생 중.. 탭하면 중지</Text>
        </TouchableOpacity>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    // paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 24) + 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#34C759',
  },
  headerButton: {
    padding: 4,
  },
  wakeWordHeaderBtnActive: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF9500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  userMessage: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  userMessageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiMessageContent: {
    flex: 1,
  },
  aiMessage: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiMessageText: {
    color: '#000',
    fontSize: 15,
    lineHeight: 22,
  },
  recommendationsContainer: {
    marginTop: 12,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  safeBadge: {
    backgroundColor: '#E8F5E9',
    padding: 4,
    borderRadius: 10,
  },
  recDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  recDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  recDetail: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    paddingVertical: 12,
  },
  navigateButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  routeInfoCard: {
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginLeft: 6,
  },
  routeInfoDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 4,
    fontWeight: '600',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingText: {
    color: '#999',
    fontSize: 14,
  },
  quickQuestions: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quickQuestionsTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickQuestionChip: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  quickQuestionText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  voiceToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voiceToggleActive: {
    backgroundColor: '#E8F8EE',
  },
  wakeWordActive: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1.5,
    borderColor: '#FF9500',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    color: '#000',
  },
  micButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#1A1A2E',
  },
  
  // 음성 모달 스타일
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    width: '90%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  voiceModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  voiceModalSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 40,
  },
  voiceVisualizer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  voicePulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(39, 174, 96, 0.3)',
  },
  voiceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recognizedTextContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  recognizedText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  voiceWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    marginBottom: 30,
  },
  voiceWaveBar: {
    width: 4,
    backgroundColor: '#27AE60',
    borderRadius: 2,
    marginHorizontal: 3,
  },
  cancelVoiceButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 40,
  },
  cancelVoiceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  voiceExamples: {
    alignItems: 'center',
  },
  voiceExampleTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  voiceExampleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  speakingIndicator: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27AE60',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  speakingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
});







