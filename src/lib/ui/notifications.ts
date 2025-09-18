import { writable } from 'svelte/store';

export type NotificationLevel = 'info' | 'success' | 'error' | 'warning';

export interface NotificationItem {
  id: string;
  level: NotificationLevel;
  message: string;
  timeout?: number; // ms
}

function createNotifications() {
  const { subscribe, update, set } = writable<NotificationItem[]>([]);

  function push(level: NotificationLevel, message: string, timeout = 3500) {
    const id = crypto.randomUUID();
    const item: NotificationItem = { id, level, message, timeout };
    update((all) => [...all, item]);
    if (timeout > 0) {
      setTimeout(() => dismiss(id), timeout);
    }
    return id;
  }

  function dismiss(id: string) {
    update((all) => all.filter((n) => n.id !== id));
  }

  function clear() { set([]); }

  return { subscribe, push, dismiss, clear };
}

export const notifications = createNotifications();

export const notify = {
  info: (m: string, t?: number) => notifications.push('info', m, t),
  success: (m: string, t?: number) => notifications.push('success', m, t),
  error: (m: string, t?: number) => notifications.push('error', m, t),
  warning: (m: string, t?: number) => notifications.push('warning', m, t)
};
