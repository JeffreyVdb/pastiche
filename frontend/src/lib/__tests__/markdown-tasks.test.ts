import { describe, it, expect } from "vitest";
import {
  parseMarkdownTasks,
  serializeMarkdownTasks,
  hasFreeformContent,
  countTasks,
  type TaskDocument,
} from "../markdown-tasks";

// ── Parse basics ─────────────────────────────────────────────────────────────

describe("parseMarkdownTasks", () => {
  it("parses empty string", () => {
    const doc = parseMarkdownTasks("");
    expect(doc.sections).toHaveLength(0);
    expect(doc.preamble).toHaveLength(0);
  });

  it("parses whitespace-only string", () => {
    const doc = parseMarkdownTasks("   \n  \n  ");
    expect(doc.sections).toHaveLength(0);
    expect(doc.preamble).toHaveLength(0);
  });

  it("parses a single section with tasks", () => {
    const md = `# Work tasks

- [ ] Deploy backend
- [x] Write tests
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].title).toBe("Work tasks");
    expect(doc.sections[0].level).toBe(1);
    expect(doc.sections[0].tasks).toHaveLength(2);
    expect(doc.sections[0].tasks[0].text).toBe("Deploy backend");
    expect(doc.sections[0].tasks[0].done).toBe(false);
    expect(doc.sections[0].tasks[1].text).toBe("Write tests");
    expect(doc.sections[0].tasks[1].done).toBe(true);
  });

  it("parses multiple sections", () => {
    const md = `# Personal

- [ ] clean

# Work

- [ ] deploy
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].title).toBe("Personal");
    expect(doc.sections[1].title).toBe("Work");
  });

  it("parses nested tasks", () => {
    const md = `# Tasks

- [ ] parent
  - [ ] child 1
  - [ ] child 2
    - [x] grandchild
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections[0].tasks).toHaveLength(1);
    const parent = doc.sections[0].tasks[0];
    expect(parent.text).toBe("parent");
    expect(parent.children).toHaveLength(2);
    expect(parent.children[0].text).toBe("child 1");
    expect(parent.children[1].text).toBe("child 2");
    expect(parent.children[1].children).toHaveLength(1);
    expect(parent.children[1].children[0].text).toBe("grandchild");
    expect(parent.children[1].children[0].done).toBe(true);
  });

  it("handles tasks before first section (preamble)", () => {
    const md = `- [ ] orphan task
- [x] another

# Section

- [ ] normal task
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.preamble).toHaveLength(2);
    expect(doc.preamble[0].text).toBe("orphan task");
    expect(doc.sections).toHaveLength(1);
  });

  it("handles empty sections", () => {
    const md = `# Empty section

# Section with tasks

- [ ] task
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].title).toBe("Empty section");
    expect(doc.sections[0].tasks).toHaveLength(0);
    expect(doc.sections[1].tasks).toHaveLength(1);
  });

  it("handles H2+ section levels", () => {
    const md = `## Level 2

- [ ] task

### Level 3

- [ ] another
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections[0].level).toBe(2);
    expect(doc.sections[1].level).toBe(3);
  });

  it("handles [X] (uppercase) as done", () => {
    const md = `# Tasks

- [X] done task
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections[0].tasks[0].done).toBe(true);
  });
});

// ── Bullet normalization ─────────────────────────────────────────────────────

describe("bullet normalization", () => {
  it("treats bare bullets without checkboxes as unchecked tasks", () => {
    const md = `# Tasks

- item one
* item two
+ item three
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections[0].tasks).toHaveLength(3);
    for (const task of doc.sections[0].tasks) {
      expect(task.done).toBe(false);
    }
  });

  it("handles mixed checkbox and bare bullet markers", () => {
    const md = `# Tasks

- [ ] checkbox task
* bare star
+ bare plus
- [x] done task
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections[0].tasks).toHaveLength(4);
    expect(doc.sections[0].tasks[0].done).toBe(false);
    expect(doc.sections[0].tasks[1].done).toBe(false);
    expect(doc.sections[0].tasks[1].text).toBe("bare star");
    expect(doc.sections[0].tasks[3].done).toBe(true);
  });
});

// ── Freeform content ─────────────────────────────────────────────────────────

describe("freeform content", () => {
  it("detects freeform content in sections", () => {
    const md = `# Tasks

Some paragraph text here.

- [ ] task
`;
    const doc = parseMarkdownTasks(md);
    expect(hasFreeformContent(doc)).toBe(true);
    expect(doc.sections[0].freeform).toHaveLength(1);
    expect(doc.sections[0].freeform[0].lines).toContain("Some paragraph text here.");
  });

  it("detects freeform content in preamble", () => {
    const md = `Hello world

# Tasks

- [ ] task
`;
    const doc = parseMarkdownTasks(md);
    expect(hasFreeformContent(doc)).toBe(true);
    expect(doc.preambleFreeform).toHaveLength(1);
  });

  it("returns false for hasFreeformContent when none exists", () => {
    const md = `# Tasks

- [ ] task one
- [ ] task two
`;
    const doc = parseMarkdownTasks(md);
    expect(hasFreeformContent(doc)).toBe(false);
  });
});

// ── Serializer ───────────────────────────────────────────────────────────────

describe("serializeMarkdownTasks", () => {
  it("serializes a simple document", () => {
    const md = `# Personal

- [ ] clean
- [x] cook

# Work

- [ ] deploy
`;
    const doc = parseMarkdownTasks(md);
    const output = serializeMarkdownTasks(doc);
    expect(output).toBe(`# Personal

- [ ] clean
- [x] cook

# Work

- [ ] deploy
`);
  });

  it("serializes nested tasks with correct indentation", () => {
    const md = `# Tasks

- [ ] parent
  - [ ] child
    - [x] grandchild
`;
    const doc = parseMarkdownTasks(md);
    const output = serializeMarkdownTasks(doc);
    expect(output).toBe(`# Tasks

- [ ] parent
  - [ ] child
    - [x] grandchild
`);
  });

  it("ends with a trailing newline", () => {
    const doc = parseMarkdownTasks("# Tasks\n\n- [ ] item\n");
    const output = serializeMarkdownTasks(doc);
    expect(output.endsWith("\n")).toBe(true);
    expect(output.endsWith("\n\n")).toBe(false);
  });

  it("adds blank lines around section headers", () => {
    const output = serializeMarkdownTasks(
      parseMarkdownTasks("# A\n\n- [ ] one\n\n# B\n\n- [ ] two\n"),
    );
    const lines = output.split("\n");
    // Before "# B" there should be a blank line
    const bIdx = lines.indexOf("# B");
    expect(bIdx).toBeGreaterThan(0);
    expect(lines[bIdx - 1]).toBe("");
    // After "# B" there should be a blank line
    expect(lines[bIdx + 1]).toBe("");
  });

  it("serializes preamble tasks", () => {
    const md = `- [ ] orphan

# Section

- [ ] task
`;
    const doc = parseMarkdownTasks(md);
    const output = serializeMarkdownTasks(doc);
    expect(output).toContain("- [ ] orphan");
    expect(output).toContain("# Section");
  });
});

// ── Round-trip stability ─────────────────────────────────────────────────────

describe("round-trip", () => {
  const canonicalDocs = [
    `# Personal tasks

- [ ] clean the bedroom
  - [ ] vacuum
  - [ ] dust surfaces
- [ ] take out the garbage

# Work tasks

- [ ] Deploy new backend service
`,
    `# Tasks

- [x] done thing
- [ ] todo thing
  - [ ] subtask a
  - [x] subtask b
`,
    `# Empty section

# Another

- [ ] item
`,
  ];

  for (const md of canonicalDocs) {
    it(`stable round-trip for: ${md.split("\n")[0]}`, () => {
      const doc = parseMarkdownTasks(md);
      const out1 = serializeMarkdownTasks(doc);
      const doc2 = parseMarkdownTasks(out1);
      const out2 = serializeMarkdownTasks(doc2);
      expect(out1).toBe(out2);
    });
  }

  it("normalizes mixed bullets to canonical form", () => {
    const md = `# Tasks

* item one
+ item two
- item three
`;
    const doc = parseMarkdownTasks(md);
    const output = serializeMarkdownTasks(doc);
    // All should become `- [ ]`
    expect(output).toContain("- [ ] item one");
    expect(output).toContain("- [ ] item two");
    expect(output).toContain("- [ ] item three");
    expect(output).not.toContain("*");
    expect(output).not.toContain("+");
  });

  it("preserves freeform content through round-trip", () => {
    const md = `Some preamble text

# Tasks

- [ ] task one

A paragraph inside the section.
`;
    const doc = parseMarkdownTasks(md);
    expect(hasFreeformContent(doc)).toBe(true);
    const output = serializeMarkdownTasks(doc);
    expect(output).toContain("Some preamble text");
    expect(output).toContain("A paragraph inside the section.");
  });
});

// ── countTasks ───────────────────────────────────────────────────────────────

describe("countTasks", () => {
  it("counts all tasks including nested", () => {
    const md = `# Tasks

- [ ] one
  - [x] two
  - [ ] three
- [x] four
`;
    const doc = parseMarkdownTasks(md);
    const { total, done } = countTasks(doc);
    expect(total).toBe(4);
    expect(done).toBe(2);
  });

  it("counts preamble tasks", () => {
    const md = `- [x] pre1
- [ ] pre2
`;
    const doc = parseMarkdownTasks(md);
    const { total, done } = countTasks(doc);
    expect(total).toBe(2);
    expect(done).toBe(1);
  });

  it("returns zero for empty document", () => {
    const doc = parseMarkdownTasks("");
    const { total, done } = countTasks(doc);
    expect(total).toBe(0);
    expect(done).toBe(0);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles header with no following content at end of file", () => {
    const md = `# Tasks

- [ ] item

# Empty at end
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[1].title).toBe("Empty at end");
    expect(doc.sections[1].tasks).toHaveLength(0);
  });

  it("handles deeply nested tasks", () => {
    const md = `# Tasks

- [ ] level 0
  - [ ] level 1
    - [ ] level 2
      - [ ] level 3
        - [ ] level 4
`;
    const doc = parseMarkdownTasks(md);
    let current = doc.sections[0].tasks[0];
    for (let i = 1; i <= 4; i++) {
      expect(current.children).toHaveLength(1);
      current = current.children[0];
      expect(current.text).toBe(`level ${i}`);
    }
  });

  it("handles tasks with empty text", () => {
    const md = `# Tasks

- [ ]
- [ ] has text
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections[0].tasks).toHaveLength(2);
    expect(doc.sections[0].tasks[0].text).toBe("");
    expect(doc.sections[0].tasks[1].text).toBe("has text");
  });

  it("handles section titles with special characters", () => {
    const md = `# Tasks & things (important!)

- [ ] item
`;
    const doc = parseMarkdownTasks(md);
    expect(doc.sections[0].title).toBe("Tasks & things (important!)");
    const output = serializeMarkdownTasks(doc);
    expect(output).toContain("# Tasks & things (important!)");
  });
});
