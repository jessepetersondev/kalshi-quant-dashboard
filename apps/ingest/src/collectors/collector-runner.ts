export interface CollectorHandle {
  readonly name: string;
  run(): Promise<void>;
}

export class CollectorRunner {
  constructor(private readonly collectors: readonly CollectorHandle[]) {}

  async runAll(): Promise<void> {
    for (const collector of this.collectors) {
      await collector.run();
    }
  }
}
