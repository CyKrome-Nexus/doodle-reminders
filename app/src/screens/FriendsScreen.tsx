import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/theme/theme';
import { Feather } from '@expo/vector-icons';

export const FriendsScreen: React.FC = () => {
  const { colors, cleanCard, cleanInput, cleanButton } = useTheme();
  const {
    friends,
    friendRequests,
    groups,
    sendFriendRequest,
    respondToFriendRequest,
    createGroup,
    friendError,
    friendSuccess,
    groupError
  } = useSocket();

  const [friendUsername, setFriendUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const handleAddFriend = () => {
    if (!friendUsername.trim()) return;
    sendFriendRequest(friendUsername);
    setFriendUsername('');
  };

  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleCreateGroupSubmit = () => {
    if (!groupName.trim()) return;
    createGroup(groupName, selectedFriends);
    setGroupName('');
    setSelectedFriends([]);
    setIsCreatingGroup(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      
      {/* 1. Add Friends Row */}
      <View style={[styles.sectionCard, cleanCard(colors.border)]}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>
          Add a Friend
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            value={friendUsername}
            onChangeText={setFriendUsername}
            placeholder="Username (e.g. alex_doodle)"
            placeholderTextColor={colors.inkSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.inputField, cleanInput(), { flex: 1, marginRight: 10 }]}
          />
          <TouchableOpacity
            onPress={handleAddFriend}
            style={[styles.actionBtn, cleanButton()]}
          >
            <Text style={styles.actionBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {friendError ? (
          <Text style={[styles.errorText, { color: colors.dangerPen }]}>
            ⚠️ {friendError}
          </Text>
        ) : null}

        {friendSuccess ? (
          <Text style={[styles.successText, { color: colors.successPen }]}>
            ✨ {friendSuccess}
          </Text>
        ) : null}
      </View>

      {/* 2. Pending Incoming Requests */}
      {friendRequests.length > 0 && (
        <View style={[styles.sectionCard, cleanCard(colors.border)]}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            Incoming Friend Requests ({friendRequests.length})
          </Text>
          {friendRequests.map(req => (
            <View key={req.id} style={[styles.requestRow, { borderBottomColor: colors.border }]}>
              <View style={styles.userAvatarContainer}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.marginLine + '20' }]}>
                  <Text style={[styles.avatarLetter, { color: colors.marginLine }]}>
                    {req.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.reqUserText, { color: colors.ink }]}>@{req.username}</Text>
              </View>
              
              <View style={styles.requestActionRow}>
                <TouchableOpacity
                  onPress={() => respondToFriendRequest(req.id, 'accept')}
                  style={[styles.pillBtn, { backgroundColor: colors.successPen }]}
                >
                  <Feather name="check" size={14} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => respondToFriendRequest(req.id, 'reject')}
                  style={[styles.pillBtn, { backgroundColor: colors.dangerPen, marginLeft: 8 }]}
                >
                  <Feather name="x" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 3. Friends List */}
      <View style={[styles.sectionCard, cleanCard(colors.border)]}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>
          My Friends ({friends.length})
        </Text>
        {friends.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>
            No friends added yet.
          </Text>
        ) : (
          <View style={styles.friendsContainer}>
            {friends.map(friend => (
              <View key={friend.id} style={[styles.friendRowItem, { borderColor: colors.border }]}>
                <View style={[styles.smallAvatar, { backgroundColor: colors.marginLine }]}>
                  <Text style={styles.smallAvatarText}>
                    {friend.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.friendNameText, { color: colors.ink }]}>@{friend.username}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 4. Collaborative Groups */}
      <View style={[styles.sectionCard, cleanCard(colors.border)]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 0 }]}>
            Shared Groups ({groups.length})
          </Text>
          {!isCreatingGroup && friends.length > 0 && (
            <TouchableOpacity
              onPress={() => setIsCreatingGroup(true)}
              style={styles.newGroupBtn}
            >
              <Text style={[styles.newGroupBtnText, { color: colors.marginLine }]}>+ New Group</Text>
            </TouchableOpacity>
          )}
        </View>

        {isCreatingGroup && (
          <View style={[styles.groupFormContainer, { borderColor: colors.border }]}>
            <Text style={[styles.groupFormLabel, { color: colors.ink }]}>Create New Group</Text>
            
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group Name (e.g. Roommates)"
              placeholderTextColor={colors.inkSecondary}
              style={[styles.inputField, cleanInput()]}
            />

            <Text style={[styles.subLabelText, { color: colors.inkSecondary }]}>Select Members:</Text>
            
            {friends.map(friend => {
              const isSelected = selectedFriends.includes(friend.id);
              return (
                <TouchableOpacity
                  key={friend.id}
                  onPress={() => handleToggleFriendSelection(friend.id)}
                  style={styles.checkboxOptionRow}
                >
                  <Feather 
                    name={isSelected ? 'check-square' : 'square'} 
                    size={18} 
                    color={isSelected ? colors.marginLine : colors.inkSecondary} 
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.checkboxLabel, { color: colors.ink }]}>@{friend.username}</Text>
                </TouchableOpacity>
              );
            })}

            {groupError ? (
              <Text style={[styles.errorText, { color: colors.dangerPen }]}>
                ⚠️ {groupError}
              </Text>
            ) : null}

            <View style={styles.formButtonRow}>
              <TouchableOpacity
                onPress={() => {
                  setIsCreatingGroup(false);
                  setGroupName('');
                  setSelectedFriends([]);
                }}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.inkSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCreateGroupSubmit}
                style={[styles.submitBtn, cleanButton()]}
              >
                <Text style={styles.submitBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {groups.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>
            No shared groups created yet.
          </Text>
        ) : (
          <View style={styles.groupsContainer}>
            {groups.map(group => (
              <View key={group.id} style={[styles.groupItemRow, { borderColor: colors.border }]}>
                <View style={styles.groupMetaInfo}>
                  <Text style={[styles.groupTitleText, { color: colors.ink }]}>👥 {group.name}</Text>
                  <Text style={[styles.groupMembersLabel, { color: colors.inkSecondary }]}>
                    {group.members.map(m => `@${m.username}`).join(', ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginTop: 8,
  },
  successText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    paddingVertical: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarLetter: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  reqUserText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  requestActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  friendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  smallAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
  },
  friendNameText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  newGroupBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  newGroupBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  groupFormContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
  },
  groupFormLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 10,
  },
  subLabelText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
    marginBottom: 8,
  },
  checkboxOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkboxLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 14,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  groupsContainer: {
    marginTop: 6,
  },
  groupItemRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
  },
  groupMetaInfo: {
    flex: 1,
  },
  groupTitleText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  groupMembersLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
});
