const {test}=require('node:test');
const assert=require('node:assert/strict');
const {review,required}=require('../public-statistics/csv-review.js');
const {numeric}=require('../public-statistics/statistics-tools.js');
const run=rows=>review({columns:required,rows},'regional',2,numeric);
test('Regional intake preserves zero and reports each incomplete record',()=>{
 const r=run([['서울', '2025', '0','명','source'],['경북','20xx','','','']]);
 assert.equal(r.held,1);assert.equal(r.issues.length,4);assert.ok(r.issues.every(i=>i.row===3));
});
test('Duplicate records flag both rows without conflating different periods',()=>{
 const r=run([['서울','2025','1','명','s'],['서울','2025','2','명','s'],['서울','2024','2','명','s']]);
 assert.equal(r.held,2);assert.deepEqual(new Set(r.issues.map(v=>v.row)),new Set([2,3]));
});
test('Unknown regions, unsafe counts and missing columns stay unconfirmed',()=>{
 assert.equal(run([['unknown','2025','9007199254740992','명','s']]).issues.length,2);
 assert.equal(run([['서울','2025','NaN','명','s']]).held,1);
 const r=review({columns:['값'],rows:[['0']]},'regional',0,numeric);
 assert.equal(r.checked,0);assert.equal(r.held,1);assert.equal(r.issues.length,4);
});
test('Generic negative values are not relabeled as invalid counts',()=>{
 const r=review({columns:['name','value'],rows:[['a','-1'],['b',''],['c','x']]},'generic',1,numeric);
 assert.equal(r.held,2);assert.ok(r.issues.every(i=>i.row!==2));
});
test('Large duplicate inputs produce bounded distinct row issues',()=>{
 const r=run(Array.from({length:5000},()=>['서울','2025','0','명','s']));
 assert.equal(r.held,5000);assert.equal(r.issues.length,5000);
});
