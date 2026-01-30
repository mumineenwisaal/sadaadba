import { create } from 'zustand';
import axios from 'axios';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  is_active: boolean;
  plan: string;
  price: number;
  subscribed_at: string;
  expires_at: string | null;
}

export interface User {
  id: string;
  device_id: string;
  is_subscribed: boolean;
  created_at: string;
}

interface AppState {
  // User state
  user: User | null;
  isSubscribed: boolean;
  
  // Data
  instrumentals: Instrumental[];
  featuredInstrumentals: Instrumental[];
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
  
  // Actions
  initializeApp: () => Promise<void>;
  fetchInstrumentals: (mood?: string, search?: string) => Promise<void>;
  fetchFeaturedInstrumentals: () => Promise<void>;
  setSelectedMood: (mood: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentTrack: (track: Instrumental | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackPosition: (position: number) => void;
  setPlaybackDuration: (duration: number) => void;
  subscribe: () => Promise<boolean>;
  restorePurchase: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isSubscribed: false,
  instrumentals: [],
  featuredInstrumentals: [],
  moods: ['All', 'Calm', 'Drums', 'Spiritual', 'Soft', 'Energetic'],
  isLoading: false,
  selectedMood: 'All',
  searchQuery: '',
  currentTrack: null,
  isPlaying: false,
  playbackPosition: 0,
  playbackDuration: 0,

  initializeApp: async () => {
    set({ isLoading: true });
    try {
      // Get or create device ID
      const deviceId = Constants.installationId || Device.osBuildId || 'unknown-device';
      
      // Create or get user
      const userResponse = await axios.post(`${API_BASE}/api/users`, {
        device_id: deviceId
      });
      const user = userResponse.data;
      
      // Check subscription status
      const subResponse = await axios.get(`${API_BASE}/api/subscription/status/${user.id}`);
      
      set({ 
        user,
        isSubscribed: subResponse.data.is_subscribed
      });
      
      // Seed database if needed (first time setup)
      try {
        await axios.post(`${API_BASE}/api/seed`);
      } catch (e) {
        // Ignore if already seeded
      }
      
      // Fetch initial data
      await get().fetchFeaturedInstrumentals();
      await get().fetchInstrumentals();
      
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
      console.error('Failed to fetch featured instrumentals:', error);
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

  setCurrentTrack: (track: Instrumental | null) => {
    set({ currentTrack: track, playbackPosition: 0 });
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setPlaybackPosition: (position: number) => {
    set({ playbackPosition: position });
  },

  setPlaybackDuration: (duration: number) => {
    set({ playbackDuration: duration });
  },

  subscribe: async () => {
    const { user } = get();
    if (!user) return false;
    
    try {
      await axios.post(`${API_BASE}/api/subscription/subscribe`, {
        user_id: user.id
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
      console.error('Failed to restore purchase:', error);
      return false;
    }
  },

  checkSubscription: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/subscription/status/${user.id}`);
      set({ isSubscribed: response.data.is_subscribed });
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  },
}));
