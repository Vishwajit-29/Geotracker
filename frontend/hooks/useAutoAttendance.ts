/**
 * useAutoAttendance — background schedule engine (web)
 *
 * Behaviour:
 *  - Ticks every 60 seconds
 *  - If today is a work day AND within office hours:
 *      → try auto check-in if not already checked in
 *  - Every 5 min while checked in: verify geofence
 *      → if outside geofence: increment miss counter
 *      → if missed ≥ 6 consecutive checks (30 min): auto check-out
 *  - When office hours end: auto check-out if still checked in
 *  - Won't act if user is on approved leave today
 *  - Won't duplicate check-in if already checked in
 *
 * Expo/Mobile equivalent: expo-background-fetch task (same API contract)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkSchedule, AttendanceRecord } from '../types';
import * as api from '../services/apiService';

// ── Day name map ─────────────────────────────────────────────────────────────
const JS_DAY_TO_JAVA: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

function parseTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function timeToMinutes(hhmm: string): number {
  const { h, m } = parseTime(hhmm);
  return h * 60 + m;
}

function isWorkDay(schedule: WorkSchedule, date: Date): boolean {
  const dayName = JS_DAY_TO_JAVA[date.getDay()];
  return schedule.workDays.includes(dayName);
}

function isWithinOfficeHours(schedule: WorkSchedule, now: Date): boolean {
  const cur = minutesSinceMidnight(now);
  const start = timeToMinutes(schedule.workStartTime);
  const end = timeToMinutes(schedule.workEndTime);
  return cur >= start && cur < end;
}

function hasOfficeHoursEnded(schedule: WorkSchedule, now: Date): boolean {
  return minutesSinceMidnight(now) >= timeToMinutes(schedule.workEndTime);
}

// ── Hook state ───────────────────────────────────────────────────────────────
export type AutoStatus =
  | 'idle'          // schedule not loaded or not a work day
  | 'waiting'       // work day but before office hours
  | 'tracking'      // checked in, actively monitoring geofence
  | 'checked-out'   // auto/manual check-out done for today
  | 'error';        // geo permission denied

interface AutoAttendanceState {
  status: AutoStatus;
  schedule: WorkSchedule | null;
  lastCheck: Date | null;
  /** Number of consecutive 5-min checks where user was outside geofence */
  missStreak: number;
  /** Minutes until auto checkout due to geofence miss (0 if not tracking) */
  minutesUntilAutoCheckout: number;
  message: string;
}

interface Props {
  currentRecord: AttendanceRecord | null;          // current open check-in (null = not checked in)
  isOnLeaveToday: boolean;                          // skip all auto-checks if on approved leave
  onCheckIn: (record: AttendanceRecord) => void;   // callback when auto check-in succeeds
  onCheckOut: (record: AttendanceRecord) => void;  // callback when auto check-out succeeds
}

const GEOFENCE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const AUTO_CHECKOUT_MISS_THRESHOLD = 6;             // 6 × 5min = 30 min
const TICK_INTERVAL_MS = 60 * 1000;                // 1 min main loop

