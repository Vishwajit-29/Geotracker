import React from 'react';
import { Leave, LeaveType } from '../types';

interface WorkingHoursProps {
  year: number;
  month: number;
  totalWorkingMinutes: number;
  totalDaysPresent: number;
  userName?: string;
  leaves?: Leave[];
}

const WorkingHours: React.FC<WorkingHoursProps> = ({
  year,
  month,
  totalWorkingMinutes,
  totalDaysPresent,
  userName,
  leaves = [],
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const totalHours = Math.floor(totalWorkingMinutes / 60);
  const totalMinutes = totalWorkingMinutes % 60;

  const averageHoursPerDay = totalDaysPresent > 0
    ? totalWorkingMinutes / totalDaysPresent / 60
    : 0;

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Filter approved leaves for this month
  const approvedLeavesThisMonth = leaves.filter(leave => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    return (
      (leaveStart.getFullYear() === year && leaveStart.getMonth() === month) ||
      (leaveEnd.getFullYear() === year && leaveEnd.getMonth() === month)
    );
  });

  // Calculate leave days for this month
  const leaveDaysInMonth = approvedLeavesThisMonth.reduce((total, leave) => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);

    // If leave period starts before this month, use start of month
    const effectiveStart = new Date(year, month, Math.max(1, leaveStart.getDate()));

    // If leave period ends after this month, use end of month
    const daysInThisMonth = new Date(year, month + 1, 0).getDate();
    const effectiveEnd = new Date(year, month, Math.min(daysInThisMonth, leaveEnd.getDate()));

    // Calculate days in this month's range
    const days = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return total + days;
  }, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-brand-dark mb-4">
        Working Hours - {monthNames[month]} {year}
        {userName && <span className="text-gray-500 font-normal ml-2">({userName})</span>}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Working Time', value: `${totalHours}h ${totalMinutes > 0 ? `${totalMinutes}m` : ''}`, color: 'text-brand-primary', bg: 'bg-blue-50' },
          { label: 'Days Present', value: totalDaysPresent.toString(), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Leave Days', value: leaveDaysInMonth.toString(), color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Average (hrs/day)', value: formatHours(averageHoursPerDay), color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg p-4 flex flex-col justify-between min-h-[120px]`}>
            <p className="text-sm text-gray-600">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {approvedLeavesThisMonth.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">Leaves this month:</p>
          <div className="space-y-2">
            {approvedLeavesThisMonth.map((leave) => {
              const startDate = new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const endDate = new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={leave.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded text-white text-xs font-bold
                      ${leave.type === LeaveType.CASUAL ? 'bg-red-500' : ''}
                      ${leave.type === LeaveType.MEDICAL ? 'bg-blue-500' : ''}
                      ${leave.type === LeaveType.OTHER ? 'bg-purple-500' : ''}
                    `}
                  >
                    {leave.type === LeaveType.CASUAL ? 'C' : leave.type === LeaveType.MEDICAL ? 'M' : 'O'}
                  </span>
                  <span className="text-gray-600">{startDate} - {endDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingHours;
