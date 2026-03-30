import { useState, useEffect, useRef, useCallback } from "react";
import {
  parseMarkdownTasks,
  serializeMarkdownTasks,
  hasFreeformContent,
  cloneDocument,
  createTask,
  createSection,
  type TaskDocument,
  type Task,
  type Section,
} from "@/lib/markdown-tasks";
import { CodeEditor } from "./CodeEditor";

// ── Props ────────────────────────────────────────────────────────────────────

interface TaskEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  allowCodeMode?: boolean;
}

// ── Main component ───────────────────────────────────────────────────────────

export function TaskEditor({
  value,
  onChange,
  readOnly = false,
  allowCodeMode = true,
}: TaskEditorProps) {
  const [doc, setDoc] = useState<TaskDocument>(() => parseMarkdownTasks(value));
  const [codeMode, setCodeMode] = useState(false);
  const suppressSync = useRef(false);

  // Sync from external value changes (e.g. initial load)
  useEffect(() => {
    if (suppressSync.current) {
      suppressSync.current = false;
      return;
    }
    setDoc(parseMarkdownTasks(value));
  }, [value]);

  const commit = useCallback(
    (next: TaskDocument) => {
      setDoc(next);
      suppressSync.current = true;
      onChange(serializeMarkdownTasks(next));
    },
    [onChange],
  );

  const freeform = hasFreeformContent(doc);

  if (codeMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setDoc(parseMarkdownTasks(value));
              setCodeMode(false);
            }}
            style={pillBtnStyle}
          >
            ← task editor
          </button>
        </div>
        <CodeEditor value={value} onChange={onChange} language="markdown" />
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        background: "var(--color-surface)",
        minHeight: "300px",
        overflow: "hidden",
      }}
    >
      {/* Freeform warning */}
      {freeform && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(234,179,8,0.08)",
            borderBottom: "1px solid rgba(234,179,8,0.25)",
            color: "rgb(202,138,4)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span>This document contains content the task editor cannot display.</span>
          {allowCodeMode ? (
            <button type="button" onClick={() => setCodeMode(true)} style={pillBtnStyle}>
              edit as code
            </button>
          ) : (
            <span style={{ fontSize: "11px", opacity: 0.8 }}>switch to source view</span>
          )}
        </div>
      )}

      {/* Toolbar */}
      {(!readOnly || allowCodeMode) && (
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  const next = cloneDocument(doc);
                  next.sections.push(createSection());
                  commit(next);
                }}
                style={pillBtnStyle}
              >
                + add section
              </button>
            )}
          </div>
          {allowCodeMode && (
            <button type="button" onClick={() => setCodeMode(true)} style={mutedPillStyle}>
              code editor
            </button>
          )}
        </div>
      )}

      {/* Preamble tasks */}
      {doc.preamble.length > 0 && (
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
          <TaskList
            tasks={doc.preamble}
            readOnly={readOnly}
            onUpdate={(tasks) => {
              const next = cloneDocument(doc);
              next.preamble = tasks;
              commit(next);
            }}
          />
        </div>
      )}

      {/* Sections */}
      {doc.sections.map((section, si) => (
        <SectionBlock
          key={si}
          section={section}
          readOnly={readOnly}
          onUpdate={(updated) => {
            const next = cloneDocument(doc);
            next.sections[si] = updated;
            commit(next);
          }}
          onDelete={() => {
            const next = cloneDocument(doc);
            next.sections.splice(si, 1);
            commit(next);
          }}
        />
      ))}

      {/* Empty state */}
      {doc.sections.length === 0 && doc.preamble.length === 0 && !freeform && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          {readOnly
            ? "No tasks yet."
            : allowCodeMode
              ? 'No sections yet. Click "+ add section" to get started.'
              : 'No tasks yet. Add a section here, or switch to source view to edit the raw markdown.'}
        </div>
      )}
    </div>
  );
}

// ── Section block ────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  readOnly,
  onUpdate,
  onDelete,
}: {
  section: Section;
  readOnly: boolean;
  onUpdate: (s: Section) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div style={{ borderBottom: "1px solid var(--color-border)" }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 14px 8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--color-text-muted)",
            opacity: 0.5,
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          {"#".repeat(section.level)}
        </span>
        <input
          type="text"
          value={section.title}
          readOnly={readOnly}
          onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-sans)",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-text)",
            padding: "2px 0",
            letterSpacing: "-0.02em",
          }}
          placeholder="Section title"
        />
        {!readOnly && (
          <div style={{ position: "relative", flexShrink: 0 }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              style={iconBtnStyle}
              title="Section options"
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "4px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 10,
                  minWidth: "140px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  style={menuItemStyle}
                >
                  Delete section
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div style={{ padding: "0 14px 8px" }}>
        <TaskList
          tasks={section.tasks}
          readOnly={readOnly}
          onUpdate={(tasks) => onUpdate({ ...section, tasks })}
        />

        {/* Add task button */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              const updated = { ...section, tasks: [...section.tasks, createTask()] };
              onUpdate(updated);
            }}
            style={{
              ...pillBtnStyle,
              marginTop: "6px",
              fontSize: "12px",
              opacity: 0.6,
            }}
          >
            + add task
          </button>
        )}
      </div>
    </div>
  );
}

