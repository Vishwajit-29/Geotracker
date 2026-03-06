
export enum Role {
  Admin = 'ADMIN',
  Employee = 'EMPLOYEE',
}

export enum LeaveType {
  CASUAL = 'CASUAL',
  MEDICAL = 'MEDICAL',
  OTHER = 'OTHER',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
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
  checkInTime: Date;
  checkOutTime?: Date;
  checkInLocation: Location;
}

export interface Geofence {
  center: Location;
  radius: number; // in meters
}

export interface Leave {
  id: number;
  userId: number;
  userName: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  reason: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface MonthlyAttendanceSummary {
  year: number;
  month: number;
  checkInDays: Record<string, boolean>; // date string -> has check-in
  totalWorkingMinutes: number;
  totalDaysPresent: number;
}

export interface WorkingHoursData {
  year: number;
  month: number;
  totalWorkingMinutes: number;
  totalDaysPresent: number;
  averageHoursPerDay: number;
}
