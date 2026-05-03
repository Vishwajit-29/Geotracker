import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyAttendance } from '../../services/api';
import { AttendanceRecord } from '../../../packages/shared/types';
import { theme, spacing, fontSize, radius } from '../../theme';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface DayStat {
  date: string;       // YYYY-MM-DD
  minutes: number;
}

function calcStats(records: AttendanceRecord[]) {
  const byDate: Record<string, number> = {};
  records.forEach(r => {
    if (!r.checkOutTime) return;
    const key = new Date(r.checkInTime).toISOString().split('T')[0];
    const mins = (new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 60000;
    byDate[key] = (byDate[key] || 0) + mins;
  });
  const days: DayStat[] = Object.entries(byDate)
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalMins = days.reduce((s, d) => s + d.minutes, 0);
  const avgMins   = days.length > 0 ? totalMins / days.length : 0;
  return { days, totalMins, avgMins };
}

export default function HoursTab() {
  const { user } = useAuth();
  const [records,    setRecords]    = useState<AttendanceRecord[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords(await getMyAttendance()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const { days, totalMins, avgMins } = calcStats(records);

  const fmtHM = (mins: number) =>
    `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m`;

  // Group by month
  const byMonth: Record<string, DayStat[]> = {};
  days.forEach(d => {
    const key = d.date.slice(0, 7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(d);
  });

  const MAX_BAR = days.length > 0 ? Math.max(...days.slice(0, 7).map(d => d.minutes)) : 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.coral} />}
    >
      <Text style={styles.pageTitle}>Working Hours</Text>

      {/* Summary cards */}
      <View style={styles.statsRow}>
        {[
          { value: fmtHM(totalMins), label: 'Total Hours', color: theme.coral },
          { value: days.length,       label: 'Days Present', color: theme.green },
          { value: fmtHM(avgMins),    label: 'Avg / Day',    color: theme.text1 },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {loading && <ActivityIndicator color={theme.coral} style={{ marginVertical: 20 }} />}

      {/* Mini bar chart — last 7 days */}
      {days.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 Days</Text>
          {days.slice(0, 7).map(d => (
            <View key={d.date} style={styles.barRow}>
              <Text style={styles.barDate}>
                {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(d.minutes / MAX_BAR) * 100}%` }]} />
              </View>
              <Text style={styles.barValue}>{fmtHM(d.minutes)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Monthly breakdown */}
      {Object.entries(byMonth).map(([monthKey, monthDays]) => {
        const [y, m] = monthKey.split('-').map(Number);
        const monthTotal = monthDays.reduce((s, d) => s + d.minutes, 0);
        return (
          <View key={monthKey} style={styles.card}>
            <View style={styles.monthHeader}>
              <Text style={styles.cardTitle}>{MONTH_NAMES[m - 1]} {y}</Text>
              <Text style={styles.monthTotal}>{fmtHM(monthTotal)}</Text>
            </View>
            {monthDays.map(d => (
              <View key={d.date} style={styles.dayRow}>
                <Text style={styles.dayDate}>
                  {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' })}
                </Text>
                <View style={styles.dayBar}>
                  <View style={[styles.dayBarFill, { width: `${Math.min(100, (d.minutes / 540) * 100)}%` }]} />
                </View>
                <Text style={styles.dayValue}>{fmtHM(d.minutes)}</Text>
              </View>
            ))}
          </View>
        );
      })}

      {days.length === 0 && !loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⏱️</Text>
          <Text style={styles.emptyText}>No working hours recorded yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.surface0 },
  content:     { padding: spacing.md, paddingTop: spacing.lg + spacing.sm, paddingBottom: 40 },
  pageTitle:   { fontSize: fontSize.xxl, fontWeight: '700', color: theme.text1, marginBottom: spacing.md },
  statsRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard:    { flex: 1, backgroundColor: theme.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  statNum:     { fontSize: fontSize.lg, fontWeight: '700' },
  statLabel:   { fontSize: fontSize.xs, color: theme.text3, marginTop: 2, textAlign: 'center' },
  card:        { backgroundColor: theme.white, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md },
  cardTitle:   { fontSize: fontSize.base, fontWeight: '700', color: theme.text1, marginBottom: spacing.sm },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  monthTotal:  { fontSize: fontSize.sm, fontWeight: '600', color: theme.coral },
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barDate:     { width: 72, fontSize: fontSize.xs, color: theme.text2 },
  barTrack:    { flex: 1, height: 8, backgroundColor: theme.surface2, borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', backgroundColor: theme.coral, borderRadius: 4 },
  barValue:    { width: 52, fontSize: fontSize.xs, color: theme.text2, textAlign: 'right' },
  dayRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dayDate:     { width: 60, fontSize: fontSize.xs, color: theme.text2 },
  dayBar:      { flex: 1, height: 6, backgroundColor: theme.surface2, borderRadius: 3, overflow: 'hidden' },
  dayBarFill:  { height: '100%', backgroundColor: theme.green, borderRadius: 3 },
  dayValue:    { width: 52, fontSize: fontSize.xs, color: theme.text2, textAlign: 'right' },
  empty:       { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:   { fontSize: 36, marginBottom: 12 },
  emptyText:   { fontSize: fontSize.base, color: theme.text3 },
});
