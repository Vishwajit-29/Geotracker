import { User, AttendanceRecord, Role, Location, Geofence, Leave, LeaveType, LeaveStatus, MonthlyAttendanceSummary } from "../types";

// Auto-detect backend URL from current window or use environment
// In WSL, use the same host as the frontend is served from
const getApiBaseUrl = (): string => {
  // Check if there's a custom API URL set in localStorage (useful for WSL/Windows)
  const customUrl = localStorage.getItem('geotracker_api_url');
  if (customUrl) return customUrl;

  // Use relative path - works when frontend and backend are on same domain
  // For development with separate ports, use the current hostname
  const { protocol, hostname } = window.location;
  // For WSL accessing from Windows browser, use current host
  return `${protocol}//${hostname}:8080/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Helper to get auth token
const getToken = (): string | null => localStorage.getItem("geotracker_token");

// Helper for authenticated fetch
const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP error! status: ${response.status}`);
  }

  return response;
};

// Auth API
export const login = async (name: string, password: string): Promise<{ token: string; user: User }> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  const data = await response.json();
  localStorage.setItem("geotracker_token", data.token);
  return data;
};

export const logout = (): void => {
  localStorage.removeItem("geotracker_token");
};

// Users API
export const getAllUsers = async (): Promise<User[]> => {
  const response = await fetchWithAuth("/users");
  const users = await response.json();

  return users.map((user: any) => ({
    id: user.id,
    name: user.name,
    role: user.role as Role,
    geofence: user.geofence
      ? {
          center: {
            latitude: user.geofence.centerLatitude,
            longitude: user.geofence.centerLongitude,
          },
          radius: user.geofence.radius,
        }
      : undefined,
  }));
};

export const addUser = async (name: string, password: string): Promise<User> => {
  const response = await fetchWithAuth("/users", {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });

  const user = await response.json();
  return {
    id: user.id,
    name: user.name,
    role: user.role as Role,
    geofence: user.geofence
      ? {
          center: {
            latitude: user.geofence.centerLatitude,
            longitude: user.geofence.centerLongitude,
          },
          radius: user.geofence.radius,
        }
      : undefined,
  };
};

export const removeUser = async (userId: number): Promise<void> => {
  await fetchWithAuth(`/users/${userId}`, {
    method: "DELETE",
  });
};

export const updateUserGeofence = async (
  userId: number,
  geofence: Geofence | undefined
): Promise<User> => {
  const body = geofence
    ? {
        centerLatitude: geofence.center.latitude,
        centerLongitude: geofence.center.longitude,
        radius: geofence.radius,
      }
    : {};

  const response = await fetchWithAuth(`/users/${userId}/geofence`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  const user = await response.json();
  return {
    id: user.id,
    name: user.name,
    role: user.role as Role,
    geofence: user.geofence
      ? {
          center: {
            latitude: user.geofence.centerLatitude,
            longitude: user.geofence.centerLongitude,
          },
          radius: user.geofence.radius,
        }
      : undefined,
  };
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> => {
  await fetchWithAuth("/users/change-password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword,
    }),
  });
};

// Attendance API
export const getAllAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  const response = await fetchWithAuth("/attendance");
  const records = await response.json();

  return records.map((record: any) => ({
    id: record.id,
    userId: record.userId,
    checkInTime: new Date(record.checkInTime + 'Z'),
    checkOutTime: record.checkOutTime ? new Date(record.checkOutTime + 'Z') : undefined,
    checkInLocation: {
      latitude: record.checkInLatitude,
      longitude: record.checkInLongitude,
    },
  }));
};

export const getUserAttendanceRecords = async (userId: number): Promise<AttendanceRecord[]> => {
  const response = await fetchWithAuth(`/attendance/user/${userId}`);
  const records = await response.json();

  return records.map((record: any) => ({
    id: record.id,
    userId: record.userId,
    checkInTime: new Date(record.checkInTime + 'Z'),
    checkOutTime: record.checkOutTime ? new Date(record.checkOutTime + 'Z') : undefined,
    checkInLocation: {
      latitude: record.checkInLatitude,
      longitude: record.checkInLongitude,
    },
  }));
};

export const checkIn = async (location: Location): Promise<AttendanceRecord> => {
  const response = await fetchWithAuth("/attendance/checkin", {
    method: "POST",
    body: JSON.stringify(location),
  });

  const record = await response.json();
  return {
    id: record.id,
    userId: record.userId,
    checkInTime: new Date(record.checkInTime),
    checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : undefined,
    checkInLocation: {
      latitude: record.checkInLatitude,
      longitude: record.checkInLongitude,
    },
  };
};

export const checkOut = async (): Promise<AttendanceRecord> => {
  const response = await fetchWithAuth("/attendance/checkout", {
    method: "POST",
  });

  const record = await response.json();
  return {
    id: record.id,
    userId: record.userId,
    checkInTime: new Date(record.checkInTime),
    checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : undefined,
    checkInLocation: {
      latitude: record.checkInLatitude,
      longitude: record.checkInLongitude,
    },
  };
};

// Check if user has open check-in (for determining button state)
export const getOpenCheckIn = async (): Promise<AttendanceRecord | null> => {
  const token = getToken();
  if (!token) return null;

  // Decode JWT to get user ID (simple base64 decode)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    const records = await getUserAttendanceRecords(userId);
    return records.find((r) => !r.checkOutTime) || null;
  } catch {
    return null;
  }
};

// Initialize API - just validates connection
export const initializeAPI = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Method to override API URL (useful for WSL+Windows setup)
export const setApiUrl = (url: string) => {
  localStorage.setItem('geotracker_api_url', url);
};

// Get current API URL for display
export const getApiUrl = (): string => API_BASE_URL;

