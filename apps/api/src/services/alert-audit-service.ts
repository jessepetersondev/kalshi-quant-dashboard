import { query } from "@kalshi-quant-dashboard/db";

export class AlertAuditService {
  async listForAlert(alertId: string) {
    const result = await query<{
      audit_log_id: string;
      actor_user_id: string;
      action: string;
      result: string;
      occurred_at: string;
    }>(
      `
        select audit_log_id, actor_user_id, action, result, occurred_at::text as occurred_at
        from audit_logs
        where target_type = 'alert'
          and target_id = $1
        order by occurred_at desc
      `,
      [alertId]
    );

    return result.rows.map((row) => ({
      auditLogId: row.audit_log_id,
      actorUserId: row.actor_user_id,
      action: row.action,
      result: row.result,
      occurredAt: new Date(row.occurred_at).toISOString()
    }));
  }
}
