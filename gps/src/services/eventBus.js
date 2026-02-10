/**
 * 媛꾨떒???대깽??踰꾩뒪 - ?붾㈃ 媛??곗씠???꾨떖??
 */
const listeners = {};

export function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
}

export function emit(event, data) {
  if (listeners[event]) {
    listeners[event].forEach(cb => cb(data));
  }
}
