import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { checkIn, checkOut, getMyAttendance, getMyMonthlySummary } from '../../services/api';
import { AttendanceRecord, MonthlyAttendanceSummary } from '../../../packages/shared/types';
import { theme, spacing, fontSize, radius } from '../../theme';

// Safe wrappers — background tracking not available in Expo Go
let _isTrackingActive: () => Promise<boolean> = async () => false;
let _startTracking:    () => Promise<void>    = async () => { throw new Error('Background tracking requires an EAS Dev Build (not Expo Go). Build the APK to use this feature.'); };
try {
  const t = require('../../tasks/locationTask');
  _isTrackingActive = t.isTrackingActive;
  _startTracking    = t.startLocationTracking;
} catch {}

const DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];

function isWithinOfficeHours(schedule: { workStartTime: string; workEndTime: string; workDays: string[] } | null): { ok: boolean; reason: string } {
  if (!schedule) return { ok: true, reason: '' };
  const now = new Date();
  const day = DAYS[now.getDay()];
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = schedule.workStartTime.split(':').map(Number);
  const [eh, em] = schedule.workEndTime.split(':').map(Number);
  if (!schedule.workDays.includes(day))
    return { ok: false, reason: `Not a work day (${day.charAt(0) + day.slice(1).toLowerCase()})` };
  if (mins < sh * 60 + sm)
    return { ok: false, reason: `Office opens at ${schedule.workStartTime}` };
  if (mins >= eh * 60 + em)
    return { ok: false, reason: `Office closed at ${schedule.workEndTime}` };
  return { ok: true, reason: '' };
}

