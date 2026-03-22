# Pastiche

Use TokToken as the default tool for code exploration.

All agents, including spawned explorer agents, should use TokToken first when locating files, functions, classes, symbols, references, callers, importers, and dependencies.

Before using raw `Read` or `Search`, attempt:
1. `mcp__toktoken__codebase_detect`
2. `mcp__toktoken__index_create` or `mcp__toktoken__index_update` if needed
3. `mcp__toktoken__search_symbols` or `mcp__toktoken__search_text`
4. `mcp__toktoken__inspect_symbol`, `mcp__toktoken__inspect_bundle`, or `mcp__toktoken__inspect_outline`

Use raw `Read` or `Search` only when:
- TokToken does not return enough information
- exact file contents are needed
- the target is a non-indexed file such as config, docs, or fixtures

Preferred TokToken usage:
- `search_symbols` for named code entities
- `search_text` for strings or unknown text patterns
- `inspect_symbol` or `inspect_bundle` before reading whole files
- `find_references`, `find_callers`, `find_importers`, `inspect_dependencies`, and `inspect_blast_radius` for relationship analysis

After code edits, refresh the index with `mcp__toktoken__index_update` or `mcp__toktoken__index_file`.
