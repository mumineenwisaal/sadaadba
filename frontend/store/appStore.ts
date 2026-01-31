import { create } from 'zustand';
import axios from 'axios';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as audioService from '../services/audioService';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export interface Instrumental {
  id: string;
  title: string;
  mood: string;
  duration: number;
  duration_formatted: string;
  is_premium: boolean;
  is_featured: boolean;
  audio_url: string | null;
  thumbnail_color: string;
  file_size: number;
  play_count: number;
  created_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string;
  track_ids: string[];
  cover_color: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  device_id: string;
  is_subscribed: boolean;
  favorites: string[];
  created_at: string;
}

export interface DownloadStatus {
  trackId: string;
  progress: number;
  isDownloading: boolean;
  isDownloaded: boolean;
}

interface AppState {
  // User state
  user: User | null;
  isSubscribed: boolean;
  
  // Data
  instrumentals: Instrumental[];
  featuredInstrumentals: Instrumental[];
  favorites: Instrumental[];
  playlists: Playlist[];
  moods: string[];
  
  // UI state
  isLoading: boolean;
  selectedMood: string;
  searchQuery: string;
  
  // Player state
  currentTrack: Instrumental | null;
  isPlaying: boolean;
  playbackPosition: number;
  playbackDuration: number;
  sound: Audio.Sound | null;
  isBuffering: boolean;
  
  // Player controls
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
  queue: Instrumental[];
  queueIndex: number;
  
  // Download state
  downloads: Record<string, DownloadStatus>;
  downloadedTracks: Record<string, audioService.DownloadedTrack>;
  
  // Actions
  initializeApp: () => Promise<void>;
  fetchInstrumentals: (mood?: string, search?: string) => Promise<void>;
  fetchFeaturedInstrumentals: () => Promise<void>;
  setSelectedMood: (mood: string) => void;
  setSearchQuery: (query: string) => void;
  
  // Player actions
  playTrack: (track: Instrumental, queue?: Instrumental[]) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  stopPlayback: () => Promise<void>;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  setQueue: (tracks: Instrumental[]) => void;
  setCurrentTrack: (track: Instrumental | null) => void;
  
  // Favorites actions
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (trackId: string) => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  
  // Playlist actions
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addToPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  getPlaylistTracks: (playlistId: string) => Promise<Instrumental[]>;
  
  // Subscription actions
  subscribe: (plan?: string) => Promise<boolean>;
  restorePurchase: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
  
