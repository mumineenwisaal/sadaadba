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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../constants/theme';

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
    isPreviewMode,
    pauseTrack,
    resumeTrack,
    playNext,
    stopPlayback,
    stopPreview,
  } = useAppStore();

  // Don't show mini player on player screen, preview screen, or if no track
  if (!currentTrack || pathname === '/player' || pathname === '/preview') {
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
    if (isPreviewMode) {
      router.push('/preview');
    } else {
      router.push('/player');
    }
  };

  const handleClose = async () => {
    if (isPreviewMode) {
      await stopPreview();
    } else {
      await stopPlayback();
    }
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
            colors={[currentTrack.thumbnail_color, COLORS.cardBg]}
            style={styles.thumbnail}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="musical-note" size={16} color="rgba(255, 255, 255, 0.6)" />
            {isPreviewMode && (
              <View style={styles.previewBadge}>
                <Ionicons name="play-circle" size={8} color={COLORS.textPrimary} />
              </View>
            )}
          </LinearGradient>
          
          <View style={styles.trackInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              {isPreviewMode && (
                <View style={styles.previewTag}>
                  <Text style={styles.previewTagText}>PREVIEW</Text>
                </View>
              )}
            </View>
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
              <Ionicons name="hourglass" size={22} color={COLORS.accentBlue} />
            ) : (
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={22} 
                color={COLORS.accentBlue} 
              />
            )}
          </TouchableOpacity>
          
          {!isPreviewMode && (
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={playNext}
            >
              <Ionicons name="play-skip-forward" size={18} color={COLORS.accentBlue} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
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
    backgroundColor: COLORS.secondaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accentBlue,
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
    position: 'relative',
  },
  previewBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.preview,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  previewTag: {
    backgroundColor: COLORS.preview,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewTagText: {
    color: COLORS.textPrimary,
    fontSize: 8,
    fontWeight: '700',
  },
  trackMood: {
    fontSize: 12,
    color: COLORS.textMuted,
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
