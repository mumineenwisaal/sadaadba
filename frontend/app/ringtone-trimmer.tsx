import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAppStore } from '../store/appStore';
import {
  formatTime,
  formatDuration,
  validateTrimSettings,
  prepareAudioForRingtone,
  setAsRingtone,
  canSetRingtone,
} from '../services/ringtoneService';

const { width } = Dimensions.get('window');
const WAVEFORM_WIDTH = width - 80;
const HANDLE_WIDTH = 20;
const MAX_RINGTONE_DURATION = 30000; // 30 seconds

export default function RingtoneTrimmerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { instrumentals, downloadedTracks, isOnline } = useAppStore();

  // Get track from params
  const trackId = params.trackId as string;
  const track = instrumentals.find((t) => t.id === trackId);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(MAX_RINGTONE_DURATION);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Refs for pan responders
  const startHandleX = useRef(new Animated.Value(0)).current;
  const endHandleX = useRef(new Animated.Value(WAVEFORM_WIDTH - HANDLE_WIDTH)).current;

  // Calculate positions
  const timeToPosition = useCallback((time: number) => {
    if (duration === 0) return 0;
    return (time / duration) * (WAVEFORM_WIDTH - HANDLE_WIDTH);
  }, [duration]);

  const positionToTime = useCallback((position: number) => {
    return (position / (WAVEFORM_WIDTH - HANDLE_WIDTH)) * duration;
  }, [duration]);

  // Initialize audio
  useEffect(() => {
    let mounted = true;
    
    // Wait for track to be available (params might not be ready immediately)
    if (!trackId) {
      return;
    }
    
    if (!track) {
      // Track not found in the list yet, wait for app to initialize
      return;
    }
    
    const loadAudio = async () => {
      try {
        setIsLoading(true);

        // Get audio URL (local if downloaded, otherwise remote)
        let audioUri = track.audio_url;
        const downloaded = downloadedTracks[track.id];
        if (downloaded) {
          audioUri = downloaded.localUri;
        }

        if (!audioUri) {
          if (mounted) {
            setIsLoading(false);
            Alert.alert('Error', 'Audio not available');
          }
          return;
        }

        // Check online status for streaming
        if (!downloaded && !isOnline) {
          if (mounted) {
            setIsLoading(false);
            Alert.alert('Offline', 'Please download this track first to set as ringtone.');
          }
          return;
        }

        // Load audio
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );

        if (mounted) {
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            const initialEnd = Math.min(status.durationMillis || MAX_RINGTONE_DURATION, MAX_RINGTONE_DURATION);
            setEndTime(initialEnd);
          }

          setSound(newSound);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading audio:', error);
        if (mounted) {
          setIsLoading(false);
          Alert.alert('Error', 'Failed to load audio');
        }
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(loadAudio, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [trackId, track?.id, track?.audio_url]);

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [track?.id]);

  // Update handle positions when duration changes
  useEffect(() => {
    if (duration > 0) {
      startHandleX.setValue(timeToPosition(startTime));
      endHandleX.setValue(timeToPosition(endTime));
    }
  }, [duration]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setCurrentPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);

      // Stop at end time
      if (status.positionMillis >= endTime && status.isPlaying) {
        sound?.pauseAsync();
        sound?.setPositionAsync(startTime);
      }
    }
  };

  // Pan responder for start handle
  const startPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.moveX - 40, timeToPosition(endTime) - HANDLE_WIDTH - 10));
        startHandleX.setValue(newX);
        const newTime = positionToTime(newX);
        setStartTime(newTime);
      },
      onPanResponderRelease: () => {
        // Ensure minimum duration
        if (endTime - startTime < 1000) {
          const newStart = Math.max(0, endTime - 1000);
          setStartTime(newStart);
          startHandleX.setValue(timeToPosition(newStart));
        }
      },
    })
  ).current;

  // Pan responder for end handle
  const endPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(
          timeToPosition(startTime) + HANDLE_WIDTH + 10,
          Math.min(gestureState.moveX - 40, WAVEFORM_WIDTH - HANDLE_WIDTH)
        );
        endHandleX.setValue(newX);
        const newTime = Math.min(positionToTime(newX), duration);
        setEndTime(newTime);
      },
      onPanResponderRelease: () => {
        // Ensure max duration
        if (endTime - startTime > MAX_RINGTONE_DURATION) {
          const newEnd = startTime + MAX_RINGTONE_DURATION;
          setEndTime(newEnd);
          endHandleX.setValue(timeToPosition(newEnd));
        }
      },
    })
  ).current;

  // Play preview
  const togglePlayPreview = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.setPositionAsync(startTime);
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing preview:', error);
    }
  };

  // Set as ringtone
  const handleSetRingtone = async () => {
    if (!track) return;

    // Validate trim settings
    const validation = validateTrimSettings({ startTime, endTime }, MAX_RINGTONE_DURATION);
    if (!validation.valid) {
      Alert.alert('Invalid Selection', validation.message);
      return;
    }

    // Check platform
    if (!canSetRingtone()) {
      Alert.alert(
        'iOS Limitation',
        'Apple doesn\'t allow apps to set ringtones directly.\n\n' +
        'To set a custom ringtone on iPhone:\n' +
        '1. Download the audio file\n' +
        '2. Use GarageBand to create a ringtone\n' +
        '3. Set it in Settings > Sounds > Ringtone\n\n' +
        'Would you like to download this audio instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              // Trigger download
              const { downloadTrack } = useAppStore.getState();
              await downloadTrack(track);
              Alert.alert('Downloaded', 'Audio saved to your device.');
            },
          },
        ]
      );
      return;
    }

    try {
      setIsProcessing(true);

      // Stop playback
      if (sound && isPlaying) {
        await sound.pauseAsync();
      }

      // Get audio URL
      let audioUri = track.audio_url;
      const downloaded = downloadedTracks[track.id];
      if (downloaded) {
        audioUri = downloaded.localUri;
      }

      if (!audioUri) {
        Alert.alert('Error', 'Audio not available');
        return;
      }

      // Prepare audio file
      const preparedFile = await prepareAudioForRingtone(
        audioUri,
        track.id,
        track.title,
        { startTime, endTime }
      );

      if (!preparedFile) {
        Alert.alert('Error', 'Failed to prepare audio file');
        return;
      }

      // Set as ringtone
      const result = await setAsRingtone(preparedFile, track.title);

      if (result.success) {
        Alert.alert(
          'Success',
          result.message,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Note', result.message);
      }
    } catch (error) {
      console.error('Error setting ringtone:', error);
      Alert.alert('Error', 'Failed to set ringtone. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render waveform bars
  const renderWaveform = () => {
    const bars = [];
    const barCount = 50;
    for (let i = 0; i < barCount; i++) {
      const height = 20 + Math.random() * 40;
      const isInSelection = 
        (i / barCount) * duration >= startTime && 
        (i / barCount) * duration <= endTime;
      bars.push(
        <View
          key={i}
          style={[
            styles.waveformBar,
            {
              height,
              backgroundColor: isInSelection ? '#C9A961' : 'rgba(201, 169, 97, 0.3)',
            },
          ]}
        />
      );
    }
    return bars;
  };

  // Calculate selected duration
  const selectedDuration = endTime - startTime;
  const isValidDuration = selectedDuration >= 1000 && selectedDuration <= MAX_RINGTONE_DURATION;

  if (!track) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Track not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#4A3463', '#6B4D8A']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set as Ringtone</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {/* Track Info */}
        <View style={styles.trackInfo}>
          <View style={styles.trackIcon}>
            <Ionicons name="musical-note" size={32} color="#C9A961" />
          </View>
          <View style={styles.trackDetails}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.trackMood}>{track.mood}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C9A961" />
            <Text style={styles.loadingText}>Loading audio...</Text>
          </View>
        ) : (
          <>
            {/* Instructions */}
            <View style={styles.instructions}>
              <Ionicons name="information-circle" size={20} color="#8B8B8B" />
              <Text style={styles.instructionText}>
                Drag the handles to select a portion (max 30 seconds)
              </Text>
            </View>

            {/* Waveform with trim handles */}
            <View style={styles.waveformContainer}>
              {/* Waveform */}
              <View style={styles.waveform}>
                {renderWaveform()}
              </View>

              {/* Selection overlay */}
              <Animated.View
                style={[
                  styles.selectionOverlay,
                  {
                    left: startHandleX,
                    width: Animated.subtract(endHandleX, startHandleX),
                  },
                ]}
              />

              {/* Start handle */}
              <Animated.View
                {...startPanResponder.panHandlers}
                style={[
                  styles.handle,
                  styles.startHandle,
                  { transform: [{ translateX: startHandleX }] },
                ]}
              >
                <View style={styles.handleBar} />
              </Animated.View>

              {/* End handle */}
              <Animated.View
                {...endPanResponder.panHandlers}
                style={[
                  styles.handle,
                  styles.endHandle,
                  { transform: [{ translateX: endHandleX }] },
                ]}
              >
                <View style={styles.handleBar} />
              </Animated.View>

              {/* Current position indicator */}
              {isPlaying && (
                <View
                  style={[
                    styles.positionIndicator,
                    { left: timeToPosition(currentPosition) + HANDLE_WIDTH / 2 },
                  ]}
                />
              )}
            </View>

            {/* Time labels */}
            <View style={styles.timeLabels}>
              <Text style={styles.timeLabel}>{formatTime(startTime)}</Text>
              <Text style={[
                styles.durationLabel,
                !isValidDuration && styles.durationLabelError
              ]}>
                Duration: {formatDuration(selectedDuration)}
                {selectedDuration > MAX_RINGTONE_DURATION && ' (too long)'}
              </Text>
              <Text style={styles.timeLabel}>{formatTime(endTime)}</Text>
            </View>

            {/* Preview button */}
            <TouchableOpacity
              style={styles.previewButton}
              onPress={togglePlayPreview}
            >
              <Ionicons
                name={isPlaying ? 'pause-circle' : 'play-circle'}
                size={56}
                color="#C9A961"
              />
              <Text style={styles.previewText}>
                {isPlaying ? 'Pause Preview' : 'Play Preview'}
              </Text>
            </TouchableOpacity>

            {/* Set Ringtone Button */}
            <TouchableOpacity
              style={[
                styles.setButton,
                (!isValidDuration || isProcessing) && styles.setButtonDisabled,
              ]}
              onPress={handleSetRingtone}
              disabled={!isValidDuration || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="notifications" size={24} color="#FFFFFF" />
                  <Text style={styles.setButtonText}>Set as Ringtone</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Platform note */}
            {Platform.OS === 'ios' && (
              <Text style={styles.platformNote}>
                Note: iOS requires GarageBand to set custom ringtones
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(201, 169, 97, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  trackMood: {
    fontSize: 14,
    color: '#8B8B8B',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B8B8B',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 139, 139, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  instructionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#8B8B8B',
  },
  waveformContainer: {
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    borderRadius: 4,
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  startHandle: {
    left: 0,
  },
  endHandle: {
    right: 0,
  },
  handleBar: {
    width: 4,
    height: 60,
    backgroundColor: '#C9A961',
    borderRadius: 2,
  },
  positionIndicator: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#4A3463',
    zIndex: 5,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeLabel: {
    fontSize: 14,
    color: '#8B8B8B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A3463',
  },
  durationLabelError: {
    color: '#E53935',
  },
  previewButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewText: {
    marginTop: 8,
    fontSize: 16,
    color: '#4A3463',
    fontWeight: '500',
  },
  setButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A3463',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  setButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  setButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  platformNote: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: '#8B8B8B',
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#8B8B8B',
  },
});
