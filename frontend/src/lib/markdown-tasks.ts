// ── Types ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  text: string;
  done: boolean;
  children: Task[];
}

export interface FreeformBlock {
  kind: "freeform";
  lines: string[];
}

export interface Section {
  title: string;
  level: number;
  tasks: Task[];
  freeform: FreeformBlock[];
}

export interface TaskDocument {
  preamble: Task[];
  preambleFreeform: FreeformBlock[];
  sections: Section[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0;

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${_idCounter++}`;
}

export function createTask(text = "", done = false): Task {
  return { id: newId(), text, done, children: [] };
}

export function createSection(title = "New section", level = 1): Section {
  return { title, level, tasks: [], freeform: [] };
}

// ── Parser ───────────────────────────────────────────────────────────────────

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const TASK_RE = /^(\s*)([-*+•])\s+\[([ xX])\]\s?(.*)$/;
const BULLET_RE = /^(\s*)([-*+•])\s+(.*)$/;

interface ParsedTaskLine {
  indent: number;
  done: boolean;
  text: string;
}

function parseIndent(raw: string): number {
  let count = 0;
  for (const ch of raw) {
    if (ch === " ") count += 1;
    else if (ch === "\t") count += 2;
    else break;
  }
  return Math.floor(count / 2);
}

function buildTaskTree(flat: ParsedTaskLine[]): Task[] {
  const root: Task[] = [];
  const stack: { depth: number; task: Task }[] = [];

  for (const line of flat) {
    const task = createTask(line.text, line.done);
    const depth = line.indent;

    // Pop stack until we find a valid parent
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(task);
    } else {
      stack[stack.length - 1].task.children.push(task);
    }

    stack.push({ depth, task });
  }

  return root;
}

export function parseMarkdownTasks(md: string): TaskDocument {
  const doc: TaskDocument = {
    preamble: [],
    preambleFreeform: [],
    sections: [],
  };

  if (!md || !md.trim()) {
    return doc;
  }

  const lines = md.split("\n");

  // Remove single trailing empty line (artifact of trailing newline)
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  let currentSection: Section | null = null;
  let pendingTasks: ParsedTaskLine[] = [];
  let pendingFreeform: string[] = [];

  function flushTasks() {
    if (pendingTasks.length === 0) return;
    const tasks = buildTaskTree(pendingTasks);
    if (currentSection) {
      currentSection.tasks.push(...tasks);
    } else {
      doc.preamble.push(...tasks);
    }
    pendingTasks = [];
  }

  function flushFreeform() {
    if (pendingFreeform.length === 0) return;
    const block: FreeformBlock = { kind: "freeform", lines: [...pendingFreeform] };
    if (currentSection) {
      currentSection.freeform.push(block);
    } else {
      doc.preambleFreeform.push(block);
    }
    pendingFreeform = [];
  }

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      flushTasks();
      flushFreeform();

      currentSection = createSection(headingMatch[2].trim(), headingMatch[1].length);
      doc.sections.push(currentSection);
      continue;
    }

    // Check for task item (checkbox)
    const taskMatch = line.match(TASK_RE);
    if (taskMatch) {
      flushFreeform();
      const indent = parseIndent(taskMatch[1]);
      const done = taskMatch[3] !== " ";
      const text = taskMatch[4];
      pendingTasks.push({ indent, done, text });
      continue;
    }

    // Check for bare bullet (no checkbox) → treat as unchecked task
    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      flushFreeform();
      const indent = parseIndent(bulletMatch[1]);
      const text = bulletMatch[3];
      pendingTasks.push({ indent, done: false, text });
      continue;
    }

    // Blank lines between tasks are ignored (formatting only)
    if (line.trim() === "" && pendingTasks.length > 0) {
      continue;
    }

    // Blank line in non-task context → skip (formatting)
    if (line.trim() === "") {
      continue;
    }

    // Everything else is freeform content
    flushTasks();
    pendingFreeform.push(line);
  }

  flushTasks();
  flushFreeform();

  return doc;
}

// ── Serializer ───────────────────────────────────────────────────────────────

function serializeTask(task: Task, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const check = task.done ? "[x]" : "[ ]";
  const lines: string[] = [`${indent}- ${check} ${task.text}`];
  for (const child of task.children) {
    lines.push(...serializeTask(child, depth + 1));
  }
  return lines;
}

function serializeTasks(tasks: Task[]): string[] {
  const lines: string[] = [];
  for (const task of tasks) {
    lines.push(...serializeTask(task, 0));
  }
  return lines;
}

export function serializeMarkdownTasks(doc: TaskDocument): string {
  const parts: string[] = [];

  // Preamble freeform
  for (const block of doc.preambleFreeform) {
    parts.push(...block.lines);
  }

  // Preamble tasks
  if (doc.preamble.length > 0) {
    if (parts.length > 0) parts.push("");
    parts.push(...serializeTasks(doc.preamble));
  }

  // Sections
  for (let i = 0; i < doc.sections.length; i++) {
    const section = doc.sections[i];
    const hashes = "#".repeat(section.level);

    // Blank line before section header (unless it's the very first output)
    if (parts.length > 0) {
      parts.push("");
    }

    parts.push(`${hashes} ${section.title}`);
    parts.push(""); // blank line after header

    // Section tasks
    if (section.tasks.length > 0) {
      parts.push(...serializeTasks(section.tasks));
    }

    // Section freeform
    for (const block of section.freeform) {
      if (parts.length > 0 && parts[parts.length - 1] !== "") {
        parts.push("");
      }
      parts.push(...block.lines);
    }
  }

  // Ensure trailing newline
  return parts.join("\n") + "\n";
}

// ── Utilities ────────────────────────────────────────────────────────────────

export function hasFreeformContent(doc: TaskDocument): boolean {
  if (doc.preambleFreeform.length > 0) return true;
  return doc.sections.some((s) => s.freeform.length > 0);
}

/** Deep-clone a task document (for immutable updates). */
export function cloneDocument(doc: TaskDocument): TaskDocument {
  return JSON.parse(JSON.stringify(doc));
}

/** Count all tasks (including nested) in a document. */
export function countTasks(doc: TaskDocument): { total: number; done: number } {
  let total = 0;
  let done = 0;

  function walk(tasks: Task[]) {
    for (const t of tasks) {
      total++;
      if (t.done) done++;
      walk(t.children);
    }
  }

  walk(doc.preamble);
  for (const section of doc.sections) {
    walk(section.tasks);
  }

  return { total, done };
}
