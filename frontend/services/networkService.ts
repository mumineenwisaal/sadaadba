// Network Service - Handles connectivity detection
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

// Check if device is online
export const checkIsOnline = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    console.error('Error checking network status:', error);
    return false;
  }
};

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    // Initial check
    checkIsOnline().then((online) => {
      setIsOnline(online);
      setIsChecking(false);
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline, isChecking };
};

// Subscribe to network changes (for store)
export const subscribeToNetworkChanges = (callback: (isOnline: boolean) => void) => {
  return NetInfo.addEventListener((state: NetInfoState) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    callback(online);
  });
};
