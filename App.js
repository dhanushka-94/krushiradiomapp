import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Image, ScrollView, Linking, SafeAreaView, Modal, ImageBackground, Animated, Dimensions, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';
import { useState, useEffect, useRef } from 'react';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(1.0);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [orientation, setOrientation] = useState('portrait');
  const [screenType, setScreenType] = useState('phone');
  const currentYear = new Date().getFullYear();
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const dimensions = useWindowDimensions();
  
  // Primary color
  const PRIMARY_COLOR = '#30c054';
  
  // Radio station URL
  const radioUrl = 'https://radioserver.krushiradio.lk/listen/krushi_radio/radio.mp3'; // Krushi Radio stream URL
  
  // Web links
  const webLinks = {
    programLibrary: 'https://www.programmeslibrary.krushiradio.lk',
    newsWebsite: 'https://www.krushiradionews.lk',
    stationWebsite: 'https://www.krushiradio.lk',
    facebook: 'https://www.facebook.com/krushiradio/',
    youtube: 'https://www.youtube.com/@KrushiRadio',
    linkedin: 'https://www.linkedin.com/company/73046085/admin/dashboard/',
    twitter: 'https://x.com/i/flow/login?redirect_after_login=%2FRadioKrush81648'
  };
  
  // Detect screen orientation and device type
  useEffect(() => {
    const detectOrientation = () => {
      const { width, height } = dimensions;
      const isPortrait = height > width;
      setOrientation(isPortrait ? 'portrait' : 'landscape');
      
      // Detect if it's a tablet based on screen size and density
      const pixelDensity = Dimensions.get('window').scale;
      const widthInInches = width / (pixelDensity * 160);
      const heightInInches = height / (pixelDensity * 160);
      const diagonalInInches = Math.sqrt(Math.pow(widthInInches, 2) + Math.pow(heightInInches, 2));
      
      setScreenType(diagonalInInches >= 7 ? 'tablet' : 'phone');
    };
    
    detectOrientation();
    
    // Listen for orientation changes
    Dimensions.addEventListener('change', detectOrientation);
    
    return () => {
      // Clean up
      // Note: In newer React Native versions, this cleanup might be different
    };
  }, [dimensions]);

  // Custom splash screen
  const SplashScreenComponent = () => (
    <View style={styles.splashContainer}>
      <Image 
        source={require('./assets/logo.png')} 
        style={styles.splashLogo}
        resizeMode="contain"
      />
      <View style={styles.splashTextContainer}>
        <Text style={styles.splashSlogan}>ගහකොල අතරේ හුස්ම හොයනා රෙඩියෝ යාත්‍රිකයා</Text>
        <Text style={styles.splashTagline}>Official Agricultural Media Network in Sri Lanka</Text>
        <Text style={styles.developerCredit}>Developed by Krushi Radio Team</Text>
      </View>
    </View>
  );

  // Use effect to preload and setup the app
  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts, images, audio, etc. here
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate loading time
        
        // Everything is ready, hide splash screen
        await SplashScreen.hideAsync();
        setAppIsReady(true);
        
        // After a delay, hide our custom splash and show the main app
        setTimeout(() => {
          setSplashVisible(false);
        }, 2000);
        
      } catch (e) {
        console.warn(e);
      }
    }
    
    prepare();
  }, []);
  
  useEffect(() => {
    // Unload the sound when component unmounts
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);
  
  // Animate the "LIVE" text
  useEffect(() => {
    const fadeIn = () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => fadeOut());
    };
    
    const fadeOut = () => {
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => fadeIn());
    };
    
    fadeIn();
    
    return () => {
      fadeAnim.stopAnimation();
    };
  }, []);

  // Auto-play when app starts
  useEffect(() => {
    if (appIsReady && !splashVisible) {
      playSound();
    }
  }, [appIsReady, splashVisible]);
  
  async function playSound() {
    try {
      setIsBuffering(true);
      
      // Check if there is an error before trying to play
      setError(null);
      
      // If sound is already loaded
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
        setIsBuffering(false);
        return;
      }
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: radioUrl },
        { shouldPlay: true, volume: volume },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
      // Set audio mode for background playing
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      
      // Check if it's a network error
      if (error.message && (
        error.message.includes('network') || 
        error.message.includes('connection') ||
        error.message.includes('timeout')
      )) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to load stream. Please try again.');
      }
      
      setIsBuffering(false);
    }
  }
  
  function onPlaybackStatusUpdate(status) {
    if (status.isLoaded) {
      setIsBuffering(false);
    } else if (status.error) {
      setError('An error occurred during playback');
      setIsBuffering(false);
    }
  }
  
  async function pauseSound() {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  }
  
  function togglePlayPause() {
    if (isPlaying) {
      pauseSound();
    } else {
      playSound();
    }
  }
  
  async function increaseVolume() {
    const newVolume = Math.min(volume + 0.1, 1.0);
    setVolume(newVolume);
    if (sound) {
      await sound.setVolumeAsync(newVolume);
    }
  }
  
  async function decreaseVolume() {
    const newVolume = Math.max(volume - 0.1, 0.0);
    setVolume(newVolume);
    if (sound) {
      await sound.setVolumeAsync(newVolume);
    }
  }
  
  function openLink(url) {
    Linking.openURL(url).catch(err => console.error('Failed to open link:', err));
  }
  
  // About modal
  const AboutModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={aboutModalVisible}
      onRequestClose={() => setAboutModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>About Us</Text>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalText}>
              රූපවාහිනිය වැනි ඉලෙක්ට්‍රොනික මාධ්‍ය සහ වෙනත් බොහෝ තොරතුරු තාක්‍ෂණය වේගයෙන් ජනතාව අතරට පැමිණියද ගුවන්විදුලිය තවමත් සංවේදී මාධ්‍යක් ලෙස භාවිතයේ පවතී. එබැවින් කෘෂිකාර්මික සන්නිවේදන ක්‍රියාවලිය සඳහා ගුවන්විදුලිය කාර්යක්ෂමව භාවිතා කළ හැකිය.
            </Text>
            <Text style={styles.modalText}>
              ගුවන් විදුලි ගොවි සේවාව කෘෂිකර්ම දෙපාර්තමේන්තුව වෙනුවෙන් ගුවන් විදුලි සන්නිවේදනය සමඟ විශාල කාර්යභාරයක් ඉටු කරයි. මෙම ආයතනය කෘෂිකර්ම දෙපාර්තමේන්තුවේ ජාතික කෘෂිකාර්මික තොරතුරු හා සන්නිවේදන මධ්‍යස්ථානය යටතේ ක්‍රියාත්මක වේ.
            </Text>
          </ScrollView>
          <TouchableOpacity 
            style={[styles.modalButton, {backgroundColor: PRIMARY_COLOR}]}
            onPress={() => setAboutModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // Contact modal
  const ContactModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={contactModalVisible}
      onRequestClose={() => setContactModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Contact Us</Text>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalSubtitle}>Address:</Text>
            <Text style={styles.modalText}>
              Krushi Radio, Television & Farm Broadcasting Service, National Agriculture Information and Communication Center, Gannoruwa.
            </Text>
            
            <Text style={styles.modalSubtitle}>Phone:</Text>
            <Text style={styles.modalText}>+9481 2 388 388</Text>
            
            <Text style={styles.modalSubtitle}>Email:</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:info@krushiradio.lk')}>
              <Text style={[styles.modalText, styles.linkText]}>info@krushiradio.lk</Text>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity 
            style={[styles.modalButton, {backgroundColor: PRIMARY_COLOR}]}
            onPress={() => setContactModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // Privacy Policy modal
  const PrivacyPolicyModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={privacyModalVisible}
      onRequestClose={() => setPrivacyModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Privacy Policy</Text>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalSubtitle}>
              Privacy Policy for Krushi Radio Mobile App
            </Text>
            <Text style={styles.modalText}>
              Effective Date: 01.03.2025
            </Text>
            
            <Text style={styles.modalText}>
              At Krushi Radio, powered by Television and Farm Broadcasting Service (TFBS), we are committed to protecting your privacy. This Privacy Policy explains our approach to privacy and clearly states that we do not collect, store, or process any personal information from users of the Krushi Radio mobile application.
            </Text>
            
            <Text style={styles.modalSubtitle}>1. No Data Collection</Text>
            <Text style={styles.modalText}>
              We respect your privacy, and we want you to feel safe while using the Krushi Radio app. To this end, we have designed the app to ensure that:
            </Text>
            <Text style={styles.modalText}>
              • No Personal Information is Collected: We do not collect your name, email address, phone number, or any other personal data.
            </Text>
            <Text style={styles.modalText}>
              • No Tracking or Analytics: The app does not use any tracking tools, cookies, or analytics services.
            </Text>
            <Text style={styles.modalText}>
              • No Location Data: We do not collect or access your location.
            </Text>
            <Text style={styles.modalText}>
              • No Third-Party Data Collection: The app does not integrate with any third-party services that collect user data.
            </Text>
            
            <Text style={styles.modalSubtitle}>2. Children's Privacy</Text>
            <Text style={styles.modalText}>
              Since we do not collect any user information, the app is safe for users of all ages, including children. However, we recommend that parents and guardians supervise app usage for children under 13.
            </Text>
            
            <Text style={styles.modalSubtitle}>3. Data Security</Text>
            <Text style={styles.modalText}>
              Although we do not collect user information, we still prioritize app security to ensure a safe and seamless listening experience for all users.
            </Text>
            
            <Text style={styles.modalSubtitle}>4. Changes to This Privacy Policy</Text>
            <Text style={styles.modalText}>
              This Privacy Policy may be updated from time to time. Any changes will be reflected within the app. By continuing to use the app after such changes, you accept the updated Privacy Policy.
            </Text>
            
            <Text style={styles.modalSubtitle}>5. Contact Us</Text>
            <Text style={styles.modalText}>
              If you have any questions or concerns about this Privacy Policy, please contact us at:
            </Text>
            <Text style={styles.modalText}>
              Television & Farm Broadcasting Service{"\n"}
              National Agriculture Information and Communication Center,{"\n"}
              Peradeniya.{"\n"}
              Telephone: +94 81 238 8388{"\n"}
              Email: info@krushiradio.lk
            </Text>
          </ScrollView>
          <TouchableOpacity 
            style={[styles.modalButton, {backgroundColor: PRIMARY_COLOR}]}
            onPress={() => setPrivacyModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // Return splash screen if app is not ready
  if (!appIsReady) {
    return <SplashScreenComponent />;
  }
  
  // Return custom splash screen if visible
  if (splashVisible) {
    return <SplashScreenComponent />;
  }

  // Dynamic styles based on orientation and screen size
  const dynamicStyles = {
    playerCard: {
      margin: screenType === 'tablet' ? 25 : 15,
      maxWidth: orientation === 'landscape' && screenType === 'tablet' ? '60%' : '100%',
      alignSelf: 'center',
    },
    logo: {
      width: screenType === 'tablet' ? 250 : 200,
      height: screenType === 'tablet' ? 120 : 100,
    },
    playButton: {
      width: screenType === 'tablet' ? 100 : 80,
      height: screenType === 'tablet' ? 100 : 80,
      borderRadius: screenType === 'tablet' ? 50 : 40,
    },
    container: {
      flexDirection: orientation === 'landscape' && screenType === 'tablet' ? 'row' : 'column',
    },
    mainContent: {
      flex: 1,
    },
    socialContainer: {
      flexDirection: orientation === 'landscape' ? 'row' : 'column',
      justifyContent: 'space-around',
      flexWrap: 'wrap',
    },
    socialButtonSize: {
      width: screenType === 'tablet' 
        ? orientation === 'landscape' ? '23%' : '48%' 
        : orientation === 'landscape' ? '23%' : '48%',
      marginBottom: 10,
      marginHorizontal: screenType === 'tablet' ? 4 : 2,
    },
    socialIconSize: screenType === 'tablet' ? 32 : 22,
    socialTextSize: screenType === 'tablet' ? 16 : 14,
    linksCard: {
      margin: screenType === 'tablet' ? 25 : 15,
      width: orientation === 'landscape' && screenType === 'tablet' ? '40%' : undefined,
    }
  };

  return (
    <ImageBackground 
      source={require('./assets/background.jpg')} 
      style={styles.backgroundPattern}
      resizeMode="repeat"
    >
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar style="dark" />
        
        <View style={styles.header}>
          <Image 
            source={require('./assets/logo.png')} 
            style={[styles.logo, dynamicStyles.logo]}
            resizeMode="contain"
          />
        </View>
        
        <ScrollView style={styles.scrollView}>
          <View style={styles.sloganContainer}>
            <Text style={styles.slogan}>ගහකොල අතරේ හුස්ම හොයනා රෙඩියෝ යාත්‍රිකයා</Text>
            <Text style={styles.tagline}>Official Agricultural Media Network in Sri Lanka</Text>
          </View>
          
          <View style={[styles.playerCard, dynamicStyles.playerCard]}>
            <View style={styles.playerContainer}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
              
              <TouchableOpacity 
                style={[styles.playButton, dynamicStyles.playButton]} 
                onPress={togglePlayPause}
                disabled={isBuffering}
              >
                {isBuffering ? (
                  <ActivityIndicator size="large" color="#30c054" />
                ) : (
                  <Text style={styles.playButtonText}>
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </Text>
                )}
              </TouchableOpacity>
              
              {isPlaying && 
                <View style={styles.liveContainer}>
                  <Animated.Text style={[styles.liveText, { opacity: fadeAnim }]}>
                    LIVE
                  </Animated.Text>
                  <Animated.View style={[styles.liveDot, { opacity: fadeAnim }]} />
                </View>
              }
              
              <View style={styles.volumeContainer}>
                <Text style={styles.volumeText}>Volume: {Math.round(volume * 100)}%</Text>
                <View style={styles.volumeButtons}>
                  <TouchableOpacity 
                    style={[styles.volumeButton, { backgroundColor: PRIMARY_COLOR }]} 
                    onPress={decreaseVolume}
                  >
                    <Text style={styles.volumeButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.volumeBarContainer}>
                    <View style={[styles.volumeBarFill, {width: `${volume * 100}%`}]} />
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.volumeButton, { backgroundColor: PRIMARY_COLOR }]} 
                    onPress={increaseVolume}
                  >
                    <Text style={styles.volumeButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          
          <View style={[styles.linksCard, dynamicStyles.linksCard]}>
            <Text style={styles.linksTitle}>Web Resources</Text>
            
            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => openLink(webLinks.stationWebsite)}
            >
              <Text style={styles.linkButtonText}>Krushi Radio Website</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => openLink(webLinks.programLibrary)}
            >
              <Text style={styles.linkButtonText}>Old Programmes Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => openLink(webLinks.newsWebsite)}
            >
              <Text style={styles.linkButtonText}>Krushi Radio News Magazine</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.socialCard}>
            <Text style={styles.socialTitle}>Follow Us</Text>
            
            <View style={[styles.socialButtonsContainer]}>
              <TouchableOpacity 
                style={[styles.socialButton, dynamicStyles.socialButtonSize]} 
                onPress={() => openLink(webLinks.facebook)}
              >
                <View style={styles.socialButtonInner}>
                  <FontAwesome name="facebook" size={dynamicStyles.socialIconSize} color={PRIMARY_COLOR} />
                  <Text style={[styles.socialButtonText, {fontSize: dynamicStyles.socialTextSize}]}>Facebook</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.socialButton, dynamicStyles.socialButtonSize]} 
                onPress={() => openLink(webLinks.youtube)}
              >
                <View style={styles.socialButtonInner}>
                  <FontAwesome name="youtube-play" size={dynamicStyles.socialIconSize} color="#FF0000" />
                  <Text style={[styles.socialButtonText, {fontSize: dynamicStyles.socialTextSize}]}>YouTube</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.socialButton, dynamicStyles.socialButtonSize]} 
                onPress={() => openLink(webLinks.linkedin)}
              >
                <View style={styles.socialButtonInner}>
                  <FontAwesome name="linkedin-square" size={dynamicStyles.socialIconSize} color="#0077B5" />
                  <Text style={[styles.socialButtonText, {fontSize: dynamicStyles.socialTextSize}]}>LinkedIn</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.socialButton, dynamicStyles.socialButtonSize]} 
                onPress={() => openLink(webLinks.twitter)}
              >
                <View style={styles.socialButtonInner}>
                  <MaterialCommunityIcons name="twitter" size={dynamicStyles.socialIconSize} color="#1DA1F2" />
                  <Text style={[styles.socialButtonText, {fontSize: dynamicStyles.socialTextSize}]}>X</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, {backgroundColor: PRIMARY_COLOR}]} 
              onPress={() => setAboutModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>About Us</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, {backgroundColor: PRIMARY_COLOR}]} 
              onPress={() => setContactModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>Contact Us</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.privacyContainer}>
            <TouchableOpacity 
              style={styles.privacyButton} 
              onPress={() => setPrivacyModalVisible(true)}
            >
              <Text style={styles.privacyButtonText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Copyright © {currentYear} Krushi Radio. Powered by Television and Farmers Broadcasting Service. Department of Agriculture. Sri Lanka. All rights reserved.
            </Text>
          </View>
        </ScrollView>
        
        <AboutModal />
        <ContactModal />
        <PrivacyPolicyModal />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundPattern: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    padding: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 200,
    height: 70,
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  sloganContainer: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  slogan: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  playerCard: {
    margin: 15,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  playerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#30c054',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  playButtonText: {
    color: '#30c054',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  liveText: {
    color: '#f44336',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 25,
    fontWeight: '500',
  },
  errorText: {
    color: '#e53935',
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  volumeContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
  },
  volumeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontWeight: '500',
  },
  volumeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  volumeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  volumeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  volumeBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 15,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: '#30c054',
    borderRadius: 4,
  },
  linksCard: {
    margin: 15,
    marginTop: 5,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  linkButton: {
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#2e7d32',
    fontWeight: '500',
  },
  socialCard: {
    margin: 15,
    marginTop: 5,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  socialButton: {
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    color: '#2e7d32',
    fontWeight: '500',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 15,
    marginTop: 5,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '48%',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  footer: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
    marginHorizontal: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalScrollView: {
    width: '100%',
    marginBottom: 15,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  linkText: {
    color: '#2e7d32',
    textDecorationLine: 'underline',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  splashLogo: {
    width: 300,
    height: 150,
    marginBottom: 40,
  },
  splashTextContainer: {
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  splashSlogan: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#B0B0B0',
    marginBottom: 10,
  },
  splashTagline: {
    fontSize: 16,
    textAlign: 'center',
    color: '#B0B0B0',
    fontStyle: 'italic',
    marginBottom: 50,
  },
  developerCredit: {
    fontSize: 12,
    textAlign: 'center',
    color: '#B0B0B0',
    marginTop: 100,
  },
  privacyContainer: {
    margin: 15,
    alignItems: 'center',
  },
  privacyButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  privacyButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
