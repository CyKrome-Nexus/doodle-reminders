import { useColorScheme } from 'react-native';
import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

export const colors = {
  light: {
    background: '#FFFFFF',         // Match Figma white background
    paperLines: '#F2F3F5',         // Modern subtle divider line
    marginLine: '#7C5CFF',         // Main accent purple
    ink: '#1F1F24',                // Deep charcoal
    inkSecondary: '#7A7A8A',       // Soft grey text
    primaryPen: '#7C5CFF',         // Purple accent
    highlighter: '#E699FF',        // Lavender highlight
    successPen: '#3AC759',         // Premium green
    dangerPen: '#FF686B',          // Premium red
    warningPen: '#FFBD20',         // Warning yellow/orange
    infoPen: '#4DA3FF',            // Blue info accent
    cardBg: '#FFFFFF',             // Clean white
    shadowColor: 'rgba(0, 0, 0, 0.03)', // Subtle card shadow
    border: '#F2F3F5',             // Input borders
  },
  dark: {
    background: '#121212',         // Deep slate dark background
    paperLines: '#2A2A2A',         // Subtle divider line
    marginLine: '#9B82FF',         // Vibrant purple for dark mode
    ink: '#FFFFFF',                // Pure white text
    inkSecondary: '#A5A5B5',       // Dusty light gray
    primaryPen: '#9B82FF',         // Light purple accent
    highlighter: '#D473FF',        // Light violet highlight
    successPen: '#42D867',         // Bright green
    dangerPen: '#FF7B7E',          // Bright red
    warningPen: '#FFC83B',         // Bright yellow/orange
    infoPen: '#66B2FF',            // Bright info blue
    cardBg: '#1F1F1F',             // Dark charcoal card
    shadowColor: 'rgba(0, 0, 0, 0.3)', // Slightly stronger dark shadow
    border: '#2C2C2C',             // Input dark borders
  }
};

export type ThemeType = typeof colors.light;

export function useTheme() {
  const socketContext = useContext(SocketContext);
  const systemScheme = useColorScheme();
  
  // Extract theme preference from user settings or fallback to system
  const userThemePreference = socketContext?.user?.settings?.theme || 'light';
  
  let activeScheme: 'light' | 'dark' = 'light';
  if (userThemePreference === 'system') {
    activeScheme = systemScheme === 'dark' ? 'dark' : 'light';
  } else {
    activeScheme = userThemePreference === 'dark' ? 'dark' : 'light';
  }

  const activeColors = colors[activeScheme];

  // Helper styles for clean cards, inputs, and buttons (replacing hand-drawn style)
  const cleanCardStyle = (borderColor?: string, shadowColor?: string) => ({
    backgroundColor: activeColors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: borderColor || activeColors.border,
    shadowColor: shadowColor || activeColors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: activeScheme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 3,
    padding: 16,
  });

  const cleanInputStyle = (borderColor?: string) => ({
    backgroundColor: activeScheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
    borderWidth: 1,
    borderColor: borderColor || activeColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: activeColors.ink,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
  });

  const cleanButtonStyle = (backgroundColor?: string) => ({
    backgroundColor: backgroundColor || activeColors.primaryPen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: activeColors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  });

  const doodleButtonStyle = (borderColor?: any, shadowColor?: any) => ({
    backgroundColor: activeColors.primaryPen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: activeColors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  });

  return {
    colors: activeColors,
    isDark: activeScheme === 'dark',
    activeTheme: userThemePreference,
    cleanCard: cleanCardStyle,
    cleanInput: cleanInputStyle,
    cleanButton: cleanButtonStyle,
    
    // Maintain backwards compatibility with original helper names to avoid breaking builds
    doodleBorder: cleanCardStyle,
    doodleInput: cleanInputStyle,
    doodleButton: doodleButtonStyle,
  };
}
