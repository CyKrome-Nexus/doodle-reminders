import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal
} from 'react-native';
import { useSocket, Reminder } from '@/context/SocketContext';
import { useTheme } from '@/theme/theme';
import { FriendsScreen } from '@/screens/FriendsScreen';
import { CreateReminderModal } from '@/screens/CreateReminderModal';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { CategoriesScreen } from '@/screens/CategoriesScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ReminderDetailsScreen } from '@/screens/ReminderDetailsScreen';
import { Feather } from '@expo/vector-icons';
import { usePermissions } from '@/hooks/usePermissions';

type ActiveTabType = 'reminders' | 'calendar' | 'categories' | 'settings';
type FilterType = 'all' | 'today' | 'upcoming' | 'completed';

export const DashboardScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { reminders, user, dismissReminder, connected } = useSocket();
  const { permissions, openSettings } = usePermissions();

  const [activeTab, setActiveTab] = useState<ActiveTabType>('reminders');
  const [filter, setFilter] = useState<FilterType>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [friendsVisible, setFriendsVisible] = useState(false);
  
  // Details modal states
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Helper to determine category color and icon from title & category
  const getCategoryMetadata = (category?: string, title?: string) => {
    const cat = (category || 'Personal').toLowerCase();
    const t = (title || '').toLowerCase();
    
    if (t.includes('water') || t.includes('drink')) {
      return { color: '#4DA3FF', icon: 'droplet' as const };
    }
    if (t.includes('medication') || t.includes('pill') || t.includes('medicine')) {
      return { color: '#FF686B', icon: 'heart' as const };
    }
    if (t.includes('standup') || t.includes('meeting') || t.includes('work')) {
      return { color: '#3AC759', icon: 'calendar' as const };
    }
    
    switch (cat) {
      case 'work':
        return { color: '#3AC759', icon: 'calendar' as const };
      case 'health':
        return { color: '#FF686B', icon: 'heart' as const };
      case 'shopping':
        return { color: '#FFBD20', icon: 'shopping-bag' as const };
      case 'finance':
        return { color: '#4DA3FF', icon: 'dollar-sign' as const };
      case 'personal':
      default:
        return { color: '#7C5CFF', icon: 'user' as const };
    }
  };

  const handleOpenDetails = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setDetailsVisible(true);
  };

  const formatFriendlyDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      if (isToday) return `Today, ${timeStr}`;
      if (isTomorrow) return `Tomorrow, ${timeStr}`;
      
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  // Logic to split and filter reminders
  const getFilteredData = () => {
    // Basic filter based on state
    let activeReminders = reminders.filter(r => r.status !== 'completed' && !r.isDismissedByMe);
    let completedReminders = reminders.filter(r => r.status === 'completed' || r.isDismissedByMe);

    if (filter === 'completed') {
      return { today: [], upcoming: completedReminders };
    }

    const todayDateStr = new Date().toDateString();
    
    const todayReminders = activeReminders.filter(r => {
      const due = new Date(r.dueAt);
      return due.toDateString() === todayDateStr;
    });

    const upcomingReminders = activeReminders.filter(r => {
      const due = new Date(r.dueAt);
      return due.toDateString() !== todayDateStr;
    });

    if (filter === 'today') {
      return { today: todayReminders, upcoming: [] };
    }
    if (filter === 'upcoming') {
      return { today: [], upcoming: upcomingReminders };
    }

    return { today: todayReminders, upcoming: upcomingReminders };
  };

  const { today, upcoming } = getFilteredData();

  // Unified list data for flat list grouping
  const listData: { type: 'header' | 'reminder'; title?: string; count?: number; item?: Reminder }[] = [];
  
  if (filter !== 'completed') {
    if (today.length > 0) {
      listData.push({ type: 'header', title: 'Today', count: today.length });
      today.forEach(item => listData.push({ type: 'reminder', item }));
    }
    if (upcoming.length > 0) {
      listData.push({ type: 'header', title: 'Upcoming', count: upcoming.length });
      upcoming.forEach(item => listData.push({ type: 'reminder', item }));
    }
  } else {
    if (upcoming.length > 0) {
      listData.push({ type: 'header', title: 'Completed', count: upcoming.length });
      upcoming.forEach(item => listData.push({ type: 'reminder', item }));
    }
  }

  const renderItem = ({ item }: { item: typeof listData[0] }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>{item.title}</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.countBadgeText, { color: colors.inkSecondary }]}>{item.count}</Text>
          </View>
        </View>
      );
    }

    const reminder = item.item!;
    const isCompleted = reminder.status === 'completed' || reminder.isDismissedByMe;
    const meta = getCategoryMetadata(reminder.category, reminder.title);

    return (
      <TouchableOpacity
        style={[
          styles.reminderCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border }
        ]}
        onPress={() => handleOpenDetails(reminder)}
      >
        {/* Left Checkbox */}
        <TouchableOpacity
          onPress={() => !isCompleted && dismissReminder(reminder.id)}
          disabled={isCompleted}
          style={styles.checkboxTouch}
        >
          <Feather 
            name={isCompleted ? "check-circle" : "circle"} 
            size={22} 
            color={isCompleted ? colors.marginLine : colors.inkSecondary} 
          />
        </TouchableOpacity>

        {/* Center Details */}
        <View style={styles.textContainer}>
          <Text style={[
            styles.reminderTitle,
            { color: colors.ink },
            isCompleted && styles.strikeThrough
          ]}>
            {reminder.title}
          </Text>
          <Text style={[
            styles.timeText,
            { color: meta.color }
          ]}>
            {formatFriendlyDate(reminder.dueAt)}
          </Text>
        </View>

        {/* Right Icon */}
        <View style={styles.iconContainer}>
          <Feather name={meta.icon} size={18} color={meta.color} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'calendar':
        return <CalendarScreen />;
      case 'categories':
        return <CategoriesScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'reminders':
      default:
        return (
          <View style={styles.remindersWrapper}>
            {/* Filter Toggle Chips Row */}
            <View style={styles.filterRow}>
              {(['all', 'today', 'upcoming', 'completed'] as FilterType[]).map((f) => {
                const isActive = filter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[
                      styles.filterChip,
                      { backgroundColor: isActive ? colors.marginLine : colors.border }
                    ]}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: isActive ? '#FFFFFF' : colors.inkSecondary }
                    ]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* List */}
            <FlatList
              data={listData}
              keyExtractor={(item, index) => item.item?.id || `header-${index}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Feather name="inbox" size={42} color={colors.inkSecondary} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>
                    No reminders found.
                  </Text>
                </View>
              )}
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {activeTab === 'reminders' && (
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingText, { color: colors.inkSecondary }]}>
              Good morning,
            </Text>
            <Text style={[styles.welcomeText, { color: colors.ink }]}>
              {user?.name || user?.username || 'Alex'} 👋
            </Text>
          </View>
          <TouchableOpacity onPress={() => setFriendsVisible(true)} style={[styles.socialBtn, { borderColor: colors.border }]}>
            <Feather name="users" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
      )}

      {permissions.notifications === 'denied' && (
        <View style={[styles.warningBanner, { backgroundColor: colors.dangerPen + '15', borderColor: colors.dangerPen }]}>
          <Feather name="bell-off" size={18} color={colors.dangerPen} style={styles.warningIcon} />
          <Text style={[styles.warningText, { color: colors.ink }]}>
            Notifications disabled. Reminder alerts won't play.
          </Text>
          <TouchableOpacity onPress={openSettings} style={[styles.warningBtn, { backgroundColor: colors.dangerPen }]}>
            <Text style={styles.warningBtnText}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Tab Screen Area */}
      <View style={{ flex: 1 }}>
        {renderActiveScreen()}
      </View>

      {/* Bottom Navigation Wrapper */}
      <View style={styles.bottomBarContainer}>
        {/* Custom Bottom Navigation Bar */}
        <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.barItem} onPress={() => setActiveTab('reminders')}>
            <Feather name="home" size={22} color={activeTab === 'reminders' ? colors.marginLine : colors.inkSecondary} />
            <Text style={[styles.barText, { color: activeTab === 'reminders' ? colors.marginLine : colors.inkSecondary }]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.barItem} onPress={() => setActiveTab('calendar')}>
            <Feather name="calendar" size={22} color={activeTab === 'calendar' ? colors.marginLine : colors.inkSecondary} />
            <Text style={[styles.barText, { color: activeTab === 'calendar' ? colors.marginLine : colors.inkSecondary }]}>Calendar</Text>
          </TouchableOpacity>

          {/* Empty Space for Center floating plus button */}
          <View style={styles.barItemEmpty} />

          <TouchableOpacity style={styles.barItem} onPress={() => setActiveTab('categories')}>
            <Feather name="folder" size={22} color={activeTab === 'categories' ? colors.marginLine : colors.inkSecondary} />
            <Text style={[styles.barText, { color: activeTab === 'categories' ? colors.marginLine : colors.inkSecondary }]}>Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.barItem} onPress={() => setActiveTab('settings')}>
            <Feather name="settings" size={22} color={activeTab === 'settings' ? colors.marginLine : colors.inkSecondary} />
            <Text style={[styles.barText, { color: activeTab === 'settings' ? colors.marginLine : colors.inkSecondary }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Center Floating Plus Button */}
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={[styles.floatingAddBtn, { backgroundColor: colors.marginLine }]}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Friends overlay modal sheet */}
      <Modal visible={friendsVisible} animationType="slide" onRequestClose={() => setFriendsVisible(false)}>
        <SafeAreaView style={[styles.friendsContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.friendsHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setFriendsVisible(false)} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={colors.ink} />
            </TouchableOpacity>
            <Text style={[styles.friendsTitle, { color: colors.ink }]}>Friends & Groups</Text>
            <View style={{ width: 40 }} />
          </View>
          <FriendsScreen />
        </SafeAreaView>
      </Modal>

      {/* Modals */}
      <CreateReminderModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />

      <ReminderDetailsScreen
        reminder={selectedReminder}
        visible={detailsVisible}
        onClose={() => {
          setDetailsVisible(false);
          setSelectedReminder(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  greetingText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    marginTop: -2,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remindersWrapper: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginRight: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  checkboxTouch: {
    padding: 4,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginTop: 2,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyContainer: {
    paddingVertical: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  bottomBarContainer: {
    position: 'relative',
    height: 72,
  },
  bottomBar: {
    flexDirection: 'row',
    height: 72,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  barItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  barItemEmpty: {
    flex: 1,
  },
  barText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
  },
  floatingAddBtn: {
    position: 'absolute',
    alignSelf: 'center',
    top: -20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  friendsContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  friendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  friendsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  warningIcon: {
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 16,
  },
  warningBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  warningBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
});
