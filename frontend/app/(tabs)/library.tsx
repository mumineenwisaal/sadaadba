import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Instrumental } from '../../store/appStore';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    instrumentals,
    isSubscribed,
    setCurrentTrack,
  } = useAppStore();

  const handleTrackPress = (track: Instrumental) => {
    if (track.is_premium && !isSubscribed) {
      router.push('/subscription');
    } else {
      setCurrentTrack(track);
      router.push('/player');
    }
  };

  // Get all instrumentals accessible to user
  const accessibleTracks = isSubscribed 
    ? instrumentals 
    : instrumentals.filter(i => !i.is_premium);

  // Group by mood
  const moodGroups = accessibleTracks.reduce((acc, track) => {
    if (!acc[track.mood]) {
      acc[track.mood] = [];
    }
    acc[track.mood].push(track);
    return acc;
  }, {} as Record<string, Instrumental[]>);

  const renderTrackRow = (track: Instrumental) => (
    <TouchableOpacity
      key={track.id}
      style={styles.trackRow}
      onPress={() => handleTrackPress(track)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[track.thumbnail_color, '#2D1F3D']}
        style={styles.trackThumbnail}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="musical-note" size={18} color="rgba(255, 255, 255, 0.5)" />
      </LinearGradient>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackDuration}>{track.duration_formatted}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8B8B8B" />
    </TouchableOpacity>
  );

  const renderMoodSection = (mood: string, tracks: Instrumental[]) => (
    <View key={mood} style={styles.moodSection}>
      <View style={styles.moodHeader}>
        <Text style={styles.moodTitle}>{mood}</Text>
        <Text style={styles.trackCount}>{tracks.length} tracks</Text>
      </View>
      {tracks.map(renderTrackRow)}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        {!isSubscribed && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
          >
            <Ionicons name="diamond" size={14} color="#C9A961" />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{accessibleTracks.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{Object.keys(moodGroups).length}</Text>
          <Text style={styles.statLabel}>Moods</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {isSubscribed ? 'Premium' : 'Free'}
          </Text>
          <Text style={styles.statLabel}>Plan</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(moodGroups).map(([mood, tracks]) =>
          renderMoodSection(mood, tracks)
        )}

        {!isSubscribed && (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() => router.push('/subscription')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4A3463', '#2D1F3D']}
              style={styles.premiumGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.premiumContent}>
                <Ionicons name="diamond" size={28} color="#C9A961" />
                <View style={styles.premiumTextContainer}>
                  <Text style={styles.premiumTitle}>Unlock Premium</Text>
                  <Text style={styles.premiumSubtitle}>
                    Get access to {instrumentals.filter(i => i.is_premium).length} more instrumentals
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C9A961" />
            </LinearGradient>
          </TouchableOpacity>
        )}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  upgradeText: {
    color: '#C9A961',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#4A3463',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A3463',
  },
  statLabel: {
    fontSize: 12,
    color: '#8B8B8B',
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
  moodSection: {
    marginBottom: 24,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  moodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  trackCount: {
    fontSize: 13,
    color: '#8B8B8B',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 52, 99, 0.05)',
  },
  trackThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  trackDuration: {
    fontSize: 12,
    color: '#8B8B8B',
    marginTop: 2,
  },
  premiumBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumTextContainer: {
    marginLeft: 16,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  premiumSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  bottomSpacing: {
    height: 100,
  },
});
