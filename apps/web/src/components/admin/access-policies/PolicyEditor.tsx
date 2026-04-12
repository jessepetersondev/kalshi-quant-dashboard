import { useEffect, useState } from "react";

import type {
  AccessPolicyCreateRequest,
  AccessPolicyDetail,
  AccessPolicyRuleInput,
  ExportScopeGrantInput,
} from "@kalshi-quant-dashboard/contracts";
import { FormField } from "@kalshi-quant-dashboard/ui";

import { ExportScopeEditor } from "./ExportScopeEditor.js";
import { PolicyRuleEditor } from "./PolicyRuleEditor.js";

type DraftRule = AccessPolicyRuleInput;
type DraftGrant = ExportScopeGrantInput;
interface DraftState {
  readonly name: string;
  readonly subjectType: AccessPolicyCreateRequest["policy"]["subjectType"];
  readonly subjectKey: string;
  readonly precedence: number;
  readonly enabled: boolean;
  readonly rules: DraftRule[];
  readonly exportGrants: DraftGrant[];
}

function buildDraft(policy: AccessPolicyDetail | null): DraftState {
  return {
    name: policy?.name ?? "",
    subjectType: policy?.subjectType ?? ("user" as const),
    subjectKey: policy?.subjectKey ?? "",
    precedence: policy?.precedence ?? 50,
    enabled: policy?.enabled ?? true,
    rules:
      policy?.rules.map((rule) => ({
        ruleType: rule.ruleType,
        effect: rule.effect,
        strategyScope: rule.strategyScope,
        adminSurfaces: rule.adminSurfaces,
        enabled: rule.enabled,
        notes: rule.notes ?? null
      })) ?? [],
    exportGrants:
      policy?.exportGrants.map((grant) => ({
        resource: grant.resource,
        strategyScope: grant.strategyScope,
        columnProfile: grant.columnProfile,
        enabled: grant.enabled
      })) ?? []
  };
}

export function PolicyEditor(props: {
  readonly policy: AccessPolicyDetail | null;
  readonly onCreate: (body: AccessPolicyCreateRequest) => Promise<void>;
  readonly onUpdate: (body: {
    accessPolicyId: string;
    version: number;
    policy: AccessPolicyCreateRequest["policy"];
    rules: AccessPolicyRuleInput[];
    exportGrants: ExportScopeGrantInput[];
  }) => Promise<void>;
}) {
  const [draft, setDraft] = useState<DraftState>(() => buildDraft(props.policy));

  useEffect(() => {
    setDraft(buildDraft(props.policy));
  }, [props.policy]);

  async function save() {
    const payload = {
      policy: {
        subjectType: draft.subjectType,
        subjectKey: draft.subjectKey,
        name: draft.name,
        precedence: draft.precedence,
        enabled: draft.enabled
      },
      rules: draft.rules,
      exportGrants: draft.exportGrants
    };

    if (props.policy) {
      await props.onUpdate({
        accessPolicyId: props.policy.accessPolicyId,
        version: props.policy.version,
        ...payload
      });
      return;
    }

    await props.onCreate(payload);
  }

  return (
    <section className="admin-panel">
      <div className="detail-header">
        <h3>{props.policy ? "Edit policy" : "Create policy"}</h3>
        <button className="primary-button" onClick={() => void save()} type="button">
          Save
        </button>
      </div>
      <div className="admin-form-grid">
        <FormField htmlFor="policy-name" label="Name">
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            type="text"
          />
        </FormField>
        <FormField htmlFor="policy-subject-type" label="Subject type">
          <select
            value={draft.subjectType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                subjectType: event.target.value as AccessPolicyCreateRequest["policy"]["subjectType"]
              }))
            }
          >
            <option value="user">User</option>
            <option value="role">Role</option>
            <option value="global">Global</option>
          </select>
        </FormField>
        <FormField
          hint="Use the user email, resolved role, or * for global policies."
          htmlFor="policy-subject-key"
          label="Subject key"
        >
          <input
            value={draft.subjectKey}
            onChange={(event) =>
              setDraft((current) => ({ ...current, subjectKey: event.target.value }))
            }
            type="text"
          />
        </FormField>
        <FormField
          hint="Higher precedence wins when multiple policies affect the same user."
          htmlFor="policy-precedence"
          label="Precedence"
        >
          <input
            value={draft.precedence}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                precedence: Number(event.target.value || 0)
              }))
            }
            type="number"
          />
        </FormField>
      </div>
      <PolicyRuleEditor
        rules={draft.rules}
        onChange={(rules) => setDraft((current) => ({ ...current, rules: [...rules] }))}
      />
      <ExportScopeEditor
        grants={draft.exportGrants}
        onChange={(exportGrants) =>
          setDraft((current) => ({ ...current, exportGrants: [...exportGrants] }))
        }
      />
    </section>
  );
}
