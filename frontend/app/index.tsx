import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  const router = useRouter();
  const { initializeApp, isLoading } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
      } catch (error) {
        console.error('Init error:', error);
      }
      // Show splash for at least 2 seconds then navigate
      setTimeout(() => {
        setShowSplash(false);
        router.replace('/(tabs)/home');
      }, 2500);
    };
    init();
  }, []);

  return (
    <LinearGradient
      colors={['#4A3463', '#2D1F3D', '#1A1225']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="musical-notes" size={48} color="#C9A961" />
          </View>
        </View>
        
        <Text style={styles.title}>Sadaa</Text>
        <Text style={styles.subtitle}>Instrumentals</Text>
        
        <Text style={styles.tagline}>Sacred Melodies for the Soul</Text>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#C9A961" />
        </View>
      </View>
      
      <Text style={styles.footer}>Dawoodi Bohra Madeh Music</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(201, 169, 97, 0.3)',
  },
  title: {
    fontSize: 42,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#C9A961',
    letterSpacing: 6,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 24,
    fontStyle: 'italic',
  },
  loadingContainer: {
    marginTop: 48,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 2,
  },
});
