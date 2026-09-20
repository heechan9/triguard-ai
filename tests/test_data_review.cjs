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
