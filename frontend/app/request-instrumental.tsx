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

export default function RequestInstrumentalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instrumentalName, setInstrumentalName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      Alert.alert('Contact Required', 'Please provide at least a phone number or email.');
      return;
    }
    if (!instrumentalName.trim()) {
      Alert.alert('Required Field', 'Please enter the instrumental/tune name.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please describe your requirement.');
      return;
    }

    const subject = encodeURIComponent('Custom Instrumental Request');
    const body = encodeURIComponent(
      `CUSTOM INSTRUMENTAL REQUEST\n` +
      `================================\n\n` +
      `Name: ${name.trim()}\n` +
      `Phone: ${phone.trim() || 'Not provided'}\n` +
      `Email: ${email.trim() || 'Not provided'}\n\n` +
      `REQUESTED INSTRUMENTAL\n` +
      `--------------------------------\n` +
      `Name/Tune: ${instrumentalName.trim()}\n\n` +
      `DESCRIPTION & REQUIREMENTS\n` +
      `--------------------------------\n` +
      `${description.trim()}\n\n` +
      `REFERENCE AUDIO\n` +
      `--------------------------------\n` +
      `Please attach your reference audio file to this email.\n\n` +
      `NOTE: Pricing will be shared privately after analyzing the tune.\n\n` +
      `---\n` +
      `Sent from Sadaa Instrumentals App`
    );
    
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email Not Available',
          'Please send your request to:\n\n' + SUPPORT_EMAIL,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert('Error', 'Failed to open email app. Please try again.');
    }
  };

  const isFormValid = name.trim() && (phone.trim() || email.trim()) && 
                      instrumentalName.trim() && description.trim();

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
          <Text style={styles.headerTitle}>Request Instrumental</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Description */}
          <View style={styles.descriptionCard}>
            <Ionicons name="musical-notes" size={28} color={COLORS.accentGold} />
            <View style={styles.descriptionContent}>
              <Text style={styles.descriptionTitle}>Custom Instrumental</Text>
              <Text style={styles.descriptionText}>
                Request a custom Dawoodi Bohra instrumental. Fill in your details and describe your requirement. Pricing will be shared privately after analyzing the tune.
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <Text style={styles.sectionTitle}>Your Details</Text>
          
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Instrumental Details</Text>

          {/* Instrumental Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Instrumental/Tune Name *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="musical-note" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder="E.g., Ya Sahib al-Taj"
                placeholderTextColor={COLORS.textMuted}
                value={instrumentalName}
                onChangeText={setInstrumentalName}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Describe Your Requirement *</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe how you want the instrumental - tempo, style, instruments to include, etc."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Reference Audio Note */}
          <View style={styles.referenceNote}>
            <View style={styles.referenceHeader}>
              <Ionicons name="attach" size={20} color={COLORS.accentGold} />
              <Text style={styles.referenceTitle}>Reference Audio</Text>
            </View>
            <Text style={styles.referenceText}>
              After tapping "Submit Request", your email app will open. You can attach a reference audio file directly to the email before sending.
            </Text>
          </View>

          {/* Pricing Note */}
          <View style={styles.pricingNote}>
            <Ionicons name="information-circle" size={18} color={COLORS.textMuted} />
            <Text style={styles.pricingText}>
              Pricing will be shared privately after analyzing your request and the reference tune.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid}
          >
            <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Submit Request</Text>
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
  descriptionContent: {
    flex: 1,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accentGold,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  textAreaContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
  },
  textArea: {
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  referenceNote: {
    backgroundColor: 'rgba(86, 101, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  referenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accentGold,
  },
  referenceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  pricingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 10,
  },
  pricingText: {
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentGold,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
