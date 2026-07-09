// Minimal pub/sub so any component can trigger a toast without prop drilling
// or a heavy state management library. ToastContainer (mounted once in App.jsx)
// subscribes to these events and renders the actual UI.

const listeners = new Set();
let nextId = 1;

function emit(message, type) {
  const toast = { id: nextId++, message, type };
  listeners.forEach(fn => fn(toast));
}

export const toast = {
  success: (message) => emit(message, 'success'),
  error: (message) => emit(message, 'error'),
  info: (message) => emit(message, 'info'),
};

export function subscribeToToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
