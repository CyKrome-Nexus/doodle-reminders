import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSocket, Reminder } from '../context/SocketContext';
import { useTheme } from '../theme/theme';
import { Feather } from '@expo/vector-icons';

interface ReminderDetailsProps {
  reminder: Reminder | null;
  visible: boolean;
  onClose: () => void;
}

export const ReminderDetailsScreen: React.FC<ReminderDetailsProps> = ({ reminder, visible, onClose }) => {
  const { deleteReminder, dismissReminder } = useSocket();
  const { colors } = useTheme();

  if (!reminder) return null;

  const due = new Date(reminder.dueAt);
  const formattedDate = due.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
  const isCompleted = reminder.status === 'completed';

  const handleDismiss = () => {
    dismissReminder(reminder.id);
    onClose();
  };

  const handleDelete = () => {
    deleteReminder(reminder.id);
    onClose();
  };

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

  const catColor = getCategoryColor(reminder.category, reminder.title);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
          {/* Mockup Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Feather name="arrow-left" size={22} color={colors.ink} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.ink }]}>Reminder Details</Text>
            <TouchableOpacity style={styles.headerBtn}>
              <Feather name="more-horizontal" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Title Section */}
            <View style={styles.titleRow}>
              <TouchableOpacity 
                onPress={!isCompleted ? handleDismiss : undefined}
                style={styles.checkboxWrapper}
                disabled={isCompleted}
              >
                <Feather 
                  name={isCompleted ? 'check-circle' : 'circle'} 
                  size={26} 
                  color={isCompleted ? colors.marginLine : colors.inkSecondary} 
                />
              </TouchableOpacity>
              <Text style={[styles.titleText, { color: colors.ink }, isCompleted && styles.completedText]}>
                {reminder.title}
              </Text>
            </View>

            {/* Information Rows */}
            <View style={styles.infoWrapper}>
              {/* Date */}
              <View style={styles.infoRow}>
                <Feather name="calendar" size={18} color={colors.inkSecondary} style={styles.infoIcon} />
                <Text style={[styles.infoValue, { color: colors.ink }]}>{formattedDate}</Text>
              </View>

              {/* Time */}
              <View style={styles.infoRow}>
                <Feather name="clock" size={18} color={colors.inkSecondary} style={styles.infoIcon} />
                <Text style={[styles.infoValue, { color: colors.ink }]}>{formattedTime}</Text>
              </View>

              {/* Repeat */}
              <View style={styles.infoRow}>
                <Feather name="repeat" size={18} color={colors.inkSecondary} style={styles.infoIcon} />
                <Text style={[styles.infoValue, { color: colors.ink }]}>{reminder.repeat || 'Does not repeat'}</Text>
              </View>

              {/* Category */}
              <View style={styles.infoRow}>
                <Feather name="tag" size={18} color={colors.inkSecondary} style={styles.infoIcon} />
                <View style={styles.catValueWrapper}>
                  <View style={[styles.catColorDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.infoValue, { color: colors.ink }]}>{reminder.category || 'Personal'}</Text>
                </View>
              </View>
            </View>

            {/* Tags Pills list */}
            {reminder.tags && reminder.tags.length > 0 && (
              <View style={styles.tagsSection}>
                <Text style={[styles.sectionTitle, { color: colors.inkSecondary }]}>TAGS</Text>
                <View style={styles.tagsContainer}>
                  {reminder.tags.map((tag, i) => (
                    <View key={i} style={[styles.tagPill, { backgroundColor: colors.marginLine + '10', borderColor: colors.marginLine + '30' }]}>
                      <Text style={[styles.tagPillText, { color: colors.marginLine }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Custom fields */}
            {reminder.customFields && reminder.customFields.length > 0 && (
              <View style={styles.cfSection}>
                <Text style={[styles.sectionTitle, { color: colors.inkSecondary }]}>CUSTOM FIELDS</Text>
                <View style={[styles.cfCard, { borderColor: colors.border }]}>
                  {reminder.customFields.map((field, index) => (
                    <View key={index} style={styles.cfRow}>
                      <Text style={[styles.cfLabel, { color: colors.inkSecondary }]}>{field.label}:</Text>
                      <Text style={[styles.cfValue, { color: colors.ink }]}>{field.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Notes Section */}
            <View style={styles.notesSection}>
              <Text style={[styles.sectionTitle, { color: colors.inkSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.ink }]}>
                {reminder.description || 'No additional notes provided.'}
              </Text>
            </View>
          </ScrollView>

          {/* Quick Actions Footer matching Mockup */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.marginLine + '15' }]}
              onPress={onClose}
            >
              <Text style={[styles.editBtnText, { color: colors.marginLine }]}>Edit Reminder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteActionBtn}
              onPress={handleDelete}
            >
              <Text style={styles.deleteBtnText}>Delete Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  scrollContent: {
    padding: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxWrapper: {
    marginRight: 14,
  },
  titleText: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  infoWrapper: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    marginRight: 16,
    width: 20,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  catValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 12,
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagPillText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  cfSection: {
    marginBottom: 16,
  },
  cfCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cfRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  cfLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    marginRight: 6,
  },
  cfValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 'auto',
  },
  editBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  editBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  deleteActionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteBtnText: {
    color: '#FF686B',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
});
