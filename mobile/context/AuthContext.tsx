import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../packages/shared/types';
import { getMySchedule } from '../services/api';
import { WorkSchedule } from '../../packages/shared/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  schedule: WorkSchedule | null;
  isLoading: boolean;
  signIn: (user: User, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSchedule: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,     setUser]     = useState<User | null>(null);
  const [token,    setToken]    = useState<string | null>(null);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem('gt_token'),
          AsyncStorage.getItem('gt_user'),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {}
      finally { setIsLoading(false); }
    })();
  }, []);

  // Load schedule whenever user logs in
  useEffect(() => {
    if (user) refreshSchedule();
  }, [user?.id]);

  const refreshSchedule = async () => {
    try {
      const s = await getMySchedule();
      setSchedule(s);
      if (s) await AsyncStorage.setItem('gt_schedule', JSON.stringify(s));
    } catch {}
  };

  const signIn = async (u: User, t: string) => {
    await Promise.all([
      AsyncStorage.setItem('gt_token', t),
      AsyncStorage.setItem('gt_user', JSON.stringify(u)),
    ]);
    setToken(t);
    setUser(u);
  };

  const signOut = async () => {
    await Promise.all([
      AsyncStorage.removeItem('gt_token'),
      AsyncStorage.removeItem('gt_user'),
      AsyncStorage.removeItem('gt_schedule'),
      AsyncStorage.removeItem('gt_checked_in'),
      AsyncStorage.removeItem('gt_miss_streak'),
    ]);
    setToken(null);
    setUser(null);
    setSchedule(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, schedule, isLoading, signIn, signOut, refreshSchedule }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
