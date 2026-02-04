import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAppStore, Instrumental } from '../../store/appStore';
import { COLORS, APP_NAME } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Islamic Pattern Background
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
      <Svg width={width} height={height * 2} style={patternStyles.svg}>{elements}</Svg>
    </View>
  );
};

const patternStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  svg: { position: 'absolute', top: 0, left: 0 },
});

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    instrumentals,
    moods,
    selectedMood,
    setSelectedMood,
    searchQuery,
    setSearchQuery,
    isSubscribed,
    isLoading,
    playTrack,
    playPreview,
  } = useAppStore();

  const [filteredTracks, setFilteredTracks] = useState<Instrumental[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    filterTracks();
  }, [instrumentals, searchQuery, selectedMood]);

  const filterTracks = useCallback(() => {
    let results = [...instrumentals];
    
    if (selectedMood !== 'All') {
      results = results.filter(track => track.mood === selectedMood);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(track =>
        track.title.toLowerCase().includes(query) ||
        track.mood.toLowerCase().includes(query)
      );
    }
    
    setFilteredTracks(results);
  }, [instrumentals, searchQuery, selectedMood]);

  const handleTrackPress = async (track: Instrumental) => {
    Keyboard.dismiss();
    if (track.is_premium && !isSubscribed) {
      // Allow preview for premium tracks - use defaults if preview times not set
      const defaultPreviewEnd = Math.min(30, track.duration);
      
      const trackWithPreview = {
        ...track,
        preview_start: track.preview_start ?? 0,
        preview_end: track.preview_end ?? defaultPreviewEnd,
      };
      
      await playPreview(trackWithPreview);
      router.push('/preview');
    } else {
      await playTrack(track);
      router.push('/player');
    }
  };

  const renderMoodChip = (mood: string) => (
    <TouchableOpacity
      key={mood}
      style={[styles.moodChip, selectedMood === mood && styles.moodChipActive]}
      onPress={() => setSelectedMood(mood)}
    >
      <Text style={[styles.moodChipText, selectedMood === mood && styles.moodChipTextActive]}>
        {mood}
      </Text>
    </TouchableOpacity>
  );

  const renderTrackItem = ({ item }: { item: Instrumental }) => {
    // All premium tracks show preview for non-subscribed users
    const hasPreview = item.is_premium && !isSubscribed;
    
    return (
      <TouchableOpacity style={styles.trackItem} onPress={() => handleTrackPress(item)} activeOpacity={0.8}>
        <LinearGradient
          colors={[item.thumbnail_color, COLORS.cardBg]}
          style={styles.trackThumbnail}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="musical-note" size={20} color="rgba(255, 255, 255, 0.5)" />
          {item.is_premium && !isSubscribed && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={10} color={COLORS.accentGold} />
            </View>
          )}
        </LinearGradient>
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.trackMeta}>
            <View style={styles.moodTag}>
              <Text style={styles.moodTagText}>{item.mood}</Text>
            </View>
            {hasPreview && (
              <View style={styles.previewTag}>
                <Ionicons name="play-circle" size={10} color={COLORS.preview} />
                <Text style={styles.previewTagText}>Preview</Text>
              </View>
            )}
            <Text style={styles.trackDuration}>{item.duration_formatted}</Text>
          </View>
        </View>
        <View style={styles.playIconContainer}>
          <Ionicons name="play" size={18} color={COLORS.accentBlue} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <IslamicPatternBg />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, isSearchFocused && styles.searchInputFocused]}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search instrumentals..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mood Filters */}
      <View style={styles.moodFiltersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={moods}
          renderItem={({ item }) => renderMoodChip(item)}
          keyExtractor={item => item}
          contentContainerStyle={styles.moodFiltersContent}
        />
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accentBlue} />
        </View>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try different keywords or filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTracks}
          renderItem={renderTrackItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tracksList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInputFocused: {
    borderColor: COLORS.accentBlue,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  moodFiltersContainer: {
    marginTop: 16,
  },
  moodFiltersContent: {
    paddingHorizontal: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  tracksList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  trackThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 14,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  moodTag: {
    backgroundColor: 'rgba(86, 101, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  moodTagText: {
    color: COLORS.accentBlue,
    fontSize: 11,
    fontWeight: '500',
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  previewTagText: {
    color: COLORS.preview,
    fontSize: 10,
    fontWeight: '600',
  },
  trackDuration: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  playIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(86, 101, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
