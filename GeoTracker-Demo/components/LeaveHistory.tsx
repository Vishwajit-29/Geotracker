import React from 'react';
import { Leave, LeaveStatus, LeaveType } from '../types';

interface LeaveHistoryProps {
  leaves: Leave[];
  onApprove?: (leaveId: number) => void;
  onReject?: (leaveId: number) => void;
  showActions?: boolean;
}

const LeaveHistory: React.FC<LeaveHistoryProps> = ({
  leaves,
  onApprove,
  onReject,
  showActions = false,
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

  if (sortedLeaves.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-brand-dark mb-4">Leave History</h3>
        <p className="text-brand-secondary text-center py-4">No leave requests found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-brand-dark mb-4">
        Leave History {showActions ? '(Pending Requests)' : ''}
      </h3>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
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
                  <div className="flex items-center gap-3 mt-1">
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
    </div>
  );
};

export default LeaveHistory;
