import type {
  AccessPolicyCreateRequest,
  AccessPolicyDetailResponse,
  AccessPolicyListQuery,
  AccessPolicyListResponse,
  AccessPolicyMutationResponse,
  AccessPolicyUpdateRequest,
  AlertRuleListResponse,
  AlertRuleMutationResponse,
  AlertRuleUpdateRequest,
  AuditLogListQuery,
  AuditLogListResponse,
  FeatureFlagListResponse,
  FeatureFlagMutation,
  FeatureFlagMutationResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAccessPolicies: build.query<AccessPolicyListResponse, AccessPolicyListQuery>({
      query: (params) => ({ url: "/admin/access-policies", params }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((policy) => ({
                type: "AccessPolicy" as const,
                id: policy.accessPolicyId
              })),
              "AccessPolicy"
            ]
          : ["AccessPolicy"]
    }),
    getAccessPolicyDetail: build.query<AccessPolicyDetailResponse, string>({
      query: (accessPolicyId) => `/admin/access-policies/${encodeURIComponent(accessPolicyId)}`,
      providesTags: (_result, _error, accessPolicyId) => [
        { type: "AccessPolicy", id: accessPolicyId }
      ]
    }),
    createAccessPolicy: build.mutation<AccessPolicyMutationResponse, AccessPolicyCreateRequest>({
      query: (body) => ({
        url: "/admin/access-policies",
        method: "POST",
        body
      }),
      invalidatesTags: ["AccessPolicy", "AuditLog"]
    }),
    updateAccessPolicy: build.mutation<
      AccessPolicyMutationResponse,
      { accessPolicyId: string; body: AccessPolicyUpdateRequest }
    >({
      query: ({ accessPolicyId, body }) => ({
        url: `/admin/access-policies/${encodeURIComponent(accessPolicyId)}`,
        method: "PATCH",
        body
      }),
      invalidatesTags: (_result, _error, args) => [
        { type: "AccessPolicy", id: args.accessPolicyId },
        "AccessPolicy",
        "AuditLog"
      ]
    }),
    getFeatureFlags: build.query<FeatureFlagListResponse, void>({
      query: () => "/admin/feature-flags",
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((flag) => ({
                type: "FeatureFlag" as const,
                id: flag.featureFlagKey
              })),
              "FeatureFlag"
            ]
          : ["FeatureFlag"]
    }),
    updateFeatureFlag: build.mutation<
      FeatureFlagMutationResponse,
      { featureFlagKey: string; body: FeatureFlagMutation }
    >({
      query: ({ featureFlagKey, body }) => ({
        url: `/admin/feature-flags/${encodeURIComponent(featureFlagKey)}`,
        method: "PATCH",
        body
      }),
      invalidatesTags: (_result, _error, args) => [
        { type: "FeatureFlag", id: args.featureFlagKey },
        "FeatureFlag",
        "AuditLog"
      ]
    }),
    getAlertRules: build.query<AlertRuleListResponse, void>({
      query: () => "/admin/alert-rules",
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((rule) => ({
                type: "AlertRule" as const,
                id: rule.alertRuleId
              })),
              "AlertRule"
            ]
          : ["AlertRule"]
    }),
    updateAlertRule: build.mutation<
      AlertRuleMutationResponse,
      { alertRuleId: string; body: AlertRuleUpdateRequest }
    >({
      query: ({ alertRuleId, body }) => ({
        url: `/admin/alert-rules/${encodeURIComponent(alertRuleId)}`,
        method: "PATCH",
        body
      }),
      invalidatesTags: (_result, _error, args) => [
        { type: "AlertRule", id: args.alertRuleId },
        "AlertRule",
        "AuditLog"
      ]
    }),
    getAuditLogs: build.query<AuditLogListResponse, AuditLogListQuery>({
      query: (params) => ({ url: "/admin/audit-logs", params }),
      providesTags: ["AuditLog"]
    })
  })
});

export const {
  useGetAccessPoliciesQuery,
  useGetAccessPolicyDetailQuery,
  useCreateAccessPolicyMutation,
  useUpdateAccessPolicyMutation,
  useGetFeatureFlagsQuery,
  useUpdateFeatureFlagMutation,
  useGetAlertRulesQuery,
  useUpdateAlertRuleMutation,
  useGetAuditLogsQuery
} = adminApi;
