import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Linking from 'expo-linking';

import { AppState } from 'react-native';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface AppPermissions {
  notifications: PermissionState;
  contacts: PermissionState;
  camera: PermissionState;
  microphone: PermissionState;
  storage: PermissionState;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<AppPermissions>({
    notifications: 'undetermined',
    contacts: 'undetermined',
    camera: 'undetermined',
    microphone: 'undetermined',
    storage: 'undetermined',
  });
  const [loading, setLoading] = useState(true);

  const checkAllPermissions = useCallback(async () => {
    try {
      const [
        notifRes,
        contactsRes,
        cameraRes,
        micRes,
        storageRes
      ] = await Promise.all([
        Notifications.getPermissionsAsync(),
        Contacts.getPermissionsAsync(),
        Camera.getCameraPermissionsAsync(),
        Camera.getMicrophonePermissionsAsync(),
        MediaLibrary.getPermissionsAsync(),
      ]);

      setPermissions({
        notifications: notifRes.status as PermissionState,
        contacts: contactsRes.status as PermissionState,
        camera: cameraRes.status as PermissionState,
        microphone: micRes.status as PermissionState,
        storage: storageRes.status as PermissionState,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestNotifications = async () => {
    try {
      const res = await Notifications.requestPermissionsAsync();
      setPermissions(prev => ({ ...prev, notifications: res.status as PermissionState }));
      return res.status as PermissionState;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied' as PermissionState;
    }
  };

  const requestContacts = async () => {
    try {
      const res = await Contacts.requestPermissionsAsync();
      setPermissions(prev => ({ ...prev, contacts: res.status as PermissionState }));
      return res.status as PermissionState;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return 'denied' as PermissionState;
    }
  };

  const requestCamera = async () => {
    try {
      const res = await Camera.requestCameraPermissionsAsync();
      setPermissions(prev => ({ ...prev, camera: res.status as PermissionState }));
      return res.status as PermissionState;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return 'denied' as PermissionState;
    }
  };

  const requestMicrophone = async () => {
    try {
      const res = await Camera.requestMicrophonePermissionsAsync();
      setPermissions(prev => ({ ...prev, microphone: res.status as PermissionState }));
      return res.status as PermissionState;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return 'denied' as PermissionState;
    }
  };

  const requestStorage = async () => {
    try {
      const res = await MediaLibrary.requestPermissionsAsync();
      setPermissions(prev => ({ ...prev, storage: res.status as PermissionState }));
      return res.status as PermissionState;
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      return 'denied' as PermissionState;
    }
  };

  const openSettings = async () => {
    await Linking.openSettings();
  };

  useEffect(() => {
    checkAllPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkAllPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkAllPermissions]);

  return {
    permissions,
    loading,
    checkAllPermissions,
    requestNotifications,
    requestContacts,
    requestCamera,
    requestMicrophone,
    requestStorage,
    openSettings,
  };
}