export function useAutoAttendance({ currentRecord, isOnLeaveToday, onCheckIn, onCheckOut }: Props): AutoAttendanceState {
  const [state, setState] = useState<AutoAttendanceState>({
    status: 'idle',
    schedule: null,
    lastCheck: null,
    missStreak: 0,
    minutesUntilAutoCheckout: 0,
    message: 'Loading schedule…',
  });

  const missStreakRef = useRef(0);
  const lastGeoCheckRef = useRef<number>(0);
  const hasActedTodayRef = useRef<{ date: string; checkedOut: boolean }>({ date: '', checkedOut: false });

  // ── Load schedule on mount ───────────────────────────────────────────────
  useEffect(() => {
    api.getMySchedule().then(schedule => {
      if (!schedule || !schedule.active) {
        setState(s => ({ ...s, status: 'idle', message: 'No work schedule set', schedule: null }));
      } else {
        setState(s => ({ ...s, schedule, message: 'Schedule loaded' }));
      }
    });
  }, []);

  // ── Geolocation helper ───────────────────────────────────────────────────
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      })
    ), []);

  // ── Main tick (runs every 60s) ───────────────────────────────────────────
  const tick = useCallback(async () => {
    const { schedule } = state;
    if (!schedule || !schedule.active) return;

    const now = new Date();
    const todayStr = now.toDateString();

    // Reset daily state at day rollover
    if (hasActedTodayRef.current.date !== todayStr) {
      hasActedTodayRef.current = { date: todayStr, checkedOut: false };
      missStreakRef.current = 0;
    }

    // Skip if on leave
    if (isOnLeaveToday) {
      setState(s => ({ ...s, status: 'idle', message: 'On leave today — auto-tracking paused' }));
      return;
    }

    // Skip non-work days
    if (!isWorkDay(schedule, now)) {
      setState(s => ({ ...s, status: 'idle', message: 'Not a work day' }));
      return;
    }

    // ── Before office hours ────────────────────────────────────────────────
    if (!isWithinOfficeHours(schedule, now)) {
      // If office hours have ended and still checked in → auto checkout
      if (hasOfficeHoursEnded(schedule, now) && currentRecord && !hasActedTodayRef.current.checkedOut) {
        try {
          const record = await api.autoCheckOut();
          hasActedTodayRef.current.checkedOut = true;
          missStreakRef.current = 0;
          onCheckOut(record);
          setState(s => ({
            ...s, status: 'checked-out', lastCheck: now, missStreak: 0, minutesUntilAutoCheckout: 0,
            message: `Auto checked out at ${now.toLocaleTimeString()} — office hours ended`,
          }));
        } catch {}
      } else if (!hasOfficeHoursEnded(schedule, now)) {
        setState(s => ({
          ...s, status: 'waiting', lastCheck: now,
          message: `Office starts at ${schedule.workStartTime}`,
        }));
      }
      return;
    }

    // ── Within office hours ────────────────────────────────────────────────

    // Request location
    let position: GeolocationPosition;
    try {
      position = await getCurrentPosition();
    } catch {
      setState(s => ({
        ...s, status: 'error', lastCheck: now,
        message: 'Location permission denied — auto-tracking disabled',
      }));
      return;
    }

    const { latitude, longitude } = position.coords;
    const now2 = Date.now();

    // ── Not yet checked in → try auto check-in ────────────────────────────
    if (!currentRecord) {
      try {
        const record = await api.autoCheckIn({ latitude, longitude });
        missStreakRef.current = 0;
        lastGeoCheckRef.current = now2;
        onCheckIn(record);
        setState(s => ({
          ...s, status: 'tracking', lastCheck: now, missStreak: 0, minutesUntilAutoCheckout: 0,
          message: `Auto checked in at ${now.toLocaleTimeString()}`,
        }));
      } catch (e: any) {
        // Outside geofence — silently wait
        setState(s => ({
          ...s, status: 'waiting', lastCheck: now,
          message: e?.message?.includes('outside') ? 'Outside office area — will auto check-in when you arrive' : 'Waiting to check in…',
        }));
      }
      return;
    }

    // ── Checked in → periodic geofence verification every 5 min ──────────
    if (now2 - lastGeoCheckRef.current < GEOFENCE_CHECK_INTERVAL_MS) {
      // Not time for geo check yet — just update status
      setState(s => ({
        ...s, status: 'tracking', lastCheck: now,
        message: `Tracking active · miss streak: ${missStreakRef.current}/${AUTO_CHECKOUT_MISS_THRESHOLD}`,
      }));
      return;
    }

    lastGeoCheckRef.current = now2;

    // Call API just for geofence check — use auto-checkin as a "ping" but we're already checked in
    // Instead, we re-use the geofence check via autoCheckIn which will throw if outside
    try {
      // If autoCheckIn throws "already checked in" → we're inside geofence (backend checked)
      // If throws "outside geofence" → we're outside
      // We need a clean ping — attempt auto-checkout preview by checking via manual position
      // Simple approach: fetch profile and run client-side haversine check
      const dist = await clientSideGeofenceCheck(latitude, longitude);
      if (dist.inGeofence) {
        missStreakRef.current = 0;
        setState(s => ({
          ...s, status: 'tracking', lastCheck: now, missStreak: 0, minutesUntilAutoCheckout: 0,
          message: `Inside office area · verified at ${now.toLocaleTimeString()}`,
        }));
      } else {
        missStreakRef.current += 1;
        const minsLeft = (AUTO_CHECKOUT_MISS_THRESHOLD - missStreakRef.current) * 5;
        if (missStreakRef.current >= AUTO_CHECKOUT_MISS_THRESHOLD) {
          // Auto checkout after 30 min outside
          const record = await api.autoCheckOut();
          hasActedTodayRef.current.checkedOut = true;
          onCheckOut(record);
          missStreakRef.current = 0;
          setState(s => ({
            ...s, status: 'checked-out', lastCheck: now, missStreak: 0, minutesUntilAutoCheckout: 0,
            message: `Auto checked out — outside office for 30+ minutes`,
          }));
        } else {
          setState(s => ({
            ...s, status: 'tracking', lastCheck: now,
            missStreak: missStreakRef.current,
            minutesUntilAutoCheckout: minsLeft,
            message: `⚠ Outside office area · auto checkout in ${minsLeft} min`,
          }));
        }
      }
    } catch {}
  }, [state, currentRecord, isOnLeaveToday, getCurrentPosition, onCheckIn, onCheckOut]);

  // ── Timer setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.schedule) return;
    tick(); // immediate first run
    const interval = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [state.schedule, currentRecord, isOnLeaveToday]);

  return state;
}

// ── Client-side geofence check using stored user profile ────────────────────
async function clientSideGeofenceCheck(lat: number, lng: number): Promise<{ inGeofence: boolean; distance: number }> {
  try {
    const users = await api.getAllUsers();
    const token = localStorage.getItem('geotracker_token');
    if (!token) return { inGeofence: false, distance: 9999 };
    const payload = JSON.parse(atob(token.split('.')[1]));
    const me = users.find(u => String(u.id) === String(payload.sub));
    if (!me?.geofence?.center) return { inGeofence: true, distance: 0 }; // no fence set → always inside
    const { latitude: clat, longitude: clng } = me.geofence.center;
    const radius = me.geofence.radius;
    const d = haversine(lat, lng, clat, clng);
    return { inGeofence: d <= radius, distance: d };
  } catch {
    return { inGeofence: true, distance: 0 }; // fail-safe: don't auto-checkout on error
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number { return deg * Math.PI / 180; }
