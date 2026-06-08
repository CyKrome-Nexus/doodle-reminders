import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Contacts from 'expo-contacts';
import { useSocket } from '@/context/SocketContext';
import { Feather } from '@expo/vector-icons';
import { BellIcon } from '@/components/BellIcon';
import { useTheme } from '@/theme/theme';

WebBrowser.maybeCompleteAuthSession();

export const AuthScreen: React.FC = () => {
  const { colors, cleanCard, cleanInput, cleanButton } = useTheme();
  const {
    login,
    authError,
    connected,
    serverUrl,
    setServerUrl,
    user,
    isAuthenticated,
    otpSent,
    otpSentMessage,
    contactsRecommendations,
    requestOtp,
    verifyOtp,
    signupStep1,
    signupStep2,
    checkContacts,
    signupStep3Complete,
    sendFriendRequest,
    logout,
    loginLocalAccount
  } = useSocket();

  // Mode state
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Normal Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup State
  const [signupEmail, setSignupEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupName, setSignupName] = useState('');

  // UI state helpers
  const [loading, setLoading] = useState(false);
  const [sentFriendRequests, setSentFriendRequests] = useState<string[]>([]);
  const [contactsPermission, setContactsPermission] = useState<string | null>(null);
  const [isScanningContacts, setIsScanningContacts] = useState(false);

  // --- Animation Hooks ---

  // 1. Initial mounting fade-in animation
  const screenFadeAnim = useRef(new Animated.Value(0)).current;

  // Local Name Input state for Skip (Local Account) mode
  const [localName, setLocalName] = useState('');

  // Welcome Intro Step:
  // 0: Centered header
  // 1: Slid up header, "Start!" & `>` visible
  // 2: Stacked menu visible (Setup Account / Skip)
  // 3: Local name input form ("What should we call you?")
  // 4: normal login/signup forms
  const skipIntro = isAuthenticated && user && user.signupStep < 4;
  const [currentIntroStep, setCurrentIntroStep] = useState(skipIntro ? 4 : 0);
  const introProgress = useRef(new Animated.Value(skipIntro ? 1.0 : 0.0)).current;

  useEffect(() => {
    Animated.timing(screenFadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (skipIntro) {
      return;
    }

    // Phase 1: Wait 2 seconds, then slide up welcome header and fade in "Start!"
    const timer = setTimeout(() => {
      setCurrentIntroStep(1);
      Animated.timing(introProgress, {
        toValue: 0.5,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }, 2000);

    return () => clearTimeout(timer);
  }, [skipIntro]);

  const initialOffsetY = (SCREEN_HEIGHT / 2) - 180;
  const slidUpOffsetY = initialOffsetY - 200;
  const initialMenuOffsetY = 0;
  const slidUpMenuOffsetY = initialMenuOffsetY - 220;
  const initialLocalFormOffsetY = 0;
  const slidUpLocalFormOffsetY = initialLocalFormOffsetY - 220;

  const headerTranslateY = introProgress.interpolate({
    inputRange: [0, 0.5, 0.75, 0.85, 1],
    outputRange: [initialOffsetY, slidUpOffsetY, slidUpOffsetY, slidUpOffsetY, 0],
  });

  const startOpacity = introProgress.interpolate({
    inputRange: [0, 0.45, 0.5, 0.7, 1],
    outputRange: [0, 0, 1, 0, 0],
  });

  const startTranslateX = introProgress.interpolate({
    inputRange: [0, 0.5, 0.75, 1],
    outputRange: [0, 0, -150, -150],
  });

  const menuOpacity = introProgress.interpolate({
    inputRange: [0, 0.5, 0.7, 0.75, 0.8, 1],
    outputRange: [0, 0, 0, 1, 0, 0],
  });

  const menuTranslateX = introProgress.interpolate({
    inputRange: [0, 0.5, 0.75, 0.85, 1],
    outputRange: [150, 150, 0, -150, -150],
  });

  const menuTranslateY = introProgress.interpolate({
    inputRange: [0, 0.5, 0.75, 0.85, 1],
    outputRange: [initialMenuOffsetY, slidUpMenuOffsetY, slidUpMenuOffsetY, slidUpMenuOffsetY, 0],
  });

  const localFormOpacity = introProgress.interpolate({
    inputRange: [0, 0.75, 0.82, 0.85, 0.88, 1],
    outputRange: [0, 0, 0, 1, 0, 0],
  });

  const localFormTranslateX = introProgress.interpolate({
    inputRange: [0, 0.75, 0.85, 1],
    outputRange: [0, 0, 0, 0],
  });

  const localFormTranslateY = introProgress.interpolate({
    inputRange: [0, 0.5, 0.75, 0.85, 1],
    outputRange: [initialLocalFormOffsetY, slidUpLocalFormOffsetY, slidUpLocalFormOffsetY, slidUpLocalFormOffsetY, 0],
  });

  const formOpacity = introProgress.interpolate({
    inputRange: [0, 0.85, 0.95, 1],
    outputRange: [0, 0, 0, 1],
  });

  const formTranslateY = introProgress.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [50, 50, 0],
  });

  const handleStartPress = () => {
    setCurrentIntroStep(2);
    Animated.timing(introProgress, {
      toValue: 0.75,
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  const handleSetupAccountPress = () => {
    setCurrentIntroStep(4);
    Animated.timing(introProgress, {
      toValue: 1.0,
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  const handleSkipPress = () => {
    setCurrentIntroStep(3);
    Animated.timing(introProgress, {
      toValue: 0.85,
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  const handleLocalNameConfirm = () => {
    if (localName.trim()) {
      loginLocalAccount(localName.trim());
    }
  };

  // 2. Segmented tab switcher sliding indicator
  const tabSlideVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(tabSlideVal, {
      toValue: isRegisterMode ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isRegisterMode]);

  const tabLeftPercent = tabSlideVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['1%', '51%'],
  });

  // 3. Fluid screen carousel transition (signup steps)
  const currentStep = !isAuthenticated ? (otpSent ? 0.5 : 0) : (user?.signupStep ?? 4);
  const [activeStep, setActiveStep] = useState(currentStep);
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentStep !== activeStep) {
      const toValue = currentStep > activeStep ? 1 : -1;
      Animated.timing(stepAnim, {
        toValue: toValue,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setActiveStep(currentStep);
        stepAnim.setValue(-toValue);
        Animated.spring(stepAnim, {
          toValue: 0,
          friction: 9,
          tension: 40,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentStep, activeStep]);

  // 4. Fluid sub-carousel transition (switching between Login and SignUp form screens)
  const [activeRegisterMode, setActiveRegisterMode] = useState(isRegisterMode);
  const modeSlideAnim = useRef(new Animated.Value(0)).current;
  const modeTransitionVal = useRef(new Animated.Value(isRegisterMode ? 0 : 1)).current;
  const formHeight = modeTransitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [155, 250],
  });

  useEffect(() => {
    if (isRegisterMode !== activeRegisterMode) {
      if (!isRegisterMode) {
        // --- Switching to Login (Expanding) ---
        // 1. Put form off-screen (so it's hidden)
        modeSlideAnim.setValue(-1);
        // 2. Render Login layout immediately
        setActiveRegisterMode(false);
        // 3. Animate height to LOGIN_HEIGHT (250) smoothly
        Animated.timing(modeTransitionVal, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }).start(() => {
          // 4. Spring slide the form horizontally into view
          Animated.spring(modeSlideAnim, {
            toValue: 0,
            friction: 9,
            tension: 40,
            useNativeDriver: true,
          }).start();
        });
      } else {
        // --- Switching to Sign Up (Shrinking) ---
        // 1. Slide the form horizontally out of view first
        Animated.timing(modeSlideAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          // 2. Render Signup layout immediately
          setActiveRegisterMode(true);
          // 3. Animate height to SIGNUP_HEIGHT (155) smoothly
          Animated.timing(modeTransitionVal, {
            toValue: 0,
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            // 4. Spring slide the form horizontally into view
            modeSlideAnim.setValue(-1);
            Animated.spring(modeSlideAnim, {
              toValue: 0,
              friction: 9,
              tension: 40,
              useNativeDriver: true,
            }).start();
          });
        });
      }
    }
  }, [isRegisterMode, activeRegisterMode]);

  // Auto scan on step 3
  useEffect(() => {
    if (isAuthenticated && user && user.signupStep === 3) {
      handleScanContacts();
    }
  }, [isAuthenticated, user?.signupStep]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const redirectUrl = Linking.createURL('oauth-callback');
      const authUrl = `${serverUrl}/auth/google?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    } catch (err: any) {
      console.error('❌ Failed to complete Google OAuth:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setLoading(true);
      const redirectUrl = Linking.createURL('oauth-callback');
      const authUrl = `${serverUrl}/auth/facebook?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    } catch (err: any) {
      console.error('❌ Failed to complete Facebook OAuth:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = () => {
    if (!loginUsername.trim() || !loginPassword.trim()) return;
    setLoading(true);
    login(loginUsername, loginPassword);
    setTimeout(() => setLoading(false), 1500);
  };

  const handleRequestOtpSubmit = () => {
    if (!signupEmail.trim() || !signupEmail.includes('@')) return;
    setLoading(true);
    requestOtp(signupEmail);
    setTimeout(() => setLoading(false), 1500);
  };

  const handleVerifyOtpSubmit = () => {
    if (!otpCode.trim() || otpCode.length < 6) return;
    setLoading(true);
    verifyOtp(signupEmail, otpCode);
    setTimeout(() => setLoading(false), 1500);
  };

  const handleStep1Submit = () => {
    if (!signupUsername.trim() || !signupPassword.trim()) return;
    if (signupPassword !== signupConfirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setLoading(true);
    signupStep1(signupUsername, signupPhone, signupPassword);
    setTimeout(() => setLoading(false), 1500);
  };

  const handleStep2Submit = (skip: boolean) => {
    setLoading(true);
    const chosenName = skip ? undefined : signupName;
    signupStep2(chosenName || '');
    setTimeout(() => setLoading(false), 1500);
  };

  const handleScanContacts = async () => {
    try {
      setIsScanningContacts(true);
      const { status } = await Contacts.requestPermissionsAsync();
      setContactsPermission(status);
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        if (data.length > 0) {
          const phones: string[] = [];
          data.forEach(c => {
            if (c.phoneNumbers) {
              c.phoneNumbers.forEach(p => {
                if (p.number) {
                  phones.push(p.number);
                }
              });
            }
          });
          checkContacts(phones);
        } else {
          checkContacts([]);
        }
      } else {
        checkContacts([]);
      }
    } catch (err: any) {
      console.warn('Failed to load contacts:', err.message);
    } finally {
      setIsScanningContacts(false);
    }
  };

  const handleAddFriend = (targetUser: { id: string; username: string }) => {
    sendFriendRequest(targetUser.username);
    setSentFriendRequests(prev => [...prev, targetUser.username]);
  };

  const handleStep3CompleteSubmit = () => {
    setLoading(true);
    signupStep3Complete();
    setTimeout(() => setLoading(false), 1500);
  };

  const handleToggleMode = (registerMode: boolean) => {
    setIsRegisterMode(registerMode);
  };

  // Interpolated sliding offset values
  const stepTranslateX = stepAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-300, 0, 300],
  });
  const stepOpacity = stepAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 1, 0],
  });

  const modeTranslateX = modeSlideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-300, 0, 300],
  });
  const modeOpacity = modeSlideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={{ flex: 1, opacity: screenFadeAnim }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

            {/* Brand Logo Header */}
            <Animated.View style={[styles.bannerContainer, { transform: [{ translateY: headerTranslateY }] }]}>
              <View style={styles.headerRow}>
                <View style={[styles.logoIconBg, { backgroundColor: colors.marginLine }]}>
                  <BellIcon size={32} color="#FFFFFF" />
                </View>
                <Text style={[styles.brandTitle, { color: colors.marginLine }]}>
                  Reminders
                </Text>
              </View>
              <Text style={[styles.brandSubtitle, { color: colors.inkSecondary }]}>
                {isAuthenticated ? "Let's configure your profile preferences" : "Never forget what matters."}
              </Text>
            </Animated.View>

            {/* Welcoming Phase Content */}
            {currentIntroStep < 4 && (
              <View style={[styles.introContentContainer, { marginTop: Math.max(100, SCREEN_HEIGHT - SCREEN_HEIGHT * 0.60) }]}>

                {/* Start! and > Trigger */}
                <Animated.View style={[
                  styles.startContainer,
                  {
                    opacity: startOpacity,
                    transform: [{ translateX: startTranslateX }],
                  }
                ]}
                  pointerEvents={currentIntroStep === 1 ? 'auto' : 'none'}
                >
                  <Text style={[styles.startLabelText, { color: colors.ink }]}>Start!</Text>
                  <TouchableOpacity
                    onPress={handleStartPress}
                    style={[styles.circleStartBtn, { backgroundColor: colors.marginLine }]}
                    activeOpacity={0.8}
                  >
                    <Feather name="chevron-right" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </Animated.View>

                {/* Stacked Menu Selection */}
                <Animated.View style={[
                  styles.menuContainer,
                  {
                    opacity: menuOpacity,
                    transform: [{ translateY: menuTranslateY }, { translateX: menuTranslateX }],
                  }
                ]}
                  pointerEvents={currentIntroStep === 2 ? 'auto' : 'none'}
                >
                  <Text style={[styles.menuSubtitle, { color: colors.ink }]}>
                    Create a free account & enjoy group reminders with friends
                  </Text>

                  <TouchableOpacity
                    onPress={handleSetupAccountPress}
                    style={[styles.primaryBtn, cleanButton(), { width: '100%' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryBtnText}>Setup Account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSkipPress}
                    style={[styles.secondaryBtn, { borderColor: colors.border, width: '100%', marginTop: 12 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.inkSecondary }]}>Skip</Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Local Name Input Form */}
                <Animated.View style={[
                  styles.localFormContainer,
                  {
                    opacity: localFormOpacity,
                    transform: [{ translateY: localFormTranslateY }, { translateX: localFormTranslateX }],
                  }
                ]}
                  pointerEvents={currentIntroStep === 3 ? 'auto' : 'none'}
                >
                  <Text style={[styles.localFormTitle, { color: colors.ink }]}>
                    What should we call you?
                  </Text>
                  <TextInput
                    value={localName}
                    onChangeText={setLocalName}
                    placeholder="Your Name (e.g. John Doe)"
                    placeholderTextColor={colors.inkSecondary}
                    style={[styles.inputField, cleanInput(), { width: '100%', marginBottom: 20 }]}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={handleLocalNameConfirm}
                    disabled={!localName.trim()}
                    style={[styles.primaryBtn, cleanButton(), { width: '100%', opacity: localName.trim() ? 1 : 0.6 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryBtnText}>Let's Go! 🚀</Text>
                  </TouchableOpacity>
                </Animated.View>

              </View>
            )}

            {/* Wizard Step Tracker */}
            {isAuthenticated && user && user.signupStep < 4 && (
              <View style={styles.wizardTracker}>
                <Text style={[styles.wizardProgressText, { color: colors.marginLine }]}>
                  {user.signupStep === 1 && "Step 1 of 3: Claim your identity 🏷️"}
                  {user.signupStep === 2 && "Step 2 of 3: What should we call you? 🎨"}
                  {user.signupStep === 3 && "Step 3 of 3: Find your drawing buddies! 🤝"}
                </Text>
              </View>
            )}

            {/* Form Container Card */}
            {currentIntroStep === 4 && (
              <Animated.View style={[
                styles.formCard,
                cleanCard(colors.border),
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formTranslateY }]
                }
              ]}>
                <Animated.View style={{ transform: [{ translateX: stepTranslateX }], opacity: stepOpacity }}>

                  {/* Step 0: Login vs Signup Panel */}
                  {activeStep === 0 && (
                    <View>
                      {/* Segmented Pill Selector (Absolute sliding background) */}
                      <View style={styles.segmentedControl}>
                        <Animated.View style={[
                          styles.segmentBtnActiveIndicator,
                          { left: tabLeftPercent }
                        ]} />

                        <TouchableOpacity
                          onPress={() => handleToggleMode(false)}
                          style={styles.segmentBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={[
                            styles.segmentText,
                            { color: !isRegisterMode ? colors.ink : colors.inkSecondary },
                            !isRegisterMode && styles.textBold
                          ]}>
                            Login
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleToggleMode(true)}
                          style={styles.segmentBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={[
                            styles.segmentText,
                            { color: isRegisterMode ? colors.ink : colors.inkSecondary },
                            isRegisterMode && styles.textBold
                          ]}>
                            Sign Up
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Animated.View style={{ height: formHeight, overflow: 'hidden' }}>
                        <Animated.View style={{ transform: [{ translateX: modeTranslateX }], opacity: modeOpacity }}>
                          {/* Render Login or signup email forms */}
                          {!activeRegisterMode ? (
                            <View style={{ height: 250 }}>
                              <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>Username</Text>
                              <TextInput
                                value={loginUsername}
                                onChangeText={setLoginUsername}
                                placeholder="Username"
                                placeholderTextColor={colors.inkSecondary}
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={[styles.inputField, cleanInput()]}
                              />

                              <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>Password</Text>
                              <TextInput
                                value={loginPassword}
                                onChangeText={setLoginPassword}
                                placeholder="Password"
                                placeholderTextColor={colors.inkSecondary}
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={[styles.inputField, cleanInput()]}
                              />

                              <TouchableOpacity
                                onPress={handleLoginSubmit}
                                disabled={loading}
                                style={[styles.primaryBtn, cleanButton()]}
                              >
                                {loading ? (
                                  <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                  <Text style={styles.primaryBtnText}>Login</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={{ height: 155 }}>
                              <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>Email Address</Text>
                              <TextInput
                                value={signupEmail}
                                onChangeText={setSignupEmail}
                                placeholder="Email Address"
                                placeholderTextColor={colors.inkSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={[styles.inputField, cleanInput()]}
                              />

                              <TouchableOpacity
                                onPress={handleRequestOtpSubmit}
                                disabled={loading}
                                style={[styles.primaryBtn, cleanButton()]}
                              >
                                {loading ? (
                                  <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                  <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}
                        </Animated.View>
                      </Animated.View>

                      {/* Divider and OAuth Buttons */}
                      <View style={{ marginTop: 10 }}>
                        {/* Divider */}
                        <View style={styles.dividerRow}>
                          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                          <Text style={[styles.dividerText, { color: colors.inkSecondary }]}>or</Text>
                          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        </View>

                        {/* Google OAuth Button */}
                        <TouchableOpacity
                          onPress={handleGoogleSignIn}
                          disabled={loading}
                          style={[styles.oauthBtn, { borderColor: colors.border, backgroundColor: '#FFFFFF' }]}
                        >
                          <Feather name="chrome" size={16} color="#EA4335" style={{ marginRight: 10 }} />
                          <Text style={[styles.oauthBtnText, { color: colors.ink }]}>Continue with Google</Text>
                        </TouchableOpacity>

                        {/* Facebook OAuth Button */}
                        <TouchableOpacity
                          onPress={handleFacebookSignIn}
                          disabled={loading}
                          style={[styles.oauthBtn, { borderColor: '#1877F2', backgroundColor: '#1877F2' }]}
                        >
                          <Feather name="facebook" size={16} color="#FFFFFF" style={{ marginRight: 10 }} />
                          <Text style={[styles.oauthBtnText, { color: '#FFFFFF' }]}>Continue with Facebook</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Step 0.5: OTP Verification */}
                  {activeStep === 0.5 && (
                    <View>
                      <Text style={[styles.otpSubText, { color: colors.ink }]}>
                        We sent a verification code to:
                      </Text>
                      <Text style={[styles.otpEmail, { color: colors.marginLine }]}>
                        {signupEmail}
                      </Text>

                      {otpSentMessage && otpSentMessage.startsWith('[DEV FALLBACK]') && (
                        <View style={[styles.fallbackBox, { borderColor: colors.marginLine, backgroundColor: colors.marginLine + '10' }]}>
                          <Text style={[styles.fallbackText, { color: colors.marginLine }]}>
                            💡 {otpSentMessage}
                          </Text>
                        </View>
                      )}

                      <Text style={[styles.inputLabel, { color: colors.inkSecondary, marginTop: 14 }]}>
                        Enter 6-digit Code
                      </Text>
                      <TextInput
                        value={otpCode}
                        onChangeText={setOtpCode}
                        placeholder="123456"
                        placeholderTextColor={colors.inkSecondary}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.otpInput, cleanInput()]}
                      />

                      <TouchableOpacity
                        onPress={handleVerifyOtpSubmit}
                        disabled={loading}
                        style={[styles.primaryBtn, cleanButton(colors.successPen)]}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity onPress={handleRequestOtpSubmit} style={styles.resendBtn}>
                        <Text style={[styles.resendBtnText, { color: colors.marginLine }]}>
                          Resend Code
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => logout()} style={styles.backLink}>
                        <Text style={[styles.backLinkText, { color: colors.inkSecondary }]}>
                          ← Back to signup
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 1: Claim Identity details */}
                  {activeStep === 1 && (
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>Username</Text>
                      <TextInput
                        value={signupUsername}
                        onChangeText={setSignupUsername}
                        placeholder="Username"
                        placeholderTextColor={colors.inkSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.inputField, cleanInput()]}
                      />

                      <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>Phone Number (Optional)</Text>
                      <TextInput
                        value={signupPhone}
                        onChangeText={setSignupPhone}
                        placeholder="+1234567890"
                        placeholderTextColor={colors.inkSecondary}
                        keyboardType="phone-pad"
                        style={[styles.inputField, cleanInput()]}
                      />

                      <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>Password</Text>
                      <TextInput
                        value={signupPassword}
                        onChangeText={setSignupPassword}
                        placeholder="Password"
                        placeholderTextColor={colors.inkSecondary}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.inputField, cleanInput()]}
                      />

                      <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>Confirm Password</Text>
                      <TextInput
                        value={signupConfirmPassword}
                        onChangeText={setSignupConfirmPassword}
                        placeholder="Confirm Password"
                        placeholderTextColor={colors.inkSecondary}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.inputField, cleanInput()]}
                      />

                      <TouchableOpacity
                        onPress={handleStep1Submit}
                        disabled={loading}
                        style={[styles.primaryBtn, cleanButton()]}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Continue</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 2: Display name setup */}
                  {activeStep === 2 && (
                    <View>
                      <Text style={[styles.instructionText, { color: colors.ink }]}>
                        What is your display name? This is how your friends will see you on reminders.
                      </Text>

                      <Text style={[styles.inputLabel, { color: colors.inkSecondary, marginTop: 12 }]}>Your Name</Text>
                      <TextInput
                        value={signupName}
                        onChangeText={setSignupName}
                        placeholder="Your Name (e.g. John Doe)"
                        placeholderTextColor={colors.inkSecondary}
                        style={[styles.inputField, cleanInput()]}
                      />

                      <TouchableOpacity
                        onPress={() => handleStep2Submit(false)}
                        disabled={loading || !signupName.trim()}
                        style={[styles.primaryBtn, cleanButton()]}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Save & Continue</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleStep2Submit(true)}
                        disabled={loading}
                        style={styles.skipBtn}
                      >
                        <Text style={[styles.skipBtnText, { color: colors.inkSecondary }]}>
                          Skip (Use username "{user?.username}")
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 3: Buddy scans */}
                  {activeStep === 3 && (
                    <View>
                      <Text style={[styles.instructionText, { color: colors.ink }]}>
                        Find friends from your contact list using matching phone numbers.
                      </Text>

                      {contactsPermission !== 'granted' ? (
                        <View style={styles.permissionContainer}>
                          <Text style={[styles.permissionInfoText, { color: colors.inkSecondary }]}>
                            We need contacts scan permission to recommend active buddies.
                          </Text>
                          <TouchableOpacity
                            onPress={handleScanContacts}
                            disabled={isScanningContacts}
                            style={[styles.primaryBtn, cleanButton(colors.marginLine + '20')]}
                          >
                            <Text style={[styles.permissionBtnText, { color: colors.marginLine }]}>
                              {isScanningContacts ? 'Scanning...' : 'Scan Contacts List'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.recContainer}>
                          <Text style={[styles.recTitle, { color: colors.ink }]}>
                            Recommended Friends Found:
                          </Text>

                          {contactsRecommendations.length === 0 ? (
                            <Text style={[styles.noFriendsText, { color: colors.inkSecondary }]}>
                              No contacts matched active accounts yet.
                            </Text>
                          ) : (
                            <ScrollView style={styles.recScroll}>
                              {contactsRecommendations.map((rec) => {
                                const hasRequested = sentFriendRequests.includes(rec.username);
                                return (
                                  <View key={rec.id} style={[styles.recRow, { borderColor: colors.border }]}>
                                    <View style={styles.recMeta}>
                                      <Text style={[styles.recNameText, { color: colors.ink }]}>{rec.name}</Text>
                                      <Text style={[styles.recUserText, { color: colors.inkSecondary }]}>@{rec.username}</Text>
                                    </View>
                                    <TouchableOpacity
                                      onPress={() => !hasRequested && handleAddFriend(rec)}
                                      disabled={hasRequested}
                                      style={[
                                        styles.recActionBtn,
                                        { backgroundColor: hasRequested ? colors.successPen : colors.marginLine }
                                      ]}
                                    >
                                      <Text style={styles.recActionText}>
                                        {hasRequested ? 'Sent' : 'Add'}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                            </ScrollView>
                          )}
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={handleStep3CompleteSubmit}
                        disabled={loading}
                        style={[styles.primaryBtn, cleanButton(colors.successPen), { marginTop: 24 }]}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Finish Setup</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {authError && (
                    <Text style={[styles.errorText, { color: colors.dangerPen }]}>
                      ⚠️ {authError}
                    </Text>
                  )}
                </Animated.View>
              </Animated.View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 120,
  },
  bannerContainer: {
    alignItems: 'center',
    marginTop: 86,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logoIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1,
  },
  brandTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
  },
  brandSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginTop: 6,
  },
  wizardTracker: {
    alignItems: 'center',
    marginBottom: 16,
  },
  wizardProgressText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    position: 'relative',
  },
  segmentBtnActiveIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 2,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  textBold: {
    fontFamily: 'Poppins_600SemiBold',
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 6,
  },
  inputField: {
    marginBottom: 18,
  },
  primaryBtn: {
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  oauthBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  otpSubText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  otpEmail: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  fallbackBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  fallbackText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 18,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  skipBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  permissionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  permissionInfoText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  recContainer: {
    marginTop: 8,
  },
  recTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 10,
  },
  noFriendsText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginVertical: 14,
  },
  recScroll: {
    maxHeight: 180,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  recMeta: {
    flex: 1,
  },
  recNameText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  recUserText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  recActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
    marginTop: 12,
  },
  introContentContainer: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 40,
  },
  startContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLabelText: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 12,
  },
  circleStartBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  menuSubtitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  localFormContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  localFormTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});
