import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/theme/theme';
import { Feather } from '@expo/vector-icons';

export const CalendarScreen: React.FC = () => {
  const { reminders } = useSocket();
  const { colors } = useTheme();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const totalDays = getDaysInMonth(year, month);
  const offset = getFirstDayOfMonth(year, month);

  const calendarCells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(new Date(year, month, d));
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const hasReminders = (date: Date) => {
    return reminders.some(r => {
      if (r.status !== 'pending') return false;
      const due = new Date(r.dueAt);
      return (
        due.getDate() === date.getDate() &&
        due.getMonth() === date.getMonth() &&
        due.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get reminders for selected day (both pending & completed)
  const dailyReminders = reminders.filter(r => {
    const due = new Date(r.dueAt);
    return (
      due.getDate() === selectedDate.getDate() &&
      due.getMonth() === selectedDate.getMonth() &&
      due.getFullYear() === selectedDate.getFullYear()
    );
  }).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const getCategoryColor = (category?: string, title?: string) => {
    const cat = (category || 'Personal').toLowerCase();
    const t = (title || '').toLowerCase();
    
    if (t.includes('water') || t.includes('drink')) return '#4DA3FF';
    if (t.includes('medication') || t.includes('pill') || t.includes('medicine')) return '#FF686B';
    
    if (cat === 'work') return '#3AC759';
    if (cat === 'health') return '#FF686B';
    if (cat === 'shopping') return '#FFBD20';
    if (cat === 'finance') return '#4DA3FF';
    return '#7C5CFF';
  };

  const formatSelectedDayHeader = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Mockup Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Feather name="menu" size={20} color={colors.ink} />
        </TouchableOpacity>
        
        <View style={styles.monthSelectorRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
            <Feather name="chevron-left" size={16} color={colors.inkSecondary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.ink }]}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
            <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleJumpToToday} style={styles.headerIconBtn}>
          <Feather name="calendar" size={20} color={colors.marginLine} />
        </TouchableOpacity>
      </View>

      {/* Weekdays S M T W T F S Header Row */}
      <View style={styles.daysOfWeekRow}>
        {daysOfWeek.map((day, idx) => (
          <Text key={idx} style={[styles.dayOfWeekLabel, { color: colors.inkSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.datesGridContainer}>
        <View style={styles.datesGrid}>
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <View key={`empty-${index}`} style={styles.dateCell} />;
            }

            const isSelected = 
              cell.getDate() === selectedDate.getDate() &&
              cell.getMonth() === selectedDate.getMonth() &&
              cell.getFullYear() === selectedDate.getFullYear();

            const isToday = 
              cell.getDate() === new Date().getDate() &&
              cell.getMonth() === new Date().getMonth() &&
              cell.getFullYear() === new Date().getFullYear();

            const cellHasReminders = hasReminders(cell);

            return (
              <TouchableOpacity
                key={`date-${index}`}
                style={[
                  styles.dateCell,
                  isSelected && [styles.selectedCell, { backgroundColor: colors.marginLine }],
                ]}
                onPress={() => setSelectedDate(cell)}
              >
                <Text
                  style={[
                    styles.dateText,
                    { color: colors.ink },
                    isSelected && { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' },
                    isToday && !isSelected && { color: colors.marginLine, fontFamily: 'Poppins_700Bold' }
                  ]}
                >
                  {cell.getDate()}
                </Text>
                {cellHasReminders && (
                  <View 
                    style={[
                      styles.dotIndicator, 
                      { backgroundColor: isSelected ? '#FFFFFF' : colors.marginLine }
                    ]} 
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Agenda Header */}
      <View style={styles.agendaHeaderRow}>
        <Text style={[styles.agendaHeaderTitle, { color: colors.ink }]}>
          {formatSelectedDayHeader(selectedDate)}
        </Text>
      </View>

      {/* Agenda Items List */}
      {dailyReminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="calendar" size={32} color={colors.inkSecondary} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>No reminders scheduled</Text>
        </View>
      ) : (
        <ScrollView style={styles.agendaScroll} contentContainerStyle={styles.agendaScrollContent}>
          {dailyReminders.map((reminder) => {
            const dueTime = new Date(reminder.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const catColor = getCategoryColor(reminder.category, reminder.title);
            const isCompleted = reminder.status === 'completed';

            return (
              <View 
                key={reminder.id} 
                style={[
                  styles.agendaItemRow, 
                  { borderColor: colors.border }
                ]}
              >
                {/* Time */}
                <Text style={[styles.agendaTimeText, { color: colors.ink }, isCompleted && styles.strikeThrough]}>
                  {dueTime}
                </Text>
                
                {/* Colored Dot bullet */}
                <View style={[styles.bulletDot, { backgroundColor: catColor }]} />
                
                {/* Title */}
                <Text style={[styles.agendaTitleText, { color: colors.ink }, isCompleted && styles.strikeThrough]}>
                  {reminder.title}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthArrow: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginHorizontal: 8,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  dayOfWeekLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  datesGridContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 2,
  },
  selectedCell: {
    // Background color applied dynamically
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  agendaHeaderRow: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  agendaHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  agendaScroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  agendaScrollContent: {
    paddingBottom: 40,
  },
  agendaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  agendaTimeText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    width: 75,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  agendaTitleText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
});
