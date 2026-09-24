const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {buildDataReview} = require('../public-statistics/data-review.js');
const data = JSON.parse(fs.readFileSync('dist/data/statistics.json'));
const agencies = JSON.parse(fs.readFileSync('dist/data/agencies.json')).datasets;
const report = JSON.parse(fs.readFileSync('dist/data/validation_report.json'));
const offices = {대구광역시:['대구경북'],경상북도:['대구경북'],서울특별시:['서울'],경기도:['경인','경기북부']};
const review = (p='경상북도', d=data, a=agencies, r=report, y=2025) => buildDataReview(d,a,r,y,p,offices);
test('Gyeongbuk links Daegu and Gyeongbuk with one MMA office and nationwide DAPA',()=>{
 const v=review(); assert.deepEqual(v.health.map(r=>r[0]),['대구','경북']); assert.equal(v.rows.length,1); assert.equal(v.expected,6); assert.equal(v.procurement.length,3); assert.equal(v.passed,3); assert.equal(v.checks[3].ok,false);
});
test('region and year changes cannot reuse previous MMA values',()=>{
 const v=review('서울특별시',data,agencies,report,2019); assert.deepEqual(v.health.map(r=>r[0]),['서울']); assert.equal(v.rows[0].year,2019);
 const missing=review('서울특별시',data,agencies,report,1900); assert.equal(missing.present,0); assert.equal(missing.checks[0].ok,false);
 assert.equal(review('경기도').rows.length,2);
});
test('missing agency source and mismatched report are unconfirmed',()=>{
 assert.equal(review('경상북도',data,[],report).checks[1].ok,false);
 assert.equal(review('경상북도',data,agencies,null).checks[2].ok,false);
 const bad=structuredClone(report);bad.agency_sources[0].sha256='bad';assert.equal(review('경상북도',data,agencies,bad).checks[2].ok,false);
});
test('zero is present and null is missing',()=>{
 const changed=structuredClone(data);const row=changed.rows.find(r=>r.year===2025&&r.office==='대구경북');row.values.현역=0;
 assert.equal(review('경상북도',changed).checks[0].ok,true);row.values.현역=null;assert.equal(review('경상북도',changed).checks[0].ok,false);
});
test('DAPA supplier-location records follow both selected provinces',()=>{
 const v=review(); assert.deepEqual(v.supplierRows,[{region:'대구광역시',count:1333},{region:'경상북도',count:1492}]);
 assert.equal(review('경기도').supplierRows[0].count,13766);
 assert.equal(review('경상북도',data,[]).supplierRows[0].count,null);
});

test('Additional sources follow shared jurisdictions, not selected year',()=>{
 const extras=review().extra;
 assert.equal(extras.length,4);
 assert.equal(extras.find(d=>d.extra_kind==='population').selectedRows.length,2);
 assert.equal(extras.find(d=>d.extra_kind==='exempt').selectedRows.length,1);
 assert.equal(extras.find(d=>d.extra_kind==='enlist').selectedRows.length,1);
 assert.equal(extras.find(d=>d.extra_kind==='catalog').selectedRows.length,0);
 assert.equal(extras.find(d=>d.extra_kind==='catalog').source_rows,1006);
 assert.deepEqual(review('경기도').extra.find(d=>d.extra_kind==='enlist').selectedRows.map(r=>r[0]),['경 인','경기북부']);
 assert.deepEqual(review('서울특별시',data,agencies,report,2019).extra,review('서울특별시').extra);
});

test('Public context keeps agency dates independent and missing sources explicit',()=>{
 const {publicContextRows}=require('../public-statistics/public-context.js');
 const rows=publicContextRows(data,agencies,review(),2025);
 assert.equal(rows[0].period,'2025년');
 assert.equal(rows[1].scope,'대구 · 경북');
 assert.equal(rows[1].period,'원본 조회 기간 미확인');
 assert.equal(rows[2].period,'원본 전체 기간');
 const old=publicContextRows(data,agencies,review('경상북도',data,agencies,report,2019),2019);
 assert.equal(old[0].period,'2019년');assert.deepEqual(old.slice(1),rows.slice(1));
 const missing=publicContextRows(data,[],review('경상북도',data,[]),2025);
 assert.equal(missing[1].source,undefined);assert.equal(missing[2].state,'미연결');
});
