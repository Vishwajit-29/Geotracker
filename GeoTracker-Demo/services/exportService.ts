import { AttendanceRecord, User } from "../types";

export const exportToCSV = (records: AttendanceRecord[], users: User[]) => {
  // Generate filename with timestamp
  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;
  const filename = `attendance-report_${timestamp}.csv`;
  const userMap = new Map(users.map((user) => [user.id, user.name]));

  const headers = [
    "Employee Name",
    "Date",
    "Check-In Time",
    "Check-Out Time",
    "Location (Lat, Lng)",
  ];

  const csvRows = [headers.join(",")];

  // Format date as MM/DD/YYYY which is widely recognized by Excel
  const toExcelDateString = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format time as HH:MM:SS which is Excel-friendly
  const toExcelTimeString = (date: Date) => {
    const pad = (num: number) => (num < 10 ? "0" + num : num);
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  records.forEach((record) => {
    const userName = userMap.get(record.userId) || "Unknown User";
    const date = toExcelDateString(record.checkInTime);
    const checkIn = toExcelTimeString(record.checkInTime);
    const checkOut = record.checkOutTime
      ? toExcelTimeString(record.checkOutTime)
      : "N/A";
    const location = record.checkInLocation
      ? `${record.checkInLocation.latitude.toFixed(4)}, ${record.checkInLocation.longitude.toFixed(4)}`
      : "N/A";

    csvRows.push(
      [`"${userName}"`, date, checkIn, checkOut, `"${location}"`].join(","),
    );
  });

  const csvString = "\ufeff" + csvRows.join("\n"); // Adding BOM for Excel compatibility
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
