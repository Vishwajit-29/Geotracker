import React from 'react';
import { Leave, LeaveStatus, LeaveType } from '../types';

interface LeaveHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaves: Leave[];
  onApprove?: (leaveId: number) => void;
  onReject?: (leaveId: number) => void;
  showActions?: boolean;
  myLeaves?: boolean;
}

const LeaveHistoryModal: React.FC<LeaveHistoryModalProps> = ({
  isOpen,
  onClose,
  leaves,
  onApprove,
  onReject,
  showActions = false,
  myLeaves = false,
}) => {
  const getStatusBadge = (status: LeaveStatus): { color: string; label: string } => {
    switch (status) {
      case LeaveStatus.APPROVED:
        return { color: 'bg-green-100 text-green-800', label: 'Approved' };
      case LeaveStatus.REJECTED:
        return { color: 'bg-red-100 text-red-800', label: 'Rejected' };
      case LeaveStatus.PENDING:
      default:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
    }
  };

  const getTypeLabel = (type: LeaveType): string => {
    switch (type) {
      case LeaveType.CASUAL:
        return 'Casual';
      case LeaveType.MEDICAL:
        return 'Medical';
      case LeaveType.OTHER:
        return 'Other';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedLeaves = [...leaves].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-brand-dark">
            {myLeaves ? 'My Leave History' : 'Leave Requests'}
          </h2>
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

        {sortedLeaves.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-brand-secondary">No leave requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLeaves.map((leave) => {
              const status = getStatusBadge(leave.status);

              return (
                <div
                  key={leave.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      {leave.userName && (
                        <p className="font-semibold text-brand-dark">{leave.userName}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600">
                          <strong>Type:</strong> {getTypeLabel(leave.type)}
                        </span>
                        <span className="text-sm text-gray-600">
                          <strong>Dates:</strong> {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Reason:</strong> {leave.reason}
                      </p>
                      {leave.status === LeaveStatus.APPROVED && leave.approvedByName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Approved by {leave.approvedByName}
                          {leave.approvedAt && ` on ${formatDate(leave.approvedAt)}`}
                        </p>
                      )}
                      {leave.status === LeaveStatus.REJECTED && leave.approvedByName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Rejected by {leave.approvedByName}
                          {leave.approvedAt && ` on ${formatDate(leave.approvedAt)}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {showActions && leave.status === LeaveStatus.PENDING && (
                      <div className="flex gap-2 mt-3 md:mt-0">
                        <button
                          onClick={() => onApprove?.(leave.id)}
                          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onReject?.(leave.id)}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistoryModal;
