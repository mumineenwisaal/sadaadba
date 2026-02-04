import { create } from 'zustand';
import axios from 'axios';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as audioService from '../services/audioService';
import { checkIsOnline, subscribeToNetworkChanges } from '../services/networkService';

const API_BASE = 'https://sada-backend.onrender.com';

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
  // Preview settings for premium tracks (in seconds)
  preview_start: number | null;
  preview_end: number | null;
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
  
  // Preview mode state
  isPreviewMode: boolean;
  previewStartTime: number;
  previewEndTime: number;
  
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
  playPreview: (track: Instrumental) => Promise<void>;
  stopPreview: () => Promise<void>;
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
  moods: ['All'], // Will be populated dynamically from instrumentals
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
  // Preview mode
  isPreviewMode: false,
  previewStartTime: 0,
  previewEndTime: 0,
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
      // Setup audio using expo-av
      set({ isPlayerReady: true });
      
      // Setup audio mode for background playback (expo-av)
      if (Platform.OS !== 'web') {
        try {
          const { Audio, InterruptionModeIOS, InterruptionModeAndroid } = await import('expo-av');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.DuckOthers,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        } catch (err) {
          console.log('Audio mode setup error:', err);
        }
      }
      
      // Load player settings
      const savedLoop = await AsyncStorage.getItem('isLoopEnabled');
      const savedShuffle = await AsyncStorage.getItem('isShuffleEnabled');
      set({
        isLoopEnabled: savedLoop === 'true',
        isShuffleEnabled: savedShuffle === 'true'
      });

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
        
        // Extract unique moods from cached data
        const uniqueMoods = [...new Set(instrumentals.map((i: Instrumental) => i.mood))] as string[];
        const sortedMoods = ['All', ...uniqueMoods.sort()];
        set({ moods: sortedMoods });
        
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
      
      // Cache instrumentals locally and extract moods when fetching all
      if (!mood && !search) {
        await AsyncStorage.setItem(STORAGE_KEYS.INSTRUMENTALS, JSON.stringify(response.data));
        
        // Extract unique moods dynamically from the data
        const uniqueMoods = [...new Set(response.data.map((i: Instrumental) => i.mood))] as string[];
        const sortedMoods = ['All', ...uniqueMoods.sort()];
        set({ moods: sortedMoods });
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
    const { downloadedTracks, instrumentals, isSubscribed, isOnline } = get();
    
    // Check if track can be played
    const isDownloaded = !!downloadedTracks[track.id];
    
    if (!isDownloaded && !isOnline) {
      // Can't play - not downloaded and offline
      set({ playbackError: 'Internet connection required to play this audio.' });
      return;
    }
    
    try {
      set({ isBuffering: true, currentTrack: track, isPlaying: false, playbackError: null, isPreviewMode: false });
      
      const playQueue = queue || (isSubscribed ? instrumentals : instrumentals.filter(i => !i.is_premium));
      const queueIndex = playQueue.findIndex(t => t.id === track.id);
      set({ queue: playQueue, queueIndex: queueIndex >= 0 ? queueIndex : 0 });
      
      // Track play count (only when online)
      if (isOnline) {
        axios.post(`${API_BASE}/api/instrumentals/${track.id}/play`).catch(() => {});
      }
      
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
      
      // Use the new audio player service
      const audioPlayerService = await import('../services/audioPlayerService');
      
      // Initialize audio if needed
      await audioPlayerService.initializeAudio();
      
      // Play with status updates
      await audioPlayerService.playAudio(audioUri, (status) => {
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
      });
      
      set({ isPlaying: true, isBuffering: false });
      
    } catch (error) {
      console.error('Error playing track:', error);
      set({ isBuffering: false, isPlaying: false, playbackError: 'Failed to play audio.' });
    }
  },

  playPreview: async (track: Instrumental) => {
    const { downloadedTracks, isOnline } = get();
    
    // Get preview times from track (in seconds, convert to milliseconds)
    const previewStart = (track.preview_start ?? 0) * 1000;
    const previewEnd = (track.preview_end ?? 30) * 1000;
    
    console.log(`Playing preview: ${previewStart}ms to ${previewEnd}ms`);
    
    // Check if track can be played
    const isDownloaded = !!downloadedTracks[track.id];
    
    if (!isDownloaded && !isOnline) {
      set({ playbackError: 'Internet connection required to preview this audio.' });
      return;
    }
    
    try {
      set({ 
        isBuffering: true, 
        currentTrack: track, 
        isPlaying: false, 
        playbackError: null,
        isPreviewMode: true,
        previewStartTime: previewStart,
        previewEndTime: previewEnd,
      });
      
      // Use expo-av for audio playback
      const { Audio } = await import('expo-av');
      
      // Configure audio mode for background playback
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Get audio URL
      let audioUri = track.audio_url;
      const downloaded = downloadedTracks[track.id];
      if (downloaded) {
        audioUri = downloaded.localUri;
      }
      
      if (!audioUri) {
        set({ isBuffering: false, isPreviewMode: false });
        return;
      }
      
      // Unload previous sound if exists
      const prevState = get() as any;
      if (prevState._webSound) {
        await prevState._webSound.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, progressUpdateIntervalMillis: 200, positionMillis: previewStart },
        (status: any) => {
          if (status.isLoaded) {
            const { isPreviewMode, previewEndTime } = get();
            
            set({ 
              playbackPosition: status.positionMillis,
              playbackDuration: status.durationMillis || track.duration * 1000,
              isPlaying: status.isPlaying,
              isBuffering: status.isBuffering,
            });
            
            // Stop at preview end time
            if (isPreviewMode && status.positionMillis >= previewEndTime) {
              get().stopPreview();
            }
            
            if (status.didJustFinish) {
              get().stopPreview();
            }
          }
        }
      );
      
      // Store sound reference and start playing
      (set as any)({ _webSound: sound });
      await sound.playAsync();
      set({ isPlaying: true, isBuffering: false });
      
    } catch (error) {
      console.error('Error playing preview:', error);
      set({ isBuffering: false, isPlaying: false, isPreviewMode: false, playbackError: 'Failed to play preview.' });
    }
  },

  stopPreview: async () => {
    const state = get() as any;
    if (state._webSound) {
      try {
        await state._webSound.stopAsync();
        await state._webSound.unloadAsync();
      } catch (e) {
        console.log('Error stopping preview:', e);
      }
    }
    set({ 
      isPlaying: false,
      isPreviewMode: false,
      previewStartTime: 0,
      previewEndTime: 0,
      _webSound: null,
    });
  },

  pauseTrack: async () => {
    const state = get() as any;
    if (state._webSound) {
      await state._webSound.pauseAsync();
    }
    set({ isPlaying: false });
  },

  resumeTrack: async () => {
    const state = get() as any;
    if (state._webSound) {
      await state._webSound.playAsync();
    }
    set({ isPlaying: true });
  },

  seekTo: async (position: number) => {
    const state = get() as any;
    if (state._webSound) {
      await state._webSound.setPositionAsync(position);
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
    const state = get() as any;
    if (state._webSound) {
      try {
        await state._webSound.stopAsync();
        await state._webSound.unloadAsync();
      } catch (e) {
        console.log('Error stopping playback:', e);
      }
    }
    set({ 
      currentTrack: null, 
      isPlaying: false, 
      playbackPosition: 0,
      playbackDuration: 0,
      queue: [],
      queueIndex: 0,
      playbackError: null,
      _webSound: null,
    });
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

  setCurrentTrack: (track: Instrumental | null) => {
    set({ currentTrack: track });
  },

  // Favorites (LOCAL-ONLY - persists on device until app uninstall)
  saveFavoritesLocally: async () => {
    const { favoriteIds, favorites } = get();
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify({ ids: favoriteIds, tracks: favorites }));
      console.log('Favorites saved locally:', favoriteIds.length, 'tracks');
    } catch (error) {
      console.error('Failed to save favorites locally:', error);
    }
  },

  loadFavoritesLocally: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (data) {
        const parsed = JSON.parse(data);
        const ids = parsed.ids || [];
        const tracks = parsed.tracks || [];
        set({ favoriteIds: ids, favorites: tracks });
        console.log('Favorites loaded from local storage:', ids.length, 'tracks');
      }
    } catch (error) {
      console.error('Failed to load favorites locally:', error);
    }
  },

  fetchFavorites: async () => {
    // Favorites are now LOCAL-ONLY - no server sync
    // Just ensure local data is loaded
    await get().loadFavoritesLocally();
  },

  toggleFavorite: async (trackId: string) => {
    const { favorites, favoriteIds, instrumentals, downloadedTracks } = get();
    
    const isFav = favoriteIds.includes(trackId);
    
    // Update local state immediately
    if (isFav) {
      set({ 
        favoriteIds: favoriteIds.filter(id => id !== trackId),
        favorites: favorites.filter(f => f.id !== trackId) 
      });
    } else {
      // Find track from instrumentals or downloaded tracks metadata
      let track = instrumentals.find(i => i.id === trackId);
      if (!track && downloadedTracks[trackId]?.trackMetadata) {
        track = downloadedTracks[trackId].trackMetadata;
      }
      if (track) {
        set({ 
          favoriteIds: [...favoriteIds, trackId],
          favorites: [...favorites, track] 
        });
      }
    }
    
    // Save to local storage immediately (persists until app uninstall)
    await get().saveFavoritesLocally();
  },

  isFavorite: (trackId: string) => {
    return get().favoriteIds.includes(trackId);
  },

  // Playlists (LOCAL-ONLY - persists on device until app uninstall)
  savePlaylistsLocally: async () => {
    const { playlists } = get();
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      console.log('Playlists saved locally:', playlists.length, 'playlists');
    } catch (error) {
      console.error('Failed to save playlists locally:', error);
    }
  },

  loadPlaylistsLocally: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (data) {
        const parsed = JSON.parse(data);
        set({ playlists: parsed });
        console.log('Playlists loaded from local storage:', parsed.length, 'playlists');
      }
    } catch (error) {
      console.error('Failed to load playlists locally:', error);
    }
  },

  fetchPlaylists: async () => {
    // Playlists are now LOCAL-ONLY - no server sync
    // Just ensure local data is loaded
    await get().loadPlaylistsLocally();
  },

  createPlaylist: async (name: string, description?: string) => {
    const { playlists } = get();
    
    // Generate playlist colors
    const colors = ['#4A3463', '#2E5A4A', '#5A3A2E', '#2E4A5A', '#5A2E4A', '#4A5A2E'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Create local playlist (LOCAL-ONLY)
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      user_id: 'local',
      name,
      description: description || '',
      track_ids: [],
      cover_color: randomColor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    set({ playlists: [...playlists, newPlaylist] });
    await get().savePlaylistsLocally();
    
    return newPlaylist;
  },

  deletePlaylist: async (playlistId: string) => {
    const { playlists } = get();
    
    // Remove locally (LOCAL-ONLY)
    set({ playlists: playlists.filter(p => p.id !== playlistId) });
    await get().savePlaylistsLocally();
    
    return true;
  },

  addToPlaylist: async (playlistId: string, trackId: string) => {
    const { playlists } = get();
    
    // Update locally (LOCAL-ONLY)
    set({
      playlists: playlists.map(p => 
        p.id === playlistId 
          ? { ...p, track_ids: [...new Set([...p.track_ids, trackId])], updated_at: new Date().toISOString() }
          : p
      )
    });
    await get().savePlaylistsLocally();
    
    return true;
  },

  removeFromPlaylist: async (playlistId: string, trackId: string) => {
    const { playlists } = get();
    
    // Update locally (LOCAL-ONLY)
    set({
      playlists: playlists.map(p => 
        p.id === playlistId 
          ? { ...p, track_ids: p.track_ids.filter(id => id !== trackId), updated_at: new Date().toISOString() }
          : p
      )
    });
    await get().savePlaylistsLocally();
    
    return true;
  },

  getPlaylistTracks: async (playlistId: string) => {
    const { playlists, instrumentals, downloadedTracks } = get();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) return [];
    
    // Get tracks from local instrumentals cache or downloaded tracks metadata
    const tracks: Instrumental[] = [];
    for (const id of playlist.track_ids) {
      let track = instrumentals.find(i => i.id === id);
      if (!track && downloadedTracks[id]?.trackMetadata) {
        track = downloadedTracks[id].trackMetadata;
      }
      if (track) {
        tracks.push(track);
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

  // Downloads (LOCAL-ONLY - persists on device until app uninstall)
  loadDownloadedTracks: async () => {
    try {
      // First try to load from AsyncStorage (always available)
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_TRACKS);
      if (cached) {
        const parsed = JSON.parse(cached);
        set({ downloadedTracks: parsed });
        console.log('Downloaded tracks loaded from storage:', Object.keys(parsed).length, 'tracks');
      }
      
      // On native, also verify from audio service
      const downloaded = await audioService.getDownloadedTracks();
      if (Object.keys(downloaded).length > 0) {
        // Merge with existing metadata from cache
        const current = get().downloadedTracks;
        const merged: Record<string, DownloadedTrackWithMetadata> = {};
        
        for (const [id, track] of Object.entries(downloaded)) {
          merged[id] = {
            ...track,
            trackMetadata: current[id]?.trackMetadata || track.trackMetadata
          };
        }
        
        set({ downloadedTracks: merged });
        // Save merged data
        await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(merged));
        console.log('Downloaded tracks verified from file system:', Object.keys(merged).length, 'tracks');
      }
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
