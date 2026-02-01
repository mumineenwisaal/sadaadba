// Playback Service - Handles background audio playback and notification controls
import TrackPlayer, {
  Event,
  State,
  Capability,
  AppKilledPlaybackBehavior,
  RepeatMode,
} from 'react-native-track-player';

// This service runs in the background and handles playback events
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  // Handle playback errors (e.g., network drops)
  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.warn('Playback error:', event);
  });

  // Handle playback state changes
  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    console.log('Playback state:', event.state);
  });

  // Handle track changes
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    console.log('Track changed:', event.track?.title);
  });
}

// Initialize the track player with capabilities
export async function setupPlayer(): Promise<boolean> {
  let isSetup = false;
  
  try {
    // Check if player is already initialized
    await TrackPlayer.getActiveTrack();
    isSetup = true;
  } catch {
    // Player not initialized, set it up
    try {
      await TrackPlayer.setupPlayer({
        // Buffer config for smoother playback
        minBuffer: 15,
        maxBuffer: 50,
        playBuffer: 2,
        backBuffer: 0,
      });
      
      await TrackPlayer.updateOptions({
        // Capabilities for the notification
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        // Capabilities when notification is compact
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        // Notification configuration
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        // Android specific
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        // Progress update interval
        progressUpdateEventInterval: 1,
      });
      
      isSetup = true;
    } catch (error) {
      console.error('Error setting up player:', error);
    }
  }
  
  return isSetup;
}

// Set repeat mode
export async function setRepeatMode(enabled: boolean) {
  await TrackPlayer.setRepeatMode(enabled ? RepeatMode.Track : RepeatMode.Off);
}

// Get current state
export async function getPlaybackState(): Promise<State> {
  const state = await TrackPlayer.getPlaybackState();
  return state.state;
}

// Check if player is playing
export async function isPlaying(): Promise<boolean> {
  const state = await getPlaybackState();
  return state === State.Playing;
}

// Format track for TrackPlayer
export function formatTrack(track: any, localUri?: string) {
  return {
    id: track.id,
    url: localUri || track.audio_url || '',
    title: track.title,
    artist: 'Sadaa Instrumentals',
    album: track.mood,
    duration: track.duration,
    artwork: undefined, // Could add artwork URL here
    // Custom metadata
    isDownloaded: !!localUri,
    isPremium: track.is_premium,
    mood: track.mood,
  };
}
