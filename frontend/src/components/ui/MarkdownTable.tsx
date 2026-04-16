import type { ComponentPropsWithoutRef, ReactNode } from "react";

type MarkdownTableProps = ComponentPropsWithoutRef<"table"> & {
  children?: ReactNode;
  node?: unknown;
};

export function MarkdownTable({ children, node: _node, ...props }: MarkdownTableProps) {
  return (
    <div className="markdown-table-scroll">
      <table {...props}>{children}</table>
    </div>
  );
}
