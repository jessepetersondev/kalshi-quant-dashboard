# Access Control

Authorization is resolved as:

`role_binding + access_policy + export_scope_grant -> effective capability`

## Effective Capability Surface

- strategy scope
- detail level max
- raw payload visibility
- privileged audit visibility
- live subscription permissions
- allowed export resources
- admin management capabilities

This result is returned by the session contract and enforced by REST, SSE,
exports, and route gating.
