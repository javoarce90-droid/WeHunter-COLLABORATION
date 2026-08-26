import { describe, it, expect } from "vitest";
import { completenessBand } from "./completeness-badge";

describe("completenessBand", () => {
  it("clasifica baja por debajo de 40", () => {
    expect(completenessBand(0)).toBe("baja");
    expect(completenessBand(39)).toBe("baja");
  });

  it("clasifica media entre 40 y 69", () => {
    expect(completenessBand(40)).toBe("media");
    expect(completenessBand(69)).toBe("media");
  });

  it("clasifica alta desde 70", () => {
    expect(completenessBand(70)).toBe("alta");
    expect(completenessBand(100)).toBe("alta");
  });
});
