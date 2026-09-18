import { describe, it, expect } from "vitest";
import {
  getParentId,
  getDepth,
  getAncestorIds,
  isHidden,
} from "./threadDepths";

function build(pairs) {
  const posts = {};

  function makePost(id, parentId) {
    return {
      id: () => String(id),
      mentionsPosts: () => (parentId == null ? [] : [posts[parentId]]),
    };
  }

  for (const [id, parent] of pairs) {
    posts[id] = makePost(id, parent);
  }

  return { posts, lookup: (id) => posts[String(id)] || null };
}

describe("getParentId", () => {
  it("reads the parent id from the first post mention", () => {
    const post = {
      id: () => "5",
      mentionsPosts: () => [{ id: () => "4" }, { id: () => "3" }],
    };
    expect(getParentId(post)).toBe("4");
  });

  it("returns null without mentions", () => {
    expect(getParentId({ id: () => "1", mentionsPosts: () => [] })).toBeNull();
    expect(getParentId({ id: () => "1" })).toBeNull();
  });
});

describe("getDepth", () => {
  it("returns 0 for a root post", () => {
    const { posts, lookup } = build([["1", null]]);
    expect(getDepth(posts["1"], 10, lookup)).toBe(0);
  });

  it("counts the ancestor chain", () => {
    const { posts, lookup } = build([
      ["1", null],
      ["2", "1"],
      ["3", "2"],
    ]);
    expect(getDepth(posts["3"], 10, lookup)).toBe(2);
  });

  it("caps the depth at maxDepth", () => {
    const { posts, lookup } = build([
      ["1", null],
      ["2", "1"],
      ["3", "2"],
    ]);
    expect(getDepth(posts["3"], 1, lookup)).toBe(1);
  });

  it("treats an unloaded parent as a root", () => {
    const orphan = {
      id: () => "9",
      mentionsPosts: () => [{ id: () => "404" }],
    };
    expect(getDepth(orphan, 10, () => null)).toBe(0);
  });

  it("terminates on a cyclic mention graph", () => {
    const a = { id: () => "1" };
    const b = { id: () => "2", mentionsPosts: () => [a] };
    a.mentionsPosts = () => [b];
    const lookup = (id) => (String(id) === "1" ? a : b);
    expect(getDepth(a, 100, lookup)).toBe(2);
  });
});

describe("getAncestorIds", () => {
  it("lists ancestor ids nearest first", () => {
    const { posts, lookup } = build([
      ["1", null],
      ["2", "1"],
      ["3", "2"],
    ]);
    expect(getAncestorIds(posts["3"], lookup)).toEqual(["2", "1"]);
  });
});

describe("isHidden", () => {
  it("is true when a collapsed ancestor exists", () => {
    const { posts, lookup } = build([
      ["1", null],
      ["2", "1"],
      ["3", "2"],
    ]);
    expect(isHidden(posts["3"], new Set(["2"]), lookup)).toBe(true);
  });

  it("is false for the collapsed post itself and unrelated posts", () => {
    const { posts, lookup } = build([
      ["1", null],
      ["2", "1"],
      ["3", "2"],
    ]);
    expect(isHidden(posts["1"], new Set(["2"]), lookup)).toBe(false);
    expect(isHidden(posts["2"], new Set(["2"]), lookup)).toBe(false);
  });
});
