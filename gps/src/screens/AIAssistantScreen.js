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
import Voice from '@react-native-voice/voice';

// ?붾? AI ???
const INITIAL_MESSAGES = [
  {
    id: 1,
    type: 'ai',
    text: '?덈뀞?섏꽭?? ?몄씠?꾪뙆?뱀엯?덈떎.\n\n紐⑹쟻吏 二쇰????⑥냽 ?꾪솴怨??덉쟾??二쇱감 怨듦컙???덈궡???쒕┫寃뚯슂. ?대뵒濡?媛?쒕굹??',
    time: '諛⑷툑',
  },
];

const QUICK_QUESTIONS = [
  '?쒖껌 洹쇱쿂 二쇱감??異붿쿇',
  '媛源뚯슫 臾대즺 二쇱감??,
  '?⑥냽 ?녿뒗 ?덉쟾 援ъ뿭',
  '30遺??④린 二쇱감',
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
  const recognizedTextRef = useRef('');

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

  // ?뚯꽦 ?ｊ린 ?좊땲硫붿씠??
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

  // STT ??源???紐꺿봺??μ뵠??
  useEffect(() => {
    Voice.onSpeechResults = (event) => {
      const text = event?.value?.[0] ?? '';
      recognizedTextRef.current = text;
      setInputText(text);
    };

    Voice.onSpeechPartialResults = (event) => {
      const text = event?.value?.[0] ?? '';
      if (text) {
        recognizedTextRef.current = text;
        setInputText(text);
      }
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      setVoiceModalVisible(false);
      const finalText = recognizedTextRef.current;
      if (finalText && finalText.trim()) {
        sendMessage(finalText);
      }
    };

    Voice.onSpeechError = () => {
      setIsListening(false);
      setVoiceModalVisible(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // TTS濡??묐떟 ?쎄린
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

  // TTS 以묒?
  const stopSpeaking = async () => {
    await Speech.stop();
    setIsSpeaking(false);
  };

  const startVoiceInputReal = async () => {
    setVoiceModalVisible(true);
    setIsListening(true);
    Vibration.vibrate(50);

    recognizedTextRef.current = '';
    setInputText('');

    try {
      await Voice.start('ko-KR');
    } catch (error) {
      setIsListening(false);
      setVoiceModalVisible(false);
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
  };

  // ?뚯꽦 ?낅젰 紐⑤떖 ?닿린
  const startVoiceInput = () => {
    setVoiceModalVisible(true);
    setIsListening(true);
    Vibration.vibrate(50);
    
    // ?ㅼ젣濡쒕뒗 ?ш린??STT ?쒖옉
    // ?곕え: 3珥????먮룞?쇰줈 ?몄떇???띿뒪???쒕??덉씠??
    setTimeout(() => {
      simulateVoiceRecognition();
    }, 3000);
  };

  // ?뚯꽦 ?몄떇 ?쒕??덉씠??(?ㅼ젣濡쒕뒗 STT API ?곕룞)
  const simulateVoiceRecognition = () => {
    const demoTexts = [
      '媛뺣궓??洹쇱쿂 30遺?二쇱감??怨?李얠븘以?,
      '?ш린??媛??媛源뚯슫 臾대즺 二쇱감???뚮젮以?,
      '?⑥냽 ?녿뒗 ?덉쟾??怨녹쑝濡??덈궡?댁쨾',
    ];
    const randomText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
    
    setIsListening(false);
    setInputText(randomText);
    
    setTimeout(() => {
      setVoiceModalVisible(false);
      sendMessage(randomText);
    }, 500);
  };

  // ?뚯꽦 ?낅젰 痍⑥냼
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
      time: '諛⑷툑',
    };

    setMessages([...messages, userMessage]);
    setInputText('');
    setIsTyping(true);

    // AI ?묐떟 ?쒕??덉씠??
    setTimeout(() => {
      setIsTyping(false);
      const aiResponse = generateAIResponse(text);
      setMessages(prev => [...prev, aiResponse]);
      
      // TTS濡??묐떟 ?쎄린
      if (voiceEnabled) {
        speakResponse(aiResponse.text);
      }
    }, 1500);
  };

  const generateAIResponse = (userText) => {
    // 媛꾨떒???묐떟 濡쒖쭅 (?ㅼ젣濡쒕뒗 API ?곕룞)
    let response = '';
    let recommendations = null;

    if (userText.includes('?쒖껌') || userText.includes('?쒖슱')) {
      response = '?쒖껌 洹쇱쿂 遺꾩꽍 寃곌낵?낅땲??\n\n?몄쥌?濡??쇰???二쇱젙李??⑥냽??吏묒쨷?섎뒗 援ъ뿭?댁뿉?? ?꾨옒 二쇱감?μ쓣 異붿쿇?쒕┰?덈떎.';
      recommendations = [
        { name: '?쒖슱?쒖껌 怨듭쁺二쇱감??, distance: '?꾨낫 3遺?, available: 23, price: '10遺?500??, safe: true },
        { name: '?꾨젅?ㅼ꽱??二쇱감??, distance: '?꾨낫 5遺?, available: 12, price: '10遺?700??, safe: true },
        { name: '?몄쥌臾명솕?뚭? 二쇱감??, distance: '?꾨낫 7遺?, available: 45, price: '10遺?600??, safe: true },
      ];
    } else if (userText.includes('臾대즺')) {
      response = '二쇰? 臾대즺 二쇱감 媛??怨듦컙?낅땲??\n\n臾대즺 二쇱감???쒓컙 ?쒗븳???덉쑝??李멸퀬??二쇱꽭??';
      recommendations = [
        { name: '?꾩?濡??몄긽二쇱감??, distance: '?꾨낫 4遺?, available: 8, price: '30遺?臾대즺', safe: true },
        { name: '泥?퀎泥?怨듭쁺二쇱감??, distance: '?꾨낫 8遺?, available: 15, price: '1?쒓컙 臾대즺', safe: true },
      ];
    } else if (userText.includes('?⑥냽') || userText.includes('?덉쟾')) {
      response = '?꾩옱 ?꾩튂 湲곗? ?⑥냽 ?꾪솴?낅땲??\n\n諛섍꼍 500m ???⑥냽移대찓??3媛쒓? ?뺤씤?⑸땲?? ?꾨옒 ?덉쟾??二쇱감?μ쓣 ?댁슜??二쇱꽭??';
      recommendations = [
        { name: '紐낅룞 怨듭쁺二쇱감??, distance: '?꾨낫 6遺?, available: 32, price: '10遺?600??, safe: true },
        { name: '濡?뜲諛깊솕??二쇱감??, distance: '?꾨낫 4遺?, available: 120, price: '10遺?800??, safe: true },
      ];
    } else {
      response = '二쇰? 二쇱감?μ쓣 遺꾩꽍?덉뒿?덈떎.\n\n?꾩옱 ?꾩튂 湲곗? 媛??媛源뚯슫 ?덉쟾??二쇱감?μ엯?덈떎.';
      recommendations = [
        { name: '媛源뚯슫 怨듭쁺二쇱감??, distance: '?꾨낫 5遺?, available: 18, price: '10遺?500??, safe: true },
      ];
    }

    return {
      id: messages.length + 2,
      type: 'ai',
      text: response,
      recommendations: recommendations,
      time: '諛⑷툑',
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
          
          {/* 二쇱감??異붿쿇 移대뱶??*/}
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
                      <Text style={styles.recDetail}>{rec.available}?먮━</Text>
                    </View>
                    <View style={styles.recDetailItem}>
                      <Ionicons name="card-outline" size={14} color="#666" />
                      <Text style={styles.recDetail}>{rec.price}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.navigateButton}>
                    <MaterialIcons name="directions" size={18} color="#fff" />
                    <Text style={styles.navigateButtonText}>寃쎈줈 ?덈궡</Text>
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
      {/* ?ㅻ뜑 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>AI 二쇱감 ?꾩슦誘?/Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>?⑤씪??/Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* 硫붿떆吏 由ъ뒪??*/}
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
                <Text style={styles.typingText}>?낅젰 以?..</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* 鍮좊Ⅸ 吏덈Ц */}
      {messages.length <= 2 && (
        <View style={styles.quickQuestions}>
          <Text style={styles.quickQuestionsTitle}>?대젃寃?臾쇱뼱蹂댁꽭??/Text>
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

      {/* ?낅젰李?*/}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputContainer}>
          {/* ?뚯꽦/TTS ?좉? */}
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
              placeholder="硫붿떆吏瑜??낅젰?섏꽭??.."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            
            {/* 留덉씠??踰꾪듉 */}
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

      {/* ?뚯꽦 ?낅젰 紐⑤떖 */}
      <Modal
        visible={voiceModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelVoiceInputReal}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalContent}>
            <Text style={styles.voiceModalTitle}>
              {isListening ? '?ｊ퀬 ?덉뒿?덈떎...' : '?몄떇 以?..'}
            </Text>
            <Text style={styles.voiceModalSubtitle}>
              紐⑹쟻吏??議곌굔??留먯???二쇱꽭??
            </Text>
            
            {/* ?뚯꽦 ?쒓컖??*/}
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

            {/* ?몄떇 以묒씤 ?띿뒪??*/}
            {inputText ? (
              <View style={styles.recognizedTextContainer}>
                <Text style={styles.recognizedText}>"{inputText}"</Text>
              </View>
            ) : null}

            {/* ?뚯꽦 ?⑥씠釉?*/}
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

            {/* 痍⑥냼 踰꾪듉 */}
            <TouchableOpacity 
              style={styles.cancelVoiceButton}
              onPress={cancelVoiceInputReal}
            >
              <Text style={styles.cancelVoiceText}>痍⑥냼</Text>
            </TouchableOpacity>

            {/* ?덉떆 臾멸뎄 */}
            <View style={styles.voiceExamples}>
              <Text style={styles.voiceExampleTitle}>?대젃寃?留먰빐蹂댁꽭??/Text>
              <Text style={styles.voiceExampleText}>"媛뺣궓??洹쇱쿂 30遺?二쇱감??怨?</Text>
              <Text style={styles.voiceExampleText}>"?ш린??媛源뚯슫 臾대즺 二쇱감??</Text>
              <Text style={styles.voiceExampleText}>"?⑥냽 ?녿뒗 ?덉쟾??怨녹쑝濡??덈궡??</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* TTS ?ъ깮 以??쒖떆 */}
      {isSpeaking && (
        <TouchableOpacity 
          style={styles.speakingIndicator}
          onPress={stopSpeaking}
        >
          <Ionicons name="volume-high" size={16} color="#fff" />
          <Text style={styles.speakingText}>?ъ깮 以?.. ??븯??以묒?</Text>
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
  
  // ?뚯꽦 紐⑤떖 ?ㅽ???
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
