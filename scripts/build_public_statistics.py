"""Package only the descriptive statistics surface for public deployment."""
from pathlib import Path
import shutil
import json
from validate_public_statistics import validate_project

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'public-statistics'
output = ROOT / 'dist'
report = validate_project(ROOT)
if output.exists():
    shutil.rmtree(output)
shutil.copytree(source, output)
assert {p.name for p in (output / 'data').iterdir()} == {'statistics.json', 'korea_provinces.json'}
(output / 'data' / 'validation_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('Built public statistics surface; source validation passed')
