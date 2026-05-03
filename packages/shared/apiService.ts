import { AuthResponse, User, AttendanceRecord, Leave, LeaveStatus, MonthlyAttendanceSummary, WorkSchedule } from './types';

// ── Adapter injection ─────────────────────────────────────────────────────────
type TokenGetter  = () => Promise<string | null>;
type BaseUrlGetter = () => Promise<string>;

let _getToken: TokenGetter   = async () => null;
let _getBaseUrl: BaseUrlGetter = async () => '/api';

/** Call once at app startup to inject platform-specific token storage + URL. */
export function configureApiAdapters(getToken: TokenGetter, getBaseUrl: BaseUrlGetter) {
  _getToken   = getToken;
  _getBaseUrl = getBaseUrl;
}

// ── Core fetch helpers ────────────────────────────────────────────────────────
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const [token, base] = await Promise.all([_getToken(), _getBaseUrl()]);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(`${base}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res;
}

async function get<T>(endpoint: string): Promise<T> {
  const res = await fetchWithAuth(endpoint);
  return res.json();
}

async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function put<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetchWithAuth(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function del(endpoint: string): Promise<void> {
  await fetchWithAuth(endpoint, { method: 'DELETE' });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(name: string, password: string): Promise<AuthResponse> {
  const base = await _getBaseUrl();
  console.log(`[login] Attempting login to: ${base}/auth/login`);
  const res  = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || 'Invalid credentials'}`);
  }
  return res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  await fetchWithAuth('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getAllUsers(): Promise<User[]> {
  return get('/users');
}

export async function createUser(name: string, password: string): Promise<User> {
  return post('/users', { name, password });
}

export async function deleteUser(userId: number): Promise<void> {
  return del(`/users/${userId}`);
}

export async function setGeofence(userId: number, geofence: { center: { latitude: number; longitude: number }; radius: number } | null): Promise<User> {
  return post(`/users/${userId}/geofence`, geofence);
}

// ── Attendance ────────────────────────────────────────────────────────────────
export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  return get('/attendance');
}

export async function getMyAttendance(): Promise<AttendanceRecord[]> {
  return get('/attendance/me');
}

export async function checkIn(latitude: number, longitude: number): Promise<AttendanceRecord> {
  return post('/attendance/checkin', { latitude, longitude });
}

export async function checkOut(): Promise<AttendanceRecord> {
  return post('/attendance/checkout');
}

export async function autoCheckIn(latitude: number, longitude: number): Promise<AttendanceRecord> {
  return post('/attendance/auto-checkin', { latitude, longitude });
}

export async function autoCheckOut(): Promise<AttendanceRecord> {
  return post('/attendance/auto-checkout');
}

export async function getMyMonthlySummary(year: number, month: number): Promise<MonthlyAttendanceSummary> {
  return get(`/attendance/me/summary?year=${year}&month=${month}`);
}

export async function getUserMonthlySummary(userId: number, year: number, month: number): Promise<MonthlyAttendanceSummary> {
  return get(`/attendance/user/${userId}/summary?year=${year}&month=${month}`);
}

// ── Leaves ────────────────────────────────────────────────────────────────────
export async function getMyLeaves(): Promise<Leave[]> {
  return get('/leaves/me');
}

export async function getAllLeaves(): Promise<Leave[]> {
  return get('/leaves');
}

export async function getPendingLeaves(): Promise<Leave[]> {
  return get('/leaves/pending');
}

export async function getLeavesByUser(userId: number): Promise<Leave[]> {
  return get(`/leaves/user/${userId}`);
}

export async function requestLeave(data: {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<Leave> {
  return post('/leaves', data);
}

export async function approveLeave(id: number): Promise<Leave> {
  return post(`/leaves/${id}/approve`);
}

export async function rejectLeave(id: number): Promise<Leave> {
  return post(`/leaves/${id}/reject`);
}

// ── Work Schedule ─────────────────────────────────────────────────────────────
export async function getMySchedule(): Promise<WorkSchedule | null> {
  try { return await get('/schedule/me'); } catch { return null; }
}

export async function getAllSchedules(): Promise<WorkSchedule[]> {
  return get('/schedule');
}

export async function setSchedule(userId: number, schedule: {
  workStartTime: string;
  workEndTime: string;
  workDays: string[];
  active: boolean;
}): Promise<WorkSchedule> {
  return post(`/schedule/${userId}`, schedule);
}

export async function deleteSchedule(userId: number): Promise<void> {
  return del(`/schedule/${userId}`);
}
