import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Interfaces for our state
export interface Friend {
  id: string;
  username: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  username: string;
  status: string;
}

export interface Group {
  id: string;
  name: string;
  members: { id: string; username: string }[];
  createdBy: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  status: 'pending' | 'triggered' | 'completed';
  isGroup: boolean;
  groupName: string | null;
  groupId: string | null;
  creatorId: string;
  creatorUsername: string;
  isDismissedByMe: boolean;
  category?: string;
  repeat?: string;
  tags?: string[];
  customFields?: { label: string; value: string }[];
}

export interface TriggeredAlarm {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  isGroup: boolean;
  groupName: string | null;
  creatorUsername: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  name?: string;
  signupStep: number;
  settings?: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    defaultReminderTime: string;
    snoozeDuration: number;
  };
}

interface SocketContextData {
  socket: Socket | null;
  connected: boolean;
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  authError: string | null;
  friendError: string | null;
  friendSuccess: string | null;
  groupError: string | null;
  reminderError: string | null;
  
  friends: Friend[];
  friendRequests: FriendRequest[];
  groups: Group[];
  reminders: Reminder[];
  triggeredAlarms: TriggeredAlarm[];
  
  otpSent: boolean;
  otpSentMessage: string | null;
  contactsRecommendations: { id: string; username: string; name: string; phone?: string }[];
  
  login: (username: string, password: string) => void;
  register: (username: string, password: string) => void;
  logout: () => void;
  requestOtp: (email: string) => void;
  verifyOtp: (email: string, otp: string) => void;
  signupStep1: (username: string, phone: string, password: string) => void;
  signupStep2: (name: string) => void;
  checkContacts: (phones: string[]) => void;
  signupStep3Complete: () => void;
  sendFriendRequest: (username: string) => void;
  respondToFriendRequest: (requestId: string, action: 'accept' | 'reject') => void;
  createGroup: (name: string, memberIds: string[]) => void;
  createReminder: (
    title: string,
    description: string,
    dueAt: Date,
    groupId?: string,
    category?: string,
    repeat?: string,
    tags?: string[],
    customFields?: { label: string; value: string }[]
  ) => void;
  dismissReminder: (reminderId: string) => void;
  deleteReminder: (reminderId: string) => void;
  updateUserSettings: (settings: Partial<NonNullable<UserInfo['settings']>>) => void;
  clearErrors: () => void;
  loginLocalAccount: (name: string) => void;
}

export const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const useSocket = () => useContext(SocketContext);

