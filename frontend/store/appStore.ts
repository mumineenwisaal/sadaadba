import { create } from 'zustand';
import axios from 'axios';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as audioService from '../services/audioService';
import { checkIsOnline, subscribeToNetworkChanges } from '../services/networkService';

// TrackPlayer will be dynamically imported on native platforms only
let TrackPlayer: any = null;
let setupPlayer: any = null;
let formatTrack: any = null;

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

// Storage keys for offline data
const STORAGE_KEYS = {
  USER: 'sadaa_user',
  INSTRUMENTALS: 'sadaa_instrumentals',
  FAVORITES: 'sadaa_favorites',
  PLAYLISTS: 'sadaa_playlists',
  SUBSCRIPTION: 'sadaa_subscription',
  DOWNLOADED_TRACKS: 'sadaa_downloaded_tracks',
};

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

// Extended downloaded track with metadata for offline access
export interface DownloadedTrackWithMetadata extends audioService.DownloadedTrack {
  trackMetadata?: Instrumental;
}

interface AppState {
  // Network state
  isOnline: boolean;
  
  // User state
  user: User | null;
  isSubscribed: boolean;
  
  // Data
  instrumentals: Instrumental[];
  featuredInstrumentals: Instrumental[];
  favorites: Instrumental[];
  favoriteIds: string[];
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
  isBuffering: boolean;
  isPlayerReady: boolean;
  playbackError: string | null;
  
  // Player controls
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
  queue: Instrumental[];
  queueIndex: number;
  
  // Download state
  downloads: Record<string, DownloadStatus>;
  downloadedTracks: Record<string, DownloadedTrackWithMetadata>;
  
  // Actions
  setIsOnline: (online: boolean) => void;
  initializeApp: () => Promise<void>;
  syncDataWithServer: () => Promise<void>;
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
  
  // Favorites actions (offline-first)
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (trackId: string) => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  saveFavoritesLocally: () => Promise<void>;
  loadFavoritesLocally: () => Promise<void>;
  
  // Playlist actions (offline-first)
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addToPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  getPlaylistTracks: (playlistId: string) => Promise<Instrumental[]>;
  savePlaylistsLocally: () => Promise<void>;
  loadPlaylistsLocally: () => Promise<void>;
  
  // Subscription actions
  subscribe: (plan?: string) => Promise<boolean>;
  restorePurchase: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
  
  // Download actions
  downloadTrack: (track: Instrumental) => Promise<boolean>;
  deleteDownload: (trackId: string) => Promise<boolean>;
  loadDownloadedTracks: () => Promise<void>;
  isTrackDownloaded: (trackId: string) => boolean;
  canPlayTrack: (trackId: string) => { canPlay: boolean; reason?: string };
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  isOnline: true,
  user: null,
  isSubscribed: false,
  instrumentals: [],
  featuredInstrumentals: [],
  favorites: [],
  favoriteIds: [],
  playlists: [],
  moods: ['All', 'Calm', 'Drums', 'Spiritual', 'Soft', 'Energetic'],
  isLoading: false,
  selectedMood: 'All',
  searchQuery: '',
  currentTrack: null,
  isPlaying: false,
  playbackPosition: 0,
  playbackDuration: 0,
  isBuffering: false,
  isPlayerReady: false,
  playbackError: null,
  isLoopEnabled: false,
  isShuffleEnabled: false,
  queue: [],
  queueIndex: 0,
  downloads: {},
  downloadedTracks: {},

  setIsOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  initializeApp: async () => {
    set({ isLoading: true });
    try {
      // Initialize TrackPlayer first (only on native platforms)
      if (Platform.OS !== 'web') {
        const playerReady = await setupPlayer();
        set({ isPlayerReady: playerReady });
        
        // Set up event listeners for TrackPlayer
        if (playerReady) {
          TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
            const isPlaying = event.state === State.Playing;
            const isBuffering = event.state === State.Buffering || event.state === State.Loading;
            set({ isPlaying, isBuffering });
          });
          
          TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
            if (event.track) {
              const { instrumentals } = get();
              const track = instrumentals.find(t => t.id === event.track?.id);
              if (track) {
                set({ currentTrack: track });
              }
            }
          });
          
          TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
            console.error('Playback error:', event);
            set({ playbackError: 'Playback error. Please check your connection.', isPlaying: false });
          });
        }
      } else {
        // For web, we'll use a fallback
        set({ isPlayerReady: true });
      }
      // Setup audio
      // Load player settings
      const savedLoop = await AsyncStorage.getItem('isLoopEnabled');
      const savedShuffle = await AsyncStorage.getItem('isShuffleEnabled');
      set({
        isLoopEnabled: savedLoop === 'true',
        isShuffleEnabled: savedShuffle === 'true'
      });
      
      // Apply saved loop setting to TrackPlayer
      if (Platform.OS !== 'web' && savedLoop === 'true') {
        try {
          await TrackPlayer.setRepeatMode(RepeatMode.Track);
        } catch (e) {}
      }

      // Load downloaded tracks first (always available offline)
      await get().loadDownloadedTracks();
      
      // Load local data first (offline-first)
      await get().loadFavoritesLocally();
      await get().loadPlaylistsLocally();
      
      // Load cached instrumentals
      const cachedInstrumentals = await AsyncStorage.getItem(STORAGE_KEYS.INSTRUMENTALS);
      if (cachedInstrumentals) {
        const parsed = JSON.parse(cachedInstrumentals);
        set({ instrumentals: parsed, featuredInstrumentals: parsed.filter((i: Instrumental) => i.is_featured) });
      }

      // Check network status
      const online = await checkIsOnline();
      set({ isOnline: online });

      // Subscribe to network changes
      subscribeToNetworkChanges((isOnline) => {
        set({ isOnline });
        if (isOnline) {
          // Sync when coming back online
          get().syncDataWithServer();
        }
      });

      if (online) {
        // Online: fetch from server
        const deviceId = Constants.installationId || Device.osBuildId || `device_${Date.now()}`;
        
        const userResponse = await axios.post(`${API_BASE}/api/users`, { device_id: deviceId });
        const user = userResponse.data;
        
        // Save user locally
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        
        const subResponse = await axios.get(`${API_BASE}/api/subscription/status/${user.id}`);
        set({ user, isSubscribed: subResponse.data.is_subscribed });
        
        try {
          await axios.post(`${API_BASE}/api/seed`);
        } catch (e) {}
        
        await get().fetchFeaturedInstrumentals();
        await get().fetchInstrumentals();
        await get().fetchFavorites();
        await get().fetchPlaylists();
      } else {
        // Offline: load cached user
        const cachedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (cachedUser) {
          set({ user: JSON.parse(cachedUser) });
        }
      }
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  syncDataWithServer: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      await get().fetchInstrumentals();
      await get().fetchFavorites();
      await get().fetchPlaylists();
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  },

  fetchInstrumentals: async (mood?: string, search?: string) => {
    const { isOnline } = get();
    
    if (!isOnline) {
      // Use cached data when offline
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.INSTRUMENTALS);
      if (cached) {
        let instrumentals = JSON.parse(cached);
        if (mood && mood !== 'All') {
          instrumentals = instrumentals.filter((i: Instrumental) => i.mood === mood);
        }
        if (search) {
          instrumentals = instrumentals.filter((i: Instrumental) => 
            i.title.toLowerCase().includes(search.toLowerCase())
          );
        }
        set({ instrumentals });
      }
      return;
    }
    
    try {
      const params: any = {};
      if (mood && mood !== 'All') params.mood = mood;
      if (search) params.search = search;
      
      const response = await axios.get(`${API_BASE}/api/instrumentals`, { params });
      set({ instrumentals: response.data });
      
      // Cache instrumentals locally
      if (!mood && !search) {
        await AsyncStorage.setItem(STORAGE_KEYS.INSTRUMENTALS, JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to fetch instrumentals:', error);
    }
  },

  fetchFeaturedInstrumentals: async () => {
    const { isOnline } = get();
    
    if (!isOnline) {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.INSTRUMENTALS);
      if (cached) {
        const all = JSON.parse(cached);
        set({ featuredInstrumentals: all.filter((i: Instrumental) => i.is_featured) });
      }
      return;
    }
    
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
    const { downloadedTracks, instrumentals, isSubscribed, isOnline, isPlayerReady } = get();
    
    // Check if track can be played
    const isDownloaded = !!downloadedTracks[track.id];
    
    if (!isDownloaded && !isOnline) {
      // Can't play - not downloaded and offline
      set({ playbackError: 'Internet connection required to play this audio.' });
      return;
    }
    
    try {
      set({ isBuffering: true, currentTrack: track, isPlaying: false, playbackError: null });
      
      const playQueue = queue || (isSubscribed ? instrumentals : instrumentals.filter(i => !i.is_premium));
      const queueIndex = playQueue.findIndex(t => t.id === track.id);
      set({ queue: playQueue, queueIndex: queueIndex >= 0 ? queueIndex : 0 });
      
      // Track play count (only when online)
      if (isOnline) {
        axios.post(`${API_BASE}/api/instrumentals/${track.id}/play`).catch(() => {});
      }
      
      // Use TrackPlayer on native platforms
      if (Platform.OS !== 'web' && isPlayerReady) {
        // Reset the queue
        await TrackPlayer.reset();
        
        // Format tracks for the queue
        const formattedQueue = playQueue.map((t) => {
          const downloaded = downloadedTracks[t.id];
          const localUri = downloaded?.localUri;
          return formatTrack(t, localUri);
        });
        
        // Add all tracks to the queue
        await TrackPlayer.add(formattedQueue);
        
        // Skip to the requested track
        if (queueIndex > 0) {
          await TrackPlayer.skip(queueIndex);
        }
        
        // Start playback
        await TrackPlayer.play();
        
        set({ isPlaying: true, isBuffering: false });
      } else {
        // Web fallback using Audio API
        const { Audio } = await import('expo-av');
        
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
        
        // Unload previous sound if exists
        const prevState = get() as any;
        if (prevState._webSound) {
          await prevState._webSound.unloadAsync();
        }
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 500 },
          (status: any) => {
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
        
        // Store web sound reference
        (set as any)({ _webSound: sound });
        set({ isPlaying: true, isBuffering: false });
      }
      
    } catch (error) {
      console.error('Error playing track:', error);
      set({ isBuffering: false, isPlaying: false, playbackError: 'Failed to play audio.' });
    }
  },

  pauseTrack: async () => {
    if (Platform.OS !== 'web') {
      try {
        await TrackPlayer.pause();
      } catch (e) {}
    } else {
      // Web fallback
      const state = get() as any;
      if (state._webSound) {
        await state._webSound.pauseAsync();
      }
    }
    set({ isPlaying: false });
  },

  resumeTrack: async () => {
    if (Platform.OS !== 'web') {
      try {
        await TrackPlayer.play();
      } catch (e) {}
    } else {
      // Web fallback
      const state = get() as any;
      if (state._webSound) {
        await state._webSound.playAsync();
      }
    }
    set({ isPlaying: true });
  },

  seekTo: async (position: number) => {
    if (Platform.OS !== 'web') {
      try {
        // TrackPlayer uses seconds
        await TrackPlayer.seekTo(position / 1000);
      } catch (e) {}
    } else {
      // Web fallback
      const state = get() as any;
      if (state._webSound) {
        await state._webSound.setPositionAsync(position);
      }
    }
    set({ playbackPosition: position });
  },

  playNext: async () => {
    const { queue, queueIndex, isShuffleEnabled, downloadedTracks, isOnline } = get();
    if (queue.length === 0) return;
    
    let nextIndex: number;
    let attempts = 0;
    const maxAttempts = queue.length;
    
    do {
      if (isShuffleEnabled) {
        let randomIndex = Math.floor(Math.random() * queue.length);
        while (randomIndex === queueIndex && queue.length > 1) {
          randomIndex = Math.floor(Math.random() * queue.length);
        }
        nextIndex = randomIndex;
      } else {
        nextIndex = (queueIndex + 1 + attempts) % queue.length;
      }
      
      const nextTrack = queue[nextIndex];
      const isDownloaded = !!downloadedTracks[nextTrack?.id];
      
      // If offline, only play downloaded tracks
      if (!isOnline && !isDownloaded) {
        attempts++;
        continue;
      }
      
      break;
    } while (attempts < maxAttempts);
    
    set({ queueIndex: nextIndex });
    if (queue[nextIndex]) {
      await get().playTrack(queue[nextIndex], queue);
    }
  },

  playPrevious: async () => {
    const { queue, queueIndex, playbackPosition, isShuffleEnabled, downloadedTracks, isOnline } = get();
    if (queue.length === 0) return;
    
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

  stopPlayback: async () => {
    if (Platform.OS !== 'web') {
      try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      } catch (e) {
        console.log('Error stopping playback:', e);
      }
    } else {
      // Web fallback
      const state = get() as any;
      if (state._webSound) {
        try {
          await state._webSound.stopAsync();
          await state._webSound.unloadAsync();
        } catch (e) {
          console.log('Error stopping web playback:', e);
        }
      }
    }
    set({ 
      currentTrack: null, 
      isPlaying: false, 
      playbackPosition: 0,
      playbackDuration: 0,
      queue: [],
      queueIndex: 0,
      playbackError: null
    });
  },

  toggleLoop: () => {
    const newValue = !get().isLoopEnabled;
    set({ isLoopEnabled: newValue });
    AsyncStorage.setItem('isLoopEnabled', String(newValue));
    
    // Apply to TrackPlayer
    if (Platform.OS !== 'web') {
      TrackPlayer.setRepeatMode(newValue ? RepeatMode.Track : RepeatMode.Off).catch(() => {});
    }
  },

  toggleShuffle: () => {
    const newValue = !get().isShuffleEnabled;
    set({ isShuffleEnabled: newValue });
    AsyncStorage.setItem('isShuffleEnabled', String(newValue));
  },

  setQueue: (tracks: Instrumental[]) => {
    set({ queue: tracks });
  },

  setCurrentTrack: (track: Instrumental | null) => {
    set({ currentTrack: track });
  },

  // Favorites (offline-first)
  saveFavoritesLocally: async () => {
    const { favoriteIds, favorites } = get();
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify({ ids: favoriteIds, tracks: favorites }));
  },

  loadFavoritesLocally: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (data) {
        const parsed = JSON.parse(data);
        set({ favoriteIds: parsed.ids || [], favorites: parsed.tracks || [] });
      }
    } catch (error) {
      console.error('Failed to load favorites locally:', error);
    }
  },

  fetchFavorites: async () => {
    const { user, isOnline } = get();
    
    if (!isOnline || !user) {
      // Use locally stored favorites when offline
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE}/api/favorites/${user.id}`);
      const tracks = response.data;
      const ids = tracks.map((t: Instrumental) => t.id);
      set({ favorites: tracks, favoriteIds: ids });
      
      // Save to local storage
      await get().saveFavoritesLocally();
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  },

  toggleFavorite: async (trackId: string) => {
    const { user, favorites, favoriteIds, instrumentals, isOnline } = get();
    
    const isFav = favoriteIds.includes(trackId);
    
    // Update local state immediately (optimistic update)
    if (isFav) {
      set({ 
        favoriteIds: favoriteIds.filter(id => id !== trackId),
        favorites: favorites.filter(f => f.id !== trackId) 
      });
    } else {
      const track = instrumentals.find(i => i.id === trackId);
      if (track) {
        set({ 
          favoriteIds: [...favoriteIds, trackId],
          favorites: [...favorites, track] 
        });
      }
    }
    
    // Save locally immediately
    await get().saveFavoritesLocally();
    
    // Sync with server if online
    if (isOnline && user) {
      try {
        if (isFav) {
          await axios.delete(`${API_BASE}/api/favorites/${user.id}/${trackId}`);
        } else {
          await axios.post(`${API_BASE}/api/favorites/${user.id}/${trackId}`);
        }
      } catch (error) {
        console.error('Failed to sync favorite with server:', error);
      }
    }
  },

  isFavorite: (trackId: string) => {
    return get().favoriteIds.includes(trackId);
  },

  // Playlists (offline-first)
  savePlaylistsLocally: async () => {
    const { playlists } = get();
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  },

  loadPlaylistsLocally: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (data) {
        set({ playlists: JSON.parse(data) });
      }
    } catch (error) {
      console.error('Failed to load playlists locally:', error);
    }
  },

  fetchPlaylists: async () => {
    const { user, isOnline } = get();
    
    if (!isOnline || !user) {
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE}/api/playlists/${user.id}`);
      set({ playlists: response.data });
      await get().savePlaylistsLocally();
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  },

  createPlaylist: async (name: string, description?: string) => {
    const { user, playlists, isOnline } = get();
    
    // Create local playlist
    const newPlaylist: Playlist = {
      id: `local_${Date.now()}`,
      user_id: user?.id || 'local',
      name,
      description: description || '',
      track_ids: [],
      cover_color: '#4A3463',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    set({ playlists: [...playlists, newPlaylist] });
    await get().savePlaylistsLocally();
    
    // Sync with server if online
    if (isOnline && user) {
      try {
        const response = await axios.post(`${API_BASE}/api/playlists`, {
          user_id: user.id,
          name,
          description: description || '',
        });
        
        // Replace local playlist with server version
        const serverPlaylist = response.data;
        set({ 
          playlists: get().playlists.map(p => 
            p.id === newPlaylist.id ? serverPlaylist : p
          )
        });
        await get().savePlaylistsLocally();
        return serverPlaylist;
      } catch (error) {
        console.error('Failed to sync playlist with server:', error);
      }
    }
    
    return newPlaylist;
  },

  deletePlaylist: async (playlistId: string) => {
    const { playlists, isOnline } = get();
    
    // Remove locally immediately
    set({ playlists: playlists.filter(p => p.id !== playlistId) });
    await get().savePlaylistsLocally();
    
    // Sync with server if online
    if (isOnline && !playlistId.startsWith('local_')) {
      try {
        await axios.delete(`${API_BASE}/api/playlists/${playlistId}`);
      } catch (error) {
        console.error('Failed to delete playlist from server:', error);
      }
    }
    
    return true;
  },

  addToPlaylist: async (playlistId: string, trackId: string) => {
    const { playlists, isOnline } = get();
    
    // Update locally immediately
    set({
      playlists: playlists.map(p => 
        p.id === playlistId 
          ? { ...p, track_ids: [...new Set([...p.track_ids, trackId])] }
          : p
      )
    });
    await get().savePlaylistsLocally();
    
    // Sync with server if online
    if (isOnline && !playlistId.startsWith('local_')) {
      try {
        await axios.post(`${API_BASE}/api/playlists/${playlistId}/tracks/${trackId}`);
      } catch (error) {
        console.error('Failed to add to playlist on server:', error);
      }
    }
    
    return true;
  },

  removeFromPlaylist: async (playlistId: string, trackId: string) => {
    const { playlists, isOnline } = get();
    
    // Update locally immediately
    set({
      playlists: playlists.map(p => 
        p.id === playlistId 
          ? { ...p, track_ids: p.track_ids.filter(id => id !== trackId) }
          : p
      )
    });
    await get().savePlaylistsLocally();
    
    // Sync with server if online
    if (isOnline && !playlistId.startsWith('local_')) {
      try {
        await axios.delete(`${API_BASE}/api/playlists/${playlistId}/tracks/${trackId}`);
      } catch (error) {
        console.error('Failed to remove from playlist on server:', error);
      }
    }
    
    return true;
  },

  getPlaylistTracks: async (playlistId: string) => {
    const { playlists, instrumentals, isOnline } = get();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) return [];
    
    // Get tracks from local instrumentals cache
    const tracks = playlist.track_ids
      .map(id => instrumentals.find(i => i.id === id))
      .filter((t): t is Instrumental => t !== undefined);
    
    // If online and not a local playlist, try to fetch from server
    if (isOnline && !playlistId.startsWith('local_')) {
      try {
        const response = await axios.get(`${API_BASE}/api/playlists/detail/${playlistId}`);
        return response.data.tracks;
      } catch (error) {
        console.error('Failed to get playlist tracks from server:', error);
      }
    }
    
    return tracks;
  },

  // Subscription
  subscribe: async (plan: string = 'monthly') => {
    const { user, isOnline } = get();
    if (!user || !isOnline) return false;
    
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
    const { user, isOnline } = get();
    if (!user || !isOnline) return false;
    
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
    const { user, isOnline } = get();
    if (!user || !isOnline) return;
    
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
      // Also save to local storage for reference
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(downloaded));
    } catch (error) {
      console.error('Failed to load downloaded tracks:', error);
      // Try to load from async storage backup
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_TRACKS);
        if (cached) {
          set({ downloadedTracks: JSON.parse(cached) });
        }
      } catch (e) {}
    }
  },

  downloadTrack: async (track: Instrumental) => {
    const { isOnline } = get();
    
    if (!track.audio_url) return false;
    if (!isOnline) return false;
    
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
        // Add track metadata to the download result for offline access
        const downloadWithMetadata = {
          ...result,
          trackMetadata: track
        };
        
        const newDownloadedTracks = {
          ...get().downloadedTracks,
          [track.id]: downloadWithMetadata
        };
        
        set((state) => ({
          downloads: {
            ...state.downloads,
            [track.id]: { trackId: track.id, progress: 1, isDownloading: false, isDownloaded: true }
          },
          downloadedTracks: newDownloadedTracks
        }));
        
        // Save to local storage for offline persistence (includes track metadata)
        await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(newDownloadedTracks));
        
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
        const newDownloads = { ...get().downloads };
        const newDownloadedTracks = { ...get().downloadedTracks };
        delete newDownloads[trackId];
        delete newDownloadedTracks[trackId];
        
        set({ downloads: newDownloads, downloadedTracks: newDownloadedTracks });
        
        // Update local storage
        await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(newDownloadedTracks));
        
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

  canPlayTrack: (trackId: string) => {
    const { isOnline, downloadedTracks } = get();
    const isDownloaded = !!downloadedTracks[trackId];
    
    if (isDownloaded) {
      return { canPlay: true };
    }
    
    if (!isOnline) {
      return { canPlay: false, reason: 'Internet connection required to play this audio.' };
    }
    
    return { canPlay: true };
  },
}));
