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

class AgencySourceExport(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from scripts.export_agency_statistics import generate
        cls.datasets = generate()['datasets']

    def test_all_sources_and_exact_kdca_cells(self):
        import csv, io, hashlib
        self.assertEqual(len(self.datasets), 7)
        for d in self.datasets:
            raw = (ROOT/'data'/d['source']).read_bytes()
            self.assertEqual(d['sha256'], hashlib.sha256(raw).hexdigest())
            if d['source'].startswith('질병관리청'):
                try:
                    text = raw.decode('utf-8-sig')
                except UnicodeDecodeError:
                    text = raw.decode('cp949')
                original = list(csv.reader(io.StringIO(text)))
                self.assertEqual(len(d['rows']), len(original))
                for source, shown in zip(original, d['rows']):
                    self.assertEqual(shown[:len(source)], source)
                    self.assertTrue(all(v == '' for v in shown[len(source):]))

    def test_dapa_aggregates_only(self):
        for d in self.datasets:
            if d['source'].startswith('방위사업청'):
                self.assertEqual(len(d['columns']), 2)
                if d['columns'][0] == '계약체결방법명':
                    self.assertEqual(sum(int(r[1]) for r in d['rows']), d['source_rows'])
                else:
                    self.assertEqual(int(d['rows'][0][1]), d['source_rows'])
                self.assertNotIn('대표자', d['columns'])
                self.assertNotIn('계약기관담당자명', d['columns'])
