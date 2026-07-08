export type AppEventType =
  | 'HABIT_CHANGED'
  | 'DAY_LOGGED'
  | 'TRANSACTION_CHANGED'
  | 'TASK_CHANGED'
  | 'GOAL_CHANGED';

export interface AppEvent {
  type: AppEventType;
  payload?: any;
}

type Listener = (event: AppEvent) => void;

class EventBus {
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: AppEvent) {
    // console.debug(`[EventBus] Emitting ${event.type}`, event.payload);
    this.listeners.forEach((listener) => listener(event));
  }
}

export const appEvents = new EventBus();
