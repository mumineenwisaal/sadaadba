import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAppStore } from '../store/appStore';

const { width } = Dimensions.get('window');

export default function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playbackPosition,
    playbackDuration,
    pauseTrack,
    resumeTrack,
    playNext,
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

  return (
    <View style={styles.container}>
      {/* Progress bar at top */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
      
      <TouchableOpacity 
        style={styles.content}
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
        
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handlePlayPause}
          >
            {isBuffering ? (
              <Ionicons name="hourglass" size={24} color="#4A3463" />
            ) : (
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={24} 
                color="#4A3463" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={playNext}
          >
            <Ionicons name="play-skip-forward" size={20} color="#4A3463" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // Above tab bar
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 52, 99, 0.1)',
    shadowColor: '#4A3463',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'rgba(74, 52, 99, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#C9A961',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
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
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
