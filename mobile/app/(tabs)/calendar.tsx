import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyMonthlySummary, getMyLeaves } from '../../services/api';
import { MonthlyAttendanceSummary, Leave, LeaveStatus } from '../../../packages/shared/types';
import { theme, spacing, fontSize, radius } from '../../theme';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function CalendarTab() {
  const { user } = useAuth();
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth());
  const [summary, setSummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [leaves,  setLeaves]  = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        getMyMonthlySummary(year, month),
        getMyLeaves(),
      ]);
      setSummary(s);
      setLeaves(l.filter(lv => lv.status === LeaveStatus.APPROVED));
    } catch {} finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [year, month]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset   = firstDay === 0 ? 6 : firstDay - 1; // shift to Mon-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const approvedLeaveSet = new Set<string>();
  leaves.forEach(lv => {
    const s = new Date(lv.startDate), e = new Date(lv.endDate);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      approvedLeaveSet.add(d.toISOString().split('T')[0]);
    }
  });

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isoKey = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isPresent = (d: number) => !!summary?.checkInDays?.[isoKey(d)];
  const isLeave   = (d: number) => approvedLeaveSet.has(isoKey(d));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.coral} />}
    >
      <Text style={styles.pageTitle}>Attendance Calendar</Text>

      {/* Month nav */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{FULL_MONTHS[month]} {year}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {summary && (
        <View style={styles.statsRow}>
          {[
            { n: summary.totalDaysPresent, label: 'Present', color: theme.green },
            { n: leaves.length,            label: 'On Leave', color: theme.amber },
            { n: `${Math.floor(summary.totalWorkingMinutes/60)}h`, label: 'Worked', color: theme.coral },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Calendar grid */}
      <View style={styles.calCard}>
        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAY_LABELS.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
        </View>

        {/* Cells */}
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={idx} style={styles.cell} />;
            const present = isPresent(day);
            const leave   = isLeave(day);
            const todayCell = isToday(day);
            return (
              <View key={idx} style={[
                styles.cell,
                present  && styles.cellPresent,
                leave    && styles.cellLeave,
                todayCell && !present && !leave && styles.cellToday,
              ]}>
                <Text style={[
                  styles.cellText,
                  present  && styles.cellTextPresent,
                  leave    && styles.cellTextLeave,
                  todayCell && !present && !leave && styles.cellTextToday,
                ]}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { color: theme.green, label: 'Present' },
          { color: theme.amber, label: 'On Leave' },
          { color: theme.coral, label: 'Today' },
        ].map(l => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendLabel}>{l.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const CELL_SIZE = 40;
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.surface0 },
  content:     { padding: spacing.md, paddingTop: spacing.lg + spacing.sm, paddingBottom: 40 },
  pageTitle:   { fontSize: fontSize.xxl, fontWeight: '700', color: theme.text1, marginBottom: spacing.md },
  navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn:      { width: 36, height: 36, borderRadius: radius.md, backgroundColor: theme.surface1, alignItems: 'center', justifyContent: 'center' },
  navArrow:    { fontSize: 22, color: theme.text1, lineHeight: 28 },
  monthLabel:  { fontSize: fontSize.lg, fontWeight: '700', color: theme.text1 },
  statsRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard:    { flex: 1, backgroundColor: theme.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  statNum:     { fontSize: fontSize.xl, fontWeight: '700' },
  statLabel:   { fontSize: fontSize.xs, color: theme.text3, marginTop: 2 },
  calCard:     { backgroundColor: theme.white, borderRadius: radius.xl, padding: spacing.sm, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.sm },
  dayHeaders:  { flexDirection: 'row', marginBottom: 4 },
  dayLabel:    { flex: 1, textAlign: 'center', fontSize: fontSize.xs, fontWeight: '600', color: theme.text3, paddingVertical: 4 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  cellPresent: { backgroundColor: theme.green, borderRadius: radius.full },
  cellLeave:   { backgroundColor: theme.amber, borderRadius: radius.full },
  cellToday:   { borderWidth: 2, borderColor: theme.coral, borderRadius: radius.full },
  cellText:    { fontSize: fontSize.sm, color: theme.text2 },
  cellTextPresent: { color: '#fff', fontWeight: '600' },
  cellTextLeave:   { color: '#fff', fontWeight: '600' },
  cellTextToday:   { color: theme.coral, fontWeight: '700' },
  legend:      { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: fontSize.xs, color: theme.text2 },
});
