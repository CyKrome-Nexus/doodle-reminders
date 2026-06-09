import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, ScrollView, TextInput, LayoutAnimation, Platform, UIManager, Alert } from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/theme/theme';
import { Feather } from '@expo/vector-icons';
import { BellIcon } from '@/components/BellIcon';
import { usePermissions } from '@/hooks/usePermissions';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SettingsScreen: React.FC = () => {
  const { user, updateUserSettings, logout } = useSocket();
  const { colors, isDark } = useTheme();
  const {
    permissions,
    requestNotifications,
    requestContacts,
    requestCamera,
    requestMicrophone,
    requestStorage,
    openSettings,
  } = usePermissions();

  const handleTogglePermission = async (type: 'contacts' | 'storage' | 'camera' | 'microphone', currentStatus: string) => {
    animateLayout();
    if (currentStatus === 'granted') {
      Alert.alert(
        'Disable Permission',
        'To disable this permission, please toggle it off in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings }
        ]
      );
    } else if (currentStatus === 'denied') {
      Alert.alert(
        'Enable Permission',
        'This permission was previously denied. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings }
        ]
      );
    } else {
      // Request permission
      if (type === 'contacts') await requestContacts();
      else if (type === 'storage') await requestStorage();
      else if (type === 'camera') await requestCamera();
      else if (type === 'microphone') await requestMicrophone();
    }
  };

  const animateLayout = () => {
    LayoutAnimation.configureNext({
      duration: 600,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleY,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };

  // Settings context fallback state
  const settings = user?.settings || {
    theme: 'light',
    notifications: true,
    defaultReminderTime: '09:00 AM',
    snoozeDuration: 10,
  };

  const [notifications, setNotifications] = useState(settings.notifications);
  const [defaultTime, setDefaultTime] = useState(settings.defaultReminderTime);
  const [snooze, setSnooze] = useState(String(settings.snoozeDuration));
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingSnooze, setIsEditingSnooze] = useState(false);
  const [isEditingTheme, setIsEditingTheme] = useState(false);

  const handleToggleNotifications = (val: boolean) => {
    animateLayout();
    setNotifications(val);
    updateUserSettings({ notifications: val });
  };

  const handleSaveTime = () => {
    animateLayout();
    setIsEditingTime(false);
    updateUserSettings({ defaultReminderTime: defaultTime });
  };

  const handleSaveSnooze = () => {
    animateLayout();
    setIsEditingSnooze(false);
    const num = parseInt(snooze, 10);
    if (!isNaN(num)) {
      updateUserSettings({ snoozeDuration: num });
    }
  };


  const getThemeLabel = (themeMode: 'light' | 'dark' | 'system') => {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>

      {/* Profile summary card */}
      <View style={[styles.profileCard, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
        <View style={[styles.avatar, { backgroundColor: colors.marginLine }]}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileTextCol}>
          <Text style={[styles.profileName, { color: colors.ink }]}>{user?.name || 'User Profile'}</Text>
          <Text style={[styles.profileSub, { color: colors.inkSecondary }]}>@{user?.username || 'user'}</Text>
        </View>
      </View>

      {/* Main preferences section */}
      <View style={[styles.settingsGroupCard, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
        {/* Row 1: Notifications switch */}
        <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <BellIcon size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#CED4DA', true: colors.marginLine + '60' }}
            thumbColor={notifications ? colors.marginLine : '#F8F9FA'}
          />
        </View>

        {/* Row 2: Default Reminder Time */}
        <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Feather name="clock" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Default Reminder Time</Text>
          </View>
          {isEditingTime ? (
            <View style={styles.editRow}>
              <TextInput
                value={defaultTime}
                onChangeText={setDefaultTime}
                style={[styles.input, { color: colors.ink, borderColor: colors.border }]}
                onSubmitEditing={handleSaveTime}
                autoFocus
              />
              <TouchableOpacity onPress={handleSaveTime} style={[styles.saveBtn, { backgroundColor: colors.marginLine }]}>
                <Feather name="check" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { animateLayout(); setIsEditingTime(true); }} style={styles.rowRightClickable}>
              <Text style={[styles.rowValueText, { color: colors.inkSecondary }]}>{defaultTime}</Text>
              <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Row 3: Snooze Duration */}
        <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Feather name="bell-off" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Snooze Duration</Text>
          </View>
          {isEditingSnooze ? (
            <View style={styles.editRow}>
              <TextInput
                value={snooze}
                onChangeText={setSnooze}
                style={[styles.input, { color: colors.ink, borderColor: colors.border }]}
                keyboardType="number-pad"
                onSubmitEditing={handleSaveSnooze}
                autoFocus
              />
              <Text style={{ marginRight: 6, color: colors.ink, fontSize: 13, fontFamily: 'Poppins_400Regular' }}>min</Text>
              <TouchableOpacity onPress={handleSaveSnooze} style={[styles.saveBtn, { backgroundColor: colors.marginLine }]}>
                <Feather name="check" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { animateLayout(); setIsEditingSnooze(true); }} style={styles.rowRightClickable}>
              <Text style={[styles.rowValueText, { color: colors.inkSecondary }]}>{snooze} min</Text>
              <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Row 4: Backup & Sync */}
        <TouchableOpacity style={[styles.settingsRow, { borderBottomColor: colors.border }]} activeOpacity={0.8}>
          <View style={styles.rowLeft}>
            <Feather name="cloud" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Backup & Sync</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
        </TouchableOpacity>

        {/* Row 5: Import Reminders */}
        <TouchableOpacity style={styles.settingsRow} activeOpacity={0.8}>
          <View style={styles.rowLeft}>
            <Feather name="download" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Import Reminders</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
        </TouchableOpacity>
      </View>

      {/* Row 6: Theme select row */}
      <View style={[styles.settingsGroupCard, { borderColor: colors.border, marginTop: 16, backgroundColor: colors.cardBg }]}>
        <TouchableOpacity
          onPress={() => {
            animateLayout();
            setIsEditingTheme(!isEditingTheme);
          }}
          style={[styles.settingsRow, { borderBottomColor: colors.border }, isEditingTheme && { borderBottomWidth: 0 }]}
          activeOpacity={0.8}
        >
          <View style={styles.rowLeft}>
            <Feather name={settings.theme === 'dark' ? 'moon' : 'sun'} size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Theme</Text>
          </View>
          <View style={styles.rowRightClickable}>
            <Text style={[styles.rowValueText, { color: colors.inkSecondary }]}>{getThemeLabel(settings.theme || 'light')}</Text>
            <Feather name={isEditingTheme ? "chevron-down" : "chevron-right"} size={16} color={colors.inkSecondary} />
          </View>
        </TouchableOpacity>

        {isEditingTheme && (
          <View style={[styles.themeDropdown, { borderTopColor: colors.border }]}>
            {(['light', 'dark', 'system'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  animateLayout();
                  updateUserSettings({ theme: t });
                  setIsEditingTheme(false);
                }}
                style={[
                  styles.themeOption,
                  settings.theme === t && [styles.themeOptionSelected, { backgroundColor: colors.border }]
                ]}
              >
                <Text style={[
                  styles.themeOptionText,
                  { color: colors.ink },
                  settings.theme === t && { fontFamily: 'Poppins_600SemiBold' }
                ]}>
                  {getThemeLabel(t)}
                </Text>
                {settings.theme === t && (
                  <Feather name="check" size={16} color={colors.marginLine} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Row 7: About Doodle Reminders */}
        <TouchableOpacity style={[styles.settingsRow, { borderBottomColor: colors.border }]} activeOpacity={0.8}>
          <View style={styles.rowLeft}>
            <Feather name="info" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>About Doodle Reminders</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
        </TouchableOpacity>

        {/* Row 8: Help & Feedback */}
        <TouchableOpacity style={styles.settingsRow} activeOpacity={0.8}>
          <View style={styles.rowLeft}>
            <Feather name="help-circle" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Help & Feedback</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
        </TouchableOpacity>
      </View>

      {/* App Permissions Section */}
      <View style={[styles.settingsGroupCard, { borderColor: colors.border, marginTop: 16, backgroundColor: colors.cardBg }]}>
        <View style={[styles.settingsRow, { borderBottomColor: colors.border, paddingVertical: 12 }]}>
          <Text style={[styles.sectionHeading, { color: colors.inkSecondary }]}>App Permissions</Text>
        </View>

        {/* Permission: Notifications (Required) */}
        <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Feather name="bell" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Notifications (Required)</Text>
          </View>
          {permissions.notifications === 'granted' ? (
            <Text style={[styles.permissionStatusGranted, { color: colors.successPen }]}>Enabled</Text>
          ) : (
            <TouchableOpacity onPress={openSettings} style={[styles.permissionBtnEnable, { backgroundColor: colors.dangerPen }]}>
              <Text style={styles.permissionBtnText}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Permission: Contacts */}
        <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Feather name="users" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Contacts</Text>
          </View>
          <Switch
            value={permissions.contacts === 'granted'}
            onValueChange={() => handleTogglePermission('contacts', permissions.contacts)}
            trackColor={{ false: '#CED4DA', true: colors.marginLine + '60' }}
            thumbColor={permissions.contacts === 'granted' ? colors.marginLine : '#F8F9FA'}
          />
        </View>

        {/* Permission: Storage */}
        <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Feather name="hard-drive" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Storage</Text>
          </View>
          <Switch
            value={permissions.storage === 'granted'}
            onValueChange={() => handleTogglePermission('storage', permissions.storage)}
            trackColor={{ false: '#CED4DA', true: colors.marginLine + '60' }}
            thumbColor={permissions.storage === 'granted' ? colors.marginLine : '#F8F9FA'}
          />
        </View>

        {/* Permission: Camera */}
        <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Feather name="camera" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Camera</Text>
          </View>
          <Switch
            value={permissions.camera === 'granted'}
            onValueChange={() => handleTogglePermission('camera', permissions.camera)}
            trackColor={{ false: '#CED4DA', true: colors.marginLine + '60' }}
            thumbColor={permissions.camera === 'granted' ? colors.marginLine : '#F8F9FA'}
          />
        </View>

        {/* Permission: Microphone */}
        <View style={styles.settingsRow}>
          <View style={styles.rowLeft}>
            <Feather name="mic" size={18} color={colors.ink} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.ink }]}>Microphone</Text>
          </View>
          <Switch
            value={permissions.microphone === 'granted'}
            onValueChange={() => handleTogglePermission('microphone', permissions.microphone)}
            trackColor={{ false: '#CED4DA', true: colors.marginLine + '60' }}
            thumbColor={permissions.microphone === 'granted' ? colors.marginLine : '#F8F9FA'}
          />
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity onPress={logout} style={styles.logoutButton} activeOpacity={0.8}>
        <Text style={[styles.logoutText, { color: colors.dangerPen }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  profileTextCol: {
    marginLeft: 14,
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  profileSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  settingsGroupCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 14,
    width: 18,
    textAlign: 'center',
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  rowRightClickable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValueText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginRight: 6,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 90,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginRight: 8,
  },
  saveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeDropdown: {
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  themeOptionSelected: {
    // Background color applied dynamically
  },
  themeOptionText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 32,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  permissionStatusGranted: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    marginRight: 6,
  },
  permissionBtnEnable: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 6,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
});
