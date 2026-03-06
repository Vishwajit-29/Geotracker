import React, { useState, useEffect } from 'react';
import { User, Role, AttendanceRecord, Location, Geofence } from './types';
import { DEFAULT_GEOFENCE } from './constants';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import * as api from './services/apiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Check if user is already logged in (restore session)
  useEffect(() => {
    const token = localStorage.getItem('geotracker_token');
    const savedUser = localStorage.getItem('geotracker_user');
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        setCurrentUser(user);
        loadData();
      } catch {
        localStorage.removeItem('geotracker_token');
        localStorage.removeItem('geotracker_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Load data after successful login
  const loadData = async () => {
    try {
      const [usersData, attendanceData] = await Promise.all([
        api.getAllUsers(),
        api.getAllAttendanceRecords(),
      ]);
      setUsers(usersData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleLogin = async (name: string, password: string): Promise<boolean> => {
    try {
      const result = await api.login(name, password);
      setCurrentUser(result.user);
      localStorage.setItem('geotracker_user', JSON.stringify(result.user));
      await loadData();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    api.logout();
    setCurrentUser(null);
    setUsers([]);
    setAttendanceRecords([]);
    localStorage.removeItem('geotracker_user');
  };

  const handleMarkAttendance = async (userId: number, location: Location) => {
    setAttendanceError(null);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const existingRecord = attendanceRecords.find(
        (record) => record.userId === userId && !record.checkOutTime
      );

      if (existingRecord) {
        // Check out
        const updatedRecord = await api.checkOut();
        setAttendanceRecords(records =>
          records.map(r => r.id === updatedRecord.id ? updatedRecord : r)
        );
      } else {
        // Check in (geofence validation done on backend)
        const newRecord = await api.checkIn(location);
        setAttendanceRecords([...attendanceRecords, newRecord]);
      }
    } catch (error: any) {
      setAttendanceError(error.message || 'Failed to mark attendance');
    }
  };

  const handleSetGeofence = async (userId: number, newGeofence: Geofence | undefined) => {
    try {
      const updatedUser = await api.updateUserGeofence(userId, newGeofence);
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (error) {
      console.error('Failed to update geofence:', error);
    }
  };

  const handleAddUser = async (name: string, password: string) => {
    try {
      const newUser = await api.addUser(name, password);
      setUsers([...users, newUser]);
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user. User may already exist.');
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (window.confirm("Are you sure you want to remove this employee?")) {
      try {
        await api.removeUser(userId);
        setUsers(users.filter(u => u.id !== userId));
        setAttendanceRecords(attendanceRecords.filter(r => r.userId !== userId));
      } catch (error) {
        console.error('Failed to remove user:', error);
      }
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-lg text-brand-secondary">Loading GeoTracker...</p>
        </div>
      );
    }

    if (!currentUser) {
      // Pass empty users array - login is handled by backend
      return <LoginScreen users={[]} onLogin={handleLogin} />;
    }

    const fullCurrentUser = users.find(u => u.id === currentUser.id) || currentUser;

    if (currentUser.role === Role.Admin) {
      return (
        <AdminDashboard
          currentUser={fullCurrentUser}
          allUsers={users}
          attendanceRecords={attendanceRecords}
          onSetGeofence={handleSetGeofence}
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
          onLogout={handleLogout}
        />
      );
    }

    if (currentUser.role === Role.Employee) {
      const employeeRecords = attendanceRecords.filter((record) => record.userId === currentUser.id);
      return (
        <EmployeeDashboard
          currentUser={fullCurrentUser}
          attendanceRecords={employeeRecords}
          allUsers={users}
          onMarkAttendance={handleMarkAttendance}
          onLogout={handleLogout}
          attendanceError={attendanceError}
          clearAttendanceError={() => setAttendanceError(null)}
          defaultGeofence={DEFAULT_GEOFENCE}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <main>{renderContent()}</main>
    </div>
  );
};

export default App;
