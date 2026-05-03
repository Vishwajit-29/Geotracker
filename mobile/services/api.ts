import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureApiAdapters } from '../../packages/shared/apiService';

const DEFAULT_SERVER = 'https://www.vishwajit.tech/api';

export async function getServerUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem('gt_server_url');
  return saved || DEFAULT_SERVER;
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem('gt_server_url', url.replace(/\/$/, ''));
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('gt_token');
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem('gt_token', token);
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem('gt_token'),
    AsyncStorage.removeItem('gt_user'),
    AsyncStorage.removeItem('gt_schedule'),
    AsyncStorage.removeItem('gt_checked_in'),
    AsyncStorage.removeItem('gt_miss_streak'),
  ]);
}

// Configure the shared API with mobile adapters
configureApiAdapters(getToken, getServerUrl);

// Re-export everything from shared
export * from '../../packages/shared/apiService';
