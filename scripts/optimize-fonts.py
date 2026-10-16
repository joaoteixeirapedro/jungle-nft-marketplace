"""Optional maintenance tool: python -m pip install 'fonttools[woff]==4.67.0'.
Generated WOFF2 files are committed; Node builds do not require Python.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools import subset

LATIN_UNICODES = 'U+0000-024F,U+0300-036F,U+1E00-1EFF,U+2000-2BFF,U+FEFF,U+FFFD'
latin_codepoints = set(subset.parse_unicodes(LATIN_UNICODES))

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
    # Keep the complete font as a fallback for all other writing systems.
    # The common Latin face has identical glyphs, metrics and hinting.
    latin = TTFont(source, recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ['*']
    options.glyph_names = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=latin_codepoints)
    subsetter.subset(latin)
    latin.flavor = 'woff2'
    latin_target = Path(f'public/fonts/roboto-mono-{weight}-latin.woff2')
    latin.save(latin_target)
    decoded_latin = TTFont(latin_target, recalcTimestamp=False)
    expected = {cp: name for cp, name in font.getBestCmap().items() if cp in latin_codepoints}
    assert decoded_latin.getBestCmap() == expected
    for name in set(expected.values()):
        assert font['hmtx'].metrics[name] == decoded_latin['hmtx'].metrics[name]
        before, after = RecordingPen(), RecordingPen()
        font.getGlyphSet()[name].draw(before)
        decoded_latin.getGlyphSet()[name].draw(after)
        assert before.value == after.value, name
    report.append({'original': source.as_posix(), 'before': source.stat().st_size,
                   'optimized': target.as_posix(), 'after': target.stat().st_size,
                   'cmapMetricsAndOutlinesIdentical': True,
                   'latin': {'optimized': latin_target.as_posix(), 'after': latin_target.stat().st_size,
                             'unicodeRange': LATIN_UNICODES, 'codepoints': len(expected),
                             'cmapMetricsAndOutlinesIdentical': True}})
Path('docs/assets/fonts.json').write_text(json.dumps(report, indent=2) + '\n')
