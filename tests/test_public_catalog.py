import hashlib
import json
import unittest
from pathlib import Path
from scripts.build_public_catalog import ROOT, ASSETS, catalog


class PublicCatalogTests(unittest.TestCase):
    def test_only_civilian_file_metadata(self):
        data = catalog()
        self.assertTrue(data['files'])
        for row in data['files']:
            self.assertIn(row['publisher'], ('질병관리청', '행정안전부'))
            self.assertEqual(set(row), {'file', 'publisher', 'bytes', 'sha256', 'source_status', 'freshness'})
            raw = (ROOT / 'data' / row['file']).read_bytes()
            self.assertEqual(row['sha256'], hashlib.sha256(raw).hexdigest())
            self.assertEqual(row['bytes'], len(raw))

    def test_deploy_bundle_is_isolated(self):
        root = ROOT / 'public-data-demo'
        self.assertEqual({p.name for p in root.iterdir()}, set(ASSETS) | {'catalog.json'})
        for name in ASSETS:
            self.assertEqual((root / name).read_bytes(), (ROOT / 'public-demo-src' / name).read_bytes())
        self.assertEqual(json.loads((root / 'catalog.json').read_text())['files'], catalog()['files'])


if __name__ == '__main__':
    unittest.main()
