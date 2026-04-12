export const roles = ["operator", "developer", "admin"] as const;

export type Role = (typeof roles)[number];

const roleRank: Record<Role, number> = {
  operator: 1,
  developer: 2,
  admin: 3
};

export function maxRole(left: Role, right: Role): Role {
  return roleRank[left] >= roleRank[right] ? left : right;
}

export function isRoleAtLeast(role: Role, minimum: Role): boolean {
  return roleRank[role] >= roleRank[minimum];
}
