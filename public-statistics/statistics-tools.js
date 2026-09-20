'use strict';
const StatisticsTools = (() => {
  function parseCSV(text) {
    if (text.length > 5 * 1024 * 1024) throw Error('CSV는 5MB 이하로 선택하세요.');
    text = text.replace(/^\uFEFF/, '');
    const rows = []; let row = [], cell = '', quoted = false, closed = false;
    const pushCell = () => { row.push(cell); cell = ''; closed = false; if (row.length > 200) throw Error('최대 200열까지 지원합니다.'); };
    const pushRow = () => { pushCell(); if (row.some(v=>v.trim()!=='')) rows.push(row); row=[]; if (rows.length > 50001) throw Error('최대 50,000개 데이터 행까지 지원합니다.'); };
    for (let i=0;i<text.length;i++) {
      const c=text[i];
      if (quoted) { if(c==='"') { if(text[i+1]==='"'){cell+='"';i++;} else {quoted=false;closed=true;} } else cell+=c; }
      else if(c===',') pushCell();
      else if(c==='\n'||c==='\r') {if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}
      else if(c==='"') {if(cell!==''||closed)throw Error('잘못된 CSV 따옴표입니다.');quoted=true;}
      else {if(closed)throw Error('닫는 따옴표 뒤의 문자를 확인하세요.');cell+=c;}
    }
    if(quoted)throw Error('CSV 따옴표가 닫히지 않았습니다.');
    if(cell!==''||row.length||closed)pushRow();
    if(rows.length<2)throw Error('열 제목과 데이터 행이 필요합니다.');
    const columns=rows.shift();
    if(columns.some(c=>!c.trim())||new Set(columns).size!==columns.length)throw Error('열 제목은 비어 있거나 중복될 수 없습니다.');
    if(rows.some(r=>r.length!==columns.length))throw Error('행마다 열 개수가 다릅니다.');
    return {columns,rows};
  }
  function numeric(value) {
    const s=String(value??'').trim();
    if(!s)return null;
    if(!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s))return null;
    const n=Number(s.replace(/,/g,''));return Number.isFinite(n)?n:null;
  }
  function summary(rows,index) {
    let count=0,missing=0,invalid=0,total=0,min=Infinity,max=-Infinity;
    for(const row of rows){const raw=String(row[index]??'').trim(),n=numeric(raw);if(!raw){missing++;continue;}if(n===null){invalid++;continue;}count++;total+=n;min=Math.min(min,n);max=Math.max(max,n);}
    return {count,missing,invalid,min:count?min:null,max:count?max:null,mean:count?total/count:null};
  }
  function csv(rows) {
    return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
  }
  function simulate(seed,baseline,variation) {
    if(!Number.isInteger(seed)||seed<0||seed>99999||!Number.isFinite(baseline)||baseline<0||baseline>1000000||!Number.isFinite(variation)||variation<0||variation>100)throw Error('시드 0–99999, 기준 건수 0–1,000,000, 변동폭 0–100%를 입력하세요.');
    let state=seed>>>0;
    return {columns:['가상 월','가상 행정 처리 건수'],rows:Array.from({length:12},(_,i)=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return [String(i+1),String(Math.round(baseline*(1+(state/4294967296*2-1)*variation/100)))];})};
  }
  return {parseCSV,numeric,summary,csv,simulate};
})();
if(typeof module!=='undefined')module.exports=StatisticsTools;
