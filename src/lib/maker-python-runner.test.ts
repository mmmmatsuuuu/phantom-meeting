import { describe, expect, it } from "vitest";
import { buildSandboxHtml } from "./maker-python-runner";

describe("buildSandboxHtml", () => {
  it("外部への通信を CSP で遮断する", () => {
    expect(buildSandboxHtml()).toContain("connect-src blob:");
    expect(buildSandboxHtml()).toContain("default-src 'none'");
  });

  it("Worker のソース内に script の閉じタグを含まない", () => {
    expect(buildSandboxHtml().match(/<\/script>/g)).toHaveLength(1);
  });
});
