"""Small helpers around python-calamine for reading the Porezna Excel files."""

from pathlib import Path

from python_calamine import CalamineWorkbook


def read_rows(path: Path, sheet: int = 0) -> list[list]:
    wb = CalamineWorkbook.from_path(str(path))
    return wb.get_sheet_by_index(sheet).to_python(skip_empty_area=False)


def cell_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def find_header_row(rows: list[list], *needles: str, search: int = 15) -> int:
    """Index of the first row whose cells contain all needles (case-insensitive)."""
    for i, row in enumerate(rows[:search]):
        text = " | ".join(cell_text(c).lower() for c in row)
        if all(n.lower() in text for n in needles):
            return i
    raise ValueError(f"header with {needles} not found in the first {search} rows")


def find_col(header: list, *needles: str, start: int = 0) -> int:
    """Index of the first header cell (from `start`) containing all needles."""
    for i, c in enumerate(header):
        if i < start:
            continue
        t = cell_text(c).lower()
        if all(n.lower() in t for n in needles):
            return i
    raise ValueError(f"column with {needles} not found in header {header}")
