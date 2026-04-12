import { randomUUID } from "node:crypto";

import { withClient } from "@kalshi-quant-dashboard/db";

export interface DenialAuditInput {
  readonly actorUserId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly reason: string;
  readonly details?: Record<string, unknown>;
}

export class DenialAuditService {
  async record(input: DenialAuditInput): Promise<void> {
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
          values ($1, $2, $3, $4, $5, 'rejected', $6, null, $7::jsonb)
        `,
        [
          randomUUID(),
          input.actorUserId,
          input.action,
          input.targetType,
          input.targetId,
          input.reason,
          JSON.stringify(input.details ?? {})
        ]
      );
    });
  }
}
