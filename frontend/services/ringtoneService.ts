// Ringtone Service - Handles audio trimming and sharing for ringtones
// Uses expo-av to actually trim the audio by recording the trimmed portion
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

export interface TrimSettings {
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
}

// Check if we can set ringtones on this device
export const canSetRingtone = (): boolean => {
  return Platform.OS === 'android';
};

// Request ringtone permission on Android
export const requestRingtonePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message: 'This app needs storage access to save the ringtone file.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Permission error:', err);
    return false;
  }
};

// Actually trim the audio by recording the playback of the trimmed section
export const trimAudioFile = async (
  sourceUri: string,
  trimSettings: TrimSettings,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  let sound: Audio.Sound | null = null;
  let recording: Audio.Recording | null = null;
  
  try {
    const trimDuration = trimSettings.endTime - trimSettings.startTime;
    
    // Configure audio for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    
    // Prepare recording
    recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      isMeteringEnabled: false,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    });
    
    // Load the source audio
    const { sound: loadedSound } = await Audio.Sound.createAsync(
      { uri: sourceUri },
      { positionMillis: trimSettings.startTime, shouldPlay: false }
    );
    sound = loadedSound;
    
    // Start recording
    await recording.startAsync();
    
    // Play the source audio from start position
    await sound.playAsync();
    
    // Monitor progress and stop at end time
    const checkInterval = 100; // Check every 100ms
    let elapsed = 0;
    
    while (elapsed < trimDuration) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
      
      // Report progress
      if (onProgress) {
        onProgress(Math.min(elapsed / trimDuration, 1));
      }
      
      // Check if sound is still playing
      const status = await sound.getStatusAsync();
      if (!status.isLoaded || !status.isPlaying) {
        break;
      }
      
      // Check if we've reached the end position
      if (status.positionMillis >= trimSettings.endTime) {
        break;
      }
    }
    
    // Stop playback and recording
    await sound.stopAsync();
    await recording.stopAndUnloadAsync();
    
    // Get the recorded file URI
    const recordedUri = recording.getURI();
    
    // Clean up
    await sound.unloadAsync();
    
    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    
    return recordedUri;
  } catch (error) {
    console.error('Error trimming audio:', error);
    
    // Clean up on error
    if (sound) {
      try { await sound.unloadAsync(); } catch (e) {}
    }
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch (e) {}
    }
    
    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {}
    
    return null;
  }
};

// Alternative: Extract portion by downloading and creating a trimmed file
// This creates a file with only the specified portion (simulated trim via metadata)
export const prepareAudioForRingtone = async (
  audioUrl: string,
  trackId: string,
  trackTitle: string,
  trimSettings: TrimSettings,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    // First, download or locate the source file
    let sourceUri = audioUrl;
    
    // If it's a remote URL, download it first
    if (!audioUrl.startsWith('file://') && !audioUrl.startsWith(FileSystem.documentDirectory || '')) {
      onProgress?.(0.1);
      const tempFile = `${FileSystem.cacheDirectory}temp_${trackId}_${Date.now()}.mp3`;
      const downloadResult = await FileSystem.downloadAsync(audioUrl, tempFile);
      if (downloadResult.status !== 200) {
        throw new Error('Failed to download audio file');
      }
      sourceUri = tempFile;
      onProgress?.(0.3);
    }
    
    // Now trim the audio by recording the playback
    onProgress?.(0.4);
    const trimmedUri = await trimAudioFile(sourceUri, trimSettings, (trimProgress) => {
      // Map trim progress to 40-90% of total progress
      onProgress?.(0.4 + (trimProgress * 0.5));
    });
    
    if (!trimmedUri) {
      throw new Error('Failed to trim audio');
    }
    
    // Move to a permanent location with proper name
    const finalFileName = `ringtone_${trackId}_${Date.now()}.m4a`;
    const finalUri = `${FileSystem.documentDirectory}${finalFileName}`;
    
    await FileSystem.moveAsync({
      from: trimmedUri,
      to: finalUri,
    });
    
    onProgress?.(1);
    
    // Clean up temp file if we downloaded one
    if (sourceUri.includes('temp_')) {
      try {
        await FileSystem.deleteAsync(sourceUri, { idempotent: true });
      } catch (e) {}
    }
    
    return finalUri;
  } catch (error) {
    console.error('Error preparing audio for ringtone:', error);
    return null;
  }
};

// Get trim info message for sharing
export const getTrimInfoMessage = (trimSettings: TrimSettings): string => {
  const startFormatted = formatDuration(trimSettings.startTime);
  const endFormatted = formatDuration(trimSettings.endTime);
  const durationFormatted = formatDuration(trimSettings.endTime - trimSettings.startTime);
  
  return `Trimmed: ${startFormatted} to ${endFormatted} (${durationFormatted})`;
};

// Set as ringtone on Android (share the trimmed file)
export const setAsRingtone = async (
  fileUri: string,
  title: string,
  trimSettings?: TrimSettings
): Promise<{ success: boolean; message: string }> => {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      message: 'Setting ringtones is only supported on Android devices.',
    };
  }

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'audio/m4a',
        dialogTitle: `Save "${title}" as Ringtone`,
        UTI: 'public.mpeg-4-audio',
      });
      
      let message = 'Trimmed audio file shared! Use your file manager to set it as ringtone.';
      if (trimSettings) {
        message += `\n\n${getTrimInfoMessage(trimSettings)}`;
      }
      
      return {
        success: true,
        message,
      };
    } else {
      return {
        success: false,
        message: 'Sharing is not available on this device.',
      };
    }
  } catch (error) {
    console.error('Error setting ringtone:', error);
    return {
      success: false,
      message: 'Failed to share ringtone. Please try again.',
    };
  }
};

// Show iOS instructions
export const showIOSRingtoneInstructions = () => {
  Alert.alert(
    'Set as Ringtone on iPhone',
    'To set a custom ringtone on iPhone:\n\n' +
    '1. Download the audio file\n' +
    '2. Open GarageBand app\n' +
    '3. Import the audio file\n' +
    '4. Export as ringtone\n' +
    '5. Go to Settings > Sounds > Ringtone\n\n' +
    'Would you like to download this audio?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Download', onPress: () => {} },
    ]
  );
};

// Format time for display (mm:ss.ms)
export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

// Format duration for display (mm:ss)
export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Validate trim settings
export const validateTrimSettings = (
  trimSettings: TrimSettings,
  maxDuration: number = 30000 // 30 seconds default
): { valid: boolean; message?: string } => {
  const duration = trimSettings.endTime - trimSettings.startTime;
  
  if (duration <= 0) {
    return { valid: false, message: 'End time must be after start time' };
  }
  
  if (duration > maxDuration) {
    return { valid: false, message: `Ringtone must be ${maxDuration / 1000} seconds or less` };
  }
  
  if (duration < 1000) {
    return { valid: false, message: 'Ringtone must be at least 1 second long' };
  }
  
  return { valid: true };
};