  // Download actions
  downloadTrack: (track: Instrumental) => Promise<boolean>;
  deleteDownload: (trackId: string) => Promise<boolean>;
  loadDownloadedTracks: () => Promise<void>;
  isTrackDownloaded: (trackId: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isSubscribed: false,
  instrumentals: [],
  featuredInstrumentals: [],
  favorites: [],
  playlists: [],
  moods: ['All', 'Calm', 'Drums', 'Spiritual', 'Soft', 'Energetic'],
  isLoading: false,
  selectedMood: 'All',
  searchQuery: '',
  currentTrack: null,
  isPlaying: false,
  playbackPosition: 0,
  playbackDuration: 0,
  sound: null,
  isBuffering: false,
  isLoopEnabled: false,
  isShuffleEnabled: false,
  queue: [],
  queueIndex: 0,
  downloads: {},
  downloadedTracks: {},

  initializeApp: async () => {
    set({ isLoading: true });
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const deviceId = Constants.installationId || Device.osBuildId || `device_${Date.now()}`;
      
      const userResponse = await axios.post(`${API_BASE}/api/users`, { device_id: deviceId });
      const user = userResponse.data;
      
      const subResponse = await axios.get(`${API_BASE}/api/subscription/status/${user.id}`);
      
      set({ user, isSubscribed: subResponse.data.is_subscribed });
      
      // Load saved player settings
      const savedLoop = await AsyncStorage.getItem('isLoopEnabled');
      const savedShuffle = await AsyncStorage.getItem('isShuffleEnabled');
      set({
        isLoopEnabled: savedLoop === 'true',
        isShuffleEnabled: savedShuffle === 'true'
      });
      
      try {
        await axios.post(`${API_BASE}/api/seed`);
      } catch (e) {}
      
      await get().loadDownloadedTracks();
      await get().fetchFeaturedInstrumentals();
      await get().fetchInstrumentals();
      await get().fetchFavorites();
      await get().fetchPlaylists();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInstrumentals: async (mood?: string, search?: string) => {
    try {
      const params: any = {};
      if (mood && mood !== 'All') params.mood = mood;
      if (search) params.search = search;
      
      const response = await axios.get(`${API_BASE}/api/instrumentals`, { params });
      set({ instrumentals: response.data });
    } catch (error) {
      console.error('Failed to fetch instrumentals:', error);
    }
  },

  fetchFeaturedInstrumentals: async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/instrumentals/featured`);
      set({ featuredInstrumentals: response.data });
    } catch (error) {
      console.error('Failed to fetch featured:', error);
    }
  },

  setSelectedMood: (mood: string) => {
    set({ selectedMood: mood });
    get().fetchInstrumentals(mood, get().searchQuery);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().fetchInstrumentals(get().selectedMood, query);
  },

  playTrack: async (track: Instrumental, queue?: Instrumental[]) => {
    const { sound: currentSound, downloadedTracks, instrumentals, isSubscribed } = get();
    
    try {
      if (currentSound) {
        await currentSound.unloadAsync();
      }
      
      set({ isBuffering: true, currentTrack: track, isPlaying: false });
      
      // Set queue
      const playQueue = queue || (isSubscribed ? instrumentals : instrumentals.filter(i => !i.is_premium));
      const queueIndex = playQueue.findIndex(t => t.id === track.id);
      set({ queue: playQueue, queueIndex: queueIndex >= 0 ? queueIndex : 0 });
      
      // Get audio URL (local if downloaded, otherwise remote)
      let audioUri = track.audio_url;
      const downloaded = downloadedTracks[track.id];
      if (downloaded) {
        audioUri = downloaded.localUri;
      }
      
      if (!audioUri) {
        set({ isBuffering: false });
        return;
      }
      
      // Track play count
      axios.post(`${API_BASE}/api/instrumentals/${track.id}/play`).catch(() => {});
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        (status) => {
          if (status.isLoaded) {
            set({ 
              playbackPosition: status.positionMillis,
              playbackDuration: status.durationMillis || track.duration * 1000,
              isPlaying: status.isPlaying,
              isBuffering: status.isBuffering,
            });
            
            if (status.didJustFinish) {
              const { isLoopEnabled } = get();
              if (isLoopEnabled) {
                get().seekTo(0).then(() => get().resumeTrack());
              } else {
                get().playNext();
              }
            }
          }
        }
      );
      
      set({ sound, isPlaying: true, isBuffering: false });
      
    } catch (error) {
      console.error('Error playing track:', error);
      set({ isBuffering: false, isPlaying: false });
    }
  },

  pauseTrack: async () => {
    const { sound } = get();
    if (sound) {
      await sound.pauseAsync();
      set({ isPlaying: false });
    }
  },

  resumeTrack: async () => {
    const { sound } = get();
    if (sound) {
      await sound.playAsync();
      set({ isPlaying: true });
    }
  },

  seekTo: async (position: number) => {
    const { sound } = get();
    if (sound) {
      await sound.setPositionAsync(position);
      set({ playbackPosition: position });
    }
  },

  playNext: async () => {
    const { queue, queueIndex, isShuffleEnabled, isLoopEnabled, currentTrack } = get();
    if (queue.length === 0) return;
    
    let nextIndex: number;
    
    if (isShuffleEnabled) {
      // Random track (not current)
      let randomIndex = Math.floor(Math.random() * queue.length);
      while (randomIndex === queueIndex && queue.length > 1) {
        randomIndex = Math.floor(Math.random() * queue.length);
      }
      nextIndex = randomIndex;
    } else {
      nextIndex = (queueIndex + 1) % queue.length;
    }
    
    set({ queueIndex: nextIndex });
    if (queue[nextIndex]) {
      await get().playTrack(queue[nextIndex], queue);
    }
  },

  playPrevious: async () => {
    const { queue, queueIndex, playbackPosition, isShuffleEnabled } = get();
    if (queue.length === 0) return;
    
    // If more than 3 seconds in, restart current track
    if (playbackPosition > 3000) {
      await get().seekTo(0);
      return;
    }
    
    let prevIndex: number;
    if (isShuffleEnabled) {
      let randomIndex = Math.floor(Math.random() * queue.length);
      while (randomIndex === queueIndex && queue.length > 1) {
        randomIndex = Math.floor(Math.random() * queue.length);
      }
      prevIndex = randomIndex;
    } else {
      prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    }
    
    set({ queueIndex: prevIndex });
    if (queue[prevIndex]) {
      await get().playTrack(queue[prevIndex], queue);
    }
  },

  toggleLoop: () => {
    const newValue = !get().isLoopEnabled;
    set({ isLoopEnabled: newValue });
    AsyncStorage.setItem('isLoopEnabled', String(newValue));
  },

  toggleShuffle: () => {
    const newValue = !get().isShuffleEnabled;
    set({ isShuffleEnabled: newValue });
    AsyncStorage.setItem('isShuffleEnabled', String(newValue));
  },

  setQueue: (tracks: Instrumental[]) => {
    set({ queue: tracks });
  },

  // Favorites
  fetchFavorites: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/favorites/${user.id}`);
      set({ favorites: response.data });
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  },

