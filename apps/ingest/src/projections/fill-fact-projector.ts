import { query } from "@kalshi-quant-dashboard/db";
import { fillRowSchema, type FillRow } from "@kalshi-quant-dashboard/contracts";

interface FillProjectionRow {
  readonly fill_id: string;
  readonly quantity: number;
  readonly price: string | null;
  readonly occurred_at: string;
}

function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString();
}

export async function projectFillFacts(correlationId: string): Promise<FillRow[]> {
  const result = await query<FillProjectionRow>(
    `
      select
        fill_id,
        quantity,
        price::text as price,
        occurred_at::text as occurred_at
      from fills
      where correlation_id = $1
      order by occurred_at asc, fill_id asc
    `,
    [correlationId]
  );

  return result.rows.map((row) =>
    fillRowSchema.parse({
      fillFactId: row.fill_id,
      filledQuantity: row.quantity,
      fillPrice: row.price ? Number(row.price) : null,
      feeAmount: null,
      occurredAt: toIsoTimestamp(row.occurred_at)
    })
  );
}
