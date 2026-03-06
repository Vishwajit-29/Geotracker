import { User, AttendanceRecord, Geofence } from "../types";

// In-memory "database"
let users: User[] = [];
let attendanceRecords: AttendanceRecord[] = [];

const USERS_STORAGE_KEY = "geotracker_users";
const ATTENDANCE_STORAGE_KEY = "geotracker_attendance";

// Helper to parse records and convert date strings to Date objects
const parseAttendanceRecords = (records: any[]): AttendanceRecord[] => {
  return records.map((record) => ({
    ...record,
    checkInTime: new Date(record.checkInTime),
    checkOutTime: record.checkOutTime
      ? new Date(record.checkOutTime)
      : undefined,
  }));
};

/**
 * Initializes the in-memory data by fetching from localStorage if available,
 * otherwise falls back to JSON files and caches them in localStorage.
 */
export const initializeDB = async () => {
  try {
    const [usersResponse, attendanceResponse] = await Promise.all([
      fetch(`/data/users.json?cacheBust=${Date.now()}`),
      fetch(`/data/attendance.json?cacheBust=${Date.now()}`),
    ]);

    if (!usersResponse.ok) throw new Error("Failed to fetch users.json");
    if (!attendanceResponse.ok)
      throw new Error("Failed to fetch attendance.json");

    const usersData = await usersResponse.json();
    const attendanceData = await attendanceResponse.json();

    users = usersData;
    attendanceRecords = parseAttendanceRecords(attendanceData);

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    localStorage.setItem(
      ATTENDANCE_STORAGE_KEY,
      JSON.stringify(attendanceRecords),
    );
  } catch (error) {
    console.error("Error initializing data:", error);
    users = [];
    attendanceRecords = [];
  }
};

// --- Data Persistence Helpers ---
const persistUsers = () => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

const persistAttendance = () => {
  localStorage.setItem(
    ATTENDANCE_STORAGE_KEY,
    JSON.stringify(attendanceRecords),
  );
};

// All functions below now operate on in-memory arrays and persist changes to localStorage.

export const getAllUsers = (): User[] => {
  return users;
};

export const getAllAttendanceRecords = (): AttendanceRecord[] => {
  return attendanceRecords;
};

export const addUser = (newUser: User): void => {
  users.push(newUser);
  persistUsers();
};

export const removeUser = (userId: number): void => {
  users = users.filter((user) => user.id !== userId);
  persistUsers();
};

export const updateUserGeofence = (
  userId: number,
  geofence: Geofence | undefined,
): void => {
  const userIndex = users.findIndex((user) => user.id === userId);
  if (userIndex > -1) {
    users[userIndex].geofence = geofence;
    persistUsers();
  }
};

export const addAttendanceRecord = (newRecord: AttendanceRecord): void => {
  attendanceRecords.push(newRecord);
  persistAttendance();
};

export const updateAttendanceRecord = (
  updatedRecord: AttendanceRecord,
): void => {
  const recordIndex = attendanceRecords.findIndex(
    (r) => r.id === updatedRecord.id,
  );
  if (recordIndex > -1) {
    attendanceRecords[recordIndex] = updatedRecord;
    persistAttendance();
  }
};

export const removeAttendanceRecordsForUser = (userId: number): void => {
  attendanceRecords = attendanceRecords.filter(
    (record) => record.userId !== userId,
  );
  persistAttendance();
};
