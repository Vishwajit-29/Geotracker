import React, { useState, useEffect } from "react";
import { User, AttendanceRecord, Role, Geofence, Leave, MonthlyAttendanceSummary, LeaveStatus } from "../types";
import { exportToCSV } from "../services/exportService";
import * as api from "../services/apiService";
import { LogoutIcon } from "./icons/LogoutIcon";
import { UsersIcon } from "./icons/UsersIcon";
import { DocumentTextIcon } from "./icons/DocumentTextIcon";
import { DownloadIcon } from "./icons/DownloadIcon";
import { GeoTrackerLogo } from "./icons/GeoTrackerLogo";
import { GlobeIcon } from "./icons/GlobeIcon";
import { PlusIcon } from "./icons/PlusIcon";
import { TrashIcon } from "./icons/TrashIcon";
import GeofenceEditorModal from "./GeofenceEditorModal";
import { PencilIcon } from "./icons/PencilIcon";
import LeaveHistoryModal from "./LeaveHistoryModal";
import WorkingHours from "./WorkingHours";
import AttendanceCalendar from "./AttendanceCalendar";

interface AdminDashboardProps {
  currentUser: User;
  allUsers: User[];
  attendanceRecords: AttendanceRecord[];
  onSetGeofence: (userId: number, geofence: Geofence | undefined) => void;
  onAddUser: (name: string, password: string) => void;
  onRemoveUser: (userId: number) => void;
  onLogout: () => void;
}

