import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsers, getPendingLeaves, getAllLeaves,
  approveLeave, rejectLeave, deleteUser,
} from '../../services/api';
import { User, Leave, LeaveStatus, Role } from '../../../packages/shared/types';
import { theme, spacing, fontSize, radius } from '../../theme';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminTab() {
  const { user: me } = useAuth();
  const [users,    setUsers]    = useState<User[]>([]);
  const [pending,  setPending]  = useState<Leave[]>([]);
  const [allLvs,   setAllLvs]   = useState<Leave[]>([]);
  const [tab,      setTab]      = useState<'leaves' | 'team'>('leaves');
  const [loading,  setLoading]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p, a] = await Promise.all([getAllUsers(), getPendingLeaves(), getAllLeaves()]);
      setUsers(u);
      setPending(p);
      setAllLvs(a);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load admin data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleApprove = async (id: number) => {
    try { await approveLeave(id); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleReject = async (id: number) => {
    Alert.alert('Decline Leave', 'Are you sure you want to decline this request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        try { await rejectLeave(id); await load(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const employees = users.filter(u => u.role === Role.Employee);
  const approved  = allLvs.filter(l => l.status === LeaveStatus.APPROVED);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.coral} />}
    >
      <Text style={styles.pageTitle}>Admin Panel</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { n: employees.length, label: 'Employees', color: theme.coral },
          { n: pending.length,   label: 'Pending Leaves', color: theme.amber },
          { n: approved.length,  label: 'Approved', color: theme.green },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.n}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Sub-tab switcher */}
      <View style={styles.tabBar}>
        {(['leaves', 'team'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'leaves' ? `Leave Requests${pending.length > 0 ? ` (${pending.length})` : ''}` : 'Team'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color={theme.coral} style={{ marginVertical: 20 }} />}

      {/* Leave Requests */}
      {tab === 'leaves' && (
        <>
          {pending.length === 0 && !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyText}>No pending leave requests</Text>
            </View>
          )}
          {pending.map(leave => (
            <View key={leave.id} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveName}>{leave.userName}</Text>
                <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>
              </View>
              <Text style={styles.leaveDates}>
                {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
              </Text>
              <Text style={styles.leaveType}>{leave.leaveType ?? 'Leave'}</Text>
              {leave.reason && <Text style={styles.leaveReason}>{leave.reason}</Text>}
              <View style={styles.leaveActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(leave.id)} activeOpacity={0.85}>
                  <Text style={styles.approveBtnText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleReject(leave.id)} activeOpacity={0.85}>
                  <Text style={styles.declineBtnText}>✕ Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Recent approved */}
          {approved.slice(0, 5).map(leave => (
            <View key={leave.id} style={[styles.leaveCard, styles.leaveCardApproved]}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveName}>{leave.userName}</Text>
                <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>Approved</Text></View>
              </View>
              <Text style={styles.leaveDates}>{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</Text>
              <Text style={styles.leaveType}>{leave.leaveType ?? 'Leave'}</Text>
            </View>
          ))}
        </>
      )}

      {/* Team */}
      {tab === 'team' && (
        <>
          {employees.map(emp => (
            <View key={emp.id} style={styles.empCard}>
              <View style={styles.empAvatar}>
                <Text style={styles.empAvatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.name}</Text>
                <Text style={styles.empRole}>Employee</Text>
                {emp.geofence && (
                  <Text style={styles.empGeo}>
                    📍 {emp.geofence.radius}m radius
                  </Text>
                )}
              </View>
              <View style={[styles.empStatus, { backgroundColor: theme.greenLight }]}>
                <Text style={[styles.empStatusText, { color: theme.green }]}>Active</Text>
              </View>
            </View>
          ))}
        </>
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
  statNum:     { fontSize: fontSize.xl, fontWeight: '700' },
  statLabel:   { fontSize: 10, color: theme.text3, marginTop: 2, textAlign: 'center' },
  tabBar:      { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tabBtn:      { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center', backgroundColor: theme.white },
  tabBtnActive:{ backgroundColor: theme.coral, borderColor: theme.coral },
  tabBtnText:  { fontSize: fontSize.sm, fontWeight: '600', color: theme.text2 },
  tabBtnTextActive: { color: '#fff' },
  empty:       { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:   { fontSize: 36, marginBottom: 12 },
  emptyText:   { fontSize: fontSize.base, color: theme.text3 },
  leaveCard:   { backgroundColor: theme.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.sm },
  leaveCardApproved: { opacity: 0.7 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  leaveName:   { fontSize: fontSize.base, fontWeight: '700', color: theme.text1 },
  leaveDates:  { fontSize: fontSize.sm, color: theme.text2, marginBottom: 2 },
  leaveType:   { fontSize: fontSize.xs, color: theme.text3, marginBottom: 4 },
  leaveReason: { fontSize: fontSize.sm, color: theme.text2, marginBottom: spacing.sm, fontStyle: 'italic' },
  leaveActions:{ flexDirection: 'row', gap: spacing.sm },
  approveBtn:  { flex: 1, backgroundColor: theme.green, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  declineBtn:  { flex: 1, backgroundColor: theme.redLight, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.redBorder },
  declineBtnText: { color: theme.red, fontSize: fontSize.sm, fontWeight: '700' },
  pendingBadge:  { backgroundColor: `${theme.amber}20`, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${theme.amber}60` },
  pendingBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: theme.amber },
  approvedBadge: { backgroundColor: theme.greenLight, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.greenBorder },
  approvedBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: theme.green },
  empCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: theme.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.sm },
  empAvatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.coralLight, alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { fontSize: fontSize.lg, fontWeight: '700', color: theme.coral },
  empName:     { fontSize: fontSize.base, fontWeight: '600', color: theme.text1 },
  empRole:     { fontSize: fontSize.xs, color: theme.text3 },
  empGeo:      { fontSize: fontSize.xs, color: theme.text3, marginTop: 2 },
  empStatus:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  empStatusText: { fontSize: fontSize.xs, fontWeight: '600' },
});
