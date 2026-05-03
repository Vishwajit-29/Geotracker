import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/api';
import { getServerUrl, setServerUrl } from '../../services/api';
import { theme, spacing, fontSize, radius } from '../../theme';

// Safe wrappers — not available in Expo Go
let _stopTracking:    () => Promise<void>    = async () => {};
let _isTrackingActive: () => Promise<boolean> = async () => false;
try {
  const t = require('../../tasks/locationTask');
  _stopTracking     = t.stopLocationTracking;
  _isTrackingActive = t.isTrackingActive;
} catch {}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ label, value, onPress, danger }: { label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <Text style={[styles.rowLabel, danger && { color: theme.red }]}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && <Text style={styles.rowChevron}>›</Text>}
    </TouchableOpacity>
  );
}

export default function SettingsTab() {
  const { user, schedule, signOut, refreshSchedule } = useAuth();

  // Server URL
  const [serverUrl, setServerUrlState] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  React.useEffect(() => { getServerUrl().then(setServerUrlState); }, []);

  const handleSaveUrl = async () => {
    const trimmed = serverUrl.trim().replace(/\/$/, '');
    if (!trimmed) { Alert.alert('Invalid URL', 'Please enter a valid server URL.'); return; }
    setSavingUrl(true);
    try {
      await setServerUrl(trimmed);
      Alert.alert('✅ Saved', 'Server URL updated. Reconnecting on next request.');
    } finally { setSavingUrl(false); }
  };

  // Change password
  const [showPass, setShowPass]           = useState(false);
  const [currentPass, setCurrentPass]     = useState('');
  const [newPass, setNewPass]             = useState('');
  const [confirmPass, setConfirmPass]     = useState('');
  const [changingPass, setChangingPass]   = useState(false);

  const handleChangePassword = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert('Missing Fields', 'Please fill all password fields.'); return;
    }
    if (newPass.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters.'); return;
    }
    if (!/[A-Z]/.test(newPass)) {
      Alert.alert('Weak Password', 'Password must contain at least one uppercase letter.'); return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Mismatch', 'New passwords do not match.'); return;
    }
    setChangingPass(true);
    try {
      await changePassword(currentPass, newPass, confirmPass);
      Alert.alert('✅ Password Changed', 'Your password has been updated successfully.');
      setCurrentPass(''); setNewPass(''); setConfirmPass(''); setShowPass(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally { setChangingPass(false); }
  };

  // Tracking
  const handleStopTracking = async () => {
    const active = await _isTrackingActive();
    if (!active) { Alert.alert('Not Running', 'Background tracking is not active.'); return; }
    Alert.alert('Stop Tracking', 'This will disable auto check-in/out until you re-enable it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: async () => { await _stopTracking(); Alert.alert('Stopped', 'Background tracking stopped.'); } },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* Profile */}
      <Section title="Account">
        <Row label="Name"    value={user?.name} />
        <View style={styles.divider} />
        <Row label="Role"    value={user?.role} />
        <View style={styles.divider} />
        <Row label="Change Password" onPress={() => setShowPass(v => !v)} />
      </Section>

      {showPass && (
        <View style={styles.passCard}>
          {[
            { label: 'Current Password', value: currentPass, set: setCurrentPass },
            { label: 'New Password',     value: newPass,     set: setNewPass },
            { label: 'Confirm New',      value: confirmPass, set: setConfirmPass },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput style={styles.input} value={f.value} onChangeText={f.set}
                secureTextEntry placeholderTextColor={theme.text3} placeholder="••••••••" />
            </View>
          ))}
          <TouchableOpacity style={[styles.actionBtn, changingPass && { opacity: 0.6 }]}
            onPress={handleChangePassword} disabled={changingPass} activeOpacity={0.85}>
            {changingPass
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.actionBtnText}>Update Password</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Work Schedule */}
      <Section title="Work Schedule">
        {schedule ? (
          <>
            <Row label="Office Hours" value={`${schedule.workStartTime} – ${schedule.workEndTime}`} />
            <View style={styles.divider} />
            <Row label="Work Days" value={schedule.workDays.map(d => d.slice(0, 3)).join(', ')} />
            <View style={styles.divider} />
            <Row label="Status" value={schedule.active ? '🟢 Active' : '⚫ Inactive'} />
          </>
        ) : (
          <Row label="No schedule set" value="Contact admin" />
        )}
        <View style={styles.divider} />
        <Row label="Refresh Schedule" onPress={refreshSchedule} />
      </Section>

      {/* Server URL */}
      <Section title="Server Connection">
        <Text style={styles.fieldLabel}>API Server URL</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrlState}
          placeholder="https://www.vishwajit.tech/api"
          placeholderTextColor={theme.text3}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity style={[styles.actionBtn, { marginTop: spacing.sm }, savingUrl && { opacity: 0.6 }]}
          onPress={handleSaveUrl} disabled={savingUrl} activeOpacity={0.85}>
          {savingUrl
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.actionBtnText}>Save & Reconnect</Text>
          }
        </TouchableOpacity>
      </Section>

      {/* Background Tracking */}
      <Section title="Background Tracking">
        <Row label="Stop Background Tracking" onPress={handleStopTracking} danger />
        <View style={styles.divider} />
        <Text style={styles.note}>
          Background tracking auto checks-in/out based on your schedule and location.
          Requires background location permission and a dev/production build (not Expo Go).
        </Text>
      </Section>

      {/* App Info */}
      <Section title="About">
        <Row label="App Version" value="1.0.0" />
        <View style={styles.divider} />
        <Row label="Server" value={serverUrl.replace('https://', '').replace('http://', '')} />
      </Section>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: theme.surface0 },
  content:      { padding: spacing.md, paddingTop: spacing.lg + spacing.sm, paddingBottom: 60 },
  pageTitle:    { fontSize: fontSize.xxl, fontWeight: '700', color: theme.text1, marginBottom: spacing.md },
  section:      { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  sectionCard:  { backgroundColor: theme.white, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14 },
  rowLabel:     { fontSize: fontSize.base, color: theme.text1 },
  rowValue:     { fontSize: fontSize.sm, color: theme.text3, maxWidth: '55%', textAlign: 'right' },
  rowChevron:   { fontSize: 18, color: theme.text3, marginLeft: 4 },
  divider:      { height: 1, backgroundColor: theme.border, marginHorizontal: spacing.md },
  passCard:     { backgroundColor: theme.white, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, padding: spacing.md, marginBottom: spacing.md },
  fieldLabel:   { fontSize: fontSize.sm, fontWeight: '600', color: theme.text2, marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.base, color: theme.text1, backgroundColor: theme.surface0, marginBottom: spacing.xs },
  actionBtn:    { backgroundColor: theme.coral, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  actionBtnText:{ color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  note:         { fontSize: fontSize.xs, color: theme.text3, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, lineHeight: 18 },
  logoutBtn:    { backgroundColor: theme.redLight, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.redBorder },
  logoutText:   { fontSize: fontSize.base, fontWeight: '700', color: theme.red },
});
