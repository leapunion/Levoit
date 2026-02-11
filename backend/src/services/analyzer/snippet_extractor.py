"""SnippetExtractor — extract ±200 char context around a brand mention.

Preserves word boundaries so snippets don't start/end mid-word.
"""


class SnippetExtractor:
    """Extracts surrounding context around a character position in text."""

    def __init__(self, radius: int = 200) -> None:
        self._radius = radius

    def extract(self, text: str, position: int) -> str:
        """Extract snippet of ±radius chars around position, preserving word boundaries.

        Args:
            text: The full cleaned text.
            position: Character offset of the brand mention start.

        Returns:
            Snippet string with leading/trailing "..." if truncated.
        """
        raw_start = max(0, position - self._radius)
        raw_end = min(len(text), position + self._radius)

        # Snap to word boundaries (don't cut mid-word)
        start = self._snap_forward(text, raw_start) if raw_start > 0 else 0
        end = self._snap_backward(text, raw_end) if raw_end < len(text) else len(text)

        snippet = text[start:end].strip()

        # Add ellipsis markers for truncation
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."

        return snippet

    @staticmethod
    def _snap_forward(text: str, pos: int) -> int:
        """Move pos forward to the next word boundary (whitespace)."""
        while pos < len(text) and not text[pos].isspace():
            pos += 1
        # Skip the whitespace itself
        while pos < len(text) and text[pos].isspace():
            pos += 1
        return pos

    @staticmethod
    def _snap_backward(text: str, pos: int) -> int:
        """Move pos backward to the previous word boundary."""
        while pos > 0 and not text[pos - 1].isspace():
            pos -= 1
        # Remove trailing whitespace
        while pos > 0 and text[pos - 1].isspace():
            pos -= 1
        return pos
