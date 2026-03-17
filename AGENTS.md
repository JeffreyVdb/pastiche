# Code Snippets

## MCP Usage

This project has the `jcodemunch` MCP server configured. **Always use it for code exploration and context gathering before reading or grepping files directly.**

- Use `jcodemunch` tools to search for symbols, understand structure, and gather context.
- Only fall back to direct file reads or Grep when `jcodemunch` cannot provide the needed information.
- Trigger `mcp__jcodemunch__index_folder` when files have changed.

### Useful jcodemunch tools

- `mcp__jcodemunch__get_repo_outline` — high-level overview of the repo structure
- `mcp__jcodemunch__get_file_outline` — outline of a specific file (functions, classes, etc.)
- `mcp__jcodemunch__get_file_tree` — directory/file tree
- `mcp__jcodemunch__search_symbols` — find symbols (functions, classes, types) by name
- `mcp__jcodemunch__find_references` — find all usages of a symbol
- `mcp__jcodemunch__find_importers` — find files that import a given module
- `mcp__jcodemunch__search_text` — full-text search across the codebase
- `mcp__jcodemunch__get_context_bundle` — gather context around a symbol or file
