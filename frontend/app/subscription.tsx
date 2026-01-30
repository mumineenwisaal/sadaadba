import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';

const BENEFITS = [
  {
    icon: 'musical-notes',
    title: 'All Premium Instrumentals',
    description: 'Access the complete collection of sacred madeh music',
  },
  {
    icon: 'download',
    title: 'Offline Listening',
    description: 'Download tracks to listen without internet',
  },
  {
    icon: 'infinite',
    title: 'Unlimited Plays',
    description: 'No restrictions on how many times you can listen',
  },
  {
    icon: 'sparkles',
    title: 'New Releases',
    description: 'Early access to newly added instrumentals',
  },
  {
    icon: 'heart',
    title: 'Support the Community',
    description: 'Help preserve and share our sacred traditions',
  },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscribe, restorePurchase, isSubscribed, instrumentals } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const premiumCount = instrumentals.filter(i => i.is_premium).length;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await subscribe();
      if (success) {
        Alert.alert(
          'Subscription Activated',
          'Thank you for subscribing! You now have access to all premium instrumentals.',
          [
            {
              text: 'Start Listening',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchase();
      if (success) {
        Alert.alert(
          'Purchase Restored',
          'Your subscription has been restored successfully!',
          [
            {
              text: 'Continue',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert(
          'No Purchase Found',
          'We could not find any previous subscription to restore.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchase. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (isSubscribed) {
    return (
      <LinearGradient
        colors={['#4A3463', '#2D1F3D', '#1A1225']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.subscribedContent}>
          <View style={styles.diamondContainer}>
            <Ionicons name="diamond" size={64} color="#C9A961" />
          </View>
          <Text style={styles.subscribedTitle}>You're Premium!</Text>
          <Text style={styles.subscribedSubtitle}>
            Thank you for your support. Enjoy all {premiumCount} premium instrumentals.
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.back()}
          >
            <Text style={styles.continueButtonText}>Continue Listening</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#4A3463', '#2D1F3D', '#1A1225']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.diamondContainer}>
            <Ionicons name="diamond" size={48} color="#C9A961" />
          </View>
          <Text style={styles.title}>Sadaa Premium</Text>
          <Text style={styles.subtitle}>
            Unlock the complete collection of sacred instrumentals
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹53</Text>
          <Text style={styles.period}>/month</Text>
        </View>

        <View style={styles.benefitsContainer}>
          {BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon as any} size={22} color="#C9A961" />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{premiumCount}</Text>
            <Text style={styles.statLabel}>Premium Tracks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Mood Categories</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#C9A961', '#A38A4C']}
            style={styles.subscribeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#4A3463" />
            ) : (
              <>
                <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                <Text style={styles.subscribeButtonSubtext}>Cancel anytime</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#C9A961" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchase</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          This is a mock subscription for demonstration purposes. 
          No actual payment will be processed.
        </Text>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  diamondContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 32,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#C9A961',
  },
  period: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 4,
  },
  benefitsContainer: {
    marginTop: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  benefitDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '600',
    color: '#C9A961',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  subscribeButton: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  subscribeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A3463',
  },
  subscribeButtonSubtext: {
    fontSize: 12,
    color: 'rgba(74, 52, 99, 0.7)',
    marginTop: 4,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#C9A961',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  subscribedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  subscribedTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
  },
  subscribedSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  continueButton: {
    marginTop: 32,
    backgroundColor: '#C9A961',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A3463',
  },
  bottomSpacing: {
    height: 40,
  },
});
