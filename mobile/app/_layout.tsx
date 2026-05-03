/**
 * Root layout — registers background task import (MUST be top-level),
 * sets up notification handler, and wraps app in AuthProvider.
 *
 * ⚠ The locationTask import is guarded: it only runs in a real dev/production
 *   native build. In Expo Go, TaskManager is not available so we skip it.
 */

// Guard: only import the task file if we have native TaskManager support.
// Expo Go doesn't support background tasks, so we catch any error gracefully.
import { Platform } from 'react-native';

// Try to register the location task — will silently fail in Expo Go
try {
  require('../tasks/locationTask');
} catch (e) {
  if (__DEV__) console.warn('[GeoTracker] Background tasks not available in Expo Go:', e);
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../context/AuthContext';
import { setupNotifications } from '../services/notifications';
import { theme } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    setupNotifications();

    // Handle notification tap (when app is backgrounded)
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const type = response.notification.request.content.data?.type;
      if (__DEV__) console.log('[Notification tapped]', type);
    });
    return () => sub.remove();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor={theme.surface0} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
