"""Package only the descriptive statistics surface for public deployment."""
from pathlib import Path
import shutil
import json
from validate_public_statistics import validate_project
from export_agency_statistics import generate
from export_research_scores import generate as generate_scores

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'public-statistics'
output = ROOT / 'dist'
report = validate_project(ROOT)
agencies = generate(ROOT)
scores = generate_scores(ROOT)
report['research_snapshot'] = {'source_sha256':scores['source_sha256'],'rows':len(scores['regions']),'verification':'archived weighted totals and grades only'}
report['agency_sources'] = [{'source': d['source'], 'sha256': d['sha256'], 'source_rows': d['source_rows']} for d in agencies['datasets']]
if output.exists():
    shutil.rmtree(output)
shutil.copytree(source, output)
assert {p.name for p in (output / 'data').iterdir()} == {'statistics.json', 'korea_provinces.json'}
(output / 'data' / 'research_scores.json').write_text(json.dumps(scores, ensure_ascii=False), encoding='utf-8')
(output / 'data' / 'agencies.json').write_text(json.dumps(agencies, ensure_ascii=False), encoding='utf-8')
(output / 'data' / 'validation_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('Built public statistics surface; source validation passed')
