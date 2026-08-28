"""
app/ai/text_extraction.py

Extracts plain text from an uploaded document so it can be masked and
sent to the LLM / embedding pipeline. Handles the three types the backend
already accepts (see ALLOWED_CONTENT_TYPES in routers/documents.py):
PDF, DOCX, XLSX.

This is deliberately simple text-out extraction — no layout, table
structure preservation is minimal (XLSX cells become tab-separated rows).
If Data Engineering's chunking step wants richer structure later, this
is the seam to extend, not replace.
"""

from __future__ import annotations

from app.models import Document


class UnsupportedDocumentType(Exception):
    pass


def extract_text(doc: Document) -> str:
    """Extract plain text from a Document's stored file, dispatching on
    content_type. Raises UnsupportedDocumentType for anything outside the
    three accepted upload types (shouldn't happen given upload validation,
    but fail loud rather than silently returning empty text)."""
    if doc.content_type == "application/pdf":
        return _extract_pdf(doc.file_path)
    elif doc.content_type == (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):
        return _extract_docx(doc.file_path)
    elif doc.content_type == (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ):
        return _extract_xlsx(doc.file_path)
    else:
        raise UnsupportedDocumentType(f"Cannot extract text from {doc.content_type}")


def _extract_pdf(path: str) -> str:
    from pypdf import PdfReader

    reader = PdfReader(path)
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages).strip()


def _extract_docx(path: str) -> str:
    import docx  # python-docx

    d = docx.Document(path)
    parts = [p.text for p in d.paragraphs if p.text.strip()]
    # Include table cell text too — proposal letters/brochures sometimes
    # carry disclosure text in tables.
    for table in d.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n\n".join(parts).strip()


def _extract_xlsx(path: str) -> str:
    import openpyxl

    wb = openpyxl.load_workbook(path, data_only=True)
    parts = []
    for sheet in wb.worksheets:
        parts.append(f"--- Sheet: {sheet.title} ---")
        for row in sheet.iter_rows(values_only=True):
            cells = [str(c) for c in row if c is not None and str(c).strip()]
            if cells:
                parts.append("\t".join(cells))
    return "\n".join(parts).strip()
