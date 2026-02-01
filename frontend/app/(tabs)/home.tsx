import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Instrumental } from '../../store/appStore';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    instrumentals,
    featuredInstrumentals,
    moods,
    selectedMood,
    setSelectedMood,
    isSubscribed,
    setCurrentTrack,
    fetchInstrumentals,
    fetchFeaturedInstrumentals,
    isLoading,
    initializeApp,
    playTrack,
    playPreview,
    isTrackDownloaded,
    isOnline,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initialize data on mount
  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      await initializeApp();
      setInitialLoading(false);
    };
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    if (!isOnline) return;
    setRefreshing(true);
    await fetchFeaturedInstrumentals();
    await fetchInstrumentals(selectedMood);
    setRefreshing(false);
  }, [selectedMood, isOnline]);

  const handleTrackPress = async (track: Instrumental) => {
    // Check if track can be played
    const { canPlay, reason } = useAppStore.getState().canPlayTrack(track.id);
    
    if (!canPlay) {
      Alert.alert('Offline', reason || 'Internet connection required to play this audio.');
      return;
    }
    
    if (track.is_premium && !isSubscribed) {
      router.push('/subscription');
    } else {
      await playTrack(track);
      router.push('/player');
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#4A3463', '#FAF8F5']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Salaam</Text>
              <Text style={styles.headerTitle}>Sadaa Instrumentals</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A3463" />
          <Text style={styles.loadingText}>Loading sacred melodies...</Text>
        </View>
      </View>
    );
  }

  const freeInstrumentals = instrumentals.filter(i => !i.is_premium);
  const premiumInstrumentals = instrumentals.filter(i => i.is_premium);

  const renderFeaturedBanner = () => {
    if (featuredInstrumentals.length === 0) return null;
    const featured = featuredInstrumentals[0];

    return (
      <TouchableOpacity
        style={styles.featuredContainer}
        onPress={() => handleTrackPress(featured)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[featured.thumbnail_color, '#1A1225']}
          style={styles.featuredGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.featuredContent}>
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#C9A961" />
              <Text style={styles.featuredBadgeText}>FEATURED</Text>
            </View>
            <Text style={styles.featuredTitle}>{featured.title}</Text>
            <View style={styles.featuredMeta}>
              <View style={styles.moodTag}>
                <Text style={styles.moodTagText}>{featured.mood}</Text>
              </View>
              <Text style={styles.featuredDuration}>{featured.duration_formatted}</Text>
            </View>
            <View style={styles.playButtonContainer}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={20} color="#4A3463" />
              </View>
              <Text style={styles.playButtonText}>Play Now</Text>
            </View>
          </View>
          <View style={styles.featuredIcon}>
            <Ionicons name="musical-notes" size={80} color="rgba(201, 169, 97, 0.15)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderMoodChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.moodChipsContainer}
    >
      {moods.map((mood) => (
        <TouchableOpacity
          key={mood}
          style={[
            styles.moodChip,
            selectedMood === mood && styles.moodChipActive,
          ]}
          onPress={() => setSelectedMood(mood)}
        >
          <Text
            style={[
              styles.moodChipText,
              selectedMood === mood && styles.moodChipTextActive,
            ]}
          >
            {mood}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTrackCard = (track: Instrumental, index: number) => {
    const downloaded = isTrackDownloaded(track.id);
    
    return (
    <TouchableOpacity
      key={track.id}
      style={styles.trackCard}
      onPress={() => handleTrackPress(track)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[track.thumbnail_color, '#2D1F3D']}
        style={styles.trackThumbnail}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="musical-note" size={24} color="rgba(255, 255, 255, 0.5)" />
        {track.is_premium && !isSubscribed && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#C9A961" />
          </View>
        )}
        {downloaded && (
          <View style={styles.downloadedBadge}>
            <Ionicons name="cloud-done" size={12} color="#4CAF50" />
          </View>
        )}
      </LinearGradient>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <View style={styles.trackMeta}>
          <View style={styles.smallMoodTag}>
            <Text style={styles.smallMoodTagText}>{track.mood}</Text>
          </View>
          <Text style={styles.trackDuration}>{track.duration_formatted}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )};


  const renderSection = (title: string, tracks: Instrumental[], showPremiumBadge?: boolean) => {
    if (tracks.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {showPremiumBadge && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color="#C9A961" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tracksRow}
        >
          {tracks.map((track, index) => renderTrackCard(track, index))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#4A3463', '#FAF8F5']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Salaam</Text>
            <Text style={styles.headerTitle}>Sadaa Instrumentals</Text>
          </View>
          <View style={styles.headerRight}>
            {!isOnline && (
              <View style={styles.offlineIndicator}>
                <Ionicons name="cloud-offline" size={14} color="#FF9800" />
              </View>
            )}
            {isSubscribed && (
              <View style={styles.subscribedBadge}>
                <Ionicons name="diamond" size={14} color="#C9A961" />
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4A3463"
          />
        }
      >
        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color="#FF9800" />
            <Text style={styles.offlineBannerText}>You're offline. Only downloaded tracks can be played.</Text>
          </View>
        )}
        
        {renderFeaturedBanner()}
        
        <Text style={styles.filterLabel}>Browse by Mood</Text>
        {renderMoodChips()}
        
        {renderSection('Free Instrumentals', freeInstrumentals)}
        {renderSection('Premium Collection', premiumInstrumentals, true)}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  offlineIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 169, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    gap: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9800',
  },
  content: {
    flex: 1,
    marginTop: -10,
  },
  featuredContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4A3463',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  featuredGradient: {
    padding: 20,
    minHeight: 160,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  featuredBadgeText: {
    color: '#C9A961',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  moodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  moodTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  featuredDuration: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginLeft: 10,
  },
  playButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C9A961',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  featuredIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B8B8B',
    marginLeft: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  moodChipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  moodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 99, 0.1)',
  },
  moodChipActive: {
    backgroundColor: '#4A3463',
    borderColor: '#4A3463',
  },
  moodChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A3463',
  },
  moodChipTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#C9A961',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  tracksRow: {
    paddingHorizontal: 20,
  },
  trackCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#4A3463',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trackThumbnail: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    padding: 10,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  smallMoodTag: {
    backgroundColor: 'rgba(74, 52, 99, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smallMoodTagText: {
    color: '#4A3463',
    fontSize: 10,
    fontWeight: '500',
  },
  trackDuration: {
    color: '#8B8B8B',
    fontSize: 11,
  },
  bottomSpacing: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8B8B8B',
  },
});
