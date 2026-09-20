const {test}=require('node:test');
const assert=require('node:assert/strict');
const t=require('../public-statistics/statistics-tools.js');
test('CSV preserves BOM, commas, escaped quotes and embedded newlines',()=>{
 assert.deepEqual(t.parseCSV('\uFEFF지역,값\r\n"대구,경북","1,200"\r\n"두""번째\n행",0'),{columns:['지역','값'],rows:[['대구,경북','1,200'],['두"번째\n행','0']]});
});
test('Malformed CSV rejected without silent truncation',()=>{
 for(const raw of ['a,b\n1','a,a\n1,2','a,b\n"bad,2','a,b\n"x"y,2','a,b\n1,2,3'])assert.throws(()=>t.parseCSV(raw));
});
test('Missing, malformed numeric values and zero are distinguished',()=>{
 assert.deepEqual(t.summary([[''],['0'],['1,000'],['1,2'],['NaN'],['-4']],0),{count:3,missing:1,invalid:2,min:-4,max:1000,mean:332});
 assert.equal(t.numeric('1e9'),null);assert.equal(t.numeric('Infinity'),null);
});
test('Spreadsheet formula injection protected while CSV quoting roundtrips',()=>{
 const out=t.csv([['name','value'],['=1+1','a,"b"'],[' \t@x','3']]);
 const parsed=t.parseCSV(out);assert.equal(parsed.rows[0][0],"'=1+1");assert.equal(parsed.rows[0][1],'a,"b"');assert.equal(parsed.rows[1][0],"' \t@x");
});
test('Synthetic data reproducible and independent of actual regions',()=>{
 assert.deepEqual(t.simulate(42,1000,20),t.simulate(42,1000,20));assert.notDeepEqual(t.simulate(42,1000,20),t.simulate(43,1000,20));
 assert.ok(t.simulate(2,1000,0).rows.every(r=>r[1]==='1000'));assert.throws(()=>t.simulate(42,-1,0));
});
