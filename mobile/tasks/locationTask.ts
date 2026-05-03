/**
 * Background Location Task — must be imported at root _layout.tsx (top-level)
 * so TaskManager can register it before the app renders any component.
 *
 * This mirrors the logic in frontend/hooks/useAutoAttendance.ts exactly.
 * ⚠ Works ONLY in EAS Dev Build / Production builds — NOT in Expo Go.
 */
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyCheckIn, notifyCheckOut, notifyGeofenceWarning } from '../services/notifications';
import { WorkSchedule } from '../../packages/shared/types';

export const LOCATION_TASK = 'gt-location-task';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isWithinSchedule(schedule: WorkSchedule): { inHours: boolean; hoursEnded: boolean; isWorkDay: boolean } {
  const now = new Date();
  const dayName = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][now.getDay()];
  const mins    = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = schedule.workStartTime.split(':').map(Number);
  const [eh, em] = schedule.workEndTime.split(':').map(Number);
  const isWorkDay = schedule.workDays.includes(dayName);
  return {
    isWorkDay,
    inHours:    isWorkDay && mins >= sh * 60 + sm && mins < eh * 60 + em,
    hoursEnded: isWorkDay && mins >= eh * 60 + em,
  };
}

// ── Top-level task definition (required by TaskManager) ───────────────────────
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
  if (error) { console.error('[GT Task]', error); return; }
  if (!data?.locations?.length) return;
  const loc = data.locations[0];

  try {
    const [token, scheduleRaw, serverUrl, checkedInStr, missStreakStr] = await Promise.all([
      AsyncStorage.getItem('gt_token'),
      AsyncStorage.getItem('gt_schedule'),
      AsyncStorage.getItem('gt_server_url'),
      AsyncStorage.getItem('gt_checked_in'),
      AsyncStorage.getItem('gt_miss_streak'),
    ]);

    if (!token || !scheduleRaw || !serverUrl) return;

    const schedule: WorkSchedule = JSON.parse(scheduleRaw);
    const isCheckedIn = checkedInStr === 'true';
    const missStreak  = parseInt(missStreakStr ?? '0', 10);
    const base        = serverUrl.replace(/\/$/, '');
    const headers     = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const { inHours, hoursEnded, isWorkDay } = isWithinSchedule(schedule);

    // ── Auto checkout at end of day ───────────────────────────────────────
    if (isCheckedIn && hoursEnded) {
      const r = await fetch(`${base}/attendance/auto-checkout`, { method: 'POST', headers });
      if (r.ok) {
        await AsyncStorage.setItem('gt_checked_in', 'false');
        await AsyncStorage.setItem('gt_miss_streak', '0');
        await notifyCheckOut('hours_ended');
      }
      return;
    }

    // Not a work day or outside hours — nothing to do
    if (!isWorkDay || !inHours) return;

    // ── Auto check-in if not already in ──────────────────────────────────
    if (!isCheckedIn) {
      const r = await fetch(`${base}/attendance/auto-checkin`, {
        method: 'POST', headers,
        body: JSON.stringify({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
      });
      if (r.ok) {
        await AsyncStorage.setItem('gt_checked_in', 'true');
        await AsyncStorage.setItem('gt_miss_streak', '0');
        await notifyCheckIn(new Date());
      }
      return;
    }

    // ── Geofence monitoring for checked-in employees ──────────────────────
    // Read user's geofence from persisted user object
    const userRaw = await AsyncStorage.getItem('gt_user');
    if (!userRaw) return;
    const user = JSON.parse(userRaw);
    const geofence = user.geofence;

    if (!geofence?.center) return; // No geofence set — skip

    const dist = haversineMeters(
      loc.coords.latitude, loc.coords.longitude,
      geofence.center.latitude, geofence.center.longitude,
    );
    const inGeofence = dist <= (geofence.radius ?? 500);

    if (inGeofence) {
      // Back inside — reset miss streak
      if (missStreak > 0) await AsyncStorage.setItem('gt_miss_streak', '0');
    } else {
      const newStreak = missStreak + 1;
      await AsyncStorage.setItem('gt_miss_streak', String(newStreak));

      if (newStreak >= 6) {
        // 6 × 5 min = 30 min outside → auto checkout
        const r = await fetch(`${base}/attendance/auto-checkout`, { method: 'POST', headers });
        if (r.ok) {
          await AsyncStorage.setItem('gt_checked_in', 'false');
          await AsyncStorage.setItem('gt_miss_streak', '0');
          await notifyCheckOut('geofence');
        }
      } else if (newStreak === 3) {
        // Warning at 15 min
        await notifyGeofenceWarning(newStreak);
      }
    }
  } catch (e) {
    console.error('[GT Task] error:', e);
  }
});

// ── Helpers to start / stop tracking ──────────────────────────────────────────
export async function startLocationTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) return;

  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') throw new Error('Foreground location permission denied');

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') throw new Error('Background location permission denied. Open Settings to allow "All the time" location access.');

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,   // 5 min
    distanceInterval: 100,          // or 100m movement
    foregroundService: {
      notificationTitle: 'GeoTracker Active',
      notificationBody: 'Monitoring office attendance in the background…',
      notificationColor: '#C96442',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopLocationTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
}
