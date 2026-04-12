import type { SkipListResponse } from "@kalshi-quant-dashboard/contracts";
import { Card, VirtualizedDataTable } from "@kalshi-quant-dashboard/ui";

export function SkipTaxonomyTable(props: {
  readonly rows: SkipListResponse["taxonomyBreakdown"];
}) {
  return (
    <Card title="Skip Taxonomy">
      <VirtualizedDataTable
        ariaLabel="Skip taxonomy rows"
        caption="Skip taxonomy rows"
        columns={[
          {
            key: "category",
            header: "Category",
            renderCell: (row) => row.skipCategory
          },
          { key: "code", header: "Code", renderCell: (row) => row.skipCode ?? "none" },
          { key: "count", header: "Count", renderCell: (row) => row.count },
          {
            key: "examples",
            header: "Examples",
            renderCell: (row) =>
              row.examples.length === 0
                ? "No representative rows"
                : `${row.examples.length} representative row${row.examples.length === 1 ? "" : "s"}`
          }
        ]}
        rowKey={(row) => `${row.skipCategory}:${row.skipCode ?? "none"}`}
        rows={props.rows}
      />
    </Card>
  );
}