  toggleFavorite: async (trackId: string) => {
    const { user, favorites } = get();
    if (!user) return;
    
    const isFav = favorites.some(f => f.id === trackId);
    
    try {
      if (isFav) {
        await axios.delete(`${API_BASE}/api/favorites/${user.id}/${trackId}`);
        set({ favorites: favorites.filter(f => f.id !== trackId) });
      } else {
        await axios.post(`${API_BASE}/api/favorites/${user.id}/${trackId}`);
        const track = get().instrumentals.find(i => i.id === trackId);
        if (track) {
          set({ favorites: [...favorites, track] });
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  },

  isFavorite: (trackId: string) => {
    return get().favorites.some(f => f.id === trackId);
  },

  // Playlists
  fetchPlaylists: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/playlists/${user.id}`);
      set({ playlists: response.data });
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  },

  createPlaylist: async (name: string, description?: string) => {
    const { user } = get();
    if (!user) return null;
    
    try {
      const response = await axios.post(`${API_BASE}/api/playlists`, {
        user_id: user.id,
        name,
        description: description || '',
      });
      const newPlaylist = response.data;
      set({ playlists: [...get().playlists, newPlaylist] });
      return newPlaylist;
    } catch (error) {
      console.error('Failed to create playlist:', error);
      return null;
    }
  },

  deletePlaylist: async (playlistId: string) => {
    try {
      await axios.delete(`${API_BASE}/api/playlists/${playlistId}`);
      set({ playlists: get().playlists.filter(p => p.id !== playlistId) });
      return true;
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      return false;
    }
  },

  addToPlaylist: async (playlistId: string, trackId: string) => {
    try {
      await axios.post(`${API_BASE}/api/playlists/${playlistId}/tracks/${trackId}`);
      // Update local playlist
      set({
        playlists: get().playlists.map(p => 
          p.id === playlistId 
            ? { ...p, track_ids: [...p.track_ids, trackId] }
            : p
        )
      });
      return true;
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      return false;
    }
  },

  removeFromPlaylist: async (playlistId: string, trackId: string) => {
    try {
      await axios.delete(`${API_BASE}/api/playlists/${playlistId}/tracks/${trackId}`);
      set({
        playlists: get().playlists.map(p => 
          p.id === playlistId 
            ? { ...p, track_ids: p.track_ids.filter(id => id !== trackId) }
            : p
        )
      });
      return true;
    } catch (error) {
      console.error('Failed to remove from playlist:', error);
      return false;
    }
  },

  getPlaylistTracks: async (playlistId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/playlists/detail/${playlistId}`);
      return response.data.tracks;
    } catch (error) {
      console.error('Failed to get playlist tracks:', error);
      return [];
    }
  },

  // Subscription
  subscribe: async (plan: string = 'monthly') => {
    const { user } = get();
    if (!user) return false;
    
    try {
      await axios.post(`${API_BASE}/api/subscription/subscribe`, {
        user_id: user.id,
        plan
      });
      set({ isSubscribed: true });
      return true;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return false;
    }
  },

  restorePurchase: async () => {
    const { user } = get();
    if (!user) return false;
    
    try {
      const response = await axios.post(`${API_BASE}/api/subscription/restore/${user.id}`);
      if (response.data.restored) {
        set({ isSubscribed: true });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  checkSubscription: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/subscription/status/${user.id}`);
      set({ isSubscribed: response.data.is_subscribed });
    } catch (error) {}
  },

  // Downloads
  loadDownloadedTracks: async () => {
    try {
      const downloaded = await audioService.getDownloadedTracks();
      set({ downloadedTracks: downloaded });
    } catch (error) {}
  },

  downloadTrack: async (track: Instrumental) => {
    if (!track.audio_url) return false;
    
    set((state) => ({
      downloads: {
        ...state.downloads,
        [track.id]: { trackId: track.id, progress: 0, isDownloading: true, isDownloaded: false }
      }
    }));
    
    try {
      const result = await audioService.downloadAudio(
        track.id,
        track.audio_url,
        (progress) => {
          set((state) => ({
            downloads: {
              ...state.downloads,
              [track.id]: { ...state.downloads[track.id], progress }
            }
          }));
        }
      );
      
      if (result) {
        set((state) => ({
          downloads: {
            ...state.downloads,
            [track.id]: { trackId: track.id, progress: 1, isDownloading: false, isDownloaded: true }
          },
          downloadedTracks: {
            ...state.downloadedTracks,
            [track.id]: result
          }
        }));
        return true;
      }
      return false;
    } catch (error) {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [track.id]: { trackId: track.id, progress: 0, isDownloading: false, isDownloaded: false }
        }
      }));
      return false;
    }
  },

  deleteDownload: async (trackId: string) => {
    try {
      const success = await audioService.deleteDownloadedAudio(trackId);
      if (success) {
        set((state) => {
          const newDownloads = { ...state.downloads };
          const newDownloadedTracks = { ...state.downloadedTracks };
          delete newDownloads[trackId];
          delete newDownloadedTracks[trackId];
          return { downloads: newDownloads, downloadedTracks: newDownloadedTracks };
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  isTrackDownloaded: (trackId: string) => {
    return !!get().downloadedTracks[trackId];
  },
}));
