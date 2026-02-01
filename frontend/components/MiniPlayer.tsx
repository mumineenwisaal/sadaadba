import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';

const { width } = Dimensions.get('window');

export default function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playbackPosition,
    playbackDuration,
    pauseTrack,
    resumeTrack,
    playNext,
    stopPlayback,
  } = useAppStore();

  // Don't show mini player on player screen or if no track
  if (!currentTrack || pathname === '/player') {
    return null;
  }

  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseTrack();
    } else {
      await resumeTrack();
    }
  };

  const handleOpenPlayer = () => {
    router.push('/player');
  };

  const handleClose = async () => {
    await stopPlayback();
  };

  // Calculate bottom position based on tab bar height
  const tabBarHeight = 60 + insets.bottom;

  return (
    <View style={[styles.container, { bottom: tabBarHeight }]}>
      {/* Progress bar at top */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.mainContent}
          onPress={handleOpenPlayer}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[currentTrack.thumbnail_color, '#2D1F3D']}
            style={styles.thumbnail}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="musical-note" size={16} color="rgba(255, 255, 255, 0.6)" />
          </LinearGradient>
          
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.trackMood} numberOfLines={1}>
              {currentTrack.mood} • {currentTrack.duration_formatted}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handlePlayPause}
          >
            {isBuffering ? (
              <Ionicons name="hourglass" size={22} color="#4A3463" />
            ) : (
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={22} 
                color="#4A3463" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={playNext}
          >
            <Ionicons name="play-skip-forward" size={18} color="#4A3463" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={20} color="#8B8B8B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#4A3463',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(74, 52, 99, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#C9A961',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 8,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  trackMood: {
    fontSize: 12,
    color: '#8B8B8B',
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
});
