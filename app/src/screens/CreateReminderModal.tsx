import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  Animated,
  PanResponder,
  Alert
} from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/theme/theme';
import { Feather } from '@expo/vector-icons';
import { usePermissions } from '@/hooks/usePermissions';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEFAULT_SOUNDS = [
  { id: 'alarm_classic', name: 'Alarm Classic', asset: require('../../assets/sounds/alarm_classic.mp3') },
  { id: 'calendar_chime', name: 'Calendar Chime', asset: require('../../assets/sounds/calendar_chime.mp3') },
  { id: 'reminder_alert', name: 'Reminder Alert', asset: require('../../assets/sounds/reminder_alert.mp3') },
  { id: 'hourly_chime', name: 'Hourly Chime', asset: require('../../assets/sounds/hourly_chime.mp3') },
  { id: 'hummingbird_sweet', name: 'Hummingbird Sweet', asset: require('../../assets/sounds/hummingbird_sweet.mp3') },
  { id: 'memories_melody', name: 'Memories Melody', asset: require('../../assets/sounds/memories_melody.mp3') },
  { id: 'message_pop', name: 'Message Pop', asset: require('../../assets/sounds/message_pop.mp3') },
  { id: 'tink_soft', name: 'Tink Soft', asset: require('../../assets/sounds/tink_soft.mp3') }
];

const Collapsible: React.FC<{ expanded: boolean; height: number; children: React.ReactNode }> = ({ expanded, height, children }) => {
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: expanded ? height : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(animatedOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      })
    ]).start();
  }, [expanded, height]);

  return (
    <Animated.View style={{ height: animatedHeight, opacity: animatedOpacity, overflow: 'hidden' }}>
      {children}
    </Animated.View>
  );
};

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const hoursArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const minutesArray = Array.from({ length: 60 }, (_, i) => i);

interface WheelPickerProps<T> {
  items: T[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  colors: any;
  formatValue?: (value: T) => string;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
}

function WheelPicker<T extends string | number>({
  items,
  selectedValue,
  onValueChange,
  colors,
  formatValue,
  onScrollStart,
  onScrollEnd
}: WheelPickerProps<T>) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const isMomentum = useRef(false);
  const selfScrollUpdate = useRef(false);

  const getIndexForValue = (value: T) => {
    const baseIdx = items.indexOf(value);
    return baseIdx === -1 ? 0 : baseIdx;
  };

  const initialOffset = React.useMemo(() => {
    return getIndexForValue(selectedValue) * ITEM_HEIGHT;
  }, []);

