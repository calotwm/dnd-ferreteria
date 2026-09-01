import { describe, expect, it } from "vitest";
import { authorize, readableModules } from "./rbac";

describe("RBAC matrix", () => {
  it("grants admin full access to every module", () => {
    expect(authorize("ADMIN", "inventory", "delete")).toBe(true);
    expect(authorize("ADMIN", "employees", "create")).toBe(true);
    expect(authorize("ADMIN", "settings", "update")).toBe(true);
  });

  it("denies seller inventory mutation (spec: employees/RBAC)", () => {
    expect(authorize("SELLER", "inventory", "read")).toBe(true);
    expect(authorize("SELLER", "inventory", "create")).toBe(false);
    expect(authorize("SELLER", "inventory", "update")).toBe(false);
    expect(authorize("SELLER", "inventory", "delete")).toBe(false);
  });

  it("denies seller expenses and stats", () => {
    expect(authorize("SELLER", "expenses", "read")).toBe(false);
    expect(authorize("SELLER", "stats", "read")).toBe(false);
  });

  it("allows seller POS and receipts", () => {
    expect(authorize("SELLER", "pos", "create")).toBe(true);
    expect(authorize("SELLER", "receipts", "read")).toBe(true);
  });

  it("gives manager read-only on employees and settings", () => {
    expect(authorize("MANAGER", "employees", "read")).toBe(true);
    expect(authorize("MANAGER", "employees", "create")).toBe(false);
    expect(authorize("MANAGER", "settings", "update")).toBe(false);
  });

  it("unknown role/action defaults to deny", () => {
    expect(authorize("SELLER", "inventory", "delete")).toBe(false);
  });

  it("readableModules respects role", () => {
    const modules = readableModules("SELLER");
    expect(modules).toContain("pos");
    expect(modules).not.toContain("stats");
    expect(modules).not.toContain("expenses");
  });
});
