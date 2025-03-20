import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Image, ScrollView, Linking, SafeAreaView, Modal, ImageBackground, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { useState, useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import { Ionicons, FontAwesome, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(1.0);
  const [networkState, setNetworkState] = useState('unknown');
  const [networkQuality, setNetworkQuality] = useState(null);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const currentYear = new Date().getFullYear();
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  
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

  // Initialize app and prepare resources
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any resources needed
        await new Promise(resolve => setTimeout(resolve, 2000)); // Show splash for at least 2 seconds
        
        // Set up audio mode for background playing immediately
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        // Hide splash screen after a short delay to ensure smooth transition
        setTimeout(async () => {
          await SplashScreen.hideAsync();
          setSplashVisible(false);
          // Start playing automatically after splash screen hides
          playSound();
        }, 500);
      }
    }

    prepare();
  }, []);

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

  // Auto-play when app starts
  useEffect(() => {
    if (appIsReady && !splashVisible) {
      playSound();
    }
  }, [appIsReady, splashVisible]);

  // Check network status periodically
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        setNetworkState(networkState.type);
        
        // Simulate network quality check (would be replaced with actual speed test in production)
        if (networkState.isConnected) {
          const qualityMap = {
            'unknown': 'unknown',
            'none': 'none',
            'wifi': 'excellent',
            'cellular': 'good',
            'bluetooth': 'fair',
            'ethernet': 'excellent',
            'wimax': 'good',
            'vpn': 'fair',
            'other': 'unknown'
          };
          
          setNetworkQuality(qualityMap[networkState.type] || 'unknown');
          
          // If we were previously disconnected and now connected, attempt reconnect
          if (error && error.includes('network') && isPlaying) {
            playSound();
          }
        } else {
          setNetworkQuality('none');
          if (isPlaying) {
            setError('Network connection lost. Waiting to reconnect...');
            if (sound) {
              await sound.pauseAsync();
            }
          }
        }
      } catch (e) {
        console.error('Error checking network:', e);
        setNetworkQuality('unknown');
      }
    };
    
    // Check network immediately
    checkNetwork();
    
    // Then check every 5 seconds
    const interval = setInterval(checkNetwork, 5000);
    
    return () => clearInterval(interval);
  }, [networkState, error, isPlaying]);
  
  // Auto-reconnect feature
  useEffect(() => {
    let reconnectTimer;
    
    if (error && error.includes('network') && networkQuality !== 'none') {
      // Exponential backoff for reconnect attempts
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      
      reconnectTimer = setTimeout(async () => {
        console.log(`Attempting to reconnect (attempt ${reconnectAttempts + 1})...`);
        setReconnectAttempts(reconnectAttempts + 1);
        await playSound();
      }, delay);
    } else if (!error) {
      // Reset reconnect attempts when successfully connected
      setReconnectAttempts(0);
    }
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [error, networkQuality, reconnectAttempts]);
  
  useEffect(() => {
    // Unload the sound when component unmounts
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);
  
  async function playSound() {
    try {
      setIsBuffering(true);
      
      // Only show network error when there's no connection
      if (networkQuality === 'none') {
        setError('Network connection unavailable. Please check your connection and try again.');
        setIsBuffering(false);
        return;
      } else {
        setError(null);
      }
      
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
        setError('Network error. Attempting to reconnect...');
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
  
  // Network quality indicator component
  const NetworkIndicator = () => {
    let color;
    let label;
    
    switch(networkQuality) {
      case 'excellent':
        color = '#4CAF50';
        label = 'Excellent';
        break;
      case 'good':
        color = '#8BC34A';
        label = 'Good';
        break;
      case 'fair':
        color = '#FFC107';
        label = 'Fair';
        break;
      case 'poor':
        color = '#FF9800';
        label = 'Poor';
        break;
      case 'none':
        color = '#F44336';
        label = 'No Connection';
        break;
      default:
        color = '#9E9E9E';
        label = 'Unknown';
    }
    
    return (
      <View style={styles.networkIndicator}>
        <View style={[styles.networkDot, {backgroundColor: color}]} />
        <Text style={styles.networkText}>{label}</Text>
      </View>
    );
  };
  
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
              රූපවාහිනිය වැනි ඉලෙක්ට්‍රොනික මාධ්‍ය සහ වෙනත් බොහෝ තොරතුරු තාක්‍ෂණය වේගයෙන් ජනතාව අතරට පැමිණියද ගුවන්විදුලිය තවමත් සංවේදී මාධ්‍යයක් ලෙස භාවිතයේ පවතී. එබැවින් කෘෂිකාර්මික සන්නිවේදන ක්‍රියාවලිය සඳහා ගුවන්විදුලිය කාර්යක්ෂමව භාවිතා කළ හැකිය.
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
  
  // Return splash screen if app is not ready
  if (!appIsReady) {
    return <SplashScreenComponent />;
  }

  return (
    <ImageBackground 
      source={require('./assets/background.jpg')} 
      style={styles.backgroundPattern}
      resizeMode="repeat"
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        
        <View style={styles.header}>
          <Image 
            source={require('./assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <ScrollView style={styles.scrollView}>
          <View style={styles.sloganContainer}>
            <Text style={styles.slogan}>ගහකොල අතරේ හුස්ම හොයනා රෙඩියෝ යාත්‍රිකයා</Text>
            <Text style={styles.tagline}>Official Agricultural Media Network in Sri Lanka</Text>
          </View>
          
          <View style={styles.playerCard}>
            <View style={styles.playerContainer}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
              
              <TouchableOpacity 
                style={styles.playButton} 
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
          
          <View style={styles.linksCard}>
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
            
            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={() => openLink(webLinks.facebook)}
              >
                <FontAwesome name="facebook" size={24} color={PRIMARY_COLOR} />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={() => openLink(webLinks.youtube)}
              >
                <FontAwesome name="youtube-play" size={24} color="#FF0000" />
                <Text style={styles.socialButtonText}>YouTube</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={() => openLink(webLinks.linkedin)}
              >
                <FontAwesome name="linkedin-square" size={24} color="#0077B5" />
                <Text style={styles.socialButtonText}>LinkedIn</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={() => openLink(webLinks.twitter)}
              >
                <MaterialCommunityIcons name="twitter" size={24} color="#1DA1F2" />
                <Text style={styles.socialButtonText}>X</Text>
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
          
          <View style={styles.footer}>
            <NetworkIndicator />
            <Text style={styles.footerText}>
              Copyright © {currentYear} Krushi Radio. Powered by Television and Farmers Broadcasting Service. Department of Agriculture. Sri Lanka. All rights reserved.
            </Text>
          </View>
        </ScrollView>
        
        <AboutModal />
        <ContactModal />
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
    width: 150,
    height: 70,
    alignSelf: 'center',
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  networkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  networkText: {
    fontSize: 12,
    color: '#666',
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
    marginBottom: 10,
    textAlign: 'center',
  },
  socialButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  socialButton: {
    backgroundColor: '#f1f8e9',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  socialButtonText: {
    color: '#2e7d32',
    fontWeight: '500',
    marginLeft: 8
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
    width: 200,
    height: 100,
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
});
