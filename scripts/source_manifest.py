"""Detect source-file changes against an explicitly reviewed baseline."""
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]

def scan(root=ROOT):
    return {p.name: {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}
            for p in sorted((root/'data').glob('*.csv'))}

def compare(previous, current):
    result=[]
    for name in sorted(set(previous) | set(current)):
        old, new = previous.get(name), current.get(name)
        state = 'added' if old is None else 'removed' if new is None else 'unchanged' if old['sha256']==new['sha256'] else 'changed'
        result.append({'source':name,'state':state,'before':old,'after':new})
    return result

def generate(root=ROOT):
    baseline=json.loads((root/'docs/SOURCE_BASELINE.json').read_text())
    files=compare(baseline['files'],scan(root))
    return {'baseline_date':baseline['reviewed_on'],'checked_at':datetime.now(timezone.utc).isoformat(),
            'baseline_note':baseline['note'],'files':files,
            'counts':{state:sum(f['state']==state for f in files) for state in ['unchanged','changed','added','removed']}}