// ==================== Leave Management ====================
export const getMyLeaves = async (): Promise<Leave[]> => {
  const response = await fetchWithAuth("/leaves/my");
  const leaves = await response.json();

  return leaves.map((leave: any) => ({
    id: leave.id,
    userId: leave.userId,
    userName: leave.userName,
    type: leave.type as LeaveType,
    status: leave.status as LeaveStatus,
    startDate: new Date(leave.startDate),
    endDate: new Date(leave.endDate),
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    approvedByName: leave.approvedByName,
    approvedAt: leave.approvedAt ? new Date(leave.approvedAt) : undefined,
    createdAt: new Date(leave.createdAt),
  }));
};

export const getLeavesByUser = async (userId: number): Promise<Leave[]> => {
  const response = await fetchWithAuth("/leaves");
  const leaves = await response.json();

  return leaves.filter((leave: any) => leave.userId === userId).map((leave: any) => ({
    id: leave.id,
    userId: leave.userId,
    userName: leave.userName,
    type: leave.type as LeaveType,
    status: leave.status as LeaveStatus,
    startDate: new Date(leave.startDate),
    endDate: new Date(leave.endDate),
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    approvedByName: leave.approvedByName,
    approvedAt: leave.approvedAt ? new Date(leave.approvedAt) : undefined,
    createdAt: new Date(leave.createdAt),
  }));
};

export const getPendingLeaves = async (): Promise<Leave[]> => {
  const response = await fetchWithAuth("/leaves/pending");
  const leaves = await response.json();

  return leaves.map((leave: any) => ({
    id: leave.id,
    userId: leave.userId,
    userName: leave.userName,
    type: leave.type as LeaveType,
    status: leave.status as LeaveStatus,
    startDate: new Date(leave.startDate),
    endDate: new Date(leave.endDate),
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    approvedByName: leave.approvedByName,
    approvedAt: leave.approvedAt ? new Date(leave.approvedAt) : undefined,
    createdAt: new Date(leave.createdAt),
  }));
};

export const getAllLeaves = async (): Promise<Leave[]> => {
  const response = await fetchWithAuth("/leaves");
  const leaves = await response.json();

  return leaves.map((leave: any) => ({
    id: leave.id,
    userId: leave.userId,
    userName: leave.userName,
    type: leave.type as LeaveType,
    status: leave.status as LeaveStatus,
    startDate: new Date(leave.startDate),
    endDate: new Date(leave.endDate),
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    approvedByName: leave.approvedByName,
    approvedAt: leave.approvedAt ? new Date(leave.approvedAt) : undefined,
    createdAt: new Date(leave.createdAt),
  }));
};

export const createLeave = async (
  type: LeaveType,
  startDate: string,
  endDate: string,
  reason: string
): Promise<Leave> => {
  const response = await fetchWithAuth("/leaves", {
    method: "POST",
    body: JSON.stringify({
      type,
      startDate,
      endDate,
      reason,
    }),
  });

  const leave = await response.json();
  return {
    id: leave.id,
    userId: leave.userId,
    userName: leave.userName,
    type: leave.type as LeaveType,
    status: leave.status as LeaveStatus,
    startDate: new Date(leave.startDate),
    endDate: new Date(leave.endDate),
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    approvedByName: leave.approvedByName,
    approvedAt: leave.approvedAt ? new Date(leave.approvedAt) : undefined,
    createdAt: new Date(leave.createdAt),
  };
};

export const approveLeave = async (leaveId: number): Promise<Leave> => {
  const response = await fetchWithAuth(`/leaves/${leaveId}/approve`, {
    method: "POST",
  });

  const leave = await response.json();
  return {
    id: leave.id,
    userId: leave.userId,
    userName: leave.userName,
    type: leave.type as LeaveType,
    status: leave.status as LeaveStatus,
    startDate: new Date(leave.startDate),
    endDate: new Date(leave.endDate),
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    approvedByName: leave.approvedByName,
    approvedAt: leave.approvedAt ? new Date(leave.approvedAt) : undefined,
    createdAt: new Date(leave.createdAt),
  };
};

export const rejectLeave = async (leaveId: number): Promise<Leave> => {
  const response = await fetchWithAuth(`/leaves/${leaveId}/reject`, {
    method: "POST",
  });

  const leave = await response.json();
  return {
    id: leave.id,
    userId: leave.userId,
    userName: leave.userName,
    type: leave.type as LeaveType,
    status: leave.status as LeaveStatus,
    startDate: new Date(leave.startDate),
    endDate: new Date(leave.endDate),
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    approvedByName: leave.approvedByName,
    approvedAt: leave.approvedAt ? new Date(leave.approvedAt) : undefined,
    createdAt: new Date(leave.createdAt),
  };
};

// ==================== Monthly Attendance Summary ====================
export const getMonthlyAttendanceSummary = async (
  year: number,
  month: number
): Promise<MonthlyAttendanceSummary> => {
  const response = await fetchWithAuth(`/attendance/summary/${year}/${month}`);
  const summary = await response.json();

  return {
    year: summary.year,
    month: summary.month,
    checkInDays: summary.checkInDays,
    totalWorkingMinutes: summary.totalWorkingMinutes,
    totalDaysPresent: summary.totalDaysPresent,
  };
};

export const getUserMonthlySummary = async (
  userId: number,
  year: number,
  month: number
): Promise<MonthlyAttendanceSummary> => {
  const response = await fetchWithAuth(`/attendance/summary/${userId}/${year}/${month}`);
  const summary = await response.json();

  return {
    year: summary.year,
    month: summary.month,
    checkInDays: summary.checkInDays,
    totalWorkingMinutes: summary.totalWorkingMinutes,
    totalDaysPresent: summary.totalDaysPresent,
  };
};