  useEffect(() => {
    if (selfScrollUpdate.current) {
      selfScrollUpdate.current = false;
      return;
    }
    if (isScrolling.current) return;
    const targetIdx = getIndexForValue(selectedValue);
    scrollViewRef.current?.scrollTo({
      y: targetIdx * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedValue]);

  const handleScrollEnd = (safeIndex: number) => {
    const itemValue = items[safeIndex];

    if (itemValue !== undefined && itemValue !== selectedValue) {
      selfScrollUpdate.current = true;
      onValueChange(itemValue);
    }

    isScrolling.current = false;
    onScrollEnd?.();
  };

  const handleScrollBegin = () => {
    isScrolling.current = true;
    onScrollStart?.();
  };

  const onDragEnd = (e: any) => {
    const velocityY = e.nativeEvent.velocity?.y ?? 0;
    const willDecelerate = e.nativeEvent.decelerate || Math.abs(velocityY) > 0.05;
    if (!willDecelerate) {
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const safeIndex = Math.max(0, Math.min(index, items.length - 1));
      handleScrollEnd(safeIndex);
    }
  };

  const onMomentumBegin = () => {
    isMomentum.current = true;
    isScrolling.current = true;
    onScrollStart?.();
  };

  const onMomentumEnd = (e: any) => {
    isMomentum.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const safeIndex = Math.max(0, Math.min(index, items.length - 1));
    handleScrollEnd(safeIndex);
  };

  return (
    <View style={styles.wheelContainer}>
      <View pointerEvents="none" style={[styles.wheelSelectionIndicator, { borderColor: colors.border }]} />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentOffset={{ x: 0, y: initialOffset }}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate={0.985}
        removeClippedSubviews={true}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollBegin={onMomentumBegin}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onDragEnd}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
      >
        {items.map((val, idx) => {
          const isSelected = val === selectedValue;
          return (
            <View key={String(val) + '-' + idx} style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelItemText,
                  { color: isSelected ? colors.ink : colors.inkSecondary, opacity: isSelected ? 1 : 0.4 },
                  isSelected && styles.wheelItemTextSelected,
                ]}
              >
                {formatValue ? formatValue(val) : String(val)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface CreateReminderModalProps {
  visible: boolean;
  onClose: () => void;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CreateReminderModal: React.FC<CreateReminderModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { groups, createReminder, reminderError, serverUrl, user } = useSocket();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState<string>('');

  // Sound selection state
  const [soundOption, setSoundOption] = useState<{ type: 'default' | 'custom'; name: string; uri?: string }>({
    type: 'default',
    name: 'Alarm Classic',
    uri: 'alarm_classic'
  });
  const [showSoundSelector, setShowSoundSelector] = useState(false);
  const playbackSoundRef = useRef<Audio.Sound | null>(null);

  const { permissions, requestStorage, openSettings } = usePermissions();

  // Stop and unload preview sound on close/unmount
  useEffect(() => {
    return () => {
      if (playbackSoundRef.current) {
        playbackSoundRef.current.unloadAsync().catch(() => {});
        playbackSoundRef.current = null;
      }
    };
  }, [visible]);

  const playSoundPreview = async (soundItem: typeof soundOption) => {
    try {
      // Unload previous sound first
      if (playbackSoundRef.current) {
        await playbackSoundRef.current.stopAsync().catch(() => {});
        await playbackSoundRef.current.unloadAsync().catch(() => {});
        playbackSoundRef.current = null;
      }

      let soundSource: any;

      if (soundItem.type === 'default') {
        const found = DEFAULT_SOUNDS.find(s => s.id === soundItem.uri);
        if (found) {
          soundSource = found.asset;
        } else {
          return;
        }
      } else {
        if (!soundItem.uri) return;
        soundSource = { uri: soundItem.uri };
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true, volume: 0.8 }
      );
      playbackSoundRef.current = newSound;
    } catch (err) {
      console.warn('Failed to play sound preview:', err);
    }
  };

  const handlePickCustomSound = async () => {
    try {
      let currentPermission = permissions.storage;
      
      if (currentPermission === 'undetermined') {
        currentPermission = await requestStorage();
      }

      if (currentPermission === 'denied') {
        Alert.alert(
          'Permission Required',
          'Storage permission is required to select custom audio files from your device. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSettings }
          ]
        );
        return;
      }

      const res = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];
      const fileName = file.name || 'custom_audio.mp3';
      const fileUri = file.uri;
      const isOnlineUser = user && user.id !== 'local_user';

      if (isOnlineUser) {
        const formData = new FormData();
        // Modern React Native fetch FormData upload format
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: file.mimeType || 'audio/mpeg'
        } as any);

        const response = await fetch(`${serverUrl}/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        setSoundOption({
          type: 'custom',
          name: fileName,
          uri: data.url
        });
      } else {
        // Offline / Local User: store local uri directly without uploading
        setSoundOption({
          type: 'custom',
          name: fileName,
          uri: fileUri
        });
      }
      setShowSoundSelector(false);
    } catch (err: any) {
      console.error('Failed to pick custom sound:', err);
      Alert.alert('Error', 'Failed to load or upload custom sound file.');
    }
  };

  // Custom metadata fields
  const [category, setCategory] = useState('Personal');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [repeat, setRepeat] = useState('Does not repeat');
  const [showRepeatSelector, setShowRepeatSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Tags local state
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Health', 'Daily']); // Preload sample tags matching mockup
  const [showTagInput, setShowTagInput] = useState(false);

  // Custom Fields local state
  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>([]);
  const [cfLabel, setCfLabel] = useState('');
  const [cfValue, setCfValue] = useState('');
  const [showCfForm, setShowCfForm] = useState(false);

  // Time Picker States
  const [customDueTime, setCustomDueTime] = useState<Date>(new Date(Date.now() + 5 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerCurrentDate, setPickerCurrentDate] = useState(new Date());
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);

  const handlePrevMonth = () => {
    setPickerCurrentDate(new Date(pickerCurrentDate.getFullYear(), pickerCurrentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setPickerCurrentDate(new Date(pickerCurrentDate.getFullYear(), pickerCurrentDate.getMonth() + 1, 1));
  };

  const animateLayout = () => {
    // LayoutAnimation is bypassed inside CreateReminderModal to avoid conflict with Animated collapsible wrappers
  };

  const prevMonthRef = useRef(handlePrevMonth);
  const nextMonthRef = useRef(handleNextMonth);

  useEffect(() => {
    prevMonthRef.current = handlePrevMonth;
    nextMonthRef.current = handleNextMonth;
  }, [handlePrevMonth, handleNextMonth]);

  const calendarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        if (dx > 50) {
          prevMonthRef.current();
        } else if (dx < -50) {
          nextMonthRef.current();
        }
      },
    })
  ).current;

  // Derive offsets dynamically relative to now
  const getOffsetsFromNow = () => {
    const now = new Date();
    const diffMs = customDueTime.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0 };
    }
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const remainingMinutesAfterDays = totalMinutes % (60 * 24);
    const hours = Math.floor(remainingMinutesAfterDays / 60);
    const minutes = remainingMinutesAfterDays % 60;
    return { days, hours, minutes };
  };

  const { days: daysOffset, hours: hoursOffset, minutes: minutesOffset } = getOffsetsFromNow();

  const handleApplyPreset = (type: '1m' | '5m' | '1h' | 'tomorrow') => {
    const target = new Date();
    if (type === '1m') {
      target.setMinutes(target.getMinutes() + 1);
    } else if (type === '5m') {
      target.setMinutes(target.getMinutes() + 5);
    } else if (type === '1h') {
      target.setHours(target.getHours() + 1);
    } else if (type === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    }
    target.setSeconds(0);
    target.setMilliseconds(0);
    setCustomDueTime(target);
    setPickerCurrentDate(target);
  };

  const adjustDueTime = (field: 'day' | 'hour' | 'minute', amount: number) => {
    const newDate = new Date(customDueTime);
    if (field === 'day') {
      newDate.setDate(newDate.getDate() + amount);
    } else if (field === 'hour') {
      newDate.setHours(newDate.getHours() + amount);
    } else if (field === 'minute') {
      newDate.setMinutes(newDate.getMinutes() + amount);
    }
    setCustomDueTime(newDate);
    setPickerCurrentDate(newDate);
  };

  const updateTimeSelection = (hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    let hour24 = hour12;
    if (ampm === 'PM' && hour12 < 12) {
      hour24 = hour12 + 12;
    } else if (ampm === 'AM' && hour12 === 12) {
      hour24 = 0;
    }

    const newDate = new Date(customDueTime);
    newDate.setHours(hour24);
    newDate.setMinutes(minute);
    setCustomDueTime(newDate);
  };

  // Derive current AM/PM, 12-hour, and minutes format for UI display
  const activeHours24 = customDueTime.getHours();
  const activeAmPm: 'AM' | 'PM' = activeHours24 >= 12 ? 'PM' : 'AM';

  let activeHour12 = activeHours24 % 12;
  if (activeHour12 === 0) activeHour12 = 12;

  const activeMinute = customDueTime.getMinutes();
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    animateLayout();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (index: number) => {
    animateLayout();
    setTags(tags.filter((_, idx) => idx !== index));
  };

  const handleAddCustomField = () => {
    if (cfLabel.trim() && cfValue.trim()) {
      animateLayout();
      setCustomFields([...customFields, { label: cfLabel.trim(), value: cfValue.trim() }]);
      setCfLabel('');
      setCfValue('');
      setShowCfForm(false);
    }
  };

  const handleRemoveCustomField = (index: number) => {
    animateLayout();
    setCustomFields(customFields.filter((_, idx) => idx !== index));
  };

  const handleScribbleSubmit = () => {
    if (!title.trim()) return;

    const finalCategory = showCustomCategoryInput ? customCategory.trim() : category;

    // Call Context to send WebSocket event
    createReminder(
      title.trim(),
      description.trim(),
      customDueTime,
      groupId || undefined,
      finalCategory || 'Personal',
      repeat,
      tags,
      customFields,
      soundOption
    );

    // Reset inputs
    setTitle('');
    setDescription('');
    setGroupId('');
    setCategory('Personal');
    setCustomCategory('');
    setShowCustomCategoryInput(false);
    setRepeat('Does not repeat');
    setSoundOption({
      type: 'default',
      name: 'Alarm Classic',
      uri: 'alarm_classic'
    });
    setShowSoundSelector(false);
    setTags(['Health', 'Daily']);
    setCustomFields([]);
    setCustomDueTime(new Date(Date.now() + 5 * 60 * 1000));

    onClose();
  };

  const getCategoryColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c === 'work') return '#3AC759';
    if (c === 'health') return '#FF686B';
    if (c === 'shopping') return '#FFBD20';
    if (c === 'finance') return '#4DA3FF';
    return '#7C5CFF';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBg}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
          {/* Mockup Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.ink} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>Add Reminder</Text>
            <TouchableOpacity onPress={handleScribbleSubmit} disabled={!title.trim()} style={styles.submitBtn}>
              <Feather name="check" size={24} color={title.trim() ? colors.marginLine : colors.inkSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView scrollEnabled={parentScrollEnabled} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Title Input matching Mockup */}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's the reminder?"
              placeholderTextColor={colors.inkSecondary}
              style={[styles.titleInput, { color: colors.ink }]}
            />

            {/* Date Input Field */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Date</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                animateLayout();
                setShowDatePicker(!showDatePicker);
                setShowTimePicker(false);
              }}
              activeOpacity={0.8}
              style={[
                styles.formRow,
                { borderColor: colors.border },
                showDatePicker && { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
              ]}
            >
              <Text style={[styles.formRowText, { color: colors.ink }]}>
                {customDueTime.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Feather name="calendar" size={18} color={colors.inkSecondary} />
            </TouchableOpacity>

            <Collapsible expanded={showDatePicker} height={290}>
              <View 
                {...calendarPanResponder.panHandlers}
                style={[styles.inlinePickerContainer, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
              >
                {/* Header for Month navigation */}
                <View style={styles.pickerMonthHeader}>
                  <TouchableOpacity onPress={() => { animateLayout(); handlePrevMonth(); }} style={styles.pickerMonthArrow}>
                    <Feather name="chevron-left" size={16} color={colors.inkSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.pickerMonthLabel, { color: colors.ink }]}>
                    {monthNames[pickerCurrentDate.getMonth()]} {pickerCurrentDate.getFullYear()}
                  </Text>
                  <TouchableOpacity onPress={() => { animateLayout(); handleNextMonth(); }} style={styles.pickerMonthArrow}>
                    <Feather name="chevron-right" size={16} color={colors.inkSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Days of week header */}
                <View style={styles.pickerDaysOfWeekRow}>
                  {daysOfWeek.map((day, idx) => (
                    <Text key={idx} style={[styles.pickerDayOfWeekLabel, { color: colors.inkSecondary }]}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.pickerDatesGrid}>
                  {(() => {
                    const pickerYear = pickerCurrentDate.getFullYear();
                    const pickerMonth = pickerCurrentDate.getMonth();
                    const totalDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                    const offset = new Date(pickerYear, pickerMonth, 1).getDay();

                    const cells: (Date | null)[] = [];
                    for (let i = 0; i < offset; i++) {
                      cells.push(null);
                    }
                    for (let d = 1; d <= totalDays; d++) {
                      cells.push(new Date(pickerYear, pickerMonth, d));
                    }

                    return cells.map((cell, index) => {
                      if (!cell) {
                        return <View key={`picker-empty-${index}`} style={styles.pickerDateCell} />;
                      }

                      const isSelected =
                        cell.getDate() === customDueTime.getDate() &&
                        cell.getMonth() === customDueTime.getMonth() &&
                        cell.getFullYear() === customDueTime.getFullYear();

                      return (
                        <TouchableOpacity
                          key={`picker-date-${index}`}
                          style={[
                            styles.pickerDateCell,
                            isSelected && { backgroundColor: colors.marginLine },
                          ]}
                          onPress={() => {
                            const newDate = new Date(customDueTime);
                            newDate.setFullYear(cell.getFullYear());
                            newDate.setMonth(cell.getMonth());
                            newDate.setDate(cell.getDate());
                            animateLayout();
                            setCustomDueTime(newDate);
                            setShowDatePicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerDateText,
                              { color: colors.ink },
                              isSelected && { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' },
                            ]}
                          >
                            {cell.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>
            </Collapsible>

            {/* Time Input Field */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Time</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                animateLayout();
                setShowTimePicker(!showTimePicker);
                setShowDatePicker(false);
              }}
              activeOpacity={0.8}
              style={[
                styles.formRow,
                { borderColor: colors.border },
                showTimePicker && { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
              ]}
            >
              <Text style={[styles.formRowText, { color: colors.ink }]}>
                {customDueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
              <Feather name="clock" size={18} color={colors.inkSecondary} />
            </TouchableOpacity>

            <Collapsible expanded={showTimePicker} height={136}>
              <View style={[styles.inlinePickerContainer, { borderColor: colors.border, backgroundColor: colors.cardBg, padding: 8 }]}>
                <View style={styles.wheelPickerWrapper}>
                  <WheelPicker
                    items={hoursArray}
                    selectedValue={activeHour12}
                    onValueChange={(h) => updateTimeSelection(h, activeMinute, activeAmPm)}
                    colors={colors}
                    onScrollStart={() => setParentScrollEnabled(false)}
                    onScrollEnd={() => setParentScrollEnabled(true)}
                  />
                  <Text style={[styles.wheelSeparator, { color: colors.ink }]}>:</Text>
                  <WheelPicker
                    items={minutesArray}
                    selectedValue={activeMinute}
                    onValueChange={(m) => updateTimeSelection(activeHour12, m, activeAmPm)}
                    colors={colors}
                    formatValue={(v) => v < 10 ? `0${v}` : `${v}`}
                    onScrollStart={() => setParentScrollEnabled(false)}
                    onScrollEnd={() => setParentScrollEnabled(true)}
                  />
                  <View style={styles.ampmColumn}>
                    {(['AM', 'PM'] as const).map((mode) => {
                      const isSelected = activeAmPm === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          onPress={() => updateTimeSelection(activeHour12, activeMinute, mode)}
                          activeOpacity={0.7}
                          style={[
                            styles.ampmWheelBtn,
                            { borderColor: colors.border },
                            isSelected && { backgroundColor: colors.marginLine, borderColor: colors.marginLine }
                          ]}
                        >
                          <Text style={[
                            styles.ampmWheelBtnText,
                            { color: colors.ink },
                            isSelected && { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }
                          ]}>
                            {mode}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </Collapsible>

            {/* Repeat configuration Selector */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Repeat</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                animateLayout();
                setShowRepeatSelector(!showRepeatSelector);
              }}
              activeOpacity={0.8}
              style={[styles.formRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.formRowText, { color: colors.ink }]}>{repeat}</Text>
              <Feather name="repeat" size={18} color={colors.inkSecondary} />
            </TouchableOpacity>

            <Collapsible expanded={showRepeatSelector} height={188}>
              <View style={[styles.selectorDropdown, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
                {['Does not repeat', 'Daily', 'Weekly', 'Monthly'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownOption}
                    onPress={() => {
                      animateLayout();
                      setRepeat(option);
                      setShowRepeatSelector(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: colors.ink }]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Collapsible>

            {/* Sound Selector */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Reminder Sound</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowSoundSelector(!showSoundSelector);
              }}
              activeOpacity={0.8}
              style={[styles.formRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.formRowText, { color: colors.ink }]}>
                {soundOption.type === 'default' ? soundOption.name : `Custom: ${soundOption.name}`}
              </Text>
              <Feather name="music" size={18} color={colors.inkSecondary} />
            </TouchableOpacity>

            <Collapsible expanded={showSoundSelector} height={260}>
              <ScrollView
                nestedScrollEnabled={true}
                style={[styles.selectorDropdown, { borderColor: colors.border, backgroundColor: colors.cardBg, maxHeight: 250 }]}
              >
                {DEFAULT_SOUNDS.map(soundItem => {
                  const isSelected = soundOption.type === 'default' && soundOption.uri === soundItem.id;
                  return (
                    <TouchableOpacity
                      key={soundItem.id}
                      style={[
                        styles.dropdownOption,
                        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
                      ]}
                      onPress={() => {
                        const nextSound = { type: 'default' as const, name: soundItem.name, uri: soundItem.id };
                        setSoundOption(nextSound);
                        playSoundPreview(nextSound);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: colors.ink, fontFamily: isSelected ? 'Poppins_600SemiBold' : 'Poppins_500Medium' }]}>
                        {soundItem.name}
                      </Text>
                      {isSelected && <Feather name="check" size={16} color={colors.marginLine} />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.marginLine + '10', flexDirection: 'row', alignItems: 'center' }
                  ]}
                  onPress={handlePickCustomSound}
                >
                  <Feather name="plus" size={16} color={colors.marginLine} style={{ marginRight: 8 }} />
                  <Text style={[styles.dropdownOptionText, { color: colors.marginLine }]}>
                    + Custom Audio File...
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Collapsible>

            {/* Category Selector */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Category</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                animateLayout();
                setShowCategorySelector(!showCategorySelector);
              }}
              activeOpacity={0.8}
              style={[styles.formRow, { borderColor: colors.border }]}
            >
              <View style={styles.catSelectedWrapper}>
                <View style={[styles.catColorDot, { backgroundColor: getCategoryColor(category) }]} />
                <Text style={[styles.formRowText, { color: colors.ink }]}>{category}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.inkSecondary} />
            </TouchableOpacity>

            <Collapsible expanded={showCategorySelector} height={276}>
              <View style={[styles.selectorDropdown, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
                {['Personal', 'Work', 'Health', 'Shopping', 'Finance'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.dropdownOption}
                    onPress={() => {
                      animateLayout();
                      setCategory(cat);
                      setShowCustomCategoryInput(false);
                      setShowCategorySelector(false);
                    }}
                  >
                    <View style={styles.catSelectedWrapper}>
                      <View style={[styles.catColorDot, { backgroundColor: getCategoryColor(cat) }]} />
                      <Text style={[styles.dropdownOptionText, { color: colors.ink }]}>{cat}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    animateLayout();
                    setShowCustomCategoryInput(true);
                    setShowCategorySelector(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, { color: colors.marginLine }]}>+ Add Custom Category</Text>
                </TouchableOpacity>
              </View>
            </Collapsible>

            <Collapsible expanded={showCustomCategoryInput} height={54}>
              <TextInput
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Enter custom category name"
                placeholderTextColor={colors.inkSecondary}
                style={[styles.inputFieldBorder, { color: colors.ink, borderColor: colors.border }]}
              />
            </Collapsible>

            {/* Notes field */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Notes (optional)</Text>
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes..."
              placeholderTextColor={colors.inkSecondary}
              multiline
              numberOfLines={3}
              style={[styles.notesInput, { color: colors.ink, borderColor: colors.border }]}
            />

            {/* Tags row */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Add Tags</Text>
            </View>
            <View style={styles.tagsContainer}>
              {tags.map((tag, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    animateLayout();
                    handleRemoveTag(idx);
                  }}
                  style={[styles.tagPill, { backgroundColor: colors.marginLine + '15', borderColor: colors.marginLine }]}
                >
                  <Text style={[styles.tagPillText, { color: colors.marginLine }]}>{tag}</Text>
                  <Feather name="x" size={12} color={colors.marginLine} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}

              {!showTagInput ? (
                <TouchableOpacity
                  onPress={() => {
                    animateLayout();
                    setShowTagInput(true);
                  }}
                  style={[styles.addTagPill, { borderColor: colors.border }]}
                >
                  <Feather name="plus" size={14} color={colors.inkSecondary} />
                </TouchableOpacity>
              ) : (
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="New Tag"
                  placeholderTextColor={colors.inkSecondary}
                  style={[styles.tagInputText, { color: colors.ink, borderColor: colors.border }]}
                  onSubmitEditing={() => {
                    animateLayout();
                    handleAddTag();
                  }}
                  autoFocus
                />
              )}
            </View>

            {/* Custom fields row */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Custom Fields</Text>
              <TouchableOpacity
                onPress={() => {
                  animateLayout();
                  setShowCfForm(!showCfForm);
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: colors.marginLine }}>
                  {showCfForm ? 'Cancel' : '+ Add'}
                </Text>
              </TouchableOpacity>
            </View>

            <Collapsible expanded={showCfForm} height={60}>
              <View style={styles.customFieldInputRow}>
                <TextInput
                  value={cfLabel}
                  onChangeText={setCfLabel}
                  placeholder="Label (e.g. Location)"
                  placeholderTextColor={colors.inkSecondary}
                  style={[styles.cfInput, { color: colors.ink, borderColor: colors.border }]}
                />
                <TextInput
                  value={cfValue}
                  onChangeText={setCfValue}
                  placeholder="Value"
                  placeholderTextColor={colors.inkSecondary}
                  style={[styles.cfInput, { color: colors.ink, borderColor: colors.border }]}
                />
                <TouchableOpacity onPress={handleAddCustomField} style={[styles.addCfBtn, { backgroundColor: colors.marginLine }]}>
                  <Feather name="plus" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Collapsible>

            {customFields.length > 0 && (
              <View style={[styles.cfListCard, { borderColor: colors.border }]}>
                {customFields.map((field, idx) => (
                  <View key={idx} style={styles.cfListItem}>
                    <Text style={[styles.cfListLabel, { color: colors.inkSecondary }]}>{field.label}:</Text>
                    <Text style={[styles.cfListValue, { color: colors.ink }]}>{field.value}</Text>
                    <TouchableOpacity onPress={() => handleRemoveCustomField(idx)} style={{ marginLeft: 8 }}>
                      <Feather name="x" size={14} color={colors.dangerPen} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Micro Adjusters for Quick Settings */}
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabelText, { color: colors.inkSecondary }]}>Time Offsets (Preserve compatibility)</Text>
            </View>

            <View style={styles.presetsRow}>
              {['1m', '5m', '1h', 'tomorrow'].map((pr) => (
                <TouchableOpacity
                  key={pr}
                  onPress={() => handleApplyPreset(pr as any)}
                  style={[styles.presetBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.presetBtnText, { color: colors.ink }]}>
                    {pr === '1m' ? '1 Min' : pr === '5m' ? '5 Mins' : pr === '1h' ? '1 Hour' : 'Tomorrow'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.adjusterBox, { borderColor: colors.border }]}>
              {[
                ['Days', daysOffset, 'day'],
                ['Hours', hoursOffset, 'hour'],
                ['Mins', minutesOffset, 'minute']
              ].map(([label, val, field]: any) => (
                <View key={label} style={styles.adjusterCol}>
                  <Text style={[styles.adjustLabel, { color: colors.inkSecondary }]}>{label}</Text>
                  <View style={styles.adjustRow}>
                    <TouchableOpacity onPress={() => adjustDueTime(field, -1)} style={styles.adjustBtn}>
                      <Text style={[styles.adjustBtnText, { color: colors.ink }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.adjustValue, { color: colors.ink }]}>{val}</Text>
                    <TouchableOpacity onPress={() => adjustDueTime(field, 1)} style={styles.adjustBtn}>
                      <Text style={[styles.adjustBtnText, { color: colors.ink }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {reminderError && (
              <Text style={[styles.errorText, { color: colors.dangerPen }]}>
                ⚠️ {reminderError}
              </Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  submitBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  titleInput: {
    fontSize: 22,
    fontFamily: 'Poppins_500Medium',
    paddingVertical: 12,
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  inputLabelText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  formRowText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  catSelectedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  selectorDropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownOptionText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  inputFieldBorder: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    height: 90,
    textAlignVertical: 'top',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagPillText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  addTagPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagInputText: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    minWidth: 80,
    marginBottom: 8,
  },
  customFieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cfInput: {
    flex: 0.44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  addCfBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cfListCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },
  cfListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cfListLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginRight: 6,
  },
  cfListValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetBtn: {
    width: '23%',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  adjusterBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  adjusterCol: {
    alignItems: 'center',
  },
  adjustLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 4,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  adjustBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  adjustValue: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    minWidth: 20,
    textAlign: 'center',
  },
  inlinePickerContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 0,
    marginBottom: 12,
    padding: 14,
  },
  pickerMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickerMonthArrow: {
    padding: 6,
  },
  pickerMonthLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  pickerDaysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pickerDayOfWeekLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  pickerDatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerDateCell: {
    width: '14.28%',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginVertical: 2,
  },
  pickerDateText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  wheelPickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginVertical: 10,
    overflow: 'hidden',
  },
  wheelContainer: {
    height: 120,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  wheelSelectionIndicator: {
    position: 'absolute',
    height: ITEM_HEIGHT,
    left: 10,
    right: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  wheelItemTextSelected: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  wheelSeparator: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    marginHorizontal: 15,
    paddingBottom: 2,
  },
  ampmColumn: {
    height: 110,
    justifyContent: 'center',
    width: 60,
    marginLeft: 15,
  },
  ampmWheelBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  ampmWheelBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginTop: 10,
  },
});
