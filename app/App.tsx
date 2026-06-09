import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { 
  useFonts, 
  Poppins_400Regular, 
  Poppins_500Medium, 
  Poppins_600SemiBold, 
  Poppins_700Bold 
} from '@expo-google-fonts/poppins';
import { SocketProvider, useSocket } from '@/context/SocketContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { DoodleAlarmOverlay } from '@/screens/DoodleAlarmOverlay';
import { useTheme } from '@/theme/theme';
import { usePermissions } from '@/hooks/usePermissions';

// Main App Contents running inside Context
const AppContent: React.FC = () => {
  const { colors } = useTheme();
  const { isAuthenticated, user } = useSocket();
  const { requestNotifications } = usePermissions();

  useEffect(() => {
    // Request required Notification permission when the app starts
    requestNotifications();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Screen Routing: require completed signupStep to access dashboard */}
      {isAuthenticated && user && user.signupStep >= 4 ? <DashboardScreen /> : <AuthScreen />}

      {/* Global Real-Time Alarm Overlay (mounts at absolute root) */}
      <DoodleAlarmOverlay />
    </View>
  );
};

export default function App() {
  // Pre-load modern Poppins Google Font
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    PatrickHand: Poppins_400Regular, // Backwards compatibility fallback mapping
  });

  // Display clean loader while pre-loading assets
  if (!fontsLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color="#7C5CFF" />
          <Text style={styles.loaderText}>Loading Reminders... ✏️</Text>
        </View>
      </View>
    );
  }

  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  loaderText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    color: '#1F1F24',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
  },
});
