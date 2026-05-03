import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyLeaves, requestLeave } from '../../services/api';
import { Leave, LeaveStatus, LeaveType } from '../../../packages/shared/types';
import { theme, spacing, fontSize, radius } from '../../theme';

const LEAVE_TYPES = [LeaveType.CASUAL, LeaveType.MEDICAL, LeaveType.OTHER];

const statusColor: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]:  theme.amber,
  [LeaveStatus.APPROVED]: theme.green,
  [LeaveStatus.REJECTED]: theme.red,
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeavesTab() {
  const { user } = useAuth();
  const [leaves,    setLeaves]    = useState<Leave[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,  setShowForm]  = useState(false);

  // Form state
  const [leaveType,  setLeaveType]  = useState<LeaveType>(LeaveType.CASUAL);
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [reason,     setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setLeaves(await getMyLeaves()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill all fields.'); return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      Alert.alert('Invalid Dates', 'End date must be after start date.'); return;
    }
    setSubmitting(true);
    try {
      await requestLeave({ leaveType, startDate, endDate, reason: reason.trim() });
      setShowForm(false);
      setStartDate(''); setEndDate(''); setReason(''); setLeaveType(LeaveType.CASUAL);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit leave request');
    } finally { setSubmitting(false); }
  };

  const pending  = leaves.filter(l => l.status === LeaveStatus.PENDING);
  const approved = leaves.filter(l => l.status === LeaveStatus.APPROVED);
  const rejected = leaves.filter(l => l.status === LeaveStatus.REJECTED);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.coral} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Leave Requests</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Request</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { n: pending.length,  label: 'Pending',  color: theme.amber },
            { n: approved.length, label: 'Approved', color: theme.green },
            { n: rejected.length, label: 'Rejected', color: theme.red },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {loading && <ActivityIndicator color={theme.coral} style={{ marginTop: 20 }} />}

        {leaves.length === 0 && !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No leave requests yet.</Text>
          </View>
        )}

        {leaves.map(leave => (
          <View key={leave.id} style={styles.leaveCard}>
            <View style={styles.leaveHeader}>
              <View>
                <Text style={styles.leaveDateRange}>
                  {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                </Text>
                <Text style={styles.leaveType}>{leave.leaveType ?? 'Leave'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${statusColor[leave.status]}20`, borderColor: statusColor[leave.status] }]}>
                <Text style={[styles.badgeText, { color: statusColor[leave.status] }]}>{leave.status}</Text>
              </View>
            </View>
            {leave.reason && <Text style={styles.leaveReason}>{leave.reason}</Text>}
            {leave.approvedByName && (
              <Text style={styles.leaveApproved}>
                {leave.status === LeaveStatus.APPROVED ? 'Approved' : 'Handled'} by {leave.approvedByName}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Request Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Leave</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Leave Type</Text>
          <View style={styles.typeRow}>
            {LEAVE_TYPES.map(t => (
              <TouchableOpacity key={t} style={[styles.typeBtn, leaveType === t && styles.typeBtnActive]}
                onPress={() => setLeaveType(t)} activeOpacity={0.8}>
                <Text style={[styles.typeBtnText, leaveType === t && styles.typeBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate}
            placeholder="2025-06-01" placeholderTextColor={theme.text3} />

          <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate}
            placeholder="2025-06-03" placeholderTextColor={theme.text3} />

          <Text style={styles.label}>Reason</Text>
          <TextInput style={[styles.input, styles.textArea]} value={reason} onChangeText={setReason}
            placeholder="Describe the reason for your leave..." placeholderTextColor={theme.text3}
            multiline numberOfLines={4} textAlignVertical="top" />

          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Submit Request</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.surface0 },
  content:     { padding: spacing.md, paddingTop: spacing.lg + spacing.sm, paddingBottom: 40 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  pageTitle:   { fontSize: fontSize.xxl, fontWeight: '700', color: theme.text1 },
  addBtn:      { backgroundColor: theme.coral, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:  { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  statsRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard:    { flex: 1, backgroundColor: theme.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  statNum:     { fontSize: fontSize.xl, fontWeight: '700' },
  statLabel:   { fontSize: fontSize.xs, color: theme.text3, marginTop: 2 },
  empty:       { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:   { fontSize: 36, marginBottom: 12 },
  emptyText:   { fontSize: fontSize.base, color: theme.text3 },
  leaveCard:   { backgroundColor: theme.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.sm },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  leaveDateRange: { fontSize: fontSize.base, fontWeight: '600', color: theme.text1 },
  leaveType:   { fontSize: fontSize.xs, color: theme.text3, marginTop: 2 },
  badge:       { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: fontSize.xs, fontWeight: '700' },
  leaveReason: { fontSize: fontSize.sm, color: theme.text2, marginBottom: 4 },
  leaveApproved: { fontSize: fontSize.xs, color: theme.text3, fontStyle: 'italic' },
  // Modal
  modal:       { flex: 1, backgroundColor: theme.surface0 },
  modalContent:{ padding: spacing.lg, paddingBottom: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle:  { fontSize: fontSize.xl, fontWeight: '700', color: theme.text1 },
  modalClose:  { fontSize: 18, color: theme.text3, padding: 4 },
  label:       { fontSize: fontSize.sm, fontWeight: '600', color: theme.text2, marginBottom: 6, marginTop: spacing.sm },
  typeRow:     { flexDirection: 'row', gap: spacing.xs },
  typeBtn:     { flex: 1, paddingVertical: 9, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center', backgroundColor: theme.white },
  typeBtnActive: { backgroundColor: theme.coral, borderColor: theme.coral },
  typeBtnText: { fontSize: fontSize.xs, fontWeight: '600', color: theme.text2 },
  typeBtnTextActive: { color: '#fff' },
  input:       { borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.base, color: theme.text1, backgroundColor: theme.white },
  textArea:    { minHeight: 100, paddingTop: 11 },
  submitBtn:   { backgroundColor: theme.coral, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  submitBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
});
