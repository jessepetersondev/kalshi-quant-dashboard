# Admin Mutations

Admin mutation flows are contract-backed and auditable.

## Supported Mutations

- access policy create or update
- feature-flag update
- alert-rule update

## Required Mutation Outcomes

- accepted mutation with returned audit info
- denied mutation with `403`
- invalid mutation with `422`
- version conflict with `409`

Every accepted or rejected mutation writes an audit log entry.
