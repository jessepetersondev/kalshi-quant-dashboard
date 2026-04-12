import { effectiveCapabilitySchema } from "@kalshi-quant-dashboard/contracts";
import { EffectiveCapabilityRepo } from "@kalshi-quant-dashboard/db";

import { PolicyEvaluator } from "./policy-evaluator.js";

export class EffectiveCapabilityResolver {
  constructor(
    private readonly repo = new EffectiveCapabilityRepo(),
    private readonly evaluator = new PolicyEvaluator()
  ) {}

  async resolveByLogin(login: string) {
    const inputs = await this.repo.resolveInputsForLogin(login);
    if (!inputs) {
      return null;
    }

    return this.resolveFromInputs(inputs);
  }

  async resolveByUserId(userId: string) {
    const inputs = await this.repo.resolveInputsForUserId(userId);
    if (!inputs) {
      return null;
    }

    return this.resolveFromInputs(inputs);
  }

  private async resolveFromInputs(
    inputs: NonNullable<Awaited<ReturnType<EffectiveCapabilityRepo["resolveInputsForUserId"]>>>
  ) {
    const issuedAt = new Date().toISOString();
    const effectiveCapability = effectiveCapabilitySchema.parse(
      this.evaluator.resolve({
        roleBindings: inputs.roleBindings,
        policyRules: inputs.policyRules,
        exportGrants: inputs.exportGrants,
        policies: inputs.policies,
        resolvedAt: issuedAt
      })
    );

    await this.repo.saveSnapshot(inputs.principal.userId, effectiveCapability);

    return {
      principal: inputs.principal,
      effectiveCapability,
      issuedAt
    };
  }
}
