import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Instrumental, Playlist } from '../../store/appStore';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    instrumentals,
    isSubscribed,
    initializeApp,
    playTrack,
    favorites,
    playlists,
    fetchPlaylists,
    createPlaylist,
    deletePlaylist,
    getPlaylistTracks,
    downloadedTracks,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists' | 'downloads'>('favorites');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Instrumental[]>([]);

  useEffect(() => {
    const load = async () => {
      if (instrumentals.length === 0) {
        await initializeApp();
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleTrackPress = async (track: Instrumental) => {
    if (track.is_premium && !isSubscribed) {
      router.push('/subscription');
    } else {
      await playTrack(track);
      router.push('/player');
    }
  };

  const handlePlaylistPress = async (playlist: Playlist) => {
    const tracks = await getPlaylistTracks(playlist.id);
    setPlaylistTracks(tracks);
    setSelectedPlaylist(playlist);
  };

  const handleCreatePlaylist = async () => {
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const handleDeletePlaylist = (playlistId: string, name: string) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePlaylist(playlistId)
        }
      ]
    );
  };

  const handlePlayAll = async (tracks: Instrumental[]) => {
    if (tracks.length > 0) {
      await playTrack(tracks[0], tracks);
      router.push('/player');
    }
  };

  const downloadedTracksList = instrumentals.filter(i => downloadedTracks[i.id]);

  const renderTrackRow = (track: Instrumental) => (
    <TouchableOpacity
      key={track.id}
      style={styles.trackRow}
      onPress={() => handleTrackPress(track)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[track.thumbnail_color, '#2D1F3D']}
        style={styles.trackThumbnail}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="musical-note" size={18} color="rgba(255, 255, 255, 0.5)" />
      </LinearGradient>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.trackMeta}>{track.mood} • {track.duration_formatted}</Text>
      </View>
      <Ionicons name="play" size={20} color="#4A3463" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4A3463" />
      </View>
    );
  }

  // Playlist Detail View
  if (selectedPlaylist) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.playlistHeader}>
          <TouchableOpacity onPress={() => setSelectedPlaylist(null)}>
            <Ionicons name="arrow-back" size={24} color="#2D2D2D" />
          </TouchableOpacity>
          <Text style={styles.playlistTitle}>{selectedPlaylist.name}</Text>
          <TouchableOpacity onPress={() => handleDeletePlaylist(selectedPlaylist.id, selectedPlaylist.name)}>
            <Ionicons name="trash-outline" size={22} color="#E91E63" />
          </TouchableOpacity>
        </View>

        <View style={styles.playlistStats}>
          <Text style={styles.playlistCount}>{playlistTracks.length} tracks</Text>
          {playlistTracks.length > 0 && (
            <TouchableOpacity 
              style={styles.playAllButton}
              onPress={() => handlePlayAll(playlistTracks)}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.tracksList}>
          {playlistTracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={48} color="#8B8B8B" />
              <Text style={styles.emptyText}>No tracks in this playlist</Text>
              <Text style={styles.emptySubtext}>Add tracks from the player screen</Text>
            </View>
          ) : (
            playlistTracks.map(renderTrackRow)
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        {!isSubscribed && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
          >
            <Ionicons name="diamond" size={14} color="#C9A961" />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons 
            name="heart" 
            size={18} 
            color={activeTab === 'favorites' ? '#4A3463' : '#8B8B8B'} 
          />
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
            Favorites
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
          onPress={() => setActiveTab('playlists')}
        >
          <Ionicons 
            name="list" 
            size={18} 
            color={activeTab === 'playlists' ? '#4A3463' : '#8B8B8B'} 
          />
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>
            Playlists
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'downloads' && styles.activeTab]}
          onPress={() => setActiveTab('downloads')}
        >
          <Ionicons 
            name="cloud-done" 
            size={18} 
            color={activeTab === 'downloads' ? '#4A3463' : '#8B8B8B'} 
          />
          <Text style={[styles.tabText, activeTab === 'downloads' && styles.activeTabText]}>
            Downloads
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <View>
            {favorites.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={48} color="#8B8B8B" />
                <Text style={styles.emptyText}>No favorites yet</Text>
                <Text style={styles.emptySubtext}>Tap the heart icon on a track to add it here</Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionCount}>{favorites.length} tracks</Text>
                  <TouchableOpacity 
                    style={styles.playAllSmall}
                    onPress={() => handlePlayAll(favorites)}
                  >
                    <Ionicons name="play" size={14} color="#4A3463" />
                    <Text style={styles.playAllSmallText}>Play All</Text>
                  </TouchableOpacity>
                </View>
                {favorites.map(renderTrackRow)}
              </>
            )}
          </View>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <View>
            <TouchableOpacity 
              style={styles.createPlaylistButton}
              onPress={() => setShowCreateModal(true)}
            >
              <View style={styles.createPlaylistIcon}>
                <Ionicons name="add" size={24} color="#4A3463" />
              </View>
              <Text style={styles.createPlaylistText}>Create New Playlist</Text>
            </TouchableOpacity>

            {playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="albums-outline" size={48} color="#8B8B8B" />
                <Text style={styles.emptyText}>No playlists yet</Text>
                <Text style={styles.emptySubtext}>Create your first playlist above</Text>
              </View>
            ) : (
              playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistCard}
                  onPress={() => handlePlaylistPress(playlist)}
                >
                  <LinearGradient
                    colors={[playlist.cover_color, '#2D1F3D']}
                    style={styles.playlistCover}
                  >
                    <Ionicons name="musical-notes" size={24} color="rgba(255, 255, 255, 0.5)" />
                  </LinearGradient>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistTrackCount}>{playlist.track_ids.length} tracks</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B8B8B" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Downloads Tab */}
        {activeTab === 'downloads' && (
          <View>
            {downloadedTracksList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cloud-download-outline" size={48} color="#8B8B8B" />
                <Text style={styles.emptyText}>No downloads yet</Text>
                <Text style={styles.emptySubtext}>Download tracks for offline listening</Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionCount}>{downloadedTracksList.length} tracks downloaded</Text>
                </View>
                {downloadedTracksList.map(renderTrackRow)}
              </>
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancel}
                onPress={() => {
                  setNewPlaylistName('');
                  setShowCreateModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCreate}
                onPress={handleCreatePlaylist}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  upgradeText: {
    color: '#C9A961',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(74, 52, 99, 0.1)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B8B8B',
  },
  activeTabText: {
    color: '#4A3463',
  },
  content: {
    flex: 1,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 14,
    color: '#8B8B8B',
  },
  playAllSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playAllSmallText: {
    fontSize: 14,
    color: '#4A3463',
    fontWeight: '500',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  trackThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  trackMeta: {
    fontSize: 12,
    color: '#8B8B8B',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D2D2D',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8B8B',
    marginTop: 8,
    textAlign: 'center',
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  createPlaylistIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 52, 99, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPlaylistText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4A3463',
    marginLeft: 12,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  playlistCover: {
    width: 52,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  playlistTrackCount: {
    fontSize: 13,
    color: '#8B8B8B',
    marginTop: 2,
  },
  // Playlist Detail
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  playlistStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  playlistCount: {
    fontSize: 14,
    color: '#8B8B8B',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A3463',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  playAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tracksList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 99, 0.2)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  modalCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#8B8B8B',
    fontSize: 15,
    fontWeight: '500',
  },
  modalCreate: {
    backgroundColor: '#4A3463',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCreateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});
