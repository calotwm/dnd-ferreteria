/**
 * Role-based access control matrix. Single source of truth for the
 * admin/manager/seller roles across every module. Kept in shared code so the
 * API middleware and the UI can both answer "can this role do X?".
 */

export type Role = "ADMIN" | "MANAGER" | "SELLER";

export type Module =
  | "dashboard"
  | "pos"
  | "inventory"
  | "expenses"
  | "clients"
  | "suppliers"
  | "employees"
  | "stats"
  | "catalog"
  | "receipts"
  | "settings";

export type Action = "read" | "create" | "update" | "delete";

export const ROLES: Role[] = ["ADMIN", "MANAGER", "SELLER"];

export const MODULES: Module[] = [
  "dashboard",
  "pos",
  "inventory",
  "expenses",
  "clients",
  "suppliers",
  "employees",
  "stats",
  "catalog",
  "receipts",
  "settings",
];

export const ACTIONS: Action[] = ["read", "create", "update", "delete"];

const ALL: Record<Action, boolean> = { read: true, create: true, update: true, delete: true };
const READ_ONLY: Record<Action, boolean> = { read: true, create: false, update: false, delete: false };

/**
 * Permission matrix:
 * - ADMIN: full access to every module.
 * - MANAGER: full access except employee/settings administration.
 * - SELLER: POS + clients + catalog read; no inventory, expenses, suppliers,
 *   employees, stats, or settings.
 */
const MATRIX: Record<Role, Record<Module, Record<Action, boolean>>> = {
  ADMIN: {
    dashboard: ALL,
    pos: ALL,
    inventory: ALL,
    expenses: ALL,
    clients: ALL,
    suppliers: ALL,
    employees: ALL,
    stats: ALL,
    catalog: ALL,
    receipts: ALL,
    settings: ALL,
  },
  MANAGER: {
    dashboard: ALL,
    pos: ALL,
    inventory: ALL,
    expenses: ALL,
    clients: ALL,
    suppliers: ALL,
    employees: READ_ONLY,
    stats: ALL,
    catalog: ALL,
    receipts: ALL,
    settings: READ_ONLY,
  },
  SELLER: {
    dashboard: { read: true, create: false, update: false, delete: false },
    pos: ALL,
    inventory: { read: true, create: false, update: false, delete: false },
    expenses: { read: false, create: false, update: false, delete: false },
    clients: ALL,
    suppliers: { read: false, create: false, update: false, delete: false },
    employees: { read: false, create: false, update: false, delete: false },
    stats: { read: false, create: false, update: false, delete: false },
    catalog: { read: true, create: false, update: false, delete: false },
    receipts: ALL,
    settings: { read: false, create: false, update: false, delete: false },
  },
};

/** Answer whether a role may perform an action on a module. */
export function authorize(role: Role, module: Module, action: Action): boolean {
  return MATRIX[role]?.[module]?.[action] ?? false;
}

/** List modules a role can read (used to build the UI navigation). */
export function readableModules(role: Role): Module[] {
  return MODULES.filter((m) => authorize(role, m, "read"));
}
