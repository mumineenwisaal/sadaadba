import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Instrumental } from '../../store/appStore';

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
    setCurrentTrack,
    isLoading,
  } = useAppStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery]);

  const handleTrackPress = (track: Instrumental) => {
    Keyboard.dismiss();
    if (track.is_premium && !isSubscribed) {
      router.push('/subscription');
    } else {
      setCurrentTrack(track);
      router.push('/player');
    }
  };

  const renderTrackItem = ({ item }: { item: Instrumental }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[item.thumbnail_color, '#2D1F3D']}
        style={styles.trackThumbnail}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="musical-note" size={20} color="rgba(255, 255, 255, 0.5)" />
        {item.is_premium && !isSubscribed && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={10} color="#C9A961" />
          </View>
        )}
      </LinearGradient>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.trackMeta}>
          <View style={styles.moodTag}>
            <Text style={styles.moodTagText}>{item.mood}</Text>
          </View>
          <Text style={styles.trackDuration}>{item.duration_formatted}</Text>
        </View>
      </View>
      <View style={styles.playIconContainer}>
        <Ionicons name="play" size={18} color="#4A3463" />
      </View>
    </TouchableOpacity>
  );

  const renderMoodFilter = () => (
    <View style={styles.moodFilterContainer}>
      <FlatList
        horizontal
        data={moods}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.moodChipsContainer}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.moodChip,
              selectedMood === item && styles.moodChipActive,
            ]}
            onPress={() => setSelectedMood(item)}
          >
            <Text
              style={[
                styles.moodChipText,
                selectedMood === item && styles.moodChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search" size={48} color="rgba(74, 52, 99, 0.3)" />
      <Text style={styles.emptyTitle}>
        {localQuery ? 'No Results Found' : 'Search Instrumentals'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {localQuery
          ? 'Try a different search term or mood filter'
          : 'Find your favorite madeh instrumentals'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8B8B8B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#8B8B8B"
            value={localQuery}
            onChangeText={(text) => {
              setLocalQuery(text);
              setIsSearching(true);
            }}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {localQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setLocalQuery('');
                setSearchQuery('');
              }}
            >
              <Ionicons name="close-circle" size={20} color="#8B8B8B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderMoodFilter()}

      {isSearching || isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A3463" />
        </View>
      ) : (
        <FlatList
          data={instrumentals}
          keyExtractor={(item) => item.id}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 99, 0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#2D2D2D',
  },
  moodFilterContainer: {
    marginTop: 16,
  },
  moodChipsContainer: {
    paddingHorizontal: 20,
  },
  moodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 99, 0.1)',
  },
  moodChipActive: {
    backgroundColor: '#4A3463',
    borderColor: '#4A3463',
  },
  moodChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A3463',
  },
  moodChipTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#4A3463',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  trackThumbnail: {
    width: 56,
    height: 56,
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
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  moodTag: {
    backgroundColor: 'rgba(74, 52, 99, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  moodTagText: {
    color: '#4A3463',
    fontSize: 11,
    fontWeight: '500',
  },
  trackDuration: {
    color: '#8B8B8B',
    fontSize: 12,
    marginLeft: 8,
  },
  playIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 52, 99, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8B8B8B',
    marginTop: 8,
    textAlign: 'center',
  },
});
