import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAppStore } from '../store/appStore';
import { COLORS, APP_NAME } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Animated waveform component
const AnimatedWaveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const bars = Array(16).fill(0);
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
            { transform: [{ scaleY: animations[index] }] },
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
    height: 50,
    marginVertical: 16,
  },
  bar: {
    width: 4,
    height: 50,
    backgroundColor: 'rgba(201, 169, 97, 0.6)',
    marginHorizontal: 3,
    borderRadius: 2,
  },
});

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    playbackPosition,
    isBuffering,
    isPreviewMode,
    previewStartTime,
    previewEndTime,
    stopPreview,
    pauseTrack,
    resumeTrack,
  } = useAppStore();

  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Handle preview ending
  useEffect(() => {
    if (!isPreviewMode && currentTrack) {
      // Preview ended, show subscribe prompt
      setShowSubscribeModal(true);
    }
  }, [isPreviewMode]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseTrack();
    } else {
      await resumeTrack();
    }
  };

  const handleClose = async () => {
    await stopPreview();
    router.back();
  };

  const handleSubscribe = async () => {
    await stopPreview();
    router.replace('/subscription');
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No track selected</Text>
      </View>
    );
  }

  const previewDuration = previewEndTime - previewStartTime;
  const previewProgress = playbackPosition - previewStartTime;
  const progressPercent = previewDuration > 0 ? Math.max(0, Math.min(previewProgress / previewDuration, 1)) : 0;

  return (
    <LinearGradient
      colors={[currentTrack.thumbnail_color, '#1A1225', '#0D0A12']}
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Preview Badge */}
      <View style={styles.previewBadgeContainer}>
        <View style={styles.previewBadge}>
          <Ionicons name="play-circle" size={14} color="#FF9800" />
          <Text style={styles.previewBadgeText}>PREVIEW</Text>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Preview</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Album Art */}
      <View style={styles.artContainer}>
        <LinearGradient
          colors={[currentTrack.thumbnail_color, '#2D1F3D']}
          style={styles.artGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isBuffering ? (
            <ActivityIndicator size="large" color="#C9A961" />
          ) : (
            <>
              <Ionicons name="musical-notes" size={60} color="rgba(255, 255, 255, 0.2)" />
              <View style={styles.premiumIcon}>
                <Ionicons name="diamond" size={20} color="#C9A961" />
              </View>
            </>
          )}
        </LinearGradient>
        
        <AnimatedWaveform isPlaying={isPlaying && !isBuffering} />
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{currentTrack.title}</Text>
        <View style={styles.trackMeta}>
          <View style={styles.moodTag}>
            <Text style={styles.moodTagText}>{currentTrack.mood}</Text>
          </View>
          <View style={styles.premiumTag}>
            <Ionicons name="diamond" size={12} color="#C9A961" />
            <Text style={styles.premiumTagText}>Premium</Text>
          </View>
        </View>
      </View>

      {/* Preview Progress Info */}
      <View style={styles.previewInfo}>
        <Text style={styles.previewInfoText}>
          Playing preview: {formatTime(previewStartTime)} - {formatTime(previewEndTime)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent * 100}%` }]} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(Math.max(0, previewProgress))}</Text>
          <Text style={styles.timeText}>{formatTime(previewDuration)}</Text>
        </View>
      </View>

      {/* Play/Pause Control */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
          disabled={isBuffering}
        >
          {isBuffering ? (
            <ActivityIndicator size="large" color="#4A3463" />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#4A3463" />
          )}
        </TouchableOpacity>
      </View>

      {/* Subscribe CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
          <Ionicons name="diamond" size={20} color="#FFFFFF" />
          <Text style={styles.subscribeButtonText}>Unlock Full Track</Text>
        </TouchableOpacity>
        <Text style={styles.ctaSubtext}>Subscribe to access all premium instrumentals</Text>
      </View>

      {/* Preview Ended Modal */}
      <Modal
        visible={showSubscribeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSubscribeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="diamond" size={40} color="#C9A961" />
            </View>
            <Text style={styles.modalTitle}>Preview Ended</Text>
            <Text style={styles.modalDescription}>
              Subscribe to Sadaa Instrumentals to enjoy the full track and unlock all premium content.
            </Text>
            <TouchableOpacity style={styles.modalSubscribeButton} onPress={handleSubscribe}>
              <Text style={styles.modalSubscribeText}>Subscribe Now - ₹53/month</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => {
                setShowSubscribeModal(false);
                handleClose();
              }}
            >
              <Text style={styles.modalCloseText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sadaa Instrumentals</Text>
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
  previewBadgeContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  previewBadgeText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: {
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
    marginTop: 10,
  },
  artGradient: {
    width: width - 140,
    height: width - 140,
    maxWidth: 220,
    maxHeight: 220,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    position: 'relative',
  },
  premiumIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 12,
  },
  trackTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  moodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
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
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  premiumTagText: {
    color: '#C9A961',
    fontSize: 13,
    fontWeight: '500',
  },
  previewInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  previewInfoText: {
    color: 'rgba(255, 152, 0, 0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 3,
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
    alignItems: 'center',
    marginTop: 24,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C9A961',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  ctaContainer: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 40,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A3463',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 10,
    elevation: 4,
    shadowColor: '#4A3463',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ctaSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.secondaryBg,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalSubscribeButton: {
    backgroundColor: COLORS.accentBlue,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSubscribeText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingVertical: 10,
  },
  modalCloseText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