type Tab = "employees" | "attendance" | "geofence" | "leaves" | "payroll";

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  allUsers,
  attendanceRecords,
  onSetGeofence,
  onAddUser,
  onRemoveUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("leaves");
  const [isAddUserFormVisible, setAddUserFormVisible] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Leave management state
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
  const [allLeaves, setAllLeaves] = useState<Leave[]>([]);
  const [isLeaveHistoryOpen, setIsLeaveHistoryOpen] = useState(false);
  const [showingPendingLeaves, setShowingPendingLeaves] = useState(true);

  // Calendar state
  const [selectedUserIdForCalendar, setSelectedUserIdForCalendar] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarSummary, setCalendarSummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [calendarLeaves, setCalendarLeaves] = useState<Leave[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  const employeeUsers = allUsers.filter((u) => u.role === Role.Employee);

  useEffect(() => {
    if (activeTab === "leaves") {
      loadLeaves();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "attendance" && selectedUserIdForCalendar) {
      loadCalendarData(selectedUserIdForCalendar);
    }
  }, [activeTab, selectedUserIdForCalendar, calendarYear, calendarMonth]);

  // Auto-refresh data when page becomes visible or tab changes
  useEffect(() => {
    const refreshData = async () => {
      try {
        const [pending, all] = await Promise.all([
          api.getPendingLeaves(),
          api.getAllLeaves(),
        ]);
        setPendingLeaves(pending);
        setAllLeaves(all);
      } catch (error) {
        console.error("Failed to refresh leaves:", error);
      }

      // Also refresh calendar data if viewing an employee
      if (selectedUserIdForCalendar) {
        try {
          const [summary, leaves] = await Promise.all([
            api.getUserMonthlySummary(selectedUserIdForCalendar, calendarYear, calendarMonth),
            api.getLeavesByUser(selectedUserIdForCalendar),
          ]);
          setCalendarSummary(summary);
          setCalendarLeaves(leaves.filter((leave) => leave.status === LeaveStatus.APPROVED));
        } catch (error) {
          console.error("Failed to refresh calendar data:", error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshData);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshData);
    };
  }, [selectedUserIdForCalendar, calendarYear, calendarMonth]);

  const loadLeaves = async () => {
    try {
      const [pending, all] = await Promise.all([
        api.getPendingLeaves(),
        api.getAllLeaves(),
      ]);
      setPendingLeaves(pending);
      setAllLeaves(all);
    } catch (error) {
      console.error("Failed to load leaves:", error);
    }
  };

  const loadCalendarData = async (userId: number) => {
    try {
      setIsLoadingCalendar(true);
      const [summary, leaves] = await Promise.all([
        api.getUserMonthlySummary(userId, calendarYear, calendarMonth),
        api.getLeavesByUser(userId),
      ]);
      setCalendarSummary(summary);
      // Filter approved leaves for this user and month
      const userLeaves = leaves.filter(
        leave => leave.status === LeaveStatus.APPROVED
      );
      setCalendarLeaves(userLeaves);
    } catch (error) {
      console.error("Failed to load calendar data:", error);
      setCalendarSummary(null);
      setCalendarLeaves([]);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const handleApproveLeave = async (leaveId: number) => {
    try {
      await api.approveLeave(leaveId);
      await loadLeaves();
      // Refresh calendar if it's being viewed
      if (selectedUserIdForCalendar) {
        await loadCalendarData(selectedUserIdForCalendar);
      }
    } catch (error) {
      console.error("Failed to approve leave:", error);
    }
  };

  const handleRejectLeave = async (leaveId: number) => {
    try {
      await api.rejectLeave(leaveId);
      await loadLeaves();
    } catch (error) {
      console.error("Failed to reject leave:", error);
    }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName && newUserPassword) {
      onAddUser(newUserName, newUserPassword);
      setNewUserName("");
      setNewUserPassword("");
      setAddUserFormVisible(false);
    }
  };

  const handleGeofenceSave = (user: User, geofence: Geofence | undefined) => {
    onSetGeofence(user.id, geofence);
    setEditingUser(null);
  };

  // Calculate working hours for all employees
  const calculateWorkingHoursForAllEmployees = () => {
    return employeeUsers.map((user) => {
      const userRecords = attendanceRecords.filter((r) => r.userId === user.id);
      let totalMinutes = 0;
      const presentDays = new Set<string>();

      userRecords.forEach((record) => {
        const dateStr = new Date(record.checkInTime).toLocaleDateString();
        presentDays.add(dateStr);

        if (record.checkOutTime) {
          totalMinutes += (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 60000;
        }
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = Math.floor(totalMinutes % 60);
      const avgHours = presentDays.size > 0 ? totalMinutes / presentDays.size / 60 : 0;

      return {
        user,
        totalHours,
        totalMins,
        presentDays: presentDays.size,
        avgHours: avgHours.toFixed(1),
      };
    });
  };

  // Calculate leave days for a specific month
  const calculateLeaveDaysInMonth = (leaves: Leave[], year: number, month: number): number => {
    return leaves.reduce((total, leave) => {
      // Only consider approved leaves
      if (leave.status !== LeaveStatus.APPROVED) return total;

      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      // Check if leave overlaps with this month
      if (leaveEnd < monthStart || leaveStart > monthEnd) return total;

      // Calculate overlap
      const overlapStart = leaveStart > monthStart ? leaveStart : monthStart;
      const overlapEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd;

      const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);
  };

  const workingHoursData = calculateWorkingHoursForAllEmployees();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Compute daily working minutes for the selected employee (for calendar display)
  const dailyWorkingMinutes: Record<string, number> = (() => {
    if (!selectedUserIdForCalendar) return {};
    const result: Record<string, number> = {};
    attendanceRecords
      .filter(r => r.userId === selectedUserIdForCalendar && r.checkOutTime)
      .forEach(record => {
        const dateKey = new Date(record.checkInTime).toISOString().split('T')[0];
        const minutes = (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 60000;
        result[dateKey] = (result[dateKey] || 0) + minutes;
      });
    return result;
  })();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-brand-dark text-white p-6 hidden md:flex flex-col justify-between fixed h-full">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="h-10 w-10">
              <GeoTrackerLogo isLight={true} />
            </div>
            <h1 className="text-2xl font-bold">GeoTracker</h1>
          </div>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("leaves")}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition ${activeTab === "leaves" ? "bg-brand-primary" : "hover:bg-gray-700"}`}
            >
              <DocumentTextIcon />
              <span>Leave Requests ({pendingLeaves.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition ${activeTab === "attendance" ? "bg-brand-primary" : "hover:bg-gray-700"}`}
            >
              <DocumentTextIcon />
              <span>Attendance Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab("payroll")}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition ${activeTab === "payroll" ? "bg-brand-primary" : "hover:bg-gray-700"}`}
            >
              <DocumentTextIcon />
              <span>Working Hours</span>
            </button>
            <button
              onClick={() => setActiveTab("employees")}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition ${activeTab === "employees" ? "bg-brand-primary" : "hover:bg-gray-700"}`}
            >
              <UsersIcon />
              <span>Employees</span>
            </button>
            <button
              onClick={() => setActiveTab("geofence")}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition ${activeTab === "geofence" ? "bg-brand-primary" : "hover:bg-gray-700"}`}
            >
              <GlobeIcon />
              <span>Geofence</span>
            </button>
          </nav>
        </div>
        <div>
          <div className="border-t border-gray-700 pt-4">
            <p className="text-sm font-semibold">{currentUser.name}</p>
            <p className="text-xs text-gray-400">{currentUser.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 p-3 mt-4 rounded-lg text-left hover:bg-gray-700 transition"
          >
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-100 md:ml-64">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden">
          <h1 className="text-xl font-bold text-brand-dark">Admin Dashboard</h1>
          <button
            onClick={onLogout}
            className="p-2 rounded-full text-brand-secondary hover:bg-gray-200"
          >
            <LogoutIcon />
          </button>
        </header>

        <div className="p-4 md:p-8">
          <div className="md:hidden mb-4">
            <select
              onChange={(e) => setActiveTab(e.target.value as Tab)}
              value={activeTab}
              className="w-full p-2 border rounded"
            >
              <option value="leaves">Leave Requests</option>
              <option value="attendance">Attendance Calendar</option>
              <option value="payroll">Working Hours</option>
              <option value="employees">Employees</option>
              <option value="geofence">Geofence</option>
            </select>
          </div>

          {activeTab === "leaves" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-brand-dark">Leave Requests</h3>
                <button
                  onClick={() => setIsLeaveHistoryOpen(true)}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 transition"
                >
                  View All Leave History
                </button>
              </div>

              {pendingLeaves.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {pendingLeaves.map((leave) => (
                    <div key={leave.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-brand-dark text-lg">{leave.userName}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-gray-600 mb-6 leading-relaxed">{leave.reason}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveLeave(leave.id)}
                          className="flex-1 px-4 py-2.5 bg-green-100 text-green-700 text-sm font-semibold rounded-lg hover:bg-green-200 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectLeave(leave.id)}
                          className="flex-1 px-4 py-2.5 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-brand-secondary">No pending leave requests</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "payroll" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-brand-dark">Working Hours Summary</h3>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 font-semibold text-sm">Employee</th>
                        <th className="p-4 font-semibold text-sm">Days Present</th>
                        <th className="p-4 font-semibold text-sm">Total Hours</th>
                        <th className="p-4 font-semibold text-sm">Average (hrs/day)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {workingHoursData.map(({ user, totalHours, totalMins, presentDays, avgHours }) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="p-4">{user.name}</td>
                          <td className="p-4">{presentDays}</td>
                          <td className="p-4">
                            {totalHours}h {totalMins > 0 ? `${totalMins}m` : ''}
                          </td>
                          <td className="p-4">{avgHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-brand-dark mb-4">View Employee Calendar</h3>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <select
                    value={selectedUserIdForCalendar || ""}
                    onChange={(e) => setSelectedUserIdForCalendar(e.target.value ? parseInt(e.target.value) : null)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Employee</option>
                    {employeeUsers.map((user) => (
                      <option key={user.id} value={user.id.toString()}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                {isLoadingCalendar && (
                  <div className="text-center py-8 text-gray-500">Loading calendar data...</div>
                )}
                {selectedUserIdForCalendar && calendarSummary && (
                  <div className="space-y-4">
                    <AttendanceCalendar
                      year={calendarYear}
                      month={calendarMonth}
                      checkInDays={calendarSummary.checkInDays}
                      leaves={calendarLeaves}
                      dailyWorkingMinutes={dailyWorkingMinutes}
                      onMonthChange={(year, month) => {
                        setCalendarYear(year);
                        setCalendarMonth(month);
                      }}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Days Present</p>
                        <p className="text-2xl font-bold text-green-600">{calendarSummary.totalDaysPresent}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Working Hours</p>
                        <p className="text-2xl font-bold text-brand-primary">
                          {Math.floor(calendarSummary.totalWorkingMinutes / 60)}h {calendarSummary.totalWorkingMinutes % 60 > 0 ? `${calendarSummary.totalWorkingMinutes % 60}m` : ''}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Leave Days</p>
                        <p className="text-2xl font-bold text-red-600">{calculateLeaveDaysInMonth(calendarLeaves, calendarYear, calendarMonth)}</p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedUserIdForCalendar && !calendarSummary && !isLoadingCalendar && (
                  <p className="text-center py-8 text-gray-500">Failed to load calendar data for selected employee</p>
                )}
                {!selectedUserIdForCalendar && (
                  <div className="text-center py-8 text-gray-500">Select an employee to view their attendance calendar</div>
                )}
              </div>
            </div>
          )}

          {activeTab === "employees" && (
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-brand-dark">
                  All Employees
                </h3>
                <button
                  onClick={() => setAddUserFormVisible(!isAddUserFormVisible)}
                  className="flex items-center space-x-2 bg-brand-primary text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition"
                >
                  <PlusIcon />
                  <span>
                    {isAddUserFormVisible ? "Cancel" : "Add Employee"}
                  </span>
                </button>
              </div>
              {isAddUserFormVisible && (
                <div className="p-6 border-b bg-gray-50">
                  <form
                    onSubmit={handleAddUserSubmit}
                    className="flex flex-col md:flex-row gap-4 items-end"
                  >
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Employee Name
                      </label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full md:w-auto bg-brand-success text-white py-2 px-4 rounded-lg shadow hover:bg-green-600 transition"
                    >
                      Save Employee
                    </button>
                  </form>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 font-semibold text-sm">Name</th>
                      <th className="p-4 font-semibold text-sm">Role</th>
                      <th className="p-4 font-semibold text-sm text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employeeUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-4">{user.name}</td>
                        <td className="p-4">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => onRemoveUser(user.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "geofence" && (
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold text-brand-dark">
                  Employee Geofence Settings
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 font-semibold text-sm">Employee</th>
                      <th className="p-4 font-semibold text-sm">
                        Geofence Status
                      </th>
                      <th className="p-4 font-semibold text-sm text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employeeUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-4">{user.name}</td>
                        <td className="p-4">
                          {user.geofence ? (
                            <span className="text-sm text-gray-700">{`Radius: ${user.geofence.radius}m at (${user.geofence.center.latitude.toFixed(2)}, ${user.geofence.center.longitude.toFixed(2)})`}</span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Using company default
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-brand-primary hover:text-blue-700 p-2 rounded-full hover:bg-blue-100"
                          >
                            <PencilIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      {editingUser && (
        <GeofenceEditorModal
          user={editingUser}
          onSave={handleGeofenceSave}
          onClose={() => setEditingUser(null)}
        />
      )}
      <LeaveHistoryModal
        isOpen={isLeaveHistoryOpen}
        onClose={() => setIsLeaveHistoryOpen(false)}
        leaves={allLeaves}
      />
    </div>
  );
};

export default AdminDashboard;
