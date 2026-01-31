import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
  TextInput,
  Alert,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    height: 60,
    marginVertical: 20,
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
    playbackPosition,
    playbackDuration,
    isBuffering,
    pauseTrack,
    resumeTrack,
    seekTo,
    playNext,
    playPrevious,
    isLoopEnabled,
    isShuffleEnabled,
    toggleLoop,
    toggleShuffle,
    downloadTrack,
    deleteDownload,
    isTrackDownloaded,
    downloads,
    toggleFavorite,
    isFavorite,
    playlists,
    addToPlaylist,
    createPlaylist,
  } = useAppStore();

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseTrack();
    } else {
      await resumeTrack();
    }
  };

  const handleSeek = async (value: number) => {
    await seekTo(value);
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    
    if (isTrackDownloaded(currentTrack.id)) {
      await deleteDownload(currentTrack.id);
    } else {
      await downloadTrack(currentTrack);
    }
  };

  const handleFavorite = () => {
    if (currentTrack) {
      toggleFavorite(currentTrack.id);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (currentTrack) {
      const success = await addToPlaylist(playlistId, currentTrack.id);
      if (success) {
        Alert.alert('Added', 'Track added to playlist');
      }
    }
    setShowPlaylistModal(false);
  };

  const handleCreatePlaylist = async () => {
    if (newPlaylistName.trim()) {
      const playlist = await createPlaylist(newPlaylistName.trim());
      if (playlist && currentTrack) {
        await addToPlaylist(playlist.id, currentTrack.id);
        Alert.alert('Created', 'Playlist created and track added');
      }
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
      setShowPlaylistModal(false);
    }
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

  const downloaded = isTrackDownloaded(currentTrack.id);
  const isFav = isFavorite(currentTrack.id);
  const isDownloading = downloads[currentTrack.id]?.isDownloading;
  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <LinearGradient
      colors={[currentTrack.thumbnail_color, '#1A1225', '#0D0A12']}
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowPlaylistModal(true)}>
          <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
            <Ionicons name="musical-notes" size={80} color="rgba(255, 255, 255, 0.2)" />
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
          {downloaded && (
            <View style={styles.downloadedTag}>
              <Ionicons name="cloud-done" size={12} color="#4CAF50" />
              <Text style={styles.downloadedTagText}>Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <TouchableOpacity 
          style={styles.progressBar}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            const barWidth = width - 80;
            const newPosition = (x / barWidth) * playbackDuration;
            handleSeek(Math.max(0, Math.min(newPosition, playbackDuration)));
          }}
        >
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
        </TouchableOpacity>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
        </View>
      </View>

      {/* Secondary Controls */}
      <View style={styles.secondaryControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleShuffle}>
          <Ionicons 
            name="shuffle" 
            size={22} 
            color={isShuffleEnabled ? "#C9A961" : "rgba(255, 255, 255, 0.5)"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={handleFavorite}>
          <Ionicons 
            name={isFav ? "heart" : "heart-outline"} 
            size={24} 
            color={isFav ? "#E91E63" : "rgba(255, 255, 255, 0.5)"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={handleDownload} disabled={isDownloading}>
          {isDownloading ? (
            <ActivityIndicator size="small" color="#C9A961" />
          ) : (
            <Ionicons 
              name={downloaded ? "cloud-done" : "cloud-download-outline"} 
              size={22} 
              color={downloaded ? "#4CAF50" : "rgba(255, 255, 255, 0.5)"} 
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleLoop}>
          <Ionicons 
            name="repeat" 
            size={22} 
            color={isLoopEnabled ? "#C9A961" : "rgba(255, 255, 255, 0.5)"} 
          />
        </TouchableOpacity>
      </View>

      {/* Main Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.skipButton} onPress={playPrevious}>
          <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

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

        <TouchableOpacity style={styles.skipButton} onPress={playNext}>
          <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sadaa Instrumentals</Text>
      </View>

      {/* Add to Playlist Modal */}
      <Modal
        visible={showPlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Playlist</Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                <Ionicons name="close" size={24} color="#2D2D2D" />
              </TouchableOpacity>
            </View>

            {showCreatePlaylist ? (
              <View style={styles.createPlaylistForm}>
                <TextInput
                  style={styles.playlistInput}
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                />
                <View style={styles.createPlaylistButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setShowCreatePlaylist(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={handleCreatePlaylist}
                  >
                    <Text style={styles.createButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.createPlaylistOption}
                  onPress={() => setShowCreatePlaylist(true)}
                >
                  <Ionicons name="add-circle" size={24} color="#4A3463" />
                  <Text style={styles.createPlaylistText}>Create New Playlist</Text>
                </TouchableOpacity>

                <FlatList
                  data={playlists}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.playlistOption}
                      onPress={() => handleAddToPlaylist(item.id)}
                    >
                      <View style={[styles.playlistIcon, { backgroundColor: item.cover_color }]}>
                        <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
                      </View>
                      <View style={styles.playlistInfo}>
                        <Text style={styles.playlistName}>{item.name}</Text>
                        <Text style={styles.playlistCount}>{item.track_ids.length} tracks</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No playlists yet</Text>
                  }
                />
              </>
            )}
          </View>
        </View>
      </Modal>
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
    width: width - 120,
    height: width - 120,
    maxWidth: 260,
    maxHeight: 260,
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
    marginTop: 16,
  },
  trackTitle: {
    fontSize: 22,
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
  downloadedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  downloadedTagText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginTop: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C9A961',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C9A961',
    marginLeft: -7,
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
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 28,
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 28,
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  createPlaylistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 52, 99, 0.1)',
  },
  createPlaylistText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A3463',
    marginLeft: 12,
  },
  playlistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  playlistIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    marginLeft: 12,
    flex: 1,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  playlistCount: {
    fontSize: 12,
    color: '#8B8B8B',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8B8B8B',
    paddingVertical: 20,
  },
  createPlaylistForm: {
    paddingVertical: 10,
  },
  playlistInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 99, 0.2)',
  },
  createPlaylistButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#8B8B8B',
    fontSize: 15,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#4A3463',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
