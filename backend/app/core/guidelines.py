from pathlib import Path

GUIDELINES_PATH = Path(__file__).resolve().parent.parent / "guidelines.md"

# Cache: (mtime, content). Invalidated when file mtime changes.
_cache: tuple[float, str] | None = None


def get_guidelines() -> str:
    """Load AE idea-generation guidelines from guidelines.md.

    Re-reads the file when its modification time changes, so edits apply
    without restarting the server. Returns an empty string if the file is missing.
    """
    global _cache
    if not GUIDELINES_PATH.exists():
        _cache = None
        return ""
    try:
        mtime = GUIDELINES_PATH.stat().st_mtime
        if _cache is not None and _cache[0] == mtime:
            return _cache[1]
    except OSError:
        return _cache[1] if _cache else ""
    content = GUIDELINES_PATH.read_text(encoding="utf-8")
    _cache = (mtime, content)
    return content
