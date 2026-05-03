import React, { useState } from 'react';
import { WorkSchedule } from '../types';
import * as api from '../services/apiService';

interface Props {
  userId: number;
  userName: string;
  current: WorkSchedule | null;
  onSaved: (schedule: WorkSchedule) => void;
  onDeleted: () => void;
}

const ALL_DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const DAY_SHORT: Record<string, string> = {
  MONDAY: 'Mo', TUESDAY: 'Tu', WEDNESDAY: 'We',
  THURSDAY: 'Th', FRIDAY: 'Fr', SATURDAY: 'Sa', SUNDAY: 'Su',
};

const WorkScheduleEditor: React.FC<Props> = ({ userId, userName, current, onSaved, onDeleted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState(current?.workStartTime ?? '09:00');
  const [endTime,   setEndTime]   = useState(current?.workEndTime   ?? '18:00');
  const [days, setDays]           = useState<string[]>(
    current?.workDays ?? ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const toggleDay = (d: string) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSave = async () => {
    if (days.length === 0) { setError('Select at least one work day.'); return; }
    if (endTime <= startTime) { setError('End time must be after start time.'); return; }
    setSaving(true); setError('');
    try {
      const saved = await api.setSchedule(userId, { workStartTime: startTime, workEndTime: endTime, workDays: days, active: true });
      onSaved(saved);
      setIsOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save schedule');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove schedule for ${userName}?`)) return;
    try { await api.deleteSchedule(userId); onDeleted(); setIsOpen(false); } catch {}
  };

  return (
    <div>
      {/* Trigger row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {current ? (
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
            {current.workStartTime} – {current.workEndTime} · {current.workDays.map(d => DAY_SHORT[d]).join(' ')}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>No schedule</span>
        )}
        <button
          className="gt-btn gt-btn-ghost"
          style={{ height: 26, fontSize: 11, padding: '0 10px' }}
          onClick={() => setIsOpen(o => !o)}
        >
          {isOpen ? 'Close' : current ? 'Edit' : 'Set'}
        </button>
        {current && !isOpen && (
          <button
            className="gt-btn"
            style={{ height: 26, fontSize: 11, padding: '0 10px', background: 'none', border: '1px solid var(--border)', color: 'var(--red)' }}
            onClick={handleDelete}
          >
            Remove
          </button>
        )}
      </div>

      {/* Expanded editor */}
      {isOpen && (
        <div style={{
          marginTop: 12, padding: '16px 18px', background: 'var(--surface-1)',
          border: '1px solid var(--border)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Time row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <label className="gt-label" style={{ marginBottom: 4 }}>Start</label>
              <input
                type="time"
                className="gt-input"
                style={{ width: 120 }}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div style={{ paddingTop: 20, color: 'var(--text-3)', fontSize: 18, fontWeight: 300 }}>–</div>
            <div>
              <label className="gt-label" style={{ marginBottom: 4 }}>End</label>
              <input
                type="time"
                className="gt-input"
                style={{ width: 120 }}
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Days row */}
          <div>
            <label className="gt-label" style={{ marginBottom: 8, display: 'block' }}>Work Days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  style={{
                    width: 36, height: 36, borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: days.includes(d) ? '1.5px solid var(--coral)' : '1.5px solid var(--border)',
                    background: days.includes(d) ? 'var(--coral)' : 'var(--surface-0)',
                    color: days.includes(d) ? '#fff' : 'var(--text-2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {DAY_SHORT[d]}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="gt-btn gt-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Schedule'}
            </button>
            <button className="gt-btn gt-btn-ghost" onClick={() => setIsOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkScheduleEditor;
