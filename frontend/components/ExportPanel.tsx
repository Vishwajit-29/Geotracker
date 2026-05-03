import React, { useState } from 'react';
import { User, AttendanceRecord, Leave } from '../types';
import { exportDailyAll, exportIndividual, exportSummary } from '../services/exportService';

interface Props {
  users: User[];
  attendanceRecords: AttendanceRecord[];
  allLeaves: Leave[];
}

type ReportType = 'daily' | 'individual' | 'summary';
type Period = 'monthly' | 'weekly' | 'custom';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStart(y: number, m: number) { return new Date(y, m, 1); }
function monthEnd(y: number, m: number) { return new Date(y, m + 1, 0); }
function weekStart(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return mon;
}
function weekEnd(start: Date) { const e = new Date(start); e.setDate(e.getDate() + 6); return e; }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const REPORT_OPTIONS: { type: ReportType; emoji: string; title: string; desc: string }[] = [
  { type: 'daily',      emoji: '📅', title: 'Daily Report',  desc: 'All employees, one date' },
  { type: 'individual', emoji: '👤', title: 'Individual',    desc: 'One employee, date range' },
  { type: 'summary',    emoji: '📊', title: 'Summary',       desc: 'All employees, period overview' },
];

const ExportPanel: React.FC<Props> = ({ users, attendanceRecords, allLeaves }) => {
  const [reportType, setReportType] = useState<ReportType>('daily');

  // Daily
  const [dailyDate, setDailyDate] = useState(todayStr());

  // Individual
  const [selectedUserId, setSelectedUserId] = useState('');
  const [period, setPeriod] = useState<Period>('monthly');
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [weekOf, setWeekOf] = useState(todayStr());

  // Summary
  const [summaryPeriod, setSummaryPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth());
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summaryWeekOf, setSummaryWeekOf] = useState(todayStr());

  // Status
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const employees = users.filter(u => (u.role as string) === 'EMPLOYEE' || u.role === 'EMPLOYEE' as any);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const resetStatus = () => { setDone(false); setError(''); setProgress(''); };

  async function handleExport() {
    resetStatus();
    setExporting(true);
    try {
      if (reportType === 'daily') {
        await exportDailyAll(new Date(dailyDate + 'T12:00:00'), attendanceRecords, users, allLeaves,
          (d, t) => setProgress(`Geocoding ${d}/${t} locations…`));

      } else if (reportType === 'individual') {
        const emp = users.find(u => u.id === parseInt(selectedUserId));
        if (!emp) { setError('Please select an employee.'); setExporting(false); return; }
        let start: Date, end: Date;
        if (period === 'monthly') { start = monthStart(selYear, selMonth); end = monthEnd(selYear, selMonth); }
        else if (period === 'weekly') { start = weekStart(weekOf); end = weekEnd(start); }
        else { start = new Date(customFrom + 'T00:00:00'); end = new Date(customTo + 'T23:59:59'); }
        await exportIndividual(emp, attendanceRecords, allLeaves, start, end,
          (d, t) => setProgress(`Geocoding ${d}/${t} locations…`));

      } else {
        let start: Date, end: Date, label: string;
        if (summaryPeriod === 'monthly') {
          start = monthStart(summaryYear, summaryMonth); end = monthEnd(summaryYear, summaryMonth);
          label = `${MONTHS[summaryMonth]} ${summaryYear}`;
        } else {
          start = weekStart(summaryWeekOf); end = weekEnd(start);
          label = `Week of ${start.toLocaleDateString('en-GB')}`;
        }
        exportSummary(users, attendanceRecords, allLeaves, start, end, label);
      }
      setDone(true); setProgress('');
    } catch (e: any) {
      setError('Export failed: ' + (e?.message || 'Unknown error')); setProgress('');
    } finally { setExporting(false); }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <p className="gt-page-subtitle" style={{ marginBottom: 24 }}>
        Download formatted reports for payroll, compliance, or records.
      </p>

      {/* Report type selector */}
      <div className="gt-export-option-grid" style={{ marginBottom: 24 }}>
        {REPORT_OPTIONS.map(({ type, emoji, title, desc }) => (
          <button
            key={type}
            className={`gt-export-option${reportType === type ? ' selected' : ''}`}
            onClick={() => { setReportType(type); resetStatus(); }}
          >
            <div className="gt-export-option-title">{emoji} {title}</div>
            <div className="gt-export-option-desc">{desc}</div>
            {reportType === type && (
              <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--coral)', fontSize: 14 }}>✓</div>
            )}
          </button>
        ))}
      </div>

      <div className="gt-divider" />

      {/* ── DAILY ── */}
      {reportType === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            All employees' attendance for a single date — check-in/out, working hours, status and work location (geocoded via OpenStreetMap).
          </p>
          <div>
            <label className="gt-label">Date</label>
            <div className="gt-input-with-icon" style={{ maxWidth: 200 }}>
              <span className="gt-input-icon material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
              <input className="gt-input" type="date" value={dailyDate} max={todayStr()}
                onChange={e => setDailyDate(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL ── */}
      {reportType === 'individual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Day-by-day attendance for one employee — check-in/out, working hours, leave type, and geocoded work location.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="gt-label">Employee</label>
              <select className="gt-select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                <option value="">— Select employee —</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="gt-label">Period</label>
              <div className="gt-period-pills">
                {(['monthly', 'weekly', 'custom'] as Period[]).map(p => (
                  <button key={p} className={`gt-period-pill${period === p ? ' active' : ''}`}
                    onClick={() => setPeriod(p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {period === 'monthly' && (
              <>
                <div>
                  <label className="gt-label">Month</label>
                  <select className="gt-select" value={selMonth} onChange={e => setSelMonth(+e.target.value)}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gt-label">Year</label>
                  <select className="gt-select" value={selYear} onChange={e => setSelYear(+e.target.value)}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}
            {period === 'weekly' && (
              <div>
                <label className="gt-label">Any day in the week</label>
                <input className="gt-input" type="date" value={weekOf} max={todayStr()} onChange={e => setWeekOf(e.target.value)} />
              </div>
            )}
            {period === 'custom' && (
              <>
                <div>
                  <label className="gt-label">From</label>
                  <input className="gt-input" type="date" value={customFrom} max={todayStr()} onChange={e => setCustomFrom(e.target.value)} />
                </div>
                <div>
                  <label className="gt-label">To</label>
                  <input className="gt-input" type="date" value={customTo} min={customFrom} max={todayStr()} onChange={e => setCustomTo(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {reportType === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Aggregate summary for all employees — days present, absent, leave days, total and average working hours. No geocoding required.
          </p>
          <div>
            <label className="gt-label">Period</label>
            <div className="gt-period-pills">
              {(['monthly', 'weekly'] as const).map(p => (
                <button key={p} className={`gt-period-pill${summaryPeriod === p ? ' active' : ''}`}
                  onClick={() => setSummaryPeriod(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {summaryPeriod === 'monthly' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="gt-label">Month</label>
                <select className="gt-select" value={summaryMonth} onChange={e => setSummaryMonth(+e.target.value)}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="gt-label">Year</label>
                <select className="gt-select" value={summaryYear} onChange={e => setSummaryYear(+e.target.value)}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}
          {summaryPeriod === 'weekly' && (
            <div style={{ maxWidth: 200 }}>
              <label className="gt-label">Any day in the week</label>
              <input className="gt-input" type="date" value={summaryWeekOf} max={todayStr()} onChange={e => setSummaryWeekOf(e.target.value)} />
            </div>
          )}
        </div>
      )}

      {/* ── Footer: status + export button ── */}
      <div className="gt-divider" style={{ marginTop: 24 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        <div>
          {progress && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>↻ {progress}</p>
          )}
          {done && (
            <p style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>✓ Downloaded successfully!</p>
          )}
          {error && (
            <p style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
          )}
          {!progress && !done && !error && (
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
              ↓ Geocoding work locations via OpenStreetMap
            </p>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="gt-btn gt-btn-primary gt-btn-lg"
        >
          {exporting ? (
            <><div className="gt-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Exporting…</>
          ) : 'Download Excel →'}
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
