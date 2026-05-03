import React, { useState } from 'react';
import { LeaveType, Leave, LeaveStatus, AttendanceRecord } from '../types';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestLeave: (type: LeaveType, startDate: string, endDate: string, reason: string) => Promise<void>;
  existingLeaves?: Leave[];
  attendanceRecords?: AttendanceRecord[];
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestLeave,
  existingLeaves = [],
  attendanceRecords = [],
}) => {
  const [type, setType] = useState<LeaveType>(LeaveType.CASUAL);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!startDate || !endDate || !reason.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }

    // Check for overlapping approved leaves
    const requestStart = new Date(startDate);
    const requestEnd = new Date(endDate);
    requestStart.setHours(0, 0, 0, 0);
    requestEnd.setHours(0, 0, 0, 0);

    const hasOverlappingLeave = existingLeaves.some(leave => {
      if (leave.status !== LeaveStatus.APPROVED) return false;
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      leaveStart.setHours(0, 0, 0, 0);
      leaveEnd.setHours(0, 0, 0, 0);
      return requestStart <= leaveEnd && requestEnd >= leaveStart;
    });

    if (hasOverlappingLeave) {
      setError('You already have an approved leave during this period');
      return;
    }

    // Check for attendance on requested leave dates
    const hasAttendanceConflict = attendanceRecords.some(record => {
      const checkInDate = new Date(record.checkInTime);
      checkInDate.setHours(0, 0, 0, 0);
      return checkInDate >= requestStart && checkInDate <= requestEnd;
    });

    if (hasAttendanceConflict) {
      setError('You cannot apply leave for dates when you have already checked in');
      return;
    }

    setIsLoading(true);
    try {
      await onRequestLeave(type, startDate, endDate, reason.trim());
      setSuccess(true);

      // Reset form after success
      setType(LeaveType.CASUAL);
      setStartDate('');
      setEndDate('');
      setReason('');

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-brand-dark">Request Leave</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <p className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Leave request submitted successfully!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LeaveType)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                required
              >
                <option value={LeaveType.CASUAL}>Casual Leave</option>
                <option value={LeaveType.MEDICAL}>Medical Leave</option>
                <option value={LeaveType.OTHER}>Other Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-none"
                placeholder="Please provide a reason for your leave request..."
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-brand-primary text-white font-medium rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestModal;
