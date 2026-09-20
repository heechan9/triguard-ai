"""Package only the descriptive statistics surface for public deployment."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'public-statistics'
output = ROOT / 'dist'
if output.exists():
    shutil.rmtree(output)
shutil.copytree(source, output)
assert {p.name for p in (output / 'data').iterdir()} == {'statistics.json', 'korea_provinces.json'}
print('Built public statistics surface')
