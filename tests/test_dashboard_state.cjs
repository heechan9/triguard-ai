const {test}=require('node:test');const assert=require('node:assert/strict');const s=require('../public-statistics/dashboard-state.js');
test('Shared state roundtrips Korean jurisdiction and tab',()=>{
 const u=new URL(s.link('https://example.com','/','경상북도',2019,'analysis'));
 assert.deepEqual(s.read(u.search,['서울특별시','경상북도'],[2025,2019]),{region:'경상북도',year:2019,tab:'analysis'});
});
test('Unsupported years regions and injected tab names use safe defaults',()=>{
 assert.deepEqual(s.read('?region=<script>&year=NaN&tab=../../bad',['서울특별시'],[2025]),{region:'서울특별시',year:2025,tab:'map'});
 assert.deepEqual(s.read('', ['서울특별시'],[2025]),{region:'서울특별시',year:2025,tab:'map'});
});
