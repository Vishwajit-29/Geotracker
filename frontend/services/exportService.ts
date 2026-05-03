import * as XLSX from 'xlsx';
import { User, AttendanceRecord, Leave, LeaveStatus, Role } from '../types';
import { geocodeBatch, clearGeocodeCache, GeoPoint } from './geocodeService';

// ─── Date / time helpers ───────────────────────────────────────────────────

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'long' });
const fmtDuration = (mins: number) => {
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWeekend(d: Date) { const n = d.getDay(); return n === 0 || n === 6; }

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start); cur.setHours(0, 0, 0, 0);
  const endN = new Date(end); endN.setHours(23, 59, 59, 999);
  while (cur <= endN) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
}

function workingMins(r: AttendanceRecord): number {
  if (!r.checkOutTime) return 0;
  return (new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 60000;
}

function getLeaveOnDay(date: Date, leaves: Leave[]): Leave | undefined {
  return leaves.find(l => {
    if (l.status !== LeaveStatus.APPROVED) return false;
    const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(l.endDate); e.setHours(23, 59, 59, 999);
    const d = new Date(date); d.setHours(12, 0, 0, 0);
    return d >= s && d <= e;
  });
}

function statusLabel(rec?: AttendanceRecord, leave?: Leave): string {
  if (rec) return '✓ Present';
  if (leave) return `◷ Leave (${leave.type})`;
  return '✗ Absent';
}

function autoColWidths(rows: unknown[][]): XLSX.ColInfo[] {
  if (!rows.length) return [];
  const widths = Array(rows[0].length).fill(8);
  rows.forEach(row =>
    row.forEach((c, i) => {
      const len = c == null ? 0 : String(c).length;
      if (len > widths[i]) widths[i] = len;
    })
  );
  return widths.map(w => ({ wch: Math.min(w + 2, 55) }));
}

function buildAndDownload(sheetData: unknown[][], sheetName: string, filename: string) {
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = autoColWidths(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

const employees = (users: User[]) =>
  users.filter(u => u.role === Role.Employee || (u.role as string) === 'EMPLOYEE');

// ─── 1. Daily Report — all employees on one date ──────────────────────────

export async function exportDailyAll(
  date: Date,
  allRecords: AttendanceRecord[],
  users: User[],
  allLeaves: Leave[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  clearGeocodeCache();
  const emps = employees(users);
  const dayRecs = allRecords.filter(r => isSameDay(new Date(r.checkInTime), date));

  const locs = emps.map(emp => {
    const r = dayRecs.find(r => r.userId === emp.id);
    return r ? (r.checkInLocation as GeoPoint) : null;
  });

  const addresses = await geocodeBatch(locs, onProgress);

  const headers = ['Employee', 'Date', 'Day', 'Check-In', 'Check-Out', 'Working Hours', 'Status', 'Work Location'];
  const rows = emps.map((emp, i) => {
    const r = dayRecs.find(r => r.userId === emp.id);
    const leave = getLeaveOnDay(date, allLeaves.filter(l => l.userId === emp.id));
    const mins = r ? workingMins(r) : 0;
    return [
      emp.name,
      fmtDate(date),
      fmtDay(date),
      r ? fmtTime(new Date(r.checkInTime)) : '—',
      r?.checkOutTime ? fmtTime(new Date(r.checkOutTime)) : r ? '(Active)' : '—',
      fmtDuration(mins),
      statusLabel(r, leave),
      addresses[i],
    ];
  });

  const dateStr = date.toISOString().slice(0, 10);
  buildAndDownload(
    [headers, ...rows],
    `Daily ${fmtDate(date)}`,
    `GeoTracker-Daily-${dateStr}.xlsx`
  );
}

// ─── 2. Individual Report — one employee, custom date range ───────────────

export async function exportIndividual(
  employee: User,
  allRecords: AttendanceRecord[],
  allLeaves: Leave[],
  startDate: Date,
  endDate: Date,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  clearGeocodeCache();
  const empRecs = allRecords.filter(r => r.userId === employee.id);
  const empLeaves = allLeaves.filter(l => l.userId === employee.id);
  const days = eachDay(startDate, endDate);

  const locs = days.map(day => {
    const r = empRecs.find(r => isSameDay(new Date(r.checkInTime), day));
    return r ? (r.checkInLocation as GeoPoint) : null;
  });

  const addresses = await geocodeBatch(locs, onProgress);

  const headers = ['Date', 'Day', 'Check-In', 'Check-Out', 'Working Hours', 'Status', 'Leave Type', 'Work Location'];
  const rows = days.map((day, i) => {
    const r = empRecs.find(r => isSameDay(new Date(r.checkInTime), day));
    const leave = getLeaveOnDay(day, empLeaves);
    const mins = r ? workingMins(r) : 0;
    return [
      fmtDate(day),
      fmtDay(day),
      r ? fmtTime(new Date(r.checkInTime)) : '—',
      r?.checkOutTime ? fmtTime(new Date(r.checkOutTime)) : r ? '(Active)' : '—',
      fmtDuration(mins),
      statusLabel(r, leave),
      leave ? leave.type : '—',
      addresses[i],
    ];
  });

  // Summary row at bottom
  const presentDays = days.filter(d => empRecs.some(r => isSameDay(new Date(r.checkInTime), d))).length;
  const totalMins = empRecs
    .filter(r => days.some(d => isSameDay(new Date(r.checkInTime), d)))
    .reduce((sum, r) => sum + workingMins(r), 0);
  const leaveDays = days.filter(d => !!getLeaveOnDay(d, empLeaves)).length;
  const workDays = days.filter(d => !isWeekend(d)).length;

  const summary = [
    'SUMMARY', '', '',  '', fmtDuration(totalMins),
    `Present: ${presentDays} | Leave: ${leaveDays} | Absent: ${Math.max(0, workDays - presentDays - leaveDays)}`,
    '', '',
  ];

  const s = startDate.toISOString().slice(0, 10);
  const e = endDate.toISOString().slice(0, 10);
  buildAndDownload(
    [headers, ...rows, [], summary],
    employee.name.slice(0, 25),
    `GeoTracker-${employee.name.replace(/\s+/g, '-')}-${s}-to-${e}.xlsx`
  );
}

// ─── 3. Summary Report — all employees, weekly or monthly ─────────────────

export function exportSummary(
  users: User[],
  allRecords: AttendanceRecord[],
  allLeaves: Leave[],
  startDate: Date,
  endDate: Date,
  label: string // e.g. "May 2026" or "Week of 01 May 2026"
): void {
  const emps = employees(users);
  const days = eachDay(startDate, endDate);
  const workDays = days.filter(d => !isWeekend(d)).length;

  const headers = [
    'Employee', 'Working Days in Period', 'Days Present',
    'Days Absent', 'Leave Days', 'Total Working Hours', 'Avg Hours / Day',
  ];

  const rows = emps.map(emp => {
    const empRecs = allRecords.filter(r => {
      const d = new Date(r.checkInTime);
      return r.userId === emp.id && days.some(day => isSameDay(d, day));
    });
    const empLeaves = allLeaves.filter(l => l.userId === emp.id);

    const presentDays = new Set(
      empRecs.map(r => new Date(r.checkInTime).toDateString())
    ).size;

    const leaveDays = days.filter(d => !!getLeaveOnDay(d, empLeaves)).length;
    const absentDays = Math.max(0, workDays - presentDays - leaveDays);
    const totalMins = empRecs.reduce((s, r) => s + workingMins(r), 0);
    const avgMins = presentDays > 0 ? totalMins / presentDays : 0;

    return [
      emp.name,
      workDays,
      presentDays,
      absentDays,
      leaveDays,
      fmtDuration(totalMins),
      fmtDuration(avgMins),
    ];
  });

  const safeLabel = label.replace(/[^a-zA-Z0-9 _-]/g, '');
  buildAndDownload(
    [headers, ...rows],
    `Summary ${safeLabel}`.slice(0, 31),
    `GeoTracker-Summary-${safeLabel.replace(/\s+/g, '-')}.xlsx`
  );
}
