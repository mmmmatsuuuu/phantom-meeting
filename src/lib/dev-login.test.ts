import { describe, expect, it } from "vitest";
import { isDevAccountEmail, isDevLoginEnabled, listDevAccounts } from "./dev-login";

describe("isDevLoginEnabled", () => {
  it("development かつローカルの Supabase なら有効", () => {
    expect(isDevLoginEnabled("development", "http://127.0.0.1:54321")).toBe(true);
    expect(isDevLoginEnabled("development", "http://localhost:54321")).toBe(true);
  });

  it("production では接続先によらず無効", () => {
    expect(isDevLoginEnabled("production", "http://127.0.0.1:54321")).toBe(false);
    expect(isDevLoginEnabled("production", "https://abc.supabase.co")).toBe(false);
  });

  it("development でも接続先がローカルでなければ無効", () => {
    expect(isDevLoginEnabled("development", "https://abc.supabase.co")).toBe(false);
    expect(isDevLoginEnabled("development", "https://127.0.0.1.example.com")).toBe(false);
  });

  it("環境変数が未設定・不正なら無効", () => {
    expect(isDevLoginEnabled("test", "http://127.0.0.1:54321")).toBe(false);
    expect(isDevLoginEnabled("development", "")).toBe(false);
    expect(isDevLoginEnabled("development", "not a url")).toBe(false);
  });
});

describe("isDevAccountEmail", () => {
  it("一覧のアカウントをすべて受け付ける", () => {
    const accounts = listDevAccounts();
    expect(accounts).toHaveLength(33);
    expect(accounts.every((a) => isDevAccountEmail(a.email))).toBe(true);
  });

  it("シード以外のメールアドレスを拒否する", () => {
    expect(isDevAccountEmail("teacher@example.com")).toBe(false);
    expect(isDevAccountEmail("seed-student1109@example.com")).toBe(false);
    expect(isDevAccountEmail("seed-teacher1@example.com.evil.test")).toBe(false);
  });
});
