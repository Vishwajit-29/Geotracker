import React, { useEffect, useState, useCallback } from 'react';
import { User, AttendanceRecord, Location, Geofence, Leave, LeaveType, LeaveStatus, MonthlyAttendanceSummary } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAutoAttendance } from '../hooks/useAutoAttendance';
import * as api from '../services/apiService';
import MapDisplay from './MapDisplay';
import AttendanceCalendar from './AttendanceCalendar';
import ChangePasswordModal from './ChangePasswordModal';
import LeaveRequestModal from './LeaveRequestModal';
import LeaveHistoryModal from './LeaveHistoryModal';
import AttendanceHistoryModal from './AttendanceHistoryModal';
import WorkingHours from './WorkingHours';

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

type EmpTab = 'attendance' | 'calendar' | 'leaves' | 'hours' | 'settings';

const Icon = ({ path }: { path: string }) => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const EMP_NAV: { tab: EmpTab; label: string; icon: string }[] = [
  { tab: 'attendance', label: 'My Attendance',   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { tab: 'calendar',   label: 'My Calendar',      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { tab: 'leaves',     label: 'Leave Requests',   icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { tab: 'hours',      label: 'Working Hours',    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { tab: 'settings',   label: 'Settings',         icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser, attendanceRecords, allUsers,
  onMarkAttendance, onLogout, attendanceError, clearAttendanceError, defaultGeofence,
}) => {
  const { location, error: geoError, isLoading, getLocation } = useGeolocation();
  const [mapView, setMapView] = useState<Location | null>(null);
  const [activeTab, setActiveTab] = useState<EmpTab>('attendance');

  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [monthlySummary, setMonthlySummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLeaveRequestOpen, setIsLeaveRequestOpen] = useState(false);
  const [isLeaveHistoryOpen, setIsLeaveHistoryOpen] = useState(false);
  const [isAttendanceHistoryOpen, setIsAttendanceHistoryOpen] = useState(false);

  const employeeGeofence: Geofence = currentUser.geofence?.center ? currentUser.geofence : defaultGeofence;
  const mapCenter: Location = mapView || employeeGeofence?.center || defaultGeofence.center;

  useEffect(() => { loadMonthlySummary(); loadLeaves(); }, [calendarYear, calendarMonth]);
  useEffect(() => {
    if (location) { onMarkAttendance(currentUser.id, location); setMapView(location); setTimeout(loadMonthlySummary, 1500); }
  }, [location]);
  useEffect(() => {
    const refresh = async () => {
      try { setMonthlySummary(await api.getMonthlyAttendanceSummary(calendarYear, calendarMonth)); } catch {}
      try { setLeaves(await api.getMyLeaves()); } catch {}
    };
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', refresh); };
  }, [calendarYear, calendarMonth]);

  const loadMonthlySummary = async () => {
    try { setIsLoadingData(true); setMonthlySummary(await api.getMonthlyAttendanceSummary(calendarYear, calendarMonth)); }
    catch {} finally { setIsLoadingData(false); }
  };
  const loadLeaves = async () => {
    try { setLeaves(await api.getMyLeaves()); } catch {}
  };
  const handleAttendanceClick = () => { clearAttendanceError(); getLocation(); };
  const handleHistoryClick = (record: AttendanceRecord) => setMapView(record.checkInLocation);
  const handleChangePassword = async (cur: string, nw: string, conf: string) => api.changePassword(cur, nw, conf);
  const handleRequestLeave = async (type: LeaveType, start: string, end: string, reason: string) => {
    await api.createLeave(type, start, end, reason); await loadLeaves(); await loadMonthlySummary();
  };

  const currentStatusRecord = attendanceRecords.find(r => !r.checkOutTime) ?? null;
  const isCheckedIn = !!currentStatusRecord;

  // Is the user on approved leave today?
  const todayStr = new Date().toDateString();
  const isOnLeaveToday = leaves.some(l =>
    l.status === LeaveStatus.APPROVED &&
    new Date(l.startDate) <= new Date() && new Date(l.endDate) >= new Date()
  );

  // Auto-attendance hook — runs silently in background
  const autoAttendance = useAutoAttendance({
    currentRecord: currentStatusRecord,
    isOnLeaveToday,
    onCheckIn: (rec) => {
      // Refresh attendance data after auto check-in
      setTimeout(loadMonthlySummary, 1000);
    },
    onCheckOut: (rec) => {
      setTimeout(loadMonthlySummary, 1000);
    },
  });

  const approvedLeaves = leaves.filter(l => l.status === LeaveStatus.APPROVED);
  const pendingLeaves = leaves.filter(l => l.status === LeaveStatus.PENDING);

  const dailyWorkingMinutes: Record<string, number> = (() => {
    const result: Record<string, number> = {};
    attendanceRecords.filter(r => r.userId === currentUser.id && r.checkOutTime).forEach(r => {
      const key = new Date(r.checkInTime).toISOString().split('T')[0];
      result[key] = (result[key] || 0) + (new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 60000;
    });
    return result;
  })();

  const sortedRecords = [...(attendanceRecords || [])].sort((a, b) =>
    new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = currentUser.name.split(' ')[0];
  const monthName = new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="gt-shell">
      {/* ── Sidebar ── */}
      <aside className="gt-sidebar">
        <div className="gt-logo">
          <div className="gt-logo-mark">
            <img src="/logo.png" alt="GT" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          </div>
          <span className="gt-logo-name">GeoTracker</span>
        </div>

        <nav className="gt-nav">
          {EMP_NAV.map(({ tab, label, icon }) => (
            <button key={tab} className={`gt-nav-item${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              <span className="gt-nav-icon"><Icon path={icon} /></span>
              {label}
              {tab === 'leaves' && pendingLeaves.length > 0 && (
                <span className="gt-nav-count">{pendingLeaves.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="gt-sidebar-footer">
          <div className="gt-avatar-sm">{currentUser.name.slice(0, 1).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="gt-sidebar-user-name">{currentUser.name}</div>
            <div className="gt-sidebar-user-role">Employee</div>
          </div>
          <button onClick={onLogout} title="Logout"
            style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
            <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="gt-main">
        <div className="gt-mobile-nav">
          <select className="gt-select" style={{ flex: 1 }} value={activeTab} onChange={e => setActiveTab(e.target.value as EmpTab)}>
            {EMP_NAV.map(n => <option key={n.tab} value={n.tab}>{n.label}</option>)}
          </select>
          <button onClick={onLogout} className="gt-btn gt-btn-ghost" style={{ height: 36 }}>Logout</button>
        </div>

        <div className="gt-page">

          {/* ── My Attendance Tab ── */}
          {activeTab === 'attendance' && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <h1 className="gt-page-title">{greeting}, {firstName}.</h1>
                <p className="gt-page-subtitle">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* ── Auto-attendance status strip ── */}
              {autoAttendance.schedule && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                  padding: '10px 14px', borderRadius: 8,
                  background: autoAttendance.status === 'tracking' ? 'rgba(101,163,13,0.08)'
                    : autoAttendance.status === 'error' ? 'rgba(220,38,38,0.08)'
                    : autoAttendance.status === 'waiting' ? 'rgba(201,100,66,0.08)'
                    : 'var(--surface-1)',
                  border: '1px solid',
                  borderColor: autoAttendance.status === 'tracking' ? 'rgba(101,163,13,0.25)'
                    : autoAttendance.status === 'error' ? 'rgba(220,38,38,0.25)'
                    : 'var(--border)',
                  fontSize: 12,
                }}
                >
                  <span style={{ fontSize: 16 }}>
                    {autoAttendance.status === 'tracking' ? '🟢'
                      : autoAttendance.status === 'waiting' ? '🕐'
                      : autoAttendance.status === 'checked-out' ? '🔵'
                      : autoAttendance.status === 'error' ? '🔴' : '⚪'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Auto-tracking · </span>
                    <span style={{ color: 'var(--text-2)' }}>{autoAttendance.message}</span>
                  </div>
                  {autoAttendance.missStreak > 0 && (
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(220,38,38,0.1)', color: 'var(--red)', fontWeight: 600
                    }}>
                      Away {autoAttendance.missStreak * 5}/{autoAttendance.missStreak * 5 + autoAttendance.minutesUntilAutoCheckout} min
                    </span>
                  )}
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
                    {autoAttendance.schedule.workStartTime}–{autoAttendance.schedule.workEndTime}
                  </span>
                </div>
              )}

              {/* Check-in card */}
              <div className="gt-card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{ color: 'var(--coral)', flexShrink: 0 }}>
                    <Icon path="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                      Geofence zone
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                      {currentUser.geofence ? `${currentUser.geofence.radius}m radius` : 'Default zone'}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    fontSize: 18, fontWeight: 400, color: isCheckedIn ? 'var(--green)' : 'var(--text-3)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {isCheckedIn ? '● Checked In' : '○ Not Checked In'}
                  </div>
                  {isCheckedIn && currentStatusRecord && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      Since {new Date(currentStatusRecord.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {(() => {
                    // Client-side guard — backend also enforces this
                    const sched = autoAttendance.schedule;
                    let canCheckIn = true;
                    let blockReason = '';
                    if (sched && !isCheckedIn) {
                      const now = new Date();
                      const dayName = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][now.getDay()];
                      const mins = now.getHours() * 60 + now.getMinutes();
                      const [sh, sm] = sched.workStartTime.split(':').map(Number);
                      const [eh, em] = sched.workEndTime.split(':').map(Number);
                      if (!sched.workDays.includes(dayName)) {
                        canCheckIn = false;
                        blockReason = `Not a work day (${dayName.charAt(0) + dayName.slice(1).toLowerCase()})`;
                      } else if (mins < sh * 60 + sm) {
                        canCheckIn = false;
                        blockReason = `Office opens at ${sched.workStartTime}`;
                      } else if (mins >= eh * 60 + em) {
                        canCheckIn = false;
                        blockReason = `Office closed at ${sched.workEndTime}`;
                      }
                    }
                    return (
                      <>
                        <button
                          onClick={handleAttendanceClick}
                          disabled={isLoading || (!isCheckedIn && !canCheckIn)}
                          title={!isCheckedIn && !canCheckIn ? blockReason : undefined}
                          className="gt-btn gt-btn-primary gt-btn-lg"
                          style={!isCheckedIn && !canCheckIn ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                        >
                          {isLoading ? (
                            <><div className="gt-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />Getting location…</>
                          ) : isCheckedIn ? 'Check Out →' : 'Check In →'}
                        </button>
                        {!isCheckedIn && !canCheckIn && (
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'right', maxWidth: 160 }}>
                            {blockReason}
                          </span>
                        )}
                        {autoAttendance.schedule && (
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            🕐 {autoAttendance.schedule.workStartTime}–{autoAttendance.schedule.workEndTime}
                          </span>
                        )}
                        {currentUser.geofence && (
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Geofence verified</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {(geoError || attendanceError) && (
                <div style={{ background: 'var(--red-bg)', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
                  {geoError || attendanceError}
                </div>
              )}

              {/* Stats row */}
              {monthlySummary && (
                <div className="gt-stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
                  <div className="gt-stat-card">
                    <div className="gt-stat-number">{monthlySummary.totalDaysPresent}</div>
                    <div className="gt-stat-label"><div className="gt-dot gt-dot-green" /> Days Present</div>
                  </div>
                  <div className="gt-stat-card">
                    <div className="gt-stat-number">{approvedLeaves.length}</div>
                    <div className="gt-stat-label"><div className="gt-dot gt-dot-amber" /> Leave Days</div>
                  </div>
                  <div className="gt-stat-card">
                    <div className="gt-stat-number">
                      {Math.floor(monthlySummary.totalWorkingMinutes / 60)}h {Math.floor(monthlySummary.totalWorkingMinutes % 60)}m
                    </div>
                    <div className="gt-stat-label"><div className="gt-dot gt-dot-coral" /> Hours Worked</div>
                  </div>
                </div>
              )}

              {/* Map */}
              <div className="gt-card" style={{ padding: 0, overflow: 'hidden', height: 280 }}>
                <MapDisplay
                  key={`${mapCenter.latitude}-${mapCenter.longitude}`}
                  center={mapCenter}
                  markerPosition={mapView}
                  circle={employeeGeofence}
                  zoom={15}
                />
              </div>

              {/* Recent activity */}
              <div style={{ marginTop: 24 }}>
                <div className="gt-flex-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 500 }}>Recent Activity</span>
                  <button className="gt-btn gt-btn-text" onClick={() => setIsAttendanceHistoryOpen(true)}>View all →</button>
                </div>
                <div className="gt-card" style={{ padding: 0 }}>
                  <table className="gt-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Hours</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRecords.slice(0, 5).map((r, i) => {
                        const checkIn = new Date(r.checkInTime);
                        const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null;
                        const mins = checkOut ? (checkOut.getTime() - checkIn.getTime()) / 60000 : null;
                        const hrs = mins ? `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m` : '—';
                        const isActive = !checkOut;
                        return (
                          <tr key={r.id ?? i}>
                            <td style={{ fontWeight: 500 }}>
                              {checkIn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="gt-table-mono">{checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="gt-table-mono">{checkOut ? checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td>{hrs}</td>
                            <td>
                              {isActive
                                ? <span className="gt-badge gt-badge-coral">● Active</span>
                                : <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 500 }}>● Present</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {sortedRecords.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 24 }}>No attendance records yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Calendar Tab ── */}
          {activeTab === 'calendar' && (
            <div>
              <div className="gt-page-header">
                <h1 className="gt-page-title">My Calendar</h1>
                <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{monthName}</span>
              </div>
              {monthlySummary ? (
                <AttendanceCalendar
                  year={calendarYear}
                  month={calendarMonth}
                  checkInDays={monthlySummary.checkInDays}
                  leaves={approvedLeaves}
                  dailyWorkingMinutes={dailyWorkingMinutes}
                  onMonthChange={(y, m) => { setCalendarYear(y); setCalendarMonth(m); }}
                />
              ) : (
                <div className="gt-card" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                  <div className="gt-spinner" style={{ width: 24, height: 24 }} />
                </div>
              )}
            </div>
          )}

          {/* ── Leaves Tab ── */}
          {activeTab === 'leaves' && (
            <div>
              <div className="gt-page-header">
                <h1 className="gt-page-title">Leave Requests</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="gt-btn gt-btn-ghost" onClick={() => setIsLeaveHistoryOpen(true)}>History</button>
                  <button className="gt-btn gt-btn-primary" onClick={() => setIsLeaveRequestOpen(true)}>+ New Request</button>
                </div>
              </div>

              {leaves.length === 0 ? (
                <div className="gt-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No leave requests yet.</p>
                  <button className="gt-btn gt-btn-primary" style={{ marginTop: 16 }} onClick={() => setIsLeaveRequestOpen(true)}>
                    Request Leave
                  </button>
                </div>
              ) : (
                <div className="gt-stack">
                  {leaves.map(l => (
                    <div key={l.id} className="gt-leave-card">
                      <div className="gt-leave-card-header">
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{l.leaveType || 'Leave'}</span>
                        <span className={`gt-badge ${l.status === LeaveStatus.APPROVED ? 'gt-badge-green' : l.status === LeaveStatus.PENDING ? 'gt-badge-amber' : 'gt-badge-red'}`}>
                          {l.status}
                        </span>
                      </div>
                      <div className="gt-leave-card-meta">
                        <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        {new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' – '}
                        {new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      {l.reason && <p className="gt-leave-card-reason">{l.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Working Hours Tab ── */}
          {activeTab === 'hours' && (
            <div>
              <div className="gt-page-header">
                <h1 className="gt-page-title">Working Hours</h1>
              </div>
              {monthlySummary ? (
                <WorkingHours
                  year={monthlySummary.year}
                  month={monthlySummary.month}
                  totalWorkingMinutes={monthlySummary.totalWorkingMinutes}
                  totalDaysPresent={monthlySummary.totalDaysPresent}
                  leaves={approvedLeaves}
                />
              ) : (
                <div className="gt-card" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                  <div className="gt-spinner" style={{ width: 24, height: 24 }} />
                </div>
              )}
            </div>
          )}

          {/* ── Settings Tab ── */}
          {activeTab === 'settings' && (
            <div>
              <div className="gt-page-header">
                <h1 className="gt-page-title">Settings</h1>
              </div>
              <div className="gt-card" style={{ maxWidth: 440 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-1)' }}>Account</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="gt-label">Full Name</label>
                    <div className="gt-input" style={{ display: 'flex', alignItems: 'center', cursor: 'default', color: 'var(--text-2)', background: '#FAFAF9' }}>
                      {currentUser.name}
                    </div>
                  </div>
                  <div>
                    <label className="gt-label">Role</label>
                    <div className="gt-input" style={{ display: 'flex', alignItems: 'center', cursor: 'default', color: 'var(--text-2)', background: '#FAFAF9' }}>
                      Employee
                    </div>
                  </div>
                  <div className="gt-divider" />
                  <button className="gt-btn gt-btn-ghost" style={{ width: 'fit-content' }} onClick={() => setIsChangePasswordOpen(true)}>
                    Change Password
                  </button>
                  <button className="gt-btn" onClick={onLogout}
                    style={{ width: 'fit-content', background: 'none', border: '1px solid var(--border)', color: 'var(--red)', borderRadius: 6, height: 34, padding: '0 14px', fontSize: 13, cursor: 'pointer' }}>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modals */}
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} onChangePassword={handleChangePassword} />
      <LeaveRequestModal isOpen={isLeaveRequestOpen} onClose={() => setIsLeaveRequestOpen(false)} onRequestLeave={handleRequestLeave} existingLeaves={leaves} attendanceRecords={attendanceRecords} />
      <LeaveHistoryModal isOpen={isLeaveHistoryOpen} onClose={() => setIsLeaveHistoryOpen(false)} leaves={leaves} myLeaves={true} />
      <AttendanceHistoryModal isOpen={isAttendanceHistoryOpen} onClose={() => setIsAttendanceHistoryOpen(false)} records={attendanceRecords} onRecordClick={handleHistoryClick} />
    </div>
  );
};

export default EmployeeDashboard;
