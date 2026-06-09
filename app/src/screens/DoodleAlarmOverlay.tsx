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
import { Audio } from 'expo-av';

const DEFAULT_SOUNDS: Record<string, any> = {
  alarm_classic: require('../../assets/sounds/alarm_classic.mp3'),
  calendar_chime: require('../../assets/sounds/calendar_chime.mp3'),
  reminder_alert: require('../../assets/sounds/reminder_alert.mp3'),
  hourly_chime: require('../../assets/sounds/hourly_chime.mp3'),
  hummingbird_sweet: require('../../assets/sounds/hummingbird_sweet.mp3'),
  memories_melody: require('../../assets/sounds/memories_melody.mp3'),
  message_pop: require('../../assets/sounds/message_pop.mp3'),
  tink_soft: require('../../assets/sounds/tink_soft.mp3')
};

export const DoodleAlarmOverlay: React.FC = () => {
  const { colors, cleanCard, cleanButton } = useTheme();
  const { triggeredAlarms, dismissReminder } = useSocket();

  // If there's an active alarm in the queue
  const activeAlarm = triggeredAlarms.length > 0 ? triggeredAlarms[0] : null;

  // Configure audio mode on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true,
    }).catch(err => console.warn('Failed to set audio mode:', err));
  }, []);

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

  // Trigger looped sound playback when alarm is ringing
  useEffect(() => {
    let alarmSound: Audio.Sound | null = null;

    const startAlarmSound = async () => {
      try {
        if (!activeAlarm) return;

        let soundSource: any;
        const soundConfig = activeAlarm.sound;

        if (soundConfig && soundConfig.type === 'custom' && soundConfig.uri) {
          soundSource = { uri: soundConfig.uri };
        } else {
          // Default sound fallback
          const soundId = soundConfig?.uri || 'alarm_classic';
          soundSource = DEFAULT_SOUNDS[soundId] || DEFAULT_SOUNDS.alarm_classic;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          soundSource,
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        alarmSound = newSound;
      } catch (err) {
        console.warn('Failed to play alarm sound:', err);
      }
    };

    if (activeAlarm) {
      startAlarmSound();
    }

    return () => {
      if (alarmSound) {
        alarmSound.stopAsync().catch(() => {});
        alarmSound.unloadAsync().catch(() => {});
        alarmSound = null;
      }
    };
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
