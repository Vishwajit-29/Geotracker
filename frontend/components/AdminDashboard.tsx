import React, { useState, useEffect } from "react";
import { User, AttendanceRecord, Role, Geofence, Leave, MonthlyAttendanceSummary, LeaveStatus, WorkSchedule } from "../types";
import * as api from "../services/apiService";
import { reverseGeocodeLocation } from "../services/geocodeService";
import GeofenceEditorModal from "./GeofenceEditorModal";
import LeaveHistoryModal from "./LeaveHistoryModal";
import WorkingHours from "./WorkingHours";
import AttendanceCalendar from "./AttendanceCalendar";
import ExportPanel from "./ExportPanel";
import WorkScheduleEditor from "./WorkScheduleEditor";
import ChangePasswordModal from "./ChangePasswordModal";

interface AdminDashboardProps {
  currentUser: User;
  allUsers: User[];
  attendanceRecords: AttendanceRecord[];
  onSetGeofence: (userId: number, geofence: Geofence | undefined) => void;
  onAddUser: (name: string, password: string) => void;
  onRemoveUser: (userId: number) => void;
  onLogout: () => void;
}

type Tab = "employees" | "attendance" | "geofence" | "leaves" | "payroll" | "export";

// ── Nav item icons (SVG inline, minimal) ──────────────────────
const Icon = ({ path, filled }: { path: string; filled?: boolean }) => (
  <svg width="16" height="16" fill={filled ? "currentColor" : "none"} stroke="currentColor"
    strokeWidth="1.6" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "leaves",     label: "Leave Requests",      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { tab: "attendance", label: "Attendance Calendar",  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { tab: "payroll",    label: "Working Hours",         icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { tab: "employees",  label: "Employees",             icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { tab: "geofence",   label: "Geofence",              icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { tab: "export",     label: "Export Excel",           icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser, allUsers, attendanceRecords,
  onSetGeofence, onAddUser, onRemoveUser, onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("leaves");
  const [isAddUserFormVisible, setAddUserFormVisible] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
  const [allLeaves, setAllLeaves] = useState<Leave[]>([]);
  const [isLeaveHistoryOpen, setIsLeaveHistoryOpen] = useState(false);

  const [selectedUserIdForCalendar, setSelectedUserIdForCalendar] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarSummary, setCalendarSummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [calendarLeaves, setCalendarLeaves] = useState<Leave[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Geofence location names for employees tab
  const [geofenceLocations, setGeofenceLocations] = useState<Record<number, string>>({});

  // Work schedules keyed by userId
  const [schedules, setSchedules] = useState<Record<number, WorkSchedule>>({});

  const employeeUsers = allUsers.filter(u => u.role === Role.Employee);

  useEffect(() => { loadLeaves(); }, []);
  useEffect(() => {
    if (activeTab === "leaves" || activeTab === "export") loadLeaves();
    if (activeTab === "employees") { loadGeofenceLocations(); loadSchedules(); }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === "attendance" && selectedUserIdForCalendar)
      loadCalendarData(selectedUserIdForCalendar);
  }, [activeTab, selectedUserIdForCalendar, calendarYear, calendarMonth]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [p, a] = await Promise.all([api.getPendingLeaves(), api.getAllLeaves()]);
        setPendingLeaves(p); setAllLeaves(a);
      } catch {}
    };
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refresh);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", refresh); };
  }, [selectedUserIdForCalendar, calendarYear, calendarMonth]);

  const loadLeaves = async () => {
    try {
      const [p, a] = await Promise.all([api.getPendingLeaves(), api.getAllLeaves()]);
      setPendingLeaves(p); setAllLeaves(a);
    } catch (e) { console.error(e); }
  };

  const loadCalendarData = async (userId: number) => {
    try {
      setIsLoadingCalendar(true);
      const [summary, leaves] = await Promise.all([
        api.getUserMonthlySummary(userId, calendarYear, calendarMonth),
        api.getLeavesByUser(userId),
      ]);
      setCalendarSummary(summary);
      setCalendarLeaves(leaves.filter(l => l.status === LeaveStatus.APPROVED));
    } catch { setCalendarSummary(null); setCalendarLeaves([]); }
    finally { setIsLoadingCalendar(false); }
  };

  const loadGeofenceLocations = async () => {
    const empsWithGeo = allUsers.filter(u => u.geofence?.center);
    if (!empsWithGeo.length) return;
    const results: Record<number, string> = {};
    // Fetch sequentially to respect Nominatim 1 req/sec
    for (const u of empsWithGeo) {
      try {
        const name = await reverseGeocodeLocation(
          u.geofence!.center.latitude,
          u.geofence!.center.longitude
        );
        results[u.id] = name;
      } catch { results[u.id] = ""; }
      setGeofenceLocations(prev => ({ ...prev, ...results }));
      await new Promise(r => setTimeout(r, 1100));
    }
  };

  const loadSchedules = async () => {
    try {
      const all = await api.getAllSchedules();
      const map: Record<number, WorkSchedule> = {};
      all.forEach(s => { if (s.userId) map[s.userId] = s; });
      setSchedules(map);
    } catch {}
  };

  const handleApproveLeave = async (id: number) => {
    try { await api.approveLeave(id); await loadLeaves(); if (selectedUserIdForCalendar) await loadCalendarData(selectedUserIdForCalendar); } catch {}
  };
  const handleRejectLeave = async (id: number) => {
    try { await api.rejectLeave(id); await loadLeaves(); } catch {}
  };
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName && newUserPassword) {
      onAddUser(newUserName, newUserPassword);
      setNewUserName(""); setNewUserPassword(""); setAddUserFormVisible(false);
    }
  };
  const handleGeofenceSave = (user: User, geofence: Geofence | undefined) => {
    onSetGeofence(user.id, geofence); setEditingUser(null);
  };

  const calculateWorkingHoursForAllEmployees = () =>
    employeeUsers.map(user => {
      const recs = attendanceRecords.filter(r => r.userId === user.id);
      let totalMinutes = 0;
      const presentDays = new Set<string>();
      recs.forEach(r => {
        presentDays.add(new Date(r.checkInTime).toLocaleDateString());
        if (r.checkOutTime)
          totalMinutes += (new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 60000;
      });
      return {
        user,
        totalHours: Math.floor(totalMinutes / 60),
        totalMins: Math.floor(totalMinutes % 60),
        presentDays: presentDays.size,
        avgHours: (presentDays.size > 0 ? totalMinutes / presentDays.size / 60 : 0).toFixed(1),
      };
    });

  const dailyWorkingMinutes: Record<string, number> = (() => {
    if (!selectedUserIdForCalendar) return {};
    const result: Record<string, number> = {};
    attendanceRecords
      .filter(r => r.userId === selectedUserIdForCalendar && r.checkOutTime)
      .forEach(r => {
        const key = new Date(r.checkInTime).toISOString().split("T")[0];
        result[key] = (result[key] || 0) + (new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 60000;
      });
    return result;
  })();

  const workingHoursData = calculateWorkingHoursForAllEmployees();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const tabTitles: Record<Tab, string> = {
    leaves: "Leave Requests", attendance: "Attendance Calendar",
    payroll: "Working Hours", employees: "Employees",
    geofence: "Geofence", export: "Export Excel",
  };

  return (
    <div className="gt-shell">
      {/* ── Sidebar ── */}
      <aside className="gt-sidebar">
        <div className="gt-logo">
          <div className="gt-logo-mark">
            <img src="/logo.png" alt="GT" style={{ width: 20, height: 20, objectFit: "contain" }} />
          </div>
          <span className="gt-logo-name">GeoTracker</span>
        </div>

        <nav className="gt-nav">
          {NAV_ITEMS.map(({ tab, label, icon }) => (
            <button
              key={tab}
              className={`gt-nav-item${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="gt-nav-icon"><Icon path={icon} /></span>
              {label}
              {tab === "leaves" && pendingLeaves.length > 0 && (
                <span className="gt-nav-count">{pendingLeaves.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="gt-sidebar-footer">
          <div className="gt-avatar-sm">
            {currentUser.name.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="gt-sidebar-user-name">{currentUser.name}</div>
            <div className="gt-sidebar-user-role">Admin</div>
          </div>
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            title="Change password"
            style={{ color: "#78716C", background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
          >
            <Icon path="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </button>
          <button
            onClick={onLogout}
            title="Logout"
            style={{ color: "#78716C", background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
          >
            <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="gt-main">
        {/* Mobile nav */}
        <div className="gt-mobile-nav">
          <select className="gt-select" style={{ flex: 1 }} value={activeTab} onChange={e => setActiveTab(e.target.value as Tab)}>
            {NAV_ITEMS.map(n => <option key={n.tab} value={n.tab}>{n.label}</option>)}
          </select>
          <button onClick={onLogout} className="gt-btn gt-btn-ghost" style={{ height: 36, padding: "0 12px" }}>Logout</button>
        </div>

        <div className="gt-page">
          {/* Page header */}
          <div className="gt-page-header">
            <div>
              <h1 className="gt-page-title">{tabTitles[activeTab]}</h1>
              {activeTab === "leaves" && (
                <p className="gt-page-subtitle">{pendingLeaves.length} pending · {allLeaves.length} total</p>
              )}
            </div>
            {activeTab === "leaves" && (
              <button className="gt-btn gt-btn-text" onClick={() => setIsLeaveHistoryOpen(true)}>
                View history →
              </button>
            )}
          </div>

          {/* ── Leave Requests Tab ── */}
          {activeTab === "leaves" && (
            <div>
              {/* Stat row */}
              <div className="gt-stats-row" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>
                {[
                  { n: pendingLeaves.length, label: "Pending", dot: "gt-dot-amber" },
                  { n: allLeaves.filter(l => l.status === LeaveStatus.APPROVED).length, label: "Approved this month", dot: "gt-dot-green" },
                  { n: allUsers.filter(u => {
                    const today = new Date().toDateString();
                    return allLeaves.some(l => l.userId === u.id && l.status === LeaveStatus.APPROVED &&
                      new Date(l.startDate) <= new Date() && new Date(l.endDate) >= new Date());
                  }).length, label: "On leave today", dot: "gt-dot-violet" },
                  { n: allUsers.filter(u => u.role === Role.Employee).length, label: "Total employees", dot: "gt-dot-coral" },
                ].map(({ n, label, dot }) => (
                  <div className="gt-stat-card" key={label}>
                    <div className="gt-stat-number">{n}</div>
                    <div className="gt-stat-label">
                      <div className={`gt-dot ${dot}`} />
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Leave cards */}
              {pendingLeaves.length === 0 ? (
                <div className="gt-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                  <p style={{ color: "var(--text-2)", fontSize: 14 }}>No pending leave requests.</p>
                </div>
              ) : (
                <div className="gt-stack">
                  {pendingLeaves.map(leave => (
                    <div key={leave.id} className="gt-leave-card">
                      <div className="gt-leave-card-header">
                        <div className="gt-row" style={{ gap: 10 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{leave.userName}</span>
                          <span className="gt-badge gt-badge-neutral">{leave.leaveType || "Leave"}</span>
                        </div>
                        <span className="gt-badge gt-badge-amber">Pending</span>
                      </div>
                      <div className="gt-leave-card-meta">
                        <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        {new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {" – "}
                        {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      {leave.reason && <p className="gt-leave-card-reason">{leave.reason}</p>}
                      <div className="gt-leave-card-actions">
                        <button className="gt-btn gt-btn-primary" onClick={() => handleApproveLeave(leave.id)}>
                          Approve
                        </button>
                        <button className="gt-btn gt-btn-ghost" onClick={() => handleRejectLeave(leave.id)}
                          style={{ color: "var(--red)" }}>
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Attendance Calendar Tab ── */}
          {activeTab === "attendance" && (
            <div>
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <select className="gt-select" style={{ maxWidth: 220 }} value={selectedUserIdForCalendar ?? ""}
                  onChange={e => setSelectedUserIdForCalendar(Number(e.target.value) || null)}>
                  <option value="">— Select employee —</option>
                  {employeeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select className="gt-select" style={{ maxWidth: 140 }} value={calendarMonth}
                  onChange={e => setCalendarMonth(Number(e.target.value))}>
                  {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="gt-select" style={{ maxWidth: 100 }} value={calendarYear}
                  onChange={e => setCalendarYear(Number(e.target.value))}>
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {!selectedUserIdForCalendar ? (
                <div className="gt-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                  <p style={{ color: "var(--text-2)", fontSize: 14 }}>Select an employee to view their attendance calendar.</p>
                </div>
              ) : isLoadingCalendar ? (
                <div className="gt-card" style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                  <div className="gt-spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : (
                <AttendanceCalendar
                  year={calendarYear}
                  month={calendarMonth}
                  checkInDays={calendarSummary?.checkInDays ?? {}}
                  leaves={calendarLeaves}
                  dailyWorkingMinutes={dailyWorkingMinutes}
                  onMonthChange={(y, m) => { setCalendarYear(y); setCalendarMonth(m); }}
                />
              )}
            </div>
          )}

          {/* ── Working Hours Tab ── */}
          {activeTab === "payroll" && (
            <div className="gt-stack">
              {workingHoursData.length === 0 ? (
                <div className="gt-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                  <p style={{ color: "var(--text-2)", fontSize: 14 }}>No attendance data yet.</p>
                </div>
              ) : workingHoursData.map(({ user, totalHours, totalMins, presentDays, avgHours }) => (
                <div key={user.id} className="gt-card" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ flex: "0 0 160px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)" }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Employee</div>
                  </div>
                  <div style={{ display: "flex", gap: 24, flex: 1, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 2 }}>Total Hours</div>
                      <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "var(--text-1)" }}>{totalHours}h {totalMins}m</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 2 }}>Days Present</div>
                      <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "var(--green)" }}>{presentDays}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 2 }}>Avg / Day</div>
                      <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "var(--coral)" }}>{avgHours}h</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Employees Tab ── */}
          {activeTab === "employees" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button className="gt-btn gt-btn-primary" onClick={() => setAddUserFormVisible(v => !v)}>
                  {isAddUserFormVisible ? "Cancel" : "+ Add Employee"}
                </button>
              </div>

              {isAddUserFormVisible && (
                <div className="gt-card" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--text-1)" }}>New Employee</h3>
                  <form onSubmit={handleAddUserSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label className="gt-label">Name</label>
                      <input className="gt-input" type="text" placeholder="Full name" value={newUserName}
                        onChange={e => setNewUserName(e.target.value)} required />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label className="gt-label">Password</label>
                      <input className="gt-input" type="password" placeholder="Password" value={newUserPassword}
                        onChange={e => setNewUserPassword(e.target.value)} required />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <button type="submit" className="gt-btn gt-btn-primary">Add</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="gt-card" style={{ padding: 0 }}>
                <div className="gt-table-wrap">
                  <table className="gt-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Geofence</th>
                        <th>Work Schedule</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(user => (
                        <tr key={user.id}>
                          <td style={{ fontWeight: 500 }}>{user.name}</td>
                          <td>
                            <span className={`gt-badge ${user.role === Role.Admin ? "gt-badge-coral" : "gt-badge-neutral"}`}>
                              {user.role}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {user.geofence?.center ? (
                              <div>
                                <div style={{ color: "var(--text-1)", fontWeight: 500, marginBottom: 2 }}>
                                  {geofenceLocations[user.id] || (
                                    <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>Loading…</span>
                                  )}
                                </div>
                                <div style={{ color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>
                                  ({user.geofence.center.latitude.toFixed(4)}, {user.geofence.center.longitude.toFixed(4)}) · {user.geofence.radius}m
                                </div>
                              </div>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                          <td style={{ minWidth: 220 }}>
                            {user.role === Role.Employee ? (
                              <WorkScheduleEditor
                                userId={user.id}
                                userName={user.name}
                                current={schedules[user.id] ?? null}
                                onSaved={saved => setSchedules(prev => ({ ...prev, [user.id]: saved }))}
                                onDeleted={() => setSchedules(prev => { const n = { ...prev }; delete n[user.id]; return n; })}
                              />
                            ) : <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              {user.role === Role.Employee && (
                                <button className="gt-btn gt-btn-ghost" style={{ height: 30, fontSize: 12 }}
                                  onClick={() => setEditingUser(user)}>
                                  Geofence
                                </button>
                              )}
                              {user.id !== currentUser.id && (
                                <button className="gt-btn" style={{ height: 30, fontSize: 12, background: "none", border: "1px solid var(--border)", color: "var(--red)" }}
                                  onClick={() => { if (confirm(`Remove ${user.name}?`)) onRemoveUser(user.id); }}>
                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Geofence Tab ── */}
          {activeTab === "geofence" && (
            <div>
              <div className="gt-card" style={{ padding: 0 }}>
                <div className="gt-table-wrap">
                  <table className="gt-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Center (Lat, Lng)</th>
                        <th>Radius</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeUsers.map(user => (
                        <tr key={user.id}>
                          <td style={{ fontWeight: 500 }}>{user.name}</td>
                          <td className="gt-table-mono">
                            {user.geofence?.center ? `${user.geofence.center.latitude.toFixed(5)}, ${user.geofence.center.longitude.toFixed(5)}` : "—"}
                          </td>
                          <td>{user.geofence ? `${user.geofence.radius} m` : "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button className="gt-btn gt-btn-ghost" style={{ height: 30, fontSize: 12 }}
                                onClick={() => setEditingUser(user)}>
                                {user.geofence ? "Edit" : "Set"}
                              </button>
                              {user.geofence && (
                                <button className="gt-btn" style={{ height: 30, fontSize: 12, background: "none", border: "1px solid var(--border)", color: "var(--red)" }}
                                  onClick={() => onSetGeofence(user.id, undefined)}>
                                  Clear
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Export Tab ── */}
          {activeTab === "export" && (
            <ExportPanel
              users={allUsers}
              attendanceRecords={attendanceRecords}
              allLeaves={allLeaves}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {editingUser && (
        <GeofenceEditorModal
          user={editingUser}
          onSave={handleGeofenceSave}
          onClose={() => setEditingUser(null)}
        />
      )}
      <LeaveHistoryModal
        isOpen={isLeaveHistoryOpen}
        leaves={allLeaves}
        onClose={() => setIsLeaveHistoryOpen(false)}
        onApprove={handleApproveLeave}
        onReject={handleRejectLeave}
        showActions={true}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onChangePassword={api.changePassword}
      />
    </div>
  );
};

export default AdminDashboard;
