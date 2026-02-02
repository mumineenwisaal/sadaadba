// Dawoodi Bohra Instrumental App Theme
// Dark Navy Blue theme inspired by Islamic design

export const COLORS = {
  // Primary Background Colors
  primaryBg: '#10162A',        // Deep Navy Blue
  secondaryBg: '#1A2138',      // Slightly lighter navy
  cardBg: '#1E263C',           // Card background
  
  // Accent Colors
  accentBlue: '#5665FF',       // Electric Blue for active elements
  accentRed: '#EF3E3E',        // Crimson Red for favorites/hearts
  accentGold: '#C9A961',       // Gold accent
  
  // Button Colors
  buttonPrimary: '#5665FF',    // Primary button blue
  buttonSecondary: '#2B3447',  // Charcoal Grey
  buttonSuccess: '#4CAF50',    // Green for success states
  
  // Text Colors
  textPrimary: '#FFFFFF',      // White
  textSecondary: '#C8C8C8',    // Light Grey
  textMuted: '#8B9CB8',        // Muted text
  textDisabled: '#5A6680',     // Disabled text
  
  // Pattern and Overlay Colors
  patternLine: '#1E263C',      // Pattern line color
  patternOverlay: 'rgba(255, 255, 255, 0.08)', // Pattern overlay
  
  // Border Colors
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',
  
  // Tab Colors
  tabActive: '#5665FF',
  tabInactive: '#2B3447',
  
  // Status Colors
  premium: '#C9A961',
  free: '#4CAF50',
  preview: '#FF9800',
  offline: '#FF9800',
  downloaded: '#4CAF50',
  error: '#E53935',
};

export const GRADIENTS = {
  primary: ['#10162A', '#1A2138', '#10162A'],
  header: ['#1A2138', '#10162A'],
  card: ['#1E263C', '#10162A'],
  splash: ['#10162A', '#1A2138', '#10162A'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  title: 32,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const APP_NAME = 'Dawoodi Bohra Instrumental';
export const APP_TAGLINE = 'Sacred Melodies for the Soul';