// ── Task list (recursive) ────────────────────────────────────────────────────

function TaskList({
  tasks,
  onUpdate,
  depth = 0,
  readOnly = false,
}: {
  tasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  depth?: number;
  readOnly?: boolean;
}) {
  return (
    <div>
      {tasks.map((task, ti) => (
        <TaskRow
          key={task.id}
          task={task}
          depth={depth}
          readOnly={readOnly}
          onUpdate={(updated) => {
            const next = [...tasks];
            next[ti] = updated;
            onUpdate(next);
          }}
          onDelete={() => {
            const next = [...tasks];
            next.splice(ti, 1);
            onUpdate(next);
          }}
          onAddSibling={() => {
            const next = [...tasks];
            next.splice(ti + 1, 0, createTask());
            onUpdate(next);
          }}
          onAddChild={() => {
            const updated = { ...task, children: [...task.children, createTask()] };
            const next = [...tasks];
            next[ti] = updated;
            onUpdate(next);
          }}
          onIndent={
            ti > 0
              ? () => {
                  // Move this task to be a child of the previous sibling
                  const next = [...tasks];
                  const [removed] = next.splice(ti, 1);
                  const prevSibling = { ...next[ti - 1] };
                  prevSibling.children = [...prevSibling.children, removed];
                  next[ti - 1] = prevSibling;
                  onUpdate(next);
                }
              : undefined
          }
          onOutdent={undefined} // Outdent is handled by parent TaskRow
          focusRef={undefined}
          onFocusPrev={() => {
            // Focus previous task input - handled via DOM
            // Look for the previous task-input in the DOM
          }}
        />
      ))}
    </div>
  );
}

// ── Single task row ──────────────────────────────────────────────────────────

function TaskRow({
  task,
  depth,
  readOnly,
  onUpdate,
  onDelete,
  onAddSibling,
  onAddChild,
  onIndent,
}: {
  task: Task;
  depth: number;
  readOnly: boolean;
  onUpdate: (t: Task) => void;
  onDelete: () => void;
  onAddSibling: () => void;
  onAddChild: () => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  focusRef?: React.RefObject<HTMLInputElement | null>;
  onFocusPrev?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Auto-focus newly created tasks (empty text)
  useEffect(() => {
    if (task.text === "" && inputRef.current) {
      inputRef.current.focus();
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onAddSibling();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (onIndent) onIndent();
    } else if (e.key === "Backspace" && task.text === "") {
      e.preventDefault();
      // Focus the previous input before deleting
      const inputs = document.querySelectorAll<HTMLInputElement>("[data-task-input]");
      const idx = Array.from(inputs).indexOf(e.currentTarget);
      if (idx > 0) {
        inputs[idx - 1].focus();
      }
      onDelete();
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingLeft: `${depth * 24}px`,
          minHeight: "34px",
        }}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.done}
          disabled={readOnly}
          onChange={(e) => onUpdate({ ...task, done: e.target.checked })}
          style={{
            width: "16px",
            height: "16px",
            accentColor: "var(--color-accent)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />

        {/* Task text */}
        <input
          ref={inputRef}
          data-task-input
          type="text"
          value={task.text}
          readOnly={readOnly}
          onChange={(e) => onUpdate({ ...task, text: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="Task description"
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            color: task.done ? "var(--color-text-muted)" : "var(--color-text)",
            textDecoration: task.done ? "line-through" : "none",
            padding: "4px 0",
            opacity: task.done ? 0.6 : 1,
          }}
        />

        {/* Action buttons */}
        {!readOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onAddSibling}
              style={iconBtnStyle}
              title="Add task below"
            >
              +
            </button>
            {depth < 3 && (
              <button
                type="button"
                onClick={onAddChild}
                style={iconBtnStyle}
                title="Add subtask"
              >
                ▾
              </button>
            )}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                style={iconBtnStyle}
                title="Task options"
              >
                ⋯
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: "4px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 10,
                    minWidth: "140px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    style={menuItemStyle}
                  >
                    Delete task
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {task.children.length > 0 && (
        <TaskList
          tasks={task.children}
          onUpdate={(children) => onUpdate({ ...task, children })}
          depth={depth + 1}
        />
      )}
    </>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const pillBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 12px",
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  cursor: "pointer",
  letterSpacing: "0.02em",
  transition: "color 0.15s, border-color 0.15s",
  whiteSpace: "nowrap",
};

const mutedPillStyle: React.CSSProperties = {
  ...pillBtnStyle,
  opacity: 0.5,
  fontSize: "11px",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "26px",
  height: "26px",
  background: "none",
  border: "1px solid transparent",
  borderRadius: "6px",
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: "14px",
  cursor: "pointer",
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
  opacity: 0.5,
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 14px",
  background: "none",
  border: "none",
  textAlign: "left",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  letterSpacing: "0.02em",
  transition: "background 0.15s, color 0.15s",
};
