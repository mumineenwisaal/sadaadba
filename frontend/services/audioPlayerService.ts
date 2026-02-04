// Audio Player Service - Uses react-native-track-player for native, expo-av for web
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

let isInitialized = false;
let webSound: Audio.Sound | null = null;
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
    if (Platform.OS === 'web') {
      // Web uses expo-av
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      isInitialized = true;
      console.log('Audio initialized for web (expo-av)');
    } else {
      // Native uses react-native-track-player
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });
        
        await TrackPlayer.updateOptions({
          capabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
            TrackPlayer.CAPABILITY_STOP,
            TrackPlayer.CAPABILITY_SEEK_TO,
            TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
            TrackPlayer.CAPABILITY_SKIP_TO_PREVIOUS,
          ],
          compactCapabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
            TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
          ],
          notificationCapabilities: [
            TrackPlayer.CAPABILITY_PLAY,
            TrackPlayer.CAPABILITY_PAUSE,
            TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
            TrackPlayer.CAPABILITY_SKIP_TO_PREVIOUS,
          ],
        });
        
        isInitialized = true;
        console.log('Audio initialized for native (react-native-track-player)');
      } catch (e) {
        console.log('TrackPlayer setup error, falling back to expo-av:', e);
        // Fallback to expo-av for native if track-player fails
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        isInitialized = true;
      }
    }
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
    await stopAudio();
    currentStatusCallback = onStatusUpdate;
    
    if (!isInitialized) {
      await initializeAudio();
    }
    
    if (Platform.OS === 'web') {
      // Use expo-av for web
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
      webSound = sound;
      return true;
    } else {
      // Use react-native-track-player for native
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        const { State, Event, useProgress } = await import('react-native-track-player');
        
        // Reset and add track
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: trackInfo?.id || 'current-track',
          url: uri,
          title: trackInfo?.title || 'Unknown',
          artist: trackInfo?.artist || 'Sadaa Instrumentals',
          artwork: trackInfo?.artwork,
        });
        
        // Seek to start position if needed
        if (startPosition > 0) {
          await TrackPlayer.seekTo(startPosition / 1000);
        }
        
        // Start playback
        await TrackPlayer.play();
        
        // Set up progress monitoring
        statusInterval = setInterval(async () => {
          try {
            const state = await TrackPlayer.getState();
            const progress = await TrackPlayer.getProgress();
            
            if (currentStatusCallback) {
              currentStatusCallback({
                isLoaded: true,
                isPlaying: state === State.Playing,
                isBuffering: state === State.Buffering || state === State.Loading,
                positionMillis: (progress.position || 0) * 1000,
                durationMillis: (progress.duration || 0) * 1000,
                didJustFinish: state === State.Stopped && progress.position >= progress.duration - 1,
              });
            }
          } catch (e) {
            // Player might be destroyed
          }
        }, 500);
        
        return true;
      } catch (e) {
        console.log('TrackPlayer play error, using expo-av fallback:', e);
        // Fallback to expo-av
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
        webSound = sound;
        return true;
      }
    }
  } catch (error) {
    console.error('Error playing audio:', error);
    return false;
  }
};

// Pause
export const pauseAudio = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        await webSound.pauseAsync();
      }
    } else {
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        await TrackPlayer.pause();
      } catch (e) {
        if (webSound) {
          await webSound.pauseAsync();
        }
      }
    }
  } catch (error) {
    console.error('Error pausing audio:', error);
  }
};

// Resume
export const resumeAudio = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        await webSound.playAsync();
      }
    } else {
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        await TrackPlayer.play();
      } catch (e) {
        if (webSound) {
          await webSound.playAsync();
        }
      }
    }
  } catch (error) {
    console.error('Error resuming audio:', error);
  }
};

// Seek
export const seekTo = async (positionMillis: number): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        await webSound.setPositionAsync(positionMillis);
      }
    } else {
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        await TrackPlayer.seekTo(positionMillis / 1000);
      } catch (e) {
        if (webSound) {
          await webSound.setPositionAsync(positionMillis);
        }
      }
    }
  } catch (error) {
    console.error('Error seeking:', error);
  }
};

// Stop and cleanup
export const stopAudio = async (): Promise<void> => {
  try {
    // Clear interval
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    currentStatusCallback = null;
    
    if (Platform.OS === 'web') {
      if (webSound) {
        try {
          await webSound.stopAsync();
          await webSound.unloadAsync();
        } catch (e) {}
        webSound = null;
      }
    } else {
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      } catch (e) {
        // Fallback cleanup
        if (webSound) {
          try {
            await webSound.stopAsync();
            await webSound.unloadAsync();
          } catch (e) {}
          webSound = null;
        }
      }
    }
  } catch (error) {
    console.error('Error stopping audio:', error);
  }
};

// Get current position
export const getCurrentPosition = async (): Promise<number> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        const status = await webSound.getStatusAsync();
        return status.isLoaded ? status.positionMillis : 0;
      }
    } else {
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        const progress = await TrackPlayer.getProgress();
        return (progress.position || 0) * 1000;
      } catch (e) {
        if (webSound) {
          const status = await webSound.getStatusAsync();
          return status.isLoaded ? status.positionMillis : 0;
        }
      }
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

// Check if playing
export const isAudioPlaying = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (webSound) {
        const status = await webSound.getStatusAsync();
        return status.isLoaded && status.isPlaying;
      }
    } else {
      try {
        const TrackPlayer = (await import('react-native-track-player')).default;
        const { State } = await import('react-native-track-player');
        const state = await TrackPlayer.getState();
        return state === State.Playing;
      } catch (e) {
        if (webSound) {
          const status = await webSound.getStatusAsync();
          return status.isLoaded && status.isPlaying;
        }
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};
