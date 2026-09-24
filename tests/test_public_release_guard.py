import copy
import json
import tempfile
import unittest
from pathlib import Path
from scripts.public_release_guard import check_source, pin_links, verify_release, REPO_URL

class SourceContracts(unittest.TestCase):
    def test_count_sources_reject_duplicate_keys_negative_counts_and_bad_width(self):
        name='병무청_현역병 지방청별 입영현황_20241231.csv'
        valid=[['지방청','인원'],['서울','0'],['경북','1,200']]
        self.assertEqual(check_source(name,valid)['structure'],'passed')
        for bad in [[['지방청','인원'],['서울','-1']], valid+[valid[1]], [['지방청','지방청'],['a','1']], valid+[['부산']]]:
            with self.assertRaises(ValueError):check_source(name,bad)

    def test_unknown_metadata_never_becomes_confirmed(self):
        name='질병관리청_통계_지역별.csv'
        rows=[['서울','서울']+['']*67]
        self.assertEqual(check_source(name,rows)['metadata'],'pending')
        with self.assertRaises(ValueError):check_source(name,[rows[0]+['extra']])

    def test_ari_rejects_duplicate_week_and_nonfinite_count(self):
        name='질병관리청_급성호흡기.csv'
        row=['2025','1']+['0']*8+['']
        self.assertEqual(check_source(name,[row])['metadata'],'confirmed')
        for rows in [[row,row],[row[:2]+['NaN']+row[3:]],[['2025','54']+row[2:]]]:
            with self.assertRaises(ValueError):check_source(name,rows)

    def test_missing_procurement_column_rejected(self):
        with self.assertRaises(ValueError):
            check_source('방위사업청_국내조달 계약.csv',[['계약체결방법명'],['경쟁']])

class ReleaseEvidence(unittest.TestCase):
    def test_pinned_links_and_tampered_export_even_after_hash_rewrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'data').mkdir();rev='a'*40
            expected={'datasets':[{'source':'sample.csv','rows':[['서울','1']]}]}
            path=root/'data/agencies.json';path.write_text(json.dumps(expected))
            (root/'app.js').write_text(REPO_URL+'main/data/sample.csv')
            with self.assertRaisesRegex(ValueError,'Mutable'):verify_release(root,expected,rev)
            pin_links(root,rev)
            report=verify_release(root,expected,rev)
            self.assertEqual(report['revision'],rev)
            self.assertIn('data/agencies.json',report['files'])
            changed=copy.deepcopy(expected);changed['datasets'][0]['rows'][0][1]='999'
            path.write_text(json.dumps(changed))
            (root/'data/release_manifest.json').write_text('{}')
            with self.assertRaisesRegex(ValueError,'differs'):verify_release(root,expected,rev)

if __name__=='__main__':unittest.main()
