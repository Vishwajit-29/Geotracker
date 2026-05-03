export enum Role {
  Admin    = 'ADMIN',
  Employee = 'EMPLOYEE',
}

export enum LeaveType {
  CASUAL  = 'CASUAL',
  MEDICAL = 'MEDICAL',
  OTHER   = 'OTHER',
}

export enum LeaveStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: number;
  name: string;
  role: Role;
  password?: string;
  geofence?: Geofence;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface AttendanceRecord {
  id: number;
  userId: number;
  checkInTime: string;
  checkOutTime?: string;
  checkInLocation: Location;
  automatic?: boolean;
}

export interface Geofence {
  center: Location;
  radius: number;
}

export interface Leave {
  id: number;
  userId: number;
  userName: string;
  leaveType?: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  reason: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface MonthlyAttendanceSummary {
  year: number;
  month: number;
  checkInDays: Record<string, boolean>;
  totalWorkingMinutes: number;
  totalDaysPresent: number;
}

export interface WorkSchedule {
  id?: number;
  userId: number;
  userName?: string;
  workStartTime: string;  // "HH:mm"
  workEndTime: string;    // "HH:mm"
  workDays: string[];     // ["MONDAY","TUESDAY",...]
  active: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
