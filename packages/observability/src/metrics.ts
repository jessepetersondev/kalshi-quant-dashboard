export type MetricTags = Record<string, string | number | boolean | null | undefined>;

interface CounterRecord {
  name: string;
  total: number;
  samples: number[];
}

export class MetricRegistry {
  private readonly counters = new Map<string, CounterRecord>();
  private readonly gauges = new Map<string, number>();

  add(name: string, amount = 1): void {
    const current = this.counters.get(name) ?? {
      name,
      total: 0,
      samples: []
    };

    current.total += amount;
    current.samples.push(amount);
    this.counters.set(name, current);
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  snapshot() {
    return {
      counters: [...this.counters.values()].map((record) => ({
        name: record.name,
        total: record.total,
        sampleCount: record.samples.length
      })),
      gauges: [...this.gauges.entries()].map(([name, value]) => ({
        name,
        value
      }))
    };
  }
}

export const metrics = new MetricRegistry();
