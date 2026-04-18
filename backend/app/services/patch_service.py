from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import re

from unidiff import PatchSet


@dataclass(slots=True)
class PatchApplyError(Exception):
    failed_hunk: int
    error: str
    expected_context: list[str]
    current_content_hash: str

    def to_response(self) -> dict[str, object]:
        return {
            "detail": "Patch failed",
            "failed_hunk": self.failed_hunk,
            "error": self.error,
            "expected_context": self.expected_context,
            "current_content_hash": self.current_content_hash,
        }


_HUNK_HEADER_RE = re.compile(
    r"^@@ -(?P<source_start>\d+)(?:,(?P<source_length>\d+))? \+(?P<target_start>\d+)(?:,(?P<target_length>\d+))? @@"
)


def _content_hash(content: str) -> str:
    return f"sha256:{sha256(content.encode('utf-8')).hexdigest()}"


def _raise_patch_error(
    *,
    original_content: str,
    failed_hunk: int,
    error: str,
    expected_context: list[str] | None = None,
) -> None:
    raise PatchApplyError(
        failed_hunk=failed_hunk,
        error=error,
        expected_context=expected_context or [],
        current_content_hash=_content_hash(original_content),
    )


def _validate_patch_text_structure(original_content: str, patch_text: str) -> None:
    lines = patch_text.splitlines(keepends=True)
    index = 0
    saw_hunk = False

    while index < len(lines):
        line = lines[index]
        if line.startswith(("--- ", "+++ ")) or line.strip() == "":
            index += 1
            continue

        if not line.startswith("@@ "):
            _raise_patch_error(
                original_content=original_content,
                failed_hunk=0,
                error="invalid unified diff",
            )

        match = _HUNK_HEADER_RE.match(line)
        if match is None:
            _raise_patch_error(
                original_content=original_content,
                failed_hunk=0,
                error="invalid unified diff hunk header",
            )

        saw_hunk = True
        source_length = int(match.group("source_length") or 1)
        target_length = int(match.group("target_length") or 1)
        source_count = 0
        target_count = 0
        index += 1

        while index < len(lines):
            body_line = lines[index]
            if body_line.startswith(("@@ ", "--- ", "+++ ")):
                break
            if body_line.startswith("\\"):
                index += 1
                continue
            if not body_line or body_line[0] not in {" ", "+", "-"}:
                _raise_patch_error(
                    original_content=original_content,
                    failed_hunk=0,
                    error="invalid unified diff",
                )
            if body_line[0] in {" ", "-"}:
                source_count += 1
            if body_line[0] in {" ", "+"}:
                target_count += 1
            index += 1

        if source_count != source_length or target_count != target_length:
            _raise_patch_error(
                original_content=original_content,
                failed_hunk=0,
                error="invalid unified diff hunk header",
            )

    if not saw_hunk:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=0,
            error="invalid unified diff",
        )


def _validate_hunk_header(original_content: str, hunk_index: int, hunk) -> None:
    source_length = sum(1 for line in hunk if line.is_context or line.is_removed)
    target_length = sum(1 for line in hunk if line.is_context or line.is_added)
    if source_length != hunk.source_length or target_length != hunk.target_length:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=hunk_index,
            error="invalid unified diff hunk header",
        )



def _validate_hunk_position(
    original_content: str,
    hunk_index: int,
    hunk,
    total_original_lines: int,
) -> None:
    if hunk.source_start < 0 or hunk.target_start < 0:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=hunk_index,
            error="invalid unified diff hunk position",
        )
    if hunk.source_length > 0 and hunk.source_start < 1:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=hunk_index,
            error="invalid unified diff hunk position",
        )
    if hunk.target_length > 0 and hunk.target_start < 1:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=hunk_index,
            error="invalid unified diff hunk position",
        )
    if hunk.target_length == 0 and hunk.target_start < 0:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=hunk_index,
            error="invalid unified diff hunk position",
        )
    if hunk.source_start > total_original_lines + 1:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=hunk_index,
            error="invalid unified diff hunk position",
        )



def _line_has_no_newline(hunk_lines, index: int) -> bool:
    return index + 1 < len(hunk_lines) and hunk_lines[index + 1].line_type == "\\"



def _expected_line_value(line, no_newline: bool) -> str:
    return line.value.rstrip("\n") if no_newline else line.value



def _line_matches_expected(actual_line: str | None, expected_value: str) -> bool:
    if actual_line == expected_value:
        return True
    return actual_line is not None and not actual_line.endswith("\n") and actual_line == expected_value.rstrip("\n")


def apply_patch(original_content: str, patch_text: str) -> str:
    _validate_patch_text_structure(original_content, patch_text)
    try:
        patch = PatchSet.from_string(patch_text)
    except Exception as exc:  # pragma: no cover - defensive against parser internals
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=0,
            error="invalid unified diff",
        )
        raise AssertionError("unreachable") from exc

    if len(patch) == 0:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=0,
            error="invalid unified diff",
        )

    if len(patch) != 1:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=0,
            error="patch must target exactly one file",
        )

    patched_file = patch[0]
    if len(patched_file) == 0:
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=0,
            error="invalid unified diff",
        )

    original_lines = original_content.splitlines(keepends=True)
    total_original_lines = len(original_lines)
    patched_lines: list[str] = []
    cursor = 0

    for hunk_index, hunk in enumerate(patched_file):
        _validate_hunk_header(original_content, hunk_index, hunk)
        _validate_hunk_position(original_content, hunk_index, hunk, total_original_lines)
        hunk_start = max(hunk.source_start - 1, 0)
        expected_target_start = len(patched_lines) + (hunk_start - cursor) + 1
        allowed_target_starts = {expected_target_start}
        if hunk.target_length == 0:
            allowed_target_starts.add(expected_target_start - 1)
        if hunk.target_start not in allowed_target_starts:
            _raise_patch_error(
                original_content=original_content,
                failed_hunk=hunk_index,
                error="invalid unified diff hunk position",
            )
        if hunk_start < cursor:
            _raise_patch_error(
                original_content=original_content,
                failed_hunk=hunk_index,
                error=f"invalid overlapping hunk at line {hunk.source_start}",
            )

        patched_lines.extend(original_lines[cursor:hunk_start])
        line_index = hunk_start

        hunk_lines = list(hunk)
        line_number = 0
        while line_number < len(hunk_lines):
            line = hunk_lines[line_number]
            if line.line_type == "\\":
                line_number += 1
                continue

            no_newline = _line_has_no_newline(hunk_lines, line_number)
            expected_value = _expected_line_value(line, no_newline)

            if line.is_added:
                patched_lines.append(expected_value)
                line_number += 1
                continue

            actual_line = original_lines[line_index] if line_index < len(original_lines) else None
            if not _line_matches_expected(actual_line, expected_value):
                _raise_patch_error(
                    original_content=original_content,
                    failed_hunk=hunk_index,
                    error=f"context mismatch at line {line_index + 1}",
                    expected_context=[expected_value.rstrip("\n")],
                )

            if line.is_context:
                patched_lines.append(actual_line)

            line_index += 1
            line_number += 1

        cursor = line_index

    patched_lines.extend(original_lines[cursor:])
    patched_content = "".join(patched_lines)
    if patched_content == "":
        _raise_patch_error(
            original_content=original_content,
            failed_hunk=0,
            error="patched content cannot be empty",
        )
    return patched_content
