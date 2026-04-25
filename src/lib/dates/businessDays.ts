function normalizeDateInput(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date(NaN);
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function countBusinessDaysInclusive(start: string | Date, end: string | Date) {
  const startDate = normalizeDateInput(start);
  const endDate = normalizeDateInput(end);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate.getTime() < startDate.getTime()
  ) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(startDate);

  while (cursor.getTime() <= endDate.getTime()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}
