// Notification Service - Handles OneSignal and local notification storage
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONESIGNAL_APP_ID = '72b2bda6-e0c4-4752-90cb-6262d4c48f09';
const NOTIFICATIONS_STORAGE_KEY = 'sadaa_notifications';

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  data?: Record<string, any>;
  imageUrl?: string;
}

class NotificationService {
  private oneSignal: any = null;
  private isInitialized = false;
  private notificationListeners: ((notifications: StoredNotification[]) => void)[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Only initialize OneSignal on native platforms
      if (Platform.OS !== 'web') {
        const OneSignal = require('react-native-onesignal').OneSignal;
        this.oneSignal = OneSignal;

        // Initialize OneSignal
        OneSignal.initialize(ONESIGNAL_APP_ID);

        // Request notification permission
        OneSignal.Notifications.requestPermission(true);

        // Set up notification listeners
        this.setupListeners();
      }

      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  private setupListeners(): void {
    if (!this.oneSignal) return;

    // Foreground notification listener
    this.oneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      console.log('Foreground notification received:', event);
      const notification = event.getNotification();
      this.storeNotification({
        id: notification.notificationId || Date.now().toString(),
        title: notification.title || 'New Notification',
        body: notification.body || '',
        timestamp: Date.now(),
        read: false,
        data: notification.additionalData,
        imageUrl: notification.bigPicture,
      });
      // Allow notification to display
      event.getNotification().display();
    });

    // Notification click listener
    this.oneSignal.Notifications.addEventListener('click', (event: any) => {
      console.log('Notification clicked:', event);
      const notification = event.notification;
      this.storeNotification({
        id: notification.notificationId || Date.now().toString(),
        title: notification.title || 'New Notification',
        body: notification.body || '',
        timestamp: Date.now(),
        read: false,
        data: notification.additionalData,
        imageUrl: notification.bigPicture,
      });
    });
  }

  async storeNotification(notification: StoredNotification): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      
      // Check for duplicates
      const exists = notifications.some(n => n.id === notification.id);
      if (exists) return;

      // Add new notification at the beginning
      const updated = [notification, ...notifications];
      
      // Keep only last 100 notifications
      const trimmed = updated.slice(0, 100);
      
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));
      
      // Notify listeners
      this.notifyListeners(trimmed);
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  async getNotifications(): Promise<StoredNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const updated = notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      this.notifyListeners(updated);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const updated = notifications.map(n => ({ ...n, read: true }));
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      this.notifyListeners(updated);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const updated = notifications.filter(n => n.id !== id);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      this.notifyListeners(updated);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
      this.notifyListeners([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  async getUnreadCount(): Promise<number> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => !n.read).length;
  }

  subscribe(listener: (notifications: StoredNotification[]) => void): () => void {
    this.notificationListeners.push(listener);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(notifications: StoredNotification[]): void {
    this.notificationListeners.forEach(listener => listener(notifications));
  }

  // For testing - add a fake notification
  async addTestNotification(): Promise<void> {
    await this.storeNotification({
      id: Date.now().toString(),
      title: 'New Instrumental Added! 🎵',
      body: 'Check out our latest Dawoodi Bohra instrumental - "Ya Sahib al-Taj"',
      timestamp: Date.now(),
      read: false,
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
