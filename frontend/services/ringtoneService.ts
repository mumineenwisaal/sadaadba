// Ringtone Service - Handles ringtone trimming and setting
import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Audio, AVPlaybackStatus } from 'expo-av';

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
    // For Android 6.0+, we need WRITE_SETTINGS permission
    // This requires user to manually enable in settings
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

// Trim audio by recording playback segment
// Since we can't directly trim MP3 in React Native without native modules,
// we'll download the full file and add metadata about the trim region
// The sharing dialog will share the full file with instructions
export const prepareAudioForRingtone = async (
  audioUrl: string,
  trackId: string,
  trackTitle: string,
  trimSettings: TrimSettings
): Promise<string | null> => {
  try {
    const fileName = `ringtone_${trackId}_${Date.now()}.mp3`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Check if it's a local file or needs downloading
    if (audioUrl.startsWith('file://') || audioUrl.startsWith(FileSystem.documentDirectory || '')) {
      // Already local, just copy
      await FileSystem.copyAsync({
        from: audioUrl,
        to: fileUri,
      });
    } else {
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(audioUrl, fileUri);
      if (downloadResult.status !== 200) {
        throw new Error('Failed to download audio file');
      }
    }

    // Note: Real audio trimming requires native code or FFmpeg
    // For a complete solution, we would need expo-dev-client with a native module
    // For now, we provide the full file with trim info in the share message

    return fileUri;
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
  
  return `Use ${startFormatted} to ${endFormatted} (${durationFormatted}) as your ringtone portion.`;
};

// Set as ringtone on Android
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
    // On Android, we need to use native modules or share the file
    // For Expo managed workflow, we'll use sharing to let user save to ringtones
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'audio/mpeg',
        dialogTitle: `Save "${title}" as Ringtone`,
        UTI: 'public.mp3',
      });
      
      let message = 'Audio file shared. Use your device\'s file manager to set it as ringtone.';
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
      message: 'Failed to set ringtone. Please try again.',
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
      { text: 'Download', onPress: () => {} }, // Will be handled by caller
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
