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
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

// 더미 AI 대화
const INITIAL_MESSAGES = [
  {
    id: 1,
    type: 'ai',
    text: '안녕하세요, 세이프파킹입니다.\n\n목적지 주변의 단속 현황과 안전한 주차 공간을 안내해 드릴게요. 어디로 가시나요?',
    time: '방금',
  },
];

const QUICK_QUESTIONS = [
  '시청 근처 주차장 추천',
  '가까운 무료 주차장',
  '단속 없는 안전 구역',
  '30분 단기 주차',
];

export default function AIAssistantScreen({ navigation }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const flatListRef = useRef(null);
  const typingDots = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

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

  // 음성 입력 모달 열기
  const startVoiceInput = () => {
    setVoiceModalVisible(true);
    setIsListening(true);
    Vibration.vibrate(50);
    
    // 실제로는 여기서 STT 시작
    // 데모: 3초 후 자동으로 인식된 텍스트 시뮬레이션
    setTimeout(() => {
      simulateVoiceRecognition();
    }, 3000);
  };

  // 음성 인식 시뮬레이션 (실제로는 STT API 연동)
  const simulateVoiceRecognition = () => {
    const demoTexts = [
      '강남역 근처 30분 주차할 곳 찾아줘',
      '여기서 가장 가까운 무료 주차장 알려줘',
      '단속 없는 안전한 곳으로 안내해줘',
    ];
    const randomText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
    
    setIsListening(false);
    setInputText(randomText);
    
    setTimeout(() => {
      setVoiceModalVisible(false);
      sendMessage(randomText);
    }, 500);
  };

  // 음성 입력 취소
  const cancelVoiceInput = () => {
    setIsListening(false);
    setVoiceModalVisible(false);
    setInputText('');
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: text,
      time: '방금',
    };

    setMessages([...messages, userMessage]);
    setInputText('');
    setIsTyping(true);

    // AI 응답 시뮬레이션
    setTimeout(() => {
      setIsTyping(false);
      const aiResponse = generateAIResponse(text);
      setMessages(prev => [...prev, aiResponse]);
      
      // TTS로 응답 읽기
      if (voiceEnabled) {
        speakResponse(aiResponse.text);
      }
    }, 1500);
  };

  const generateAIResponse = (userText) => {
    // 간단한 응답 로직 (실제로는 API 연동)
    let response = '';
    let recommendations = null;

    if (userText.includes('시청') || userText.includes('서울')) {
      response = '시청 근처 분석 결과입니다.\n\n세종대로 일대는 주정차 단속이 집중되는 구역이에요. 아래 주차장을 추천드립니다.';
      recommendations = [
        { name: '서울시청 공영주차장', distance: '도보 3분', available: 23, price: '10분 500원', safe: true },
        { name: '프레스센터 주차장', distance: '도보 5분', available: 12, price: '10분 700원', safe: true },
        { name: '세종문화회관 주차장', distance: '도보 7분', available: 45, price: '10분 600원', safe: true },
      ];
    } else if (userText.includes('무료')) {
      response = '주변 무료 주차 가능 공간입니다.\n\n무료 주차는 시간 제한이 있으니 참고해 주세요.';
      recommendations = [
        { name: '을지로 노상주차장', distance: '도보 4분', available: 8, price: '30분 무료', safe: true },
        { name: '청계천 공영주차장', distance: '도보 8분', available: 15, price: '1시간 무료', safe: true },
      ];
    } else if (userText.includes('단속') || userText.includes('안전')) {
      response = '현재 위치 기준 단속 현황입니다.\n\n반경 500m 내 단속카메라 3개가 확인됩니다. 아래 안전한 주차장을 이용해 주세요.';
      recommendations = [
        { name: '명동 공영주차장', distance: '도보 6분', available: 32, price: '10분 600원', safe: true },
        { name: '롯데백화점 주차장', distance: '도보 4분', available: 120, price: '10분 800원', safe: true },
      ];
    } else {
      response = '주변 주차장을 분석했습니다.\n\n현재 위치 기준 가장 가까운 안전한 주차장입니다.';
      recommendations = [
        { name: '가까운 공영주차장', distance: '도보 5분', available: 18, price: '10분 500원', safe: true },
      ];
    }

    return {
      id: messages.length + 2,
      type: 'ai',
      text: response,
      recommendations: recommendations,
      time: '방금',
    };
  };

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
          <Ionicons name="sparkles" size={20} color="#fff" />
        </View>
        <View style={styles.aiMessageContent}>
          <View style={styles.aiMessage}>
            <Text style={styles.aiMessageText}>{item.text}</Text>
          </View>
          
          {/* 주차장 추천 카드들 */}
          {item.recommendations && (
            <View style={styles.recommendationsContainer}>
              {item.recommendations.map((rec, index) => (
                <TouchableOpacity key={index} style={styles.recommendationCard}>
                  <View style={styles.recHeader}>
                    <FontAwesome5 name="parking" size={16} color="#34C759" />
                    <Text style={styles.recName}>{rec.name}</Text>
                    {rec.safe && (
                      <View style={styles.safeBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#34C759" />
                      </View>
                    )}
                  </View>
                  <View style={styles.recDetails}>
                    <View style={styles.recDetailItem}>
                      <Ionicons name="location-outline" size={14} color="#666" />
                      <Text style={styles.recDetail}>{rec.distance}</Text>
                    </View>
                    <View style={styles.recDetailItem}>
                      <Ionicons name="car-outline" size={14} color="#666" />
                      <Text style={styles.recDetail}>{rec.available}자리</Text>
                    </View>
                    <View style={styles.recDetailItem}>
                      <Ionicons name="card-outline" size={14} color="#666" />
                      <Text style={styles.recDetail}>{rec.price}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.navigateButton}>
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
          <Text style={styles.title}>AI 주차 도우미</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>온라인</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#000" />
        </TouchableOpacity>
      </View>

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
                <Text style={styles.typingText}>입력 중...</Text>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
              placeholder="메시지를 입력하세요..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            
            {/* 마이크 버튼 */}
            <TouchableOpacity 
              style={styles.micButton}
              onPress={startVoiceInput}
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
        onRequestClose={cancelVoiceInput}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalContent}>
            <Text style={styles.voiceModalTitle}>
              {isListening ? '듣고 있습니다...' : '인식 중...'}
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
              onPress={cancelVoiceInput}
            >
              <Text style={styles.cancelVoiceText}>취소</Text>
            </TouchableOpacity>

            {/* 예시 문구 */}
            <View style={styles.voiceExamples}>
              <Text style={styles.voiceExampleTitle}>이렇게 말해보세요</Text>
              <Text style={styles.voiceExampleText}>"강남역 근처 30분 주차할 곳"</Text>
              <Text style={styles.voiceExampleText}>"여기서 가까운 무료 주차장"</Text>
              <Text style={styles.voiceExampleText}>"단속 없는 안전한 곳으로 안내해"</Text>
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
          <Text style={styles.speakingText}>재생 중... 탭하여 중지</Text>
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
    paddingVertical: 12,
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
  messagesList: {
    padding: 16,
    paddingBottom: 100,
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
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 10,
    color: '#000',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
