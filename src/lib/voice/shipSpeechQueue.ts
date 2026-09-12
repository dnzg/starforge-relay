export interface SpeechQueue<T> {
  enqueue(item: T): Promise<boolean>;
  clear(): void;
  get pending(): number;
}

export function createSpeechQueue<T>(
  play: (item: T) => Promise<boolean>,
): SpeechQueue<T> {
  type Job = { item: T; resolve: (played: boolean) => void };

  let jobs: Job[] = [];
  let draining = false;
  let generation = 0;

  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
      while (jobs.length > 0) {
        const job = jobs.shift();
        if (!job) break;
        const startedAt = generation;
        try {
          const played = await play(job.item);
          job.resolve(startedAt === generation && played);
        } catch {
          job.resolve(false);
        }
      }
    } finally {
      draining = false;
      if (jobs.length > 0) void drain();
    }
  }

  return {
    enqueue(item: T): Promise<boolean> {
      return new Promise((resolve) => {
        jobs.push({ item, resolve });
        void drain();
      });
    },
    clear() {
      generation += 1;
      const pending = jobs;
      jobs = [];
      for (const job of pending) job.resolve(false);
    },
    get pending() {
      return jobs.length;
    },
  };
}