// Dynamic local backend host resolver
const getDefaultServerUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000'; // Android emulator redirects to localhost
  }
  return 'http://localhost:3000'; // iOS emulator / Web
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serverUrl, setServerUrlState] = useState(getDefaultServerUrl());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const LOCAL_USER_KEY = '@doodle_reminders:local_user';
  const LOCAL_REMINDERS_KEY = '@doodle_reminders:local_reminders';

  // Load persistent local data on mount
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const savedUserJson = await AsyncStorage.getItem(LOCAL_USER_KEY);
        if (savedUserJson) {
          const savedUser = JSON.parse(savedUserJson);
          console.log(`[Local Account] Loaded offline profile for @${savedUser.username}`);
          setUser(savedUser);
          setIsAuthenticated(true);
          
          const savedRemindersJson = await AsyncStorage.getItem(LOCAL_REMINDERS_KEY);
          if (savedRemindersJson) {
            setReminders(JSON.parse(savedRemindersJson));
          }
        }
      } catch (err) {
        console.warn('Failed to load local account:', err);
      }
    };
    loadLocalData();
  }, []);

  const loginLocalAccount = async (name: string) => {
    console.log(`[Local Account] Creating local account for name: ${name}`);
    const localUser: UserInfo = {
      id: 'local_user',
      username: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: name,
      signupStep: 4,
      settings: {
        theme: 'light',
        notifications: true,
        defaultReminderTime: '09:00 AM',
        snoozeDuration: 10
      }
    };
    
    try {
      await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      setUser(localUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      console.error('Failed to save local user details:', err);
      setAuthError('Failed to save local user details');
    }
  };
  
  // Step-by-step signup states
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [contactsRecommendations, setContactsRecommendations] = useState<{ id: string; username: string; name: string; phone?: string }[]>([]);

  // Lists
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [triggeredAlarms, setTriggeredAlarms] = useState<TriggeredAlarm[]>([]);

  // Errors / Success Messages
  const [authError, setAuthError] = useState<string | null>(null);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const setServerUrl = (newUrl: string) => {
    setServerUrlState(newUrl);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const clearErrors = () => {
    setAuthError(null);
    setFriendError(null);
    setFriendSuccess(null);
    setGroupError(null);
    setReminderError(null);
  };

  // Listen to deep linking URL triggers (OAuth callbacks)
  const initialUrl = Linking.useURL();

  const handleDeepLink = (urlStr: string) => {
    try {
      console.log(`🔗 [Deep Link] Received incoming URL: ${urlStr}`);
      const parsed = Linking.parse(urlStr);
      console.log(`🔗 [Deep Link] Parsed path: ${parsed.path}, params:`, parsed.queryParams);

      // Handle both standard deep links and Expo Go nested URLs
      if (parsed.path === 'oauth-callback' || urlStr.includes('oauth-callback')) {
        const { token: oauthToken, userId, username, error } = parsed.queryParams as {
          token?: string;
          userId?: string;
          username?: string;
          error?: string;
        };

        if (error) {
          console.error(`⚠️ [Deep Link] Authentication error reported: ${error}`);
          setAuthError(decodeURIComponent(error));
          return;
        }

        if (oauthToken && userId && username) {
          console.log(`📥 [Deep Link] Auth success for user: @${username}`);
          setToken(oauthToken);
          setUser({ id: userId, username, signupStep: 4 });
          setIsAuthenticated(true);
          setAuthError(null);

          // Eagerly send handshake if socket is online
          if (socketRef.current) {
            console.log(`[Socket Outbound ↗️] Direct handshake dispatch (Deep Link integration)`);
            socketRef.current.emit('auth:handshake', { token: oauthToken });
          }
        }
      }
    } catch (err: any) {
      console.error('❌ [Deep Link] Failed to parse deep link URL:', err.message);
    }
  };

  useEffect(() => {
    if (initialUrl) {
      handleDeepLink(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Connect and manage WebSocket lifecycle
  useEffect(() => {
    if (isAuthenticated && user?.id === 'local_user') {
      console.log('🔌 [Socket Connection] Local account active. Ensuring socket is offline.');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    console.log(`🔌 [Socket Connection] Initializing connection to: ${serverUrl}`);
    const newSocket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: !!token,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`🟢 [Socket Connection] Connected to backend! Socket ID: ${newSocket.id}`);
      setConnected(true);
      
      // If we already had a token in memory, try to handshake/resume session
      if (token) {
        console.log(`[Socket Outbound ↗️] Emitting 'auth:handshake' (resuming session)...`);
        newSocket.emit('auth:handshake', { token });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`🔴 [Socket Connection] Disconnected from server. Reason: ${reason}`);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      if (token) {
        console.warn(`⚠️ [Socket Connection] Connection error:`, error.message);
      }
    });

    // Auth events
    newSocket.on('auth:success', (data: { token: string; user: UserInfo }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'auth:success' for @${data.user.username} (Step: ${data.user.signupStep})`);
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      setAuthError(null);
      
      // Fetch our initial user rosters ONLY if signup is complete
      if (data.user.signupStep >= 4) {
        console.log(`[Socket Outbound ↗️] Querying lists ('friend:list', 'group:list', 'reminder:list')...`);
        newSocket.emit('friend:list');
        newSocket.emit('group:list');
        newSocket.emit('reminder:list');
      }
    });

    newSocket.on('auth:otp_sent', (data: { success: boolean; message: string }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'auth:otp_sent':`, data.message);
      setOtpSent(true);
      setOtpSentMessage(data.message);
      setAuthError(null);
    });

    newSocket.on('auth:step_success', (data: { user: UserInfo }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'auth:step_success' -> Step: ${data.user.signupStep}`);
      setUser(data.user);
      setAuthError(null);
    });

    newSocket.on('auth:contacts_matched', (data: { recommendations: any[] }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'auth:contacts_matched' -> Matches: ${data.recommendations.length}`);
      setContactsRecommendations(data.recommendations);
      setAuthError(null);
    });

    newSocket.on('auth:handshake_failed', (data: { message: string }) => {
      console.warn(`📥 [Socket Inbound 📥] Handshake failed:`, data.message);
      logout();
    });

    newSocket.on('auth:error', (data: { message: string }) => {
      console.error(`📥 [Socket Inbound 📥] Received 'auth:error':`, data.message);
      setAuthError(data.message);
    });

    // Friend events
    newSocket.on('friend:error', (data: { message: string }) => {
      console.error(`📥 [Socket Inbound 📥] Received 'friend:error':`, data.message);
      setFriendError(data.message);
    });

    newSocket.on('friend:success', (data: { message: string }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'friend:success':`, data.message);
      setFriendSuccess(data.message);
      setTimeout(() => setFriendSuccess(null), 3000);
    });

    newSocket.on('friend:list_response', (data: { friends: Friend[]; requests: FriendRequest[] }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'friend:list_response' -> Friends: ${data.friends.length}, Invites: ${data.requests.length}`);
      setFriends(data.friends);
      setFriendRequests(data.requests);
    });

    newSocket.on('friend:request_received', (data: { fromUserId: string; username: string }) => {
      console.log(`📥 [Socket Inbound 📥] ALERT: Friend request received from @${data.username}!`);
      // Auto refresh list
      console.log(`[Socket Outbound ↗️] Re-querying friend list...`);
      newSocket.emit('friend:list');
    });

    newSocket.on('friend:accepted', (data: { userId: string; username: string }) => {
      console.log(`📥 [Socket Inbound 📥] ALERT: @${data.username} accepted your friend request!`);
      console.log(`[Socket Outbound ↗️] Re-querying friend list...`);
      newSocket.emit('friend:list');
    });

    // Group events
    newSocket.on('group:error', (data: { message: string }) => {
      console.error(`📥 [Socket Inbound 📥] Received 'group:error':`, data.message);
      setGroupError(data.message);
    });

    newSocket.on('group:success', (data: { message: string }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'group:success':`, data.message);
      console.log(`[Socket Outbound ↗️] Refreshing groups list...`);
      newSocket.emit('group:list');
    });

    newSocket.on('group:list_response', (data: Group[]) => {
      console.log(`📥 [Socket Inbound 📥] Received 'group:list_response' -> Groups count: ${data.length}`);
      setGroups(data);
    });

    newSocket.on('group:new', (data: any) => {
      console.log(`📥 [Socket Inbound 📥] ALERT: You have been added to a new Group: "${data.name}"!`);
      console.log(`[Socket Outbound ↗️] Re-fetching groups and reminders...`);
      newSocket.emit('group:list');
      newSocket.emit('reminder:list'); // Refresh reminders in case there are group reminders
    });

    // Reminder events
    newSocket.on('reminder:error', (data: { message: string }) => {
      console.error(`📥 [Socket Inbound 📥] Received 'reminder:error':`, data.message);
      setReminderError(data.message);
    });

    newSocket.on('reminder:success', (data: { message: string }) => {
      console.log(`📥 [Socket Inbound 📥] Received 'reminder:success':`, data.message);
      console.log(`[Socket Outbound ↗️] Re-querying active reminders...`);
      newSocket.emit('reminder:list');
      setReminderError(null);
    });

    newSocket.on('reminder:list_response', (data: Reminder[]) => {
      console.log(`📥 [Socket Inbound 📥] Received 'reminder:list_response' -> Reminders loaded: ${data.length}`);
      setReminders(data);
      
      // Look at the new list to see if there are triggered reminders that we haven't dismissed
      const pendingAlarms = data.filter(r => r.status === 'triggered' && !r.isDismissedByMe);
      if (pendingAlarms.length > 0) {
        console.log(`[Alarm Manager] Found ${pendingAlarms.length} triggered, undismissed alarms in list. Enqueuing...`);
        setTriggeredAlarms(prev => {
          // merge cleanly avoiding duplicates
          const merged = [...prev];
          pendingAlarms.forEach(pa => {
            if (!merged.some(m => m.id === pa.id)) {
              merged.push({
                id: pa.id,
                title: pa.title,
                description: pa.description,
                dueAt: pa.dueAt,
                isGroup: pa.isGroup,
                groupName: pa.groupName,
                creatorUsername: pa.creatorUsername
              });
            }
          });
          return merged;
        });
      }
    });

    newSocket.on('reminder:new', (data: any) => {
      console.log(`📥 [Socket Inbound 📥] ALERT: New reminder added: "${data.title}" (Group: ${data.groupName || 'None'})`);
      console.log(`[Socket Outbound ↗️] Refreshing active reminders...`);
      newSocket.emit('reminder:list');
    });

    // Real-time alarm trigger event!
    newSocket.on('reminder:trigger', (data: TriggeredAlarm) => {
      console.log(`🚨 [Socket Inbound 📥] ALARM TRIGGER EVENT RECEIVED FOR: "${data.title}"! Launching overlay...`);
      
      // Append to the active alarm queue if not already there
      setTriggeredAlarms(prev => {
        if (prev.some(alarm => alarm.id === data.id)) return prev;
        return [...prev, data];
      });
      
      // Also sync list
      console.log(`[Socket Outbound ↗️] Re-querying reminders list to sync status...`);
      newSocket.emit('reminder:list');
    });

    newSocket.on('reminder:dismissed_sync', (data: { reminderId: string }) => {
      console.log(`📥 [Socket Inbound 📥] Sync: Alarm dismissed globally for ID ${data.reminderId}. Silencing local overlay.`);
      
      // Remove from active alarm queue if it's there
      setTriggeredAlarms(prev => prev.filter(alarm => alarm.id !== data.reminderId));
      newSocket.emit('reminder:list');
    });

    return () => {
      console.log('🔌 [Socket Connection] Terminating and cleaning up connection...');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl, token, isAuthenticated, user]);

  // Local alarm checking timer for offline support
  useEffect(() => {
    if (!isAuthenticated || user?.id !== 'local_user') return;

    const interval = setInterval(async () => {
      const now = new Date();
      let changed = false;
      const triggered: TriggeredAlarm[] = [];

      const updated = reminders.map((reminder) => {
        if (reminder.status === 'pending') {
          const dueTime = new Date(reminder.dueAt);
          if (dueTime <= now) {
            console.log(`⏰ [Local Alarm] Reminder triggered locally: "${reminder.title}"`);
            changed = true;
            triggered.push({
              id: reminder.id,
              title: reminder.title,
              description: reminder.description,
              dueAt: reminder.dueAt,
              isGroup: false,
              groupName: null,
              creatorUsername: user.name || user.username,
            });
            return { ...reminder, status: 'triggered' as const };
          }
        }
        return reminder;
      });

      if (changed) {
        setReminders(updated);
        try {
          await AsyncStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save local reminders after trigger:', err);
        }
      }

      if (triggered.length > 0) {
        setTriggeredAlarms((prev) => {
          const merged = [...prev];
          triggered.forEach((t) => {
            if (!merged.some((m) => m.id === t.id)) {
              merged.push(t);
            }
          });
          return merged;
        });
      }
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [isAuthenticated, user, reminders]);

  // Auth operations
  const login = (username: string, password: string) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:login' for @${username}`);
    setAuthError(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:login', { username, password });
    }
  };

  const register = (username: string, password: string) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:register' for @${username}`);
    setAuthError(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:register', { username, password });
    }
  };

  const logout = () => {
    console.log('[Auth Session] Logging out... purging tokens and local rosters.');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setFriends([]);
    setFriendRequests([]);
    setGroups([]);
    setReminders([]);
    setTriggeredAlarms([]);
    setOtpSent(false);
    setOtpSentMessage(null);
    setContactsRecommendations([]);
    clearErrors();

    AsyncStorage.removeItem(LOCAL_USER_KEY);
    AsyncStorage.removeItem(LOCAL_REMINDERS_KEY);
  };

  const requestOtp = (email: string) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:request_otp' for ${email}`);
    setAuthError(null);
    setOtpSent(false);
    setOtpSentMessage(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:request_otp', { email });
    }
  };

  const verifyOtp = (email: string, otp: string) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:verify_otp' for ${email} with code ${otp}`);
    setAuthError(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:verify_otp', { email, otp });
    }
  };

  const signupStep1 = (username: string, phone: string, password: string) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:signup_step1' for @${username}`);
    setAuthError(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:signup_step1', { username, phone, password });
    }
  };

  const signupStep2 = (name: string) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:signup_step2' with name: ${name}`);
    setAuthError(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:signup_step2', { name });
    }
  };

  const checkContacts = (phones: string[]) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:check_contacts' with ${phones.length} phone numbers`);
    setAuthError(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:check_contacts', { phones });
    }
  };

  const signupStep3Complete = () => {
    console.log(`[Socket Outbound ↗️] Dispatching 'auth:signup_step3_complete'`);
    setAuthError(null);
    if (socketRef.current) {
      socketRef.current.emit('auth:signup_step3_complete');
    }
  };

  // Friend operations
  const sendFriendRequest = (username: string) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'friend:request' to target: @${username}`);
    setFriendError(null);
    setFriendSuccess(null);
    if (socketRef.current) {
      socketRef.current.emit('friend:request', { toUsername: username });
    }
  };

  const respondToFriendRequest = (requestId: string, action: 'accept' | 'reject') => {
    console.log(`[Socket Outbound ↗️] Dispatching 'friend:respond' for request ${requestId} (Action: ${action})`);
    setFriendError(null);
    if (socketRef.current) {
      socketRef.current.emit('friend:respond', { requestId, action });
    }
  };

  // Group operations
  const createGroup = (name: string, memberIds: string[]) => {
    console.log(`[Socket Outbound ↗️] Dispatching 'group:create' for "${name}" with members: [${memberIds.join(', ')}]`);
    setGroupError(null);
    if (socketRef.current) {
      socketRef.current.emit('group:create', { name, memberIds });
    }
  };

  // Reminder operations
  const createReminder = async (
    title: string,
    description: string,
    dueAt: Date,
    groupId?: string,
    category?: string,
    repeat?: string,
    tags?: string[],
    customFields?: { label: string; value: string }[]
  ) => {
    setReminderError(null);
    if (user?.id === 'local_user') {
      console.log(`[Local Account] Creating local reminder: "${title}"`);
      const newReminder: Reminder = {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title,
        description,
        dueAt: dueAt.toISOString(),
        status: 'pending',
        isGroup: false,
        groupName: null,
        groupId: null,
        creatorId: 'local_user',
        creatorUsername: user.name || user.username,
        isDismissedByMe: false,
        category,
        repeat,
        tags,
        customFields
      };

      const updated = [...reminders, newReminder];
      setReminders(updated);
      try {
        await AsyncStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save local reminder:', err);
      }
      return;
    }

    console.log(`[Socket Outbound ↗️] Dispatching 'reminder:create' for "${title}" scheduled at ${dueAt.toISOString()} (Group: ${groupId || 'None'})`);
    if (socketRef.current) {
      socketRef.current.emit('reminder:create', {
        title,
        description,
        dueAt: dueAt.toISOString(),
        groupId,
        category,
        repeat,
        tags,
        customFields
      });
    }
  };

  const dismissReminder = async (reminderId: string) => {
    if (user?.id === 'local_user') {
      console.log(`[Local Account] Dismissing local reminder: ${reminderId}`);
      const updated = reminders.map(r => r.id === reminderId ? { ...r, status: 'completed' as const, isDismissedByMe: true } : r);
      setReminders(updated);
      setTriggeredAlarms(prev => prev.filter(alarm => alarm.id !== reminderId));
      try {
        await AsyncStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to dismiss local reminder:', err);
      }
      return;
    }

    console.log(`[Socket Outbound ↗️] Dispatching 'reminder:dismiss' for reminder ID ${reminderId}`);
    if (socketRef.current) {
      socketRef.current.emit('reminder:dismiss', { reminderId });
    }
    setTriggeredAlarms(prev => prev.filter(alarm => alarm.id !== reminderId));
  };

  const updateUserSettings = async (newSettings: Partial<NonNullable<UserInfo['settings']>>) => {
    if (user) {
      const updatedUser: UserInfo = {
        ...user,
        settings: {
          ...user.settings,
          ...newSettings,
        } as any
      };
      setUser(updatedUser);

      if (user.id === 'local_user') {
        try {
          await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
        } catch (err) {
          console.error('Failed to save updated local user settings:', err);
        }
        return;
      }
    }

    console.log(`[Socket Outbound ↗️] Dispatching 'user:update_settings':`, newSettings);
    if (socketRef.current && isAuthenticated) {
      socketRef.current.emit('user:update_settings', newSettings);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    if (user?.id === 'local_user') {
      console.log(`[Local Account] Deleting local reminder: ${reminderId}`);
      const updated = reminders.filter(r => r.id !== reminderId);
      setReminders(updated);
      setTriggeredAlarms(prev => prev.filter(alarm => alarm.id !== reminderId));
      try {
        await AsyncStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to delete local reminder:', err);
      }
      return;
    }

    console.log(`[Socket Outbound ↗️] Dispatching 'reminder:delete' for reminder ID ${reminderId}`);
    if (socketRef.current) {
      socketRef.current.emit('reminder:delete', { reminderId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        isAuthenticated,
        user,
        token,
        serverUrl,
        setServerUrl,
        authError,
        friendError,
        friendSuccess,
        groupError,
        reminderError,

        friends,
        friendRequests,
        groups,
        reminders,
        triggeredAlarms,

        otpSent,
        otpSentMessage,
        contactsRecommendations,

        login,
        register,
        logout,
        requestOtp,
        verifyOtp,
        signupStep1,
        signupStep2,
        checkContacts,
        signupStep3Complete,
        sendFriendRequest,
        respondToFriendRequest,
        createGroup,
        createReminder,
        dismissReminder,
        deleteReminder,
        updateUserSettings,
        clearErrors,
        loginLocalAccount
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
