export const ADMIN_ROLES = ["admin", "superadmin"];

export const isAdminRole = (role) => ADMIN_ROLES.includes(String(role || "").toLowerCase());
