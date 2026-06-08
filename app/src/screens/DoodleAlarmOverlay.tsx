import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Vibration,
  SafeAreaView
} from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/theme/theme';
import { BellIcon } from '@/components/BellIcon';

export const DoodleAlarmOverlay: React.FC = () => {
  const { colors, cleanCard, cleanButton } = useTheme();
  const { triggeredAlarms, dismissReminder } = useSocket();

  // If there's an active alarm in the queue
  const activeAlarm = triggeredAlarms.length > 0 ? triggeredAlarms[0] : null;

  // Trigger continuous pulsing haptics when alarm is ringing
  useEffect(() => {
    if (activeAlarm) {
      const interval = setInterval(() => {
        Vibration.vibrate([0, 400, 200, 400]);
      }, 1500);
      return () => {
        clearInterval(interval);
        Vibration.cancel();
      };
    }
  }, [activeAlarm]);

  if (!activeAlarm) return null;

  const handleSilence = () => {
    dismissReminder(activeAlarm.id);
  };

  return (
    <Modal visible={true} transparent animationType="fade">
      <SafeAreaView style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={styles.contentWrapper}>
          
          <View style={[styles.alarmCard, cleanCard(colors.border), { backgroundColor: colors.background }]}>
            
            {/* Bell Icon Wrapper */}
            <View style={[styles.bellIconBg, { backgroundColor: colors.dangerPen + '15' }]}>
              <BellIcon size={44} color={colors.dangerPen} />
            </View>
            
            <Text style={[styles.alertHeader, { color: colors.dangerPen }]}>
              Reminder Alert
            </Text>

            {/* Group or Personal Badge */}
            {activeAlarm.isGroup ? (
              <View style={[styles.badge, { backgroundColor: colors.marginLine + '15', borderColor: colors.marginLine + '30' }]}>
                <Text style={[styles.badgeText, { color: colors.marginLine }]}>
                  👥 Group: {activeAlarm.groupName}
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: colors.inkSecondary + '10', borderColor: colors.inkSecondary + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.inkSecondary }]}>
                  🔒 Personal Alert
                </Text>
              </View>
            )}

            {/* Alarm Title */}
            <Text style={[styles.alarmTitle, { color: colors.ink }]}>
              {activeAlarm.title}
            </Text>

            {/* Description */}
            {activeAlarm.description ? (
              <Text style={[styles.alarmDesc, { color: colors.inkSecondary }]}>
                {activeAlarm.description}
              </Text>
            ) : null}

            <Text style={[styles.creatorText, { color: colors.inkSecondary }]}>
              Scribbled by @{activeAlarm.creatorUsername}
            </Text>

            {/* Silence Button */}
            <TouchableOpacity
              onPress={handleSilence}
              style={[styles.silenceBtn, cleanButton(colors.dangerPen)]}
            >
              <Text style={styles.silenceBtnText}>Silence Alarm</Text>
            </TouchableOpacity>

            {activeAlarm.isGroup && (
              <Text style={[styles.syncHint, { color: colors.inkSecondary }]}>
                (Silencing syncs across other group members)
              </Text>
            )}
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  alarmCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  bellIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertHeader: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  alarmTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  alarmDesc: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  creatorText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 28,
  },
  silenceBtn: {
    width: '100%',
    paddingVertical: 14,
  },
  silenceBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  syncHint: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginTop: 10,
    textAlign: 'center',
  },
});
