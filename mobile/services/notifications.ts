import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('attendance', {
      name: 'Attendance',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#C96442',
    });
    await Notifications.setNotificationChannelAsync('tracking', {
      name: 'Tracking Status',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifyCheckIn(time: Date): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Checked In',
      body: `Auto check-in at ${time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — have a productive day!`,
      data: { type: 'checkin' },
    },
    trigger: null, // immediate
  });
}

export async function notifyCheckOut(reason: 'hours_ended' | 'geofence', time?: Date): Promise<void> {
  const body = reason === 'hours_ended'
    ? `Office hours ended — you've been checked out automatically.`
    : `Outside office area for 30+ min — auto checked out.`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔵 Checked Out',
      body,
      data: { type: 'checkout' },
    },
    trigger: null,
  });
}

export async function notifyGeofenceWarning(missStreak: number): Promise<void> {
  const minutesLeft = Math.max(0, (6 - missStreak) * 5);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Outside Office Area',
      body: `You've left the geofenced zone. Auto checkout in ~${minutesLeft} min if you don't return.`,
      data: { type: 'geofence_warning' },
    },
    trigger: null,
  });
}

export async function notifyCheckInBlocked(reason: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ℹ️ Check-in Not Allowed',
      body: reason,
      data: { type: 'blocked' },
    },
    trigger: null,
  });
}
