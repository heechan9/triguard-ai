"""Adversarial fixtures for the descriptive public data release gate."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from scripts.validate_public_statistics import ROOT, validate


class PublicStatisticsGate(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads((ROOT/'public-statistics/data/statistics.json').read_text())
        self.raw = (ROOT/'data'/self.snapshot['source']).read_bytes()
        self.downloads = ROOT/'public-statistics/downloads'

    def test_current_release(self):
        report = validate(self.snapshot,self.raw,self.downloads)
        self.assertEqual((report['row_count'],report['numeric_value_count'],report['national_total_checks']),(105,630,42))

    def test_source_replaced(self):
        with self.assertRaisesRegex(ValueError,'SOURCE_HASH'):
            validate(self.snapshot,self.raw+b'\n',self.downloads)

    def test_duplicate_row(self):
        self.snapshot['rows'].append(copy.deepcopy(self.snapshot['rows'][0]))
        with self.assertRaisesRegex(ValueError,'DUPLICATE'):
            validate(self.snapshot,self.raw,self.downloads)

    def test_missing_row(self):
        self.snapshot['rows'].pop()
        with self.assertRaisesRegex(ValueError,'SOURCE_VALUES'):
            validate(self.snapshot,self.raw,self.downloads)

    def test_changed_count(self):
        self.snapshot['rows'][0]['values']['처분인원'] += 1
        with self.assertRaisesRegex(ValueError,'SOURCE_VALUES'):
            validate(self.snapshot,self.raw,self.downloads)

    def test_invalid_counts(self):
        for value in [None,True,-1,float('nan'),1.5]:
            with self.subTest(value=value):
                snapshot = copy.deepcopy(self.snapshot)
                snapshot['rows'][0]['values']['처분인원'] = value
                with self.assertRaisesRegex(ValueError,'COUNTS'):
                    validate(snapshot,self.raw,self.downloads)

    def test_download_corruption(self):
        with tempfile.TemporaryDirectory() as tmp:
            target=Path(tmp)
            for p in self.downloads.glob('*.csv'):
                (target/p.name).write_bytes(p.read_bytes())
            p=target/'triguard-statistics-2019.csv'
            lines=p.read_text(encoding='utf-8-sig').splitlines()
            p.write_text('\n'.join(lines[:-1]),encoding='utf-8-sig')
            with self.assertRaisesRegex(ValueError,'CSV_VALUES'):
                validate(self.snapshot,self.raw,target)


if __name__=='__main__':
    unittest.main()
