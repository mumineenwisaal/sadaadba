import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

const SUPPORT_EMAIL = 'dawoodibohrainstrumental@gmail.com';

type QueryType = 'query' | 'suggestion' | 'issue';

interface QueryOption {
  id: QueryType;
  label: string;
  icon: string;
}

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<QueryType>('query');
  const [message, setMessage] = useState('');

  const queryOptions: QueryOption[] = [
    { id: 'query', label: 'Query', icon: 'help-circle' },
    { id: 'suggestion', label: 'Suggestion', icon: 'bulb' },
    { id: 'issue', label: 'Issue', icon: 'warning' },
  ];

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Empty Message', 'Please write your message before sending.');
      return;
    }

    const subject = encodeURIComponent('Instrumental App Support');
    const typeLabel = queryOptions.find(q => q.id === selectedType)?.label || 'Query';
    const body = encodeURIComponent(
      `Type: ${typeLabel}\n\n${message.trim()}\n\n---\nSent from Sadaa Instrumentals App`
    );
    
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email Not Available',
          'Please send your message to:\n\n' + SUPPORT_EMAIL,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert('Error', 'Failed to open email app. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Description */}
          <View style={styles.descriptionCard}>
            <Ionicons name="mail" size={28} color={COLORS.accentGold} />
            <Text style={styles.descriptionText}>
              Have a query, suggestion, or facing an issue? We're here to help! Send us a message and we'll get back to you as soon as possible.
            </Text>
          </View>

          {/* Query Type Selection */}
          <Text style={styles.sectionLabel}>What would you like to share?</Text>
          <View style={styles.queryTypeContainer}>
            {queryOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.queryTypeOption,
                  selectedType === option.id && styles.queryTypeOptionSelected,
                ]}
                onPress={() => setSelectedType(option.id)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={22}
                  color={selectedType === option.id ? COLORS.accentGold : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.queryTypeText,
                    selectedType === option.id && styles.queryTypeTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message Input */}
          <Text style={styles.sectionLabel}>Your Message</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Write your message here..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />
          </View>

          {/* Character Count */}
          <Text style={styles.charCount}>{message.length} / 1000 characters</Text>

          {/* Contact Info */}
          <View style={styles.contactInfo}>
            <Ionicons name="information-circle" size={18} color={COLORS.textMuted} />
            <Text style={styles.contactInfoText}>
              Your message will be sent to our support email via your default email app.
            </Text>
          </View>
        </ScrollView>

        {/* Send Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              !message.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  descriptionCard: {
    backgroundColor: 'rgba(201, 169, 97, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 24,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  queryTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  queryTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  queryTypeOptionSelected: {
    borderColor: COLORS.accentGold,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
  },
  queryTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  queryTypeTextSelected: {
    color: COLORS.accentGold,
  },
  inputContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    marginBottom: 8,
  },
  textInput: {
    padding: 16,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 150,
    maxHeight: 200,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginBottom: 20,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 10,
  },
  contactInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentBlue,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