export default function AttendanceTab() {
  const { user, schedule } = useAuth();
  const [records,  setRecords]  = useState<AttendanceRecord[]>([]);
  const [summary,  setSummary]  = useState<MonthlyAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking]  = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const now = new Date();
  const openRecord = records.find(r => !r.checkOutTime);
  const isCheckedIn = !!openRecord;

  const load = useCallback(async () => {
    try {
      const [recs, sum] = await Promise.all([
        getMyAttendance(),
        getMyMonthlySummary(now.getFullYear(), now.getMonth()),
      ]);
      setRecords(recs);
      setSummary(sum);
    } catch {}
  }, []);

  const checkTracking = useCallback(async () => {
    const active = await _isTrackingActive();
    setTracking(active);
  }, []);

  useEffect(() => { load(); checkTracking(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAttendance = async () => {
    setIsLoading(true);
    setStatusMsg('');
    try {
      if (!isCheckedIn) {
        // Validate schedule client-side first
        const { ok, reason } = isWithinOfficeHours(schedule);
        if (!ok) { Alert.alert('Check-in Not Allowed', reason); setIsLoading(false); return; }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location Required', 'Please allow location access to check in.');
          setIsLoading(false); return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await checkIn(loc.coords.latitude, loc.coords.longitude);
        setStatusMsg('✅ Checked in successfully!');
      } else {
        await checkOut();
        setStatusMsg('🔵 Checked out successfully!');
      }
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTracking = async () => {
    try {
      await _startTracking();
      setTracking(true);
      Alert.alert('✅ Tracking Started', 'GeoTracker will now auto check-in/out based on your schedule and location.');
    } catch (e: any) {
      Alert.alert('Cannot Start Tracking', e.message);
    }
  };

  const { ok: canCheckIn, reason: blockReason } = isWithinOfficeHours(schedule);
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.coral} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}</Text>
        <Text style={styles.dateStr}>{dayName}, {dateStr}</Text>
      </View>

      {/* Auto-tracking strip (Phase B — EAS build only) */}
      {tracking ? (
        <View style={[styles.strip, styles.stripGreen]}>
          <Text style={styles.stripIcon}>🟢</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stripTitle}>Auto-tracking Active</Text>
            <Text style={styles.stripSub}>{schedule?.workStartTime}–{schedule?.workEndTime} · Background service running</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[styles.strip, styles.stripAmber]} onPress={handleStartTracking} activeOpacity={0.8}>
          <Text style={styles.stripIcon}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stripTitle}>Enable Auto-tracking</Text>
            <Text style={styles.stripSub}>Tap to start background attendance (needs background location)</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Check-in card */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isCheckedIn ? theme.green : theme.text3 }]} />
          <Text style={[styles.statusText, { color: isCheckedIn ? theme.green : theme.text3 }]}>
            {isCheckedIn ? 'Checked In' : 'Not Checked In'}
          </Text>
        </View>

        {isCheckedIn && openRecord && (
          <Text style={styles.checkInSince}>
            Since {new Date(openRecord.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        {schedule && (
          <Text style={styles.scheduleLine}>🕐 {schedule.workStartTime} – {schedule.workEndTime}</Text>
        )}

        {!isCheckedIn && !canCheckIn && (
          <View style={styles.blockedBox}>
            <Text style={styles.blockedText}>{blockReason}</Text>
          </View>
        )}

        {statusMsg !== '' && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{statusMsg}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.checkBtn,
            isCheckedIn ? styles.checkBtnOut : styles.checkBtnIn,
            (!isCheckedIn && !canCheckIn) && styles.checkBtnDisabled,
          ]}
          onPress={handleAttendance}
          disabled={isLoading || (!isCheckedIn && !canCheckIn)}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.checkBtnText}>{isCheckedIn ? 'Check Out →' : 'Check In →'}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {summary && (
        <View style={styles.statsRow}>
          {[
            { value: summary.totalDaysPresent, label: 'Days Present', color: theme.green },
            { value: `${Math.floor(summary.totalWorkingMinutes / 60)}h`, label: 'Hours Worked', color: theme.coral },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={[styles.statNum, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent records */}
      <Text style={styles.sectionTitle}>Recent Attendance</Text>
      {records.slice(0, 5).map(rec => (
        <View key={rec.id} style={styles.recCard}>
          <View style={[styles.recDot, { backgroundColor: rec.checkOutTime ? theme.green : theme.amber }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.recDate}>
              {new Date(rec.checkInTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
            </Text>
            <Text style={styles.recTime}>
              In: {new Date(rec.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {rec.checkOutTime ? `  ·  Out: ${new Date(rec.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : '  ·  Active'}
            </Text>
          </View>
          {rec.automatic && <Text style={styles.autoBadge}>auto</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.surface0 },
  content:     { padding: spacing.md, paddingBottom: 40 },
  header:      { marginBottom: spacing.md, paddingTop: spacing.lg },
  greeting:    { fontSize: fontSize.xxl, fontWeight: '700', color: theme.text1 },
  dateStr:     { fontSize: fontSize.sm, color: theme.text3, marginTop: 2 },
  strip:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1 },
  stripGreen:  { backgroundColor: theme.greenLight, borderColor: theme.greenBorder },
  stripAmber:  { backgroundColor: theme.amberLight, borderColor: '#D9770640' },
  stripIcon:   { fontSize: 18 },
  stripTitle:  { fontSize: fontSize.sm, fontWeight: '600', color: theme.text1 },
  stripSub:    { fontSize: fontSize.xs, color: theme.text2, marginTop: 1 },
  card:        { backgroundColor: theme.white, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  statusText:  { fontSize: fontSize.lg, fontWeight: '600' },
  checkInSince:{ fontSize: fontSize.sm, color: theme.text3, marginBottom: spacing.xs },
  scheduleLine:{ fontSize: fontSize.xs, color: theme.text3, marginBottom: spacing.sm },
  blockedBox:  { backgroundColor: theme.amberLight, borderRadius: radius.sm, padding: spacing.xs, marginBottom: spacing.sm },
  blockedText: { fontSize: fontSize.xs, color: theme.amber },
  successBox:  { backgroundColor: theme.greenLight, borderRadius: radius.sm, padding: spacing.xs, marginBottom: spacing.sm },
  successText: { fontSize: fontSize.xs, color: theme.green },
  checkBtn:    { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  checkBtnIn:  { backgroundColor: theme.coral },
  checkBtnOut: { backgroundColor: theme.text2 },
  checkBtnDisabled: { opacity: 0.4 },
  checkBtnText:{ color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  statsRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard:    { flex: 1, backgroundColor: theme.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  statNum:     { fontSize: fontSize.xxl, fontWeight: '700' },
  statLabel:   { fontSize: fontSize.xs, color: theme.text3, marginTop: 2 },
  sectionTitle:{ fontSize: fontSize.base, fontWeight: '700', color: theme.text1, marginBottom: spacing.sm },
  recCard:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.white, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.xs },
  recDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  recDate:     { fontSize: fontSize.sm, fontWeight: '600', color: theme.text1 },
  recTime:     { fontSize: fontSize.xs, color: theme.text3, marginTop: 2 },
  autoBadge:   { fontSize: 9, color: theme.text3, backgroundColor: theme.surface2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
});
