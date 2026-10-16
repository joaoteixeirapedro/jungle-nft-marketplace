"""Optional maintenance tool: python -m pip install 'fonttools[woff]==4.67.0'.
Generated WOFF2 files are committed; Node builds do not require Python.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

report = []
for weight in ['regular', 'medium', 'bold']:
    source = Path(f'assets/originals/fonts/roboto-mono-{weight}.ttf')
    target = Path(f'public/fonts/roboto-mono-{weight}.woff2')
    font = TTFont(source, recalcTimestamp=False)
    font.flavor = 'woff2'
    font.save(target)
    decoded = TTFont(target, recalcTimestamp=False)
    assert font.getBestCmap() == decoded.getBestCmap()
    assert font['hmtx'].metrics == decoded['hmtx'].metrics
    for name in font.getGlyphOrder():
        before, after = RecordingPen(), RecordingPen()
        font.getGlyphSet()[name].draw(before)
        decoded.getGlyphSet()[name].draw(after)
        assert before.value == after.value, name
    report.append({'original': source.as_posix(), 'before': source.stat().st_size,
                   'optimized': target.as_posix(), 'after': target.stat().st_size,
                   'cmapMetricsAndOutlinesIdentical': True})
Path('docs/assets/fonts.json').write_text(json.dumps(report, indent=2) + '\n')
