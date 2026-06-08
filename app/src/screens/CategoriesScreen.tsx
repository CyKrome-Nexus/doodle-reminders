import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/theme/theme';
import { Feather } from '@expo/vector-icons';

interface CategoryItem {
  name: string;
  icon: any;
  color: string;
}

export const CategoriesScreen: React.FC = () => {
  const { reminders } = useSocket();
  const { colors, isDark } = useTheme();
  
  // Custom categories defined locally by the user
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Standard category profiles matching design mockup
  const baseCategories: CategoryItem[] = [
    { name: 'Personal', icon: 'user', color: '#7C5CFF' },
    { name: 'Work', icon: 'briefcase', color: '#3AC759' },
    { name: 'Health', icon: 'heart', color: '#FF686B' },
    { name: 'Shopping', icon: 'shopping-cart', color: '#FFBD20' },
    { name: 'Finance', icon: 'credit-card', color: '#4DA3FF' },
    { name: 'Other', icon: 'grid', color: '#A5B2AD' },
  ];

  // Dynamic discovery of categories from existing reminders list
  const discoveredCategories = reminders
    .map(r => r.category || 'Personal')
    .filter(name => !baseCategories.some(bc => bc.name.toLowerCase() === name.toLowerCase()));
  
  // Combine base, custom, and discovered categories uniquely
  const allCategoryNames = Array.from(new Set([
    ...baseCategories.map(c => c.name),
    ...customCategories,
    ...discoveredCategories
  ]));

  const categoryList: CategoryItem[] = allCategoryNames.map(name => {
    const base = baseCategories.find(bc => bc.name.toLowerCase() === name.toLowerCase());
    if (base) return base;

    // Generate colors/icons dynamically for custom categories
    return {
      name,
      icon: 'tag',
      color: '#7C5CFF'
    };
  });

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      const formatted = newCatName.trim();
      if (!allCategoryNames.some(c => c.toLowerCase() === formatted.toLowerCase())) {
        setCustomCategories(prev => [...prev, formatted]);
      }
      setNewCatName('');
      setShowAddForm(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Categories</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Feather name={showAddForm ? 'x' : 'plus'} size={24} color={colors.marginLine} />
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <View style={[styles.addFormCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <TextInput
            placeholder="Category Name"
            placeholderTextColor={colors.inkSecondary}
            value={newCatName}
            onChangeText={setNewCatName}
            style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}
            onSubmitEditing={handleAddCategory}
          />
          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: colors.marginLine }]} 
            onPress={handleAddCategory}
          >
            <Text style={styles.submitBtnText}>Add Category</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List content styled as rows */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {categoryList.map((cat) => {
          // Count total pending reminders belonging to this category
          const count = reminders.filter(
            r => (r.category || 'Personal').toLowerCase() === cat.name.toLowerCase() && r.status === 'pending'
          ).length;

          return (
            <TouchableOpacity 
              key={cat.name} 
              style={[
                styles.catRow, 
                { 
                  backgroundColor: colors.cardBg, 
                  borderColor: colors.border,
                }
              ]}
              activeOpacity={0.8}
            >
              {/* Left Circle Icon */}
              <View style={[styles.iconWrapper, { backgroundColor: cat.color + '15' }]}>
                <Feather name={cat.icon} size={18} color={cat.color} />
              </View>

              {/* Title */}
              <Text style={[styles.catName, { color: colors.ink }]}>{cat.name}</Text>

              {/* Right Count indicator */}
              <View style={styles.countWrapper}>
                <Text style={[styles.catCount, { color: colors.inkSecondary }]}>{count}</Text>
                <Feather name="chevron-right" size={16} color={colors.inkSecondary} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFormCard: {
    marginHorizontal: 24,
    marginVertical: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 12,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  catName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  countWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catCount: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
});
