import type { SourceAdapter } from "./source-adapter.js";

export class AdapterRegistry {
  private readonly adapters = new Map<string, SourceAdapter>();

  register(adapter: SourceAdapter): void {
    this.adapters.set(adapter.variant, adapter);
  }

  get(variant: string): SourceAdapter {
    const adapter = this.adapters.get(variant);

    if (!adapter) {
      throw new Error(`No source adapter registered for variant '${variant}'.`);
    }

    return adapter;
  }

  list(): readonly string[] {
    return [...this.adapters.keys()].sort();
  }
}
