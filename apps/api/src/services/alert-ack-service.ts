import { AdminAuditService } from "./admin-audit-service.js";
import { withClient } from "@kalshi-quant-dashboard/db";

export class AlertAckService {
  constructor(private readonly auditService = new AdminAuditService()) {}

  async acknowledge(args: {
    readonly alertId: string;
    readonly actorUserId: string;
  }) {
    await withClient(async (client) => {
      await client.query(
        `
          update alerts
          set status = 'acknowledged',
              last_seen_at = now()
          where alert_id = $1
        `,
        [args.alertId]
      );
    });

    return this.auditService.record({
      actorUserId: args.actorUserId,
      action: "alert.acknowledge",
      targetType: "alert",
      targetId: args.alertId,
      result: "accepted"
    });
  }
}
