import { randomUUID } from "node:crypto";

import {
  auditLogListQuerySchema,
  auditLogListResponseSchema,
  pageInfoSchema,
  type AuditLogListQuery,
  type MutationAudit
} from "@kalshi-quant-dashboard/contracts";
import { withClient } from "@kalshi-quant-dashboard/db";
import { normalizePaginationQuery } from "./pagination.js";

interface AuditRow {
  readonly audit_log_id: string;
  readonly actor_user_id: string;
  readonly action: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly result: MutationAudit["result"];
  readonly reason: string | null;
  readonly before_state: Record<string, unknown> | null;
  readonly after_state: Record<string, unknown> | null;
  readonly occurred_at: Date;
}

export class AdminAuditService {
  async record(args: {
    readonly actorUserId: string;
    readonly action: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly result: MutationAudit["result"];
    readonly reason?: string | null;
    readonly beforeState?: Record<string, unknown> | null;
    readonly afterState?: Record<string, unknown> | null;
  }): Promise<MutationAudit> {
    const auditLogId = randomUUID();
    const occurredAt = new Date().toISOString();

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
            after_state,
            occurred_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
        `,
        [
          auditLogId,
          args.actorUserId,
          args.action,
          args.targetType,
          args.targetId,
          args.result,
          args.reason ?? null,
          args.beforeState ? JSON.stringify(args.beforeState) : null,
          args.afterState ? JSON.stringify(args.afterState) : null,
          occurredAt
        ]
      );
    });

    return {
      auditLogId,
      result: args.result,
      occurredAt,
      actorUserId: args.actorUserId
    };
  }

  parseListQuery(input: unknown): AuditLogListQuery {
    return normalizePaginationQuery("auditLogs", auditLogListQuerySchema.parse(input ?? {}));
  }

  async list(input: AuditLogListQuery) {
    return withClient(async (client) => {
      const values: unknown[] = [];
      const whereParts: string[] = [];
      if (input.search?.trim()) {
        values.push(`%${input.search.trim().toLowerCase()}%`);
        whereParts.push(
          `(lower(action) like $${values.length} or lower(target_type) like $${values.length} or lower(target_id) like $${values.length} or lower(coalesce(reason, '')) like $${values.length})`
        );
      }

      const whereClause = whereParts.length > 0 ? `where ${whereParts.join(" and ")}` : "";
      const countResult = await client.query<{ total: string }>(
        `select count(*)::text as total from audit_logs ${whereClause}`,
        values
      );
      const totalItems = Number(countResult.rows[0]?.total ?? 0);
      const offset = (input.page - 1) * input.pageSize;
      values.push(input.pageSize, offset);

      const rows = await client.query<AuditRow>(
        `
          select audit_log_id, actor_user_id, action, target_type, target_id, result, reason, before_state, after_state, occurred_at
          from audit_logs
          ${whereClause}
          order by occurred_at desc, audit_log_id desc
          limit $${values.length - 1}
          offset $${values.length}
        `,
        values
      );

      return auditLogListResponseSchema.parse({
        items: rows.rows.map((row) => ({
          auditLogId: row.audit_log_id,
          actorUserId: row.actor_user_id,
          action: row.action,
          targetType: row.target_type,
          targetId: row.target_id,
          result: row.result,
          reason: row.reason,
          beforeState: row.before_state,
          afterState: row.after_state,
          occurredAt: row.occurred_at.toISOString()
        })),
        pageInfo: pageInfoSchema.parse({
          page: input.page,
          pageSize: input.pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / input.pageSize))
        })
      });
    });
  }
}
