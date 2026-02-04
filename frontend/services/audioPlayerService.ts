// Audio Player Service - Uses expo-av for all platforms
// Provides background audio support and consistent API
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

let isInitialized = false;
let currentSound: Audio.Sound | null = null;
let statusInterval: NodeJS.Timeout | null = null;
let currentStatusCallback: ((status: AudioStatus) => void) | null = null;

export interface AudioStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
}

// Initialize audio system
export const initializeAudio = async (): Promise<boolean> => {
  if (isInitialized) return true;
  
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isInitialized = true;
    console.log('Audio initialized (expo-av)');
    return true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
    return false;
  }
};

// Play audio
export const playAudio = async (
  uri: string,
  onStatusUpdate: (status: AudioStatus) => void,
  startPosition: number = 0,
  trackInfo?: { id: string; title: string; artist?: string; artwork?: string }
): Promise<boolean> => {
  try {
    // Stop any current playback first
    await stopAudio();
    
    currentStatusCallback = onStatusUpdate;
    
    if (!isInitialized) {
      await initializeAudio();
    }
    
    // Create and play new sound
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { 
        shouldPlay: true, 
        positionMillis: startPosition, 
        progressUpdateIntervalMillis: 500 
      },
      (status: any) => {
        if (status.isLoaded && currentStatusCallback) {
          currentStatusCallback({
            isLoaded: true,
            isPlaying: status.isPlaying,
            isBuffering: status.isBuffering || false,
            positionMillis: status.positionMillis || 0,
            durationMillis: status.durationMillis || 0,
            didJustFinish: status.didJustFinish || false,
          });
        }
      }
    );
    
    currentSound = sound;
    console.log('Audio playback started');
    return true;
  } catch (error) {
    console.error('Error playing audio:', error);
    return false;
  }
};

// Pause
export const pauseAudio = async (): Promise<void> => {
  try {
    if (currentSound) {
      await currentSound.pauseAsync();
      console.log('Audio paused');
    }
  } catch (error) {
    console.error('Error pausing audio:', error);
  }
};

// Resume
export const resumeAudio = async (): Promise<void> => {
  try {
    if (currentSound) {
      await currentSound.playAsync();
      console.log('Audio resumed');
    }
  } catch (error) {
    console.error('Error resuming audio:', error);
  }
};

// Seek
export const seekTo = async (positionMillis: number): Promise<void> => {
  try {
    if (currentSound) {
      await currentSound.setPositionAsync(positionMillis);
      console.log('Audio seeked to:', positionMillis);
    }
  } catch (error) {
    console.error('Error seeking:', error);
  }
};

// Stop and cleanup - THIS IS THE CRITICAL FUNCTION FOR MINI PLAYER CLOSE
export const stopAudio = async (): Promise<void> => {
  try {
    // Clear interval
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    
    // Clear callback
    currentStatusCallback = null;
    
    // Stop and unload sound
    if (currentSound) {
      try {
        const status = await currentSound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await currentSound.stopAsync();
          }
          await currentSound.unloadAsync();
        }
      } catch (e) {
        console.log('Error during sound cleanup:', e);
      }
      currentSound = null;
      console.log('Audio stopped and unloaded');
    }
  } catch (error) {
    console.error('Error stopping audio:', error);
    // Force cleanup even on error
    currentSound = null;
    currentStatusCallback = null;
  }
};

// Get current position
export const getCurrentPosition = async (): Promise<number> => {
  try {
    if (currentSound) {
      const status = await currentSound.getStatusAsync();
      return status.isLoaded ? status.positionMillis : 0;
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

// Check if playing
export const isAudioPlaying = async (): Promise<boolean> => {
  try {
    if (currentSound) {
      const status = await currentSound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Get current sound instance (for advanced use)
export const getCurrentSound = (): Audio.Sound | null => {
  return currentSound;
};
