// Build a task or note from a small cross-app capture form. This module only
// validates and returns data; persistence remains with the account progress store.
export const QUICK_CAPTURE_LIMITS = Object.freeze({
  taskTitle: 100,
  noteTitle: 80,
  noteBody: 1000,
  noteCount: 30,
  checklistItems: 20,
  checklistItem: 100
});

const text = value => String(value ?? '').trim();

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function noteError(state) {
  return (Array.isArray(state.schoolNotes) ? state.schoolNotes.length : 0) >= QUICK_CAPTURE_LIMITS.noteCount
    ? 'You have reached the 30-note limit. Delete a note permanently to make room.'
    : '';
}

export function createQuickCapture(kind, fields = {}, state = {}) {
  if (kind === 'task') {
    const title = text(fields.title);
    const date = text(fields.date);
    if (!title) return { error: 'Enter a task name.' };
    if (title.length > QUICK_CAPTURE_LIMITS.taskTitle) return { error: 'Task names can be up to 100 characters.' };
    if (date && !validDate(date)) return { error: 'Choose a valid due date.' };
    return { value: { title, date, done: false } };
  }

  if (kind === 'note') {
    const title = text(fields.title);
    const body = text(fields.body);
    if (title.length > QUICK_CAPTURE_LIMITS.noteTitle) return { error: 'Note titles can be up to 80 characters.' };
    if (body.length > QUICK_CAPTURE_LIMITS.noteBody) return { error: 'Notes can be up to 1,000 characters.' };
    if (!title && !body) return { error: 'Add a title or a little note before saving.' };
    const limitError = noteError(state);
    if (limitError) return { error: limitError };
    return { value: { kind: 'text', title, body, labels: '', colour: 'default' } };
  }

  if (kind === 'checklist') {
    const title = text(fields.title);
    const body = String(fields.body ?? '').replace(/\r\n?/g, '\n').trim();
    if (title.length > QUICK_CAPTURE_LIMITS.noteTitle) return { error: 'Checklist titles can be up to 80 characters.' };
    const items = body.split('\n').map(text).filter(Boolean);
    if (!title && !items.length) return { error: 'Add a title or at least one checklist item.' };
    if (items.length > QUICK_CAPTURE_LIMITS.checklistItems) return { error: 'A checklist can have up to 20 items.' };
    if (items.some(item => item.length > QUICK_CAPTURE_LIMITS.checklistItem)) return { error: 'Checklist items can be up to 100 characters each.' };
    const limitError = noteError(state);
    if (limitError) return { error: limitError };
    return {
      value: {
        kind: 'checklist',
        title,
        body: '',
        labels: '',
        colour: 'default',
        items: items.map(item => ({ text: item, done: false }))
      }
    };
  }

  return { error: 'Choose a task, note or checklist.' };
}
