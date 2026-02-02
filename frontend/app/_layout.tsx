import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { notificationService } from '../services/notificationService';

export default function RootLayout() {
  // Initialize OneSignal notifications
  useEffect(() => {
    notificationService.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FAF8F5' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="player" 
          options={{ 
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="subscription" 
          options={{ 
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="menu" 
          options={{ 
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="notifications" 
          options={{ 
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="help" 
          options={{ 
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="request-instrumental" 
          options={{ 
            animation: 'slide_from_right',
          }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
