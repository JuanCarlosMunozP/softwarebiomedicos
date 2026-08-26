import { describe, expect, it } from "vitest";
import { can, canAssignRole } from "./permissions";

describe("can", () => {
  it("returns false when role is undefined", () => {
    expect(can(undefined, "equipment", "view")).toBe(false);
  });

  it("superadmin can do everything listed for every resource", () => {
    expect(can("superadmin", "users", "delete")).toBe(true);
    expect(can("superadmin", "failures", "create")).toBe(true);
  });

  it("tecnico cannot delete equipment (no delete listed for that resource)", () => {
    expect(can("tecnico", "equipment", "delete")).toBe(false);
  });

  it("tecnico can view equipment", () => {
    expect(can("tecnico", "equipment", "view")).toBe(true);
  });

  it("returns false for a resource not present in the role's matrix entry", () => {
    // tecnico no tiene entrada "users" en absoluto en la matriz.
    expect(can("tecnico", "users", "view")).toBe(false);
  });

  it("coordinador can create/edit equipment but not delete it", () => {
    expect(can("coordinador", "equipment", "create")).toBe(true);
    expect(can("coordinador", "equipment", "edit")).toBe(true);
    expect(can("coordinador", "equipment", "delete")).toBe(false);
  });
});

describe("canAssignRole", () => {
  it("returns false when actorRole is undefined", () => {
    expect(canAssignRole(undefined, "tecnico")).toBe(false);
  });

  it("superadmin can assign any role, including admin and superadmin", () => {
    expect(canAssignRole("superadmin", "admin")).toBe(true);
    expect(canAssignRole("superadmin", "superadmin")).toBe(true);
  });

  it("admin can assign coordinador/ingeniero/tecnico", () => {
    expect(canAssignRole("admin", "coordinador")).toBe(true);
    expect(canAssignRole("admin", "tecnico")).toBe(true);
  });

  it("admin cannot assign admin or superadmin", () => {
    expect(canAssignRole("admin", "admin")).toBe(false);
    expect(canAssignRole("admin", "superadmin")).toBe(false);
  });

  it("roles below admin cannot assign anyone", () => {
    expect(canAssignRole("coordinador", "tecnico")).toBe(false);
    expect(canAssignRole("tecnico", "tecnico")).toBe(false);
  });
});
