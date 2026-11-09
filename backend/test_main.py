"""main.py の API のテスト."""

import h3

from main import DUMMY_COUNTS, H3_RESOLUTION, h3_counts


def test_h3_counts_returns_res10_cells_and_their_max() -> None:
    """既定では resolution 10 のセルを返し、max_count は件数の最大値になる."""
    r = h3_counts()
    assert r.cells
    assert all(h3.get_resolution(c.h3) == H3_RESOLUTION for c in r.cells)
    assert r.max_count == max(c.count for c in r.cells)


def test_h3_counts_sums_into_parent_cells() -> None:
    """粗い解像度では親セルに合計し、総件数は変わらない."""
    r = h3_counts(resolution=6)
    assert all(h3.get_resolution(c.h3) == 6 for c in r.cells)  # noqa: PLR2004
    assert sum(c.count for c in r.cells) == sum(DUMMY_COUNTS.values())
    assert r.max_count == max(c.count for c in r.cells)
