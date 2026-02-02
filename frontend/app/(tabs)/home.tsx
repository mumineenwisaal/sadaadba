import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAppStore, Instrumental } from '../../store/appStore';
import { COLORS, APP_NAME } from '../../constants/theme';
import { notificationService } from '../../services/notificationService';

const { width, height } = Dimensions.get('window');

// Islamic Pattern Background Component
const IslamicPatternBg = () => {
  const size = 45;
  const rows = Math.ceil(height / size) + 2;
  const cols = Math.ceil(width / size) + 2;
  
  const elements = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size + (row % 2 === 0 ? 0 : size / 2);
      const y = row * size;
      
      elements.push(
        <Path
          key={`d-${row}-${col}`}
          d={`M ${x} ${y - size/3} L ${x + size/3} ${y} L ${x} ${y + size/3} L ${x - size/3} ${y} Z`}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={0.5}
          fill="none"
        />
      );
    }
  }
  
  return (
    <View style={patternStyles.container} pointerEvents="none">
      <Svg width={width} height={height * 2} style={patternStyles.svg}>
        {elements}
      </Svg>
    </View>
  );
};

const patternStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

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
    fetchInstrumentals,
    fetchFeaturedInstrumentals,
    initializeApp,
    playTrack,
    playPreview,
    isTrackDownloaded,
    isOnline,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      await initializeApp();
      setInitialLoading(false);
    };
    loadData();

    // Subscribe to notification count updates
    const loadUnreadCount = async () => {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    };
    loadUnreadCount();

    const unsubscribe = notificationService.subscribe(async () => {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    });

    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    if (!isOnline) return;
    setRefreshing(true);
    await fetchFeaturedInstrumentals();
    await fetchInstrumentals(selectedMood);
    setRefreshing(false);
  }, [selectedMood, isOnline]);

  const handleTrackPress = async (track: Instrumental) => {
    const { canPlay, reason } = useAppStore.getState().canPlayTrack(track.id);
    
    if (!canPlay) {
      Alert.alert('Offline', reason || 'Internet connection required to play this audio.');
      return;
    }
    
    if (track.is_premium && !isSubscribed) {
      if (track.preview_start !== null && track.preview_end !== null) {
        await playPreview(track);
        router.push('/preview');
      } else {
        router.push('/subscription');
      }
    } else {
      await playTrack(track);
      router.push('/player');
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <IslamicPatternBg />
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="musical-notes" size={20} color={COLORS.accentGold} />
            </View>
            <Text style={styles.headerTitle}>{APP_NAME}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accentBlue} />
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
          colors={[COLORS.accentBlue, '#3A4AE0']}
          style={styles.featuredGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.featuredContent}>
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color={COLORS.accentGold} />
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
                <Ionicons name="play" size={20} color={COLORS.primaryBg} />
              </View>
              <Text style={styles.playButtonText}>Play Now</Text>
            </View>
          </View>
          <View style={styles.featuredIcon}>
            <Ionicons name="musical-notes" size={80} color="rgba(255, 255, 255, 0.15)" />
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
    const hasPreview = track.is_premium && !isSubscribed && track.preview_start !== null && track.preview_end !== null;
    
    return (
      <TouchableOpacity
        key={track.id}
        style={styles.trackCard}
        onPress={() => handleTrackPress(track)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[track.thumbnail_color, COLORS.cardBg]}
          style={styles.trackThumbnail}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="musical-note" size={24} color="rgba(255, 255, 255, 0.5)" />
          {track.is_premium && !isSubscribed && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={12} color={COLORS.accentGold} />
            </View>
          )}
          {hasPreview && (
            <View style={styles.previewBadge}>
              <Ionicons name="play-circle" size={10} color="#FFFFFF" />
              <Text style={styles.previewBadgeText}>Preview</Text>
            </View>
          )}
          {downloaded && (
            <View style={styles.downloadedBadge}>
              <Ionicons name="cloud-done" size={12} color={COLORS.downloaded} />
            </View>
          )}
        </LinearGradient>
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
          <View style={styles.trackMeta}>
            <View style={styles.smallMoodTag}>
              <Text style={styles.smallMoodTagText}>{track.mood}</Text>
            </View>
            <Text style={styles.trackDuration}>{track.duration_formatted}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, tracks: Instrumental[], showPremiumBadge?: boolean) => {
    if (tracks.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {showPremiumBadge && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color={COLORS.accentGold} />
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
      <IslamicPatternBg />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="musical-notes" size={18} color={COLORS.accentGold} />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>{APP_NAME}</Text>
        </View>
        <View style={styles.headerRight}>
          {!isOnline && (
            <View style={styles.statusBadge}>
              <Ionicons name="cloud-offline" size={12} color={COLORS.offline} />
            </View>
          )}
          {isSubscribed && (
            <View style={[styles.statusBadge, styles.premiumBadge]}>
              <Ionicons name="diamond" size={12} color={COLORS.accentGold} />
            </View>
          )}
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => router.push('/menu')}
          >
            <Ionicons name="menu" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accentBlue}
          />
        }
      >
        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color={COLORS.offline} />
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
    backgroundColor: COLORS.primaryBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    zIndex: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offlineIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201, 169, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E53935',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    gap: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.offline,
  },
  content: {
    flex: 1,
  },
  featuredContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
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
    backgroundColor: 'rgba(201, 169, 97, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  featuredBadgeText: {
    color: COLORS.accentGold,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  moodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  moodTagText: {
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.buttonSecondary,
    marginRight: 10,
  },
  moodChipActive: {
    backgroundColor: COLORS.accentBlue,
  },
  moodChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  moodChipTextActive: {
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
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
    color: COLORS.accentGold,
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
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
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
  previewBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.preview,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  previewBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 8,
    fontWeight: '700',
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
    color: COLORS.textPrimary,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  smallMoodTag: {
    backgroundColor: 'rgba(86, 101, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smallMoodTagText: {
    color: COLORS.accentBlue,
    fontSize: 10,
    fontWeight: '500',
  },
  trackDuration: {
    color: COLORS.textMuted,
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
    color: COLORS.textSecondary,
  },
});
