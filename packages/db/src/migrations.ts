export interface MigrationDescriptor {
  readonly id: string;
  readonly fileName: string;
}

export const migrations: readonly MigrationDescriptor[] = [
  {
    id: "0001_initial",
    fileName: "0001_initial.sql"
  },
  {
    id: "0002_performance",
    fileName: "0002_performance.sql"
  }
];
