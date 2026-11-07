export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// A streak remains current until the end of the following day.
export function currentStreak(activity, now = new Date()) {
  const dates = new Set(activity);
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dates.has(localDate(day))) day.setDate(day.getDate() - 1);
  let count = 0;
  while (dates.has(localDate(day))) { count++; day.setDate(day.getDate() - 1); }
  return count;
}

export function sortedTasks(tasks) {
  return tasks.map((task, index) => ({ task, index })).sort((a, b) =>
    Number(a.task.done) - Number(b.task.done) ||
    (a.task.date || '9999').localeCompare(b.task.date || '9999') || a.index - b.index);
}

export function taskDateLabel(date, today = localDate()) {
  if (!date) return 'No date';
  if (date === today) return 'Today';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const label = parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return date < today ? `Overdue · ${label}` : label;
}

// Calendar days are built in local time so DST changes do not shift the labels.
export function recentStudyDays(activity, now = new Date(), count = 7) {
  const done = new Set(Array.isArray(activity) ? activity : []);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Array.from({length:count}, (_,i) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i));
    const date = localDate(day);
    return { date, label:day.toLocaleDateString('en-GB',{weekday:'short'}), description:day.toLocaleDateString('en-GB',{day:'numeric',month:'short'}), active:done.has(date), today:date===localDate(today) };
  });
}
