import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAppStore } from '../store/appStore';

const { width, height } = Dimensions.get('window');

// Animated waveform component
const AnimatedWaveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const bars = Array(20).fill(0);
  const animations = useRef(bars.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (isPlaying) {
      bars.forEach((_, index) => {
        const animation = Animated.loop(
          Animated.sequence([
            Animated.timing(animations[index], {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 300,
              useNativeDriver: true,
            }),
            Animated.timing(animations[index], {
              toValue: 0.3,
              duration: 300 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ])
        );
        animation.start();
      });
    } else {
      animations.forEach((anim) => {
        anim.stopAnimation();
        anim.setValue(0.3);
      });
    }
  }, [isPlaying]);

  return (
    <View style={waveStyles.container}>
      {bars.map((_, index) => (
        <Animated.View
          key={index}
          style={[
            waveStyles.bar,
            {
              transform: [{ scaleY: animations[index] }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginVertical: 24,
  },
  bar: {
    width: 4,
    height: 60,
    backgroundColor: 'rgba(201, 169, 97, 0.6)',
    marginHorizontal: 3,
    borderRadius: 2,
  },
});

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    playbackPosition,
    setPlaybackPosition,
    playbackDuration,
    setPlaybackDuration,
    instrumentals,
    setCurrentTrack,
    isSubscribed,
  } = useAppStore();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Setup audio mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      // Cleanup sound on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (currentTrack) {
      // Set duration from track data (since we don't have real audio)
      setPlaybackDuration(currentTrack.duration * 1000);
    }
  }, [currentTrack]);

  // Simulate playback progress (since we have no real audio files)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setPlaybackPosition(prev => {
          const newPos = prev + 1000;
          if (newPos >= currentTrack.duration * 1000) {
            handleNext();
            return 0;
          }
          return newPos;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  const handlePlayPause = async () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!currentTrack) return;
    
    const accessibleTracks = isSubscribed 
      ? instrumentals 
      : instrumentals.filter(i => !i.is_premium);
    
    const currentIndex = accessibleTracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % accessibleTracks.length;
    setCurrentTrack(accessibleTracks[nextIndex]);
    setPlaybackPosition(0);
  };

  const handlePrevious = () => {
    if (!currentTrack) return;
    
    const accessibleTracks = isSubscribed 
      ? instrumentals 
      : instrumentals.filter(i => !i.is_premium);
    
    const currentIndex = accessibleTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? accessibleTracks.length - 1 : currentIndex - 1;
    setCurrentTrack(accessibleTracks[prevIndex]);
    setPlaybackPosition(0);
  };

  const handleSeek = (value: number) => {
    setPlaybackPosition(value);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No track selected</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[currentTrack.thumbnail_color, '#1A1225', '#0D0A12']}
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Album Art / Waveform */}
      <View style={styles.artContainer}>
        <LinearGradient
          colors={[currentTrack.thumbnail_color, '#2D1F3D']}
          style={styles.artGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="musical-notes" size={80} color="rgba(255, 255, 255, 0.2)" />
        </LinearGradient>
        
        <AnimatedWaveform isPlaying={isPlaying} />
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{currentTrack.title}</Text>
        <View style={styles.trackMeta}>
          <View style={styles.moodTag}>
            <Text style={styles.moodTagText}>{currentTrack.mood}</Text>
          </View>
          {currentTrack.is_premium && (
            <View style={styles.premiumTag}>
              <Ionicons name="diamond" size={12} color="#C9A961" />
              <Text style={styles.premiumTagText}>Premium</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handlePrevious}
        >
          <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={36}
            color="#4A3463"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleNext}
        >
          <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Additional Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sadaa Instrumentals</Text>
        <Text style={styles.footerSubtext}>Dawoodi Bohra Madeh Music</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  artContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
  },
  artGradient: {
    width: width - 100,
    height: width - 100,
    maxWidth: 280,
    maxHeight: 280,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 24,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  moodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moodTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumTagText: {
    color: '#C9A961',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginTop: 32,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C9A961',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 32,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C9A961',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 12,
    marginTop: 4,
  },
});
