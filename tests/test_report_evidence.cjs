// Exercise the deployed report renderer, not a duplicate report implementation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {buildDataReview}=require('../public-statistics/data-review.js');
const DashboardState=require('../public-statistics/dashboard-state.js');
const read=p=>JSON.parse(fs.readFileSync('dist/data/'+p));
const data=read('statistics.json'), agencyData=read('agencies.json').datasets;
const validationReport=read('validation_report.json'), researchScores=read('research_scores.json');
const manifest=read('release_manifest.json');
const code=fs.readFileSync('dist/dashboard-ux.js','utf8');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields=['처분인원','현역','보충역','전시근로역','병역면제','재신체검사'];
const offices={경상남도:['경남'],서울특별시:['서울'],대구광역시:['대구경북'],경상북도:['대구경북'],경기도:['경인','경기북부']};
test('Actual report tables preserve source counts, missing values and pinned provenance',()=>{
 const elements=new Map();
 const $=selector=>{if(!elements.has(selector))elements.set(selector,{value:'2025',innerHTML:'',textContent:'',hidden:true,disabled:false,handlers:{},addEventListener(k,f){this.handlers[k]=f;},scrollIntoView(){}});return elements.get(selector);};
 const context={data,agencyData,validationReport,researchScores,fields,offices,selected:'경상남도',buildDataReview,DashboardState,$,esc,ReleaseVersion:{revision:manifest.revision},count:v=>typeof v==='number'?v.toLocaleString('ko-KR'):'자료 없음',window:{},location:{origin:'https://example.test',pathname:'/'},history:{replaceState(){}},document:{querySelector(){return {id:'tab-map'};}},fetch:async()=>({ok:false})};
 vm.createContext(context);vm.runInContext(code,context);
 for(const region of Object.keys(offices))for(const year of [2019,2025]){
   context.selected=region;$('#year').value=String(year);$('#prepareReport').handlers.click();
   const html=$('#reportPreview').innerHTML;
   const body=html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
   const cells=[...body.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(m=>m[1]);
   const expected=fields.flatMap(f=>data.rows.filter(r=>r.year===year&&offices[region].includes(r.office)).map(r=>r.values[f].toLocaleString('ko-KR')));
   assert.deepEqual(cells,expected,region+' '+year);
   assert.ok(html.includes(manifest.revision));
   assert.ok(html.includes('/blob/'+manifest.revision+'/data/'));
   assert.ok(!html.includes('/blob/main/'));
   context.window.syncDashboardURL();assert.equal($('#reportPreview').hidden,true);assert.equal($('#reportPrint').disabled,true);
 }
});
