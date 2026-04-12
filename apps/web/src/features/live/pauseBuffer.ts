export interface PauseBuffer<T> {
  readonly isPaused: boolean;
  readonly buffered: readonly T[];
  pause(): void;
  push(event: T): void;
  flush(): readonly T[];
  resume(): readonly T[];
}

export function createPauseBuffer<T>(): PauseBuffer<T> {
  let isPaused = false;
  let buffered: T[] = [];

  return {
    get isPaused() {
      return isPaused;
    },
    get buffered() {
      return buffered;
    },
    pause() {
      isPaused = true;
    },
    push(event: T) {
      if (isPaused) {
        buffered = [...buffered, event];
      }
    },
    flush() {
      const next = buffered;
      buffered = [];
      return next;
    },
    resume() {
      isPaused = false;
      return this.flush();
    }
  };
}
