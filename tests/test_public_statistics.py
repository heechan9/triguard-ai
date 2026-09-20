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
        self.assertEqual(len(self.datasets), 11)
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

class AgencyMetadataReview(unittest.TestCase):
    def test_supplier_addresses_use_explicit_province_only(self):
        from scripts.agency_metadata import supplier_regions
        result = supplier_regions(['대표업체주소'], [['강원특별자치도 강릉시'], ['전북특별자치도 전주시'], ['경상북도 구미시'], ['충남대전시'], ['용산구'], ['']])
        self.assertEqual(result['counts']['강원도'], 1)
        self.assertEqual(result['counts']['전라북도'], 1)
        self.assertEqual(result['counts']['경상북도'], 1)
        self.assertEqual(result['unclassified'], 3)
        self.assertEqual(sum(result['counts'].values()) + result['unclassified'], result['total'])

    def test_real_supplier_partition_and_health_metadata(self):
        from scripts.export_agency_statistics import generate
        datasets = generate()['datasets']
        d = next(d for d in datasets if 'supplier_regions' in d)
        regions = d['supplier_regions']
        self.assertEqual(sum(regions['counts'].values()) + regions['unclassified'], d['source_rows'])
        self.assertEqual(regions['unclassified'], 20)
        self.assertEqual(regions['counts']['대구광역시'], 1333)
        self.assertEqual(regions['counts']['경상북도'], 1492)
        for d in datasets:
            if d['source'].startswith('질병관리청'):
                if '급성호흡기' in d['source']:
                    self.assertEqual(d['columns'][:2], ['연도', '주차'])
                    self.assertEqual(d['metadata']['unit'], '입원환자수(명)')
                else:
                    self.assertIn('미확인', d['metadata']['status'])
                    self.assertIn('원자료', d['columns'][0])

class OfficialAriSchema(unittest.TestCase):
    def test_changed_source_cannot_reuse_verified_headers(self):
        from scripts.agency_metadata import health_metadata
        with self.assertRaisesRegex(ValueError, 'ARI source changed'):
            health_metadata('급성호흡기.csv', ['unknown']*11, [], 'wrong')

class ArchivedResearchScores(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads((ROOT/'web/data/risk_snapshot.json').read_text())

    def test_original_results_preserved(self):
        from scripts.export_research_scores import generate, FIELDS
        result = generate()
        self.assertEqual(result['generated_at'], self.snapshot['generated_at'])
        for original, exported in zip(self.snapshot['regions'], result['regions']):
            for field in ['지방청', '위험등급'] + FIELDS:
                self.assertEqual(original[field], exported[field])

    def test_inconsistent_result_rejected(self):
        from scripts.export_research_scores import validate
        for field, value in [('통합Risk', 99), ('인력Risk', None), ('물자Risk', float('nan')), ('위험등급', 'unknown')]:
            with self.subTest(field=field):
                snapshot = copy.deepcopy(self.snapshot)
                snapshot['regions'][0][field] = value
                with self.assertRaises(ValueError):
                    validate(snapshot)

    def test_missing_office_rejected(self):
        from scripts.export_research_scores import validate
        self.snapshot['regions'].pop()
        with self.assertRaisesRegex(ValueError, 'coverage'):
            validate(self.snapshot)

class AdditionalSourcePreservation(unittest.TestCase):
    def test_original_headers_and_cells(self):
        from scripts.export_agency_statistics import generate, read_rows
        extras = [d for d in generate()['datasets'] if 'extra_kind' in d]
        self.assertEqual(len(extras), 4)
        for d in extras:
            raw, rows = read_rows(ROOT/'data'/d['source'])
            self.assertEqual(d['columns'], rows[0])
            self.assertEqual(d['rows'], rows[1:])
            self.assertEqual(d['source_rows'], len(rows)-1)

class SourceChanges(unittest.TestCase):
    def test_change_addition_removal_are_separate(self):
        from scripts.source_manifest import compare
        old={'same':{'sha256':'a'},'changed':{'sha256':'b'},'gone':{'sha256':'c'}}
        new={'same':{'sha256':'a'},'changed':{'sha256':'d'},'new':{'sha256':'e'}}
        self.assertEqual({r['source']:r['state'] for r in compare(old,new)}, {'same':'unchanged','changed':'changed','gone':'removed','new':'added'})

    def test_current_reviewed_baseline(self):
        from scripts.source_manifest import generate
        report=generate()
        self.assertEqual(report['counts'],{'unchanged':13,'changed':0,'added':0,'removed':0})
