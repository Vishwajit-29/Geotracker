import React, { useEffect, useState } from 'react';
import { User, AttendanceRecord, Location, Geofence, Leave, LeaveType, LeaveStatus, MonthlyAttendanceSummary } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import * as api from '../services/apiService';
import MapDisplay from './MapDisplay';
import AttendanceCalendar from './AttendanceCalendar';
import ChangePasswordModal from './ChangePasswordModal';
import LeaveRequestModal from './LeaveRequestModal';
import LeaveHistoryModal from './LeaveHistoryModal';
import AttendanceHistoryModal from './AttendanceHistoryModal';
import WorkingHours from './WorkingHours';
import { LocationIcon } from './icons/LocationIcon';
import { ClockIcon } from './icons/ClockIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { GeoTrackerLogo } from './icons/GeoTrackerLogo';

interface EmployeeDashboardProps {
  currentUser: User;
  attendanceRecords: AttendanceRecord[];
  allUsers: User[];
  onMarkAttendance: (userId: number, location: Location) => void;
  onLogout: () => void;
  attendanceError: string | null;
  clearAttendanceError: () => void;
  defaultGeofence: Geofence;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser,
  attendanceRecords,
  allUsers,
  onMarkAttendance,
  onLogout,
  attendanceError,
  clearAttendanceError,
  defaultGeofence,
}) => {
  const { location, error: geoError, isLoading, getLocation } = useGeolocation();
  const [mapView, setMapView] = useState<Location | null>(null);

  // New state for calendar and features
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [monthlySummary, setMonthlySummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);

  // Modal states
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLeaveRequestOpen, setIsLeaveRequestOpen] = useState(false);
  const [isLeaveHistoryOpen, setIsLeaveHistoryOpen] = useState(false);
  const [isAttendanceHistoryOpen, setIsAttendanceHistoryOpen] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(false);

  // Safely get employee geofence with fallback to default
  const employeeGeofence: Geofence = currentUser.geofence?.center
    ? currentUser.geofence
    : defaultGeofence;

  // Safely get map center
  const mapCenter: Location = mapView || employeeGeofence?.center || defaultGeofence.center;

  // Load data when month changes
  useEffect(() => {
    loadMonthlySummary();
    loadLeaves();
  }, [calendarYear, calendarMonth]);

  // Load attendance data after location is received
  useEffect(() => {
    if (location) {
      onMarkAttendance(currentUser.id, location);
      setMapView(location);
      // Refresh data after marking attendance (delay to allow backend to process)
      setTimeout(() => {
        loadMonthlySummary();
      }, 1500);
    }
  }, [location]);

  // Refresh data when page becomes visible (user returns to tab/browser)
  useEffect(() => {
    const refreshData = async () => {
      try {
        const summary = await api.getMonthlyAttendanceSummary(calendarYear, calendarMonth);
        setMonthlySummary(summary);
      } catch (error) {
        console.error('Failed to load monthly summary:', error);
      }
      try {
        const leaveData = await api.getMyLeaves();
        setLeaves(leaveData);
      } catch (error) {
        console.error('Failed to load leaves:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshData);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshData);
    };
  }, [calendarYear, calendarMonth]);

  const loadMonthlySummary = async () => {
    try {
      setIsLoadingData(true);
      const summary = await api.getMonthlyAttendanceSummary(calendarYear, calendarMonth);
      setMonthlySummary(summary);
    } catch (error) {
      console.error('Failed to load monthly summary:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadLeaves = async () => {
    try {
      const leaveData = await api.getMyLeaves();
      setLeaves(leaveData);
    } catch (error) {
      console.error('Failed to load leaves:', error);
    }
  };

  const handleAttendanceClick = () => {
    clearAttendanceError();
    getLocation();
  };

  const handleHistoryClick = (record: AttendanceRecord) => {
    setMapView(record.checkInLocation);
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    await api.changePassword(currentPassword, newPassword, confirmPassword);
  };

  const handleRequestLeave = async (
    type: LeaveType,
    startDate: string,
    endDate: string,
    reason: string
  ) => {
    await api.createLeave(type, startDate, endDate, reason);
    // Reload both leaves and monthly summary to update calendar
    await loadLeaves();
    await loadMonthlySummary();
  };

  const currentStatusRecord = attendanceRecords.find((r) => !r.checkOutTime);
  const statusText = currentStatusRecord ? 'Checked In' : 'Checked Out';
  const statusColor = currentStatusRecord ? 'bg-green-500' : 'bg-red-500';
  const buttonText = currentStatusRecord ? 'Check Out' : 'Check In';

  const sortedRecords = [...(attendanceRecords || [])].sort((a, b) =>
    new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  );

  // Get approved leaves for the current month
  const approvedLeavesForMonth = leaves.filter(
    leave => leave.status === LeaveStatus.APPROVED
  );

  // Compute daily working minutes from attendance records for calendar display
  const dailyWorkingMinutes: Record<string, number> = (() => {
    const result: Record<string, number> = {};
    attendanceRecords
      .filter(r => r.userId === currentUser.id && r.checkOutTime)
      .forEach(record => {
        const dateKey = new Date(record.checkInTime).toISOString().split('T')[0];
        const minutes = (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 60000;
        result[dateKey] = (result[dateKey] || 0) + minutes;
      });
    return result;
  })();

  return (
    <div className="md:flex">
      <header className="bg-brand-dark text-white p-4 flex justify-between items-center w-full md:hidden">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8"><GeoTrackerLogo isLight={true}/></div>
          <h1 className="text-xl font-bold">GeoTracker</h1>
        </div>
        <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-700">
          <LogoutIcon />
        </button>
      </header>

      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-3xl font-bold text-brand-dark">Welcome, {currentUser.name.split(' ')[0]}!</h2>
          <div className="flex items-center gap-2">
            <button onClick={onLogout} className="hidden md:flex items-center space-x-2 text-brand-secondary hover:text-brand-primary">
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="bg-white rounded-xl shadow-lg p-4 hover:shadow-md transition flex flex-col items-center justify-center"
          >
            <svg className="w-8 h-8 text-brand-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm font-semibold text-brand-dark">Change Password</span>
          </button>

          <button
            onClick={() => setIsLeaveRequestOpen(true)}
            className="bg-white rounded-xl shadow-lg p-4 hover:shadow-md transition flex flex-col items-center justify-center"
          >
            <svg className="w-8 h-8 text-brand-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-brand-dark">Request Leave</span>
          </button>

          <button
            onClick={() => setIsLeaveHistoryOpen(true)}
            className="bg-white rounded-xl shadow-lg p-4 hover:shadow-md transition flex flex-col items-center justify-center"
          >
            <svg className="w-8 h-8 text-brand-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-semibold text-brand-dark">Leave History</span>
          </button>
          <button
            onClick={() => setIsAttendanceHistoryOpen(true)}
            className="bg-white rounded-xl shadow-lg p-4 hover:shadow-md transition flex flex-col items-center justify-center"
          >
            <svg className="w-8 h-8 text-brand-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-sm font-semibold text-brand-dark">Attendance History</span>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-4 flex flex-col justify-center">
            <div className="flex items-center justify-center space-x-3">
              <p className="text-lg text-brand-secondary">Your current status:</p>
              <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${statusColor}`}>
                {statusText}
              </span>
            </div>
            <button
              onClick={handleAttendanceClick}
              disabled={isLoading}
              className="w-full md:w-3/4 mx-auto py-4 px-6 bg-brand-primary text-white font-bold rounded-lg shadow-md hover:bg-blue-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Getting Location...' : buttonText}
            </button>
            {geoError && <p className="text-red-500 text-sm mt-2 text-center">{geoError}</p>}
            {attendanceError && <p className="text-red-500 text-sm mt-2 text-center">{attendanceError}</p>}
          </div>
          <div className={`bg-white rounded-xl shadow-lg p-2 h-80 md:h-auto ${isChangePasswordOpen || isLeaveRequestOpen || isLeaveHistoryOpen ? 'opacity-30 pointer-events-none' : ''}`}>
            <MapDisplay
              key={`${mapCenter.latitude}-${mapCenter.longitude}`}
              center={mapCenter}
              markerPosition={mapView}
              circle={employeeGeofence}
              zoom={15}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {monthlySummary && (
            <WorkingHours
              year={monthlySummary.year}
              month={monthlySummary.month}
              totalWorkingMinutes={monthlySummary.totalWorkingMinutes}
              totalDaysPresent={monthlySummary.totalDaysPresent}
              leaves={approvedLeavesForMonth}
            />
          )}

          {monthlySummary && (
            <AttendanceCalendar
              year={calendarYear}
              month={calendarMonth}
              checkInDays={monthlySummary.checkInDays}
              leaves={approvedLeavesForMonth}
              dailyWorkingMinutes={dailyWorkingMinutes}
              onMonthChange={(year, month) => {
                setCalendarYear(year);
                setCalendarMonth(month);
              }}
            />
          )}
        </div>

      </div>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onChangePassword={handleChangePassword}
      />

      <LeaveRequestModal
        isOpen={isLeaveRequestOpen}
        onClose={() => setIsLeaveRequestOpen(false)}
        onRequestLeave={handleRequestLeave}
        existingLeaves={leaves}
        attendanceRecords={attendanceRecords}
      />

      <LeaveHistoryModal
        isOpen={isLeaveHistoryOpen}
        onClose={() => setIsLeaveHistoryOpen(false)}
        leaves={leaves}
        myLeaves={true}
      />
      <AttendanceHistoryModal
        isOpen={isAttendanceHistoryOpen}
        onClose={() => setIsAttendanceHistoryOpen(false)}
        records={attendanceRecords}
        onRecordClick={handleHistoryClick}
      />
    </div>
  );
};

export default EmployeeDashboard;
