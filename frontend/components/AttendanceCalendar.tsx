import React from 'react';
import { Leave, LeaveType, LeaveStatus } from '../types';

interface AttendanceCalendarProps {
  year: number;
  month: number;
  checkInDays: Record<string, boolean>;
  leaves: Leave[];
  onMonthChange: (year: number, month: number) => void;
  dailyWorkingMinutes?: Record<string, number>;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  year,
  month,
  checkInDays,
  leaves,
  onMonthChange,
  dailyWorkingMinutes,
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDay = isCurrentMonth ? today.getDate() : null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const getLeaveForDate = (date: Date): Leave | undefined => {
    return leaves.find(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      // Set dates to midnight for comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate && leave.status === LeaveStatus.APPROVED;
    });
  };

  const getPreviousMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const getNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const formatDateKey = (day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isFutureDay = (day: number): boolean => {
    if (!isCurrentMonth) return false;
    return day > currentDay!;
  };

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={getPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          aria-label="Previous month"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-bold text-brand-dark">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={getNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          aria-label="Next month"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdayNames.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="h-20" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const dateKey = formatDateKey(day);
          const hasCheckIn = checkInDays[dateKey] || false;
          const date = new Date(year, month, day);
          const leave = getLeaveForDate(date);
          const isToday = currentDay === day && isCurrentMonth;
          const future = isFutureDay(day);
          const dailyMinutes = dailyWorkingMinutes ? dailyWorkingMinutes[dateKey] : undefined;

          // Format daily working time for display
          let dailyTimeDisplay: string | null = null;
          if (dailyMinutes !== undefined && dailyMinutes > 0 && !leave) {
            const totalRounded = Math.round(dailyMinutes);
            const hours = Math.floor(totalRounded / 60);
            const minutes = totalRounded % 60;
            dailyTimeDisplay = `${hours}h ${minutes}m`;
          }

          return (
            <div
              key={day}
              className={`
                h-20 rounded-lg p-2 flex flex-col items-center justify-between relative
                ${isToday ? 'ring-2 ring-brand-primary ring-offset-2' : ''}
                ${future ? 'bg-blue-50' : ''}
                ${hasCheckIn && !future ? 'bg-green-50 hover:shadow-md' : ''}
                ${leave && !future ? 'bg-red-50 hover:shadow-md' : ''}
                ${leave && future ? 'bg-red-50 hover:shadow-md' : ''}
                ${!hasCheckIn && !leave && !future ? 'bg-gray-50 hover:shadow-md' : ''}
              `}
            >
              <span
                className={`
                  text-sm font-medium
                  ${isToday ? 'text-brand-primary' : future ? 'text-blue-600' : 'text-gray-700'}
                `}
              >
                {day}
              </span>

              <div className="flex flex-col items-center gap-1">
                {hasCheckIn && !future && (
                  <span className="text-green-600 font-bold text-lg" role="img" aria-label="Check-in">
                    ✓
                  </span>
                )}

                {leave && (
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={`
                        text-xs font-bold px-1.5 py-0.5 rounded text-white
                        ${leave.type === LeaveType.CASUAL ? 'bg-red-500' : ''}
                        ${leave.type === LeaveType.MEDICAL ? 'bg-blue-500' : ''}
                        ${leave.type === LeaveType.OTHER ? 'bg-purple-500' : ''}
                      `}
                    >
                      {leave.type === LeaveType.CASUAL ? 'C' :
                       leave.type === LeaveType.MEDICAL ? 'M' : 'O'}
                    </span>
                  </div>
                )}

                {dailyTimeDisplay && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    {dailyTimeDisplay}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-bold">✓</span>
          <span className="text-gray-600">Check-in Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-xs font-bold px-2 py-0.5 rounded text-white">C</span>
          <span className="text-gray-600">Casual Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-500 text-xs font-bold px-2 py-0.5 rounded text-white">M</span>
          <span className="text-gray-600">Medical Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-purple-500 text-xs font-bold px-2 py-0.5 rounded text-white">O</span>
          <span className="text-gray-600">Other Leave</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
