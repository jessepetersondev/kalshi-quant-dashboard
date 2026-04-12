import { randomUUID } from "node:crypto";

import { withClient } from "@kalshi-quant-dashboard/db";
import type { ExportQuery } from "@kalshi-quant-dashboard/contracts";

export class ExportAuditService {
  async recordAccepted(args: {
    readonly actorUserId: string;
    readonly query: ExportQuery;
    readonly rowCount: number;
  }): Promise<void> {
    await withClient(async (client) => {
      await client.query(
        `
          insert into audit_logs (
            audit_log_id,
            actor_user_id,
            action,
            target_type,
            target_id,
            result,
            reason,
            before_state,
            after_state
          )
          values ($1, $2, 'export.csv', 'export', $3, 'accepted', null, null, $4::jsonb)
        `,
        [
          randomUUID(),
          args.actorUserId,
          args.query.resource,
          JSON.stringify({
            resource: args.query.resource,
            format: args.query.format,
            rowCount: args.rowCount
          })
        ]
      );
    });
  }
}
