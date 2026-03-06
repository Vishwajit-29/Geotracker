import React from 'react';
import { AttendanceRecord } from '../types';
import { LocationIcon } from './icons/LocationIcon';
import { ClockIcon } from './icons/ClockIcon';

interface AttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  onRecordClick: (record: AttendanceRecord) => void;
}

const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onRecordClick,
}) => {
  if (!isOpen) return null;

  const sortedRecords = [...records].sort((a, b) =>
    new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-brand-dark">Your Attendance History</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedRecords.length > 0 ? (
            <div className="space-y-3">
              {sortedRecords.map((record) => (
                <button
                  key={record.id}
                  onClick={() => {
                    onRecordClick(record);
                    onClose();
                  }}
                  className="w-full text-left bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                >
                  <div>
                    <p className="font-semibold text-brand-dark">
                      {new Date(record.checkInTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center text-sm text-brand-secondary space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <ClockIcon />
                        <span>In: {new Date(record.checkInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="opacity-50" />
                        <span>Out: {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-2 md:mt-0">
                    <LocationIcon />
                    <span>
                      {record.checkInLocation.latitude.toFixed(4)}, {record.checkInLocation.longitude.toFixed(4)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No attendance records found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistoryModal;
