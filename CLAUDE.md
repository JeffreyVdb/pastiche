# Pastiche

Use TokToken first for code exploration, especially when finding files, symbols, functions, classes, callers, references, and dependency relationships.
Use TokToken as the default tool for codebase exploration.

Preferred exploration flow:
- Run `mcp__toktoken__codebase_detect` at the start of a session.
- If needed, run `mcp__toktoken__index_create` before searching.
- After code edits, run `mcp__toktoken__index_update` or `mcp__toktoken__index_file`.
- Prefer TokToken tools over manual file scanning when exploring code.
- Usually start with `mcp__toktoken__search_symbols` or `mcp__toktoken__search_text`, then inspect with `mcp__toktoken__inspect_symbol`, `mcp__toktoken__inspect_outline`, `mcp__toktoken__inspect_bundle`, or `mcp__toktoken__inspect_file`.
Mandatory workflow:
- At session start, run `mcp__toktoken__codebase_detect`.
- If the codebase is not indexed, run `mcp__toktoken__index_create` before exploring.
- After any code edits, run `mcp__toktoken__index_update` or `mcp__toktoken__index_file` before more TokToken queries.
- For finding functions, classes, methods, symbols, references, callers, importers, dependencies, or likely impact, use TokToken first.
- Do not default to raw `Read`, `Search`, or broad file scanning when a TokToken tool can answer the question.
- Use raw file reads only when TokToken is insufficient, when exact non-indexed file contents are needed, or when working with files outside TokToken coverage.

Preferred query order:
- Start with `mcp__toktoken__search_symbols` for named code entities.
- Use `mcp__toktoken__search_text` for strings, config keys, comments, or unknown text patterns.
- Use `mcp__toktoken__inspect_symbol`, `mcp__toktoken__inspect_outline`, and `mcp__toktoken__inspect_bundle` before reading whole files manually.
- Use `mcp__toktoken__find_references`, `mcp__toktoken__find_callers`, `mcp__toktoken__find_importers`, `mcp__toktoken__inspect_dependencies`, `mcp__toktoken__inspect_hierarchy`, and `mcp__toktoken__inspect_blast_radius` for relationship analysis instead of reconstructing relationships by hand.

TokToken MCP tools:
- `mcp__toktoken__codebase_detect`: Detect whether a directory is an indexable codebase and what action to take next.
- `mcp__toktoken__cache_clear`: Clear one project index or all indexes.

Notes:
- `search_symbols` is the default tool for locating functions, classes, and methods.
- `search_symbols` is the default tool for locating functions, classes, methods, and symbol IDs.
- `inspect_symbol` and `inspect_bundle` are preferred over reading full files when targeted symbol retrieval is enough.
- `search_text` is the fallback when the target is a string, config key, comment, or unknown text pattern.
- If TokToken returns insufficient results, then use raw `Read` or `Search`, but mention that TokToken was attempted first.
- TokToken indexing may exclude some non-code file types by default; if expected files are missing, rebuild/update the index with the tool's full-index option if available.
