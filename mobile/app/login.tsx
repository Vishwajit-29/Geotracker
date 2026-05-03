import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { login, getServerUrl, setServerUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { theme, spacing, fontSize, radius } from '../theme';

export default function LoginScreen() {
  const { signIn }   = useAuth();
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Server URL config
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');
  
  useEffect(() => {
    getServerUrl().then(setServerUrlState);
  }, []);

  const handleSaveUrl = async () => {
    const trimmed = serverUrl.trim().replace(/\/$/, '');
    await setServerUrl(trimmed);
    setShowConfig(false);
    setError(''); // clear any network errors
  };

  const handleLogin = async () => {
    if (!name.trim() || !password.trim()) {
      setError('Please enter your username and password');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { user, token } = await login(name.trim(), password);
      await signIn(user, token);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Login failed. Check credentials or server URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoMark}>
            <Image source={require('../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.logoName}>GeoTracker</Text>
          <Text style={styles.logoSub}>Attendance Platform</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>
          <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor={theme.text3}
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={theme.text3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In →</Text>
            }
          </TouchableOpacity>

          {/* Server Config Toggle */}
          <TouchableOpacity onPress={() => setShowConfig(!showConfig)} activeOpacity={0.7}>
            <Text style={styles.hint}>
              Server: <Text style={styles.hintBold}>{serverUrl.replace('https://', '').replace('http://', '')}</Text>
              {'\n'}<Text style={{ color: theme.coral }}>Tap to configure connection</Text>
            </Text>
          </TouchableOpacity>
          
          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.label}>API Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrlState}
                placeholder="http://192.168.x.x:8080/api"
                placeholderTextColor={theme.text3}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
                <Text style={styles.saveBtnText}>Save URL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.surface0 },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logoWrap:    { alignItems: 'center', marginBottom: spacing.xl },
  logoMark:    { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: theme.coralLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  logoImg:     { width: 40, height: 40 },
  logoName:    { fontSize: fontSize.xl, fontWeight: '700', color: theme.text1, letterSpacing: -0.5 },
  logoSub:     { fontSize: fontSize.sm, color: theme.text3, marginTop: 2 },
  card:        { backgroundColor: theme.white, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: theme.border },
  cardTitle:   { fontSize: fontSize.xl, fontWeight: '700', color: theme.text1, marginBottom: 4 },
  cardSubtitle:{ fontSize: fontSize.sm, color: theme.text3, marginBottom: spacing.md },
  errorBox:    { backgroundColor: theme.redLight, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: theme.redBorder },
  errorText:   { fontSize: fontSize.sm, color: theme.red },
  fieldGroup:  { marginBottom: spacing.sm },
  label:       { fontSize: fontSize.sm, fontWeight: '600', color: theme.text2, marginBottom: 6 },
  input:       { borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.base, color: theme.text1, backgroundColor: theme.surface0 },
  button:      { backgroundColor: theme.coral, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  buttonText:  { color: '#fff', fontSize: fontSize.base, fontWeight: '700', letterSpacing: 0.3 },
  hint:        { textAlign: 'center', fontSize: fontSize.xs, color: theme.text3, marginTop: spacing.md, lineHeight: 18 },
  hintBold:    { color: theme.text2, fontWeight: '600' },
  configBox:   { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border },
  saveBtn:     { backgroundColor: theme.surface2, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: theme.text1, fontSize: fontSize.sm, fontWeight: '600' },
});
