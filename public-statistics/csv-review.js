'use strict';
const CSVReview = (()=>{
  const required=['지역','연도','값','단위','출처'];
  const regions=new Set(['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주','서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원도','강원특별자치도','충청북도','충청남도','전라북도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도','전국']);
  function review(dataset,mode,index,numeric){
    const columns=dataset.columns.map(c=>c.trim()),issues=[];
    const add=(row,column,reason,value='')=>issues.push({row,column,reason,value});
    const missing=mode==='regional'?required.filter(c=>!columns.includes(c)):[];
    if(new Set(columns).size!==columns.length)add(1,'열 제목','공백 제거 후 중복 열 제목');
    missing.forEach(c=>add(1,c,'필수 열 없음'));
    if(missing.length||issues.length)return {issues,checked:0,held:dataset.rows.length,status:'형식 보완 필요'};
    const col=Object.fromEntries(columns.map((c,i)=>[c,i]));
    const seen=new Map();
    dataset.rows.forEach((r,i)=>{
      const row=i+2;
      const key=JSON.stringify(mode==='regional'?[r[col.지역].trim(),r[col.연도].trim(),r[col.단위].trim(),r[col.출처].trim()]:r);
      if(seen.has(key)){add(row,'행 식별','중복 기록 확인',`첫 기록 ${seen.get(key)}번`);add(seen.get(key),'행 식별','중복 기록 확인',`다른 기록 ${row}번`);}else seen.set(key,row);
      const valueIndex=mode==='regional'?col.값:index;
      const raw=String(r[valueIndex]??'').trim();
      if(!raw)add(row,columns[valueIndex],'빈 값 · 0으로 대체하지 않음');
      else if(numeric(raw)===null)add(row,columns[valueIndex],'유한한 수치 형식 필요',raw);
      if(mode==='regional'){
        const get=c=>String(r[col[c]]??'').trim();
        if(!regions.has(get('지역')))add(row,'지역','지원 지역명 확인 필요',get('지역'));
        if(!/^\d{4}$/.test(get('연도'))||Number(get('연도'))<1900||Number(get('연도'))>2100)add(row,'연도','1900–2100 사이 네 자리 연도 필요',get('연도'));
        if(!get('단위'))add(row,'단위','단위 누락');
        if(!get('출처'))add(row,'출처','출처 누락');
        if(['명','건'].includes(get('단위'))&&numeric(raw)!==null&&(!Number.isSafeInteger(numeric(raw))||numeric(raw)<0))add(row,'값','명·건은 0 이상의 안전한 정수 필요',raw);
      }
    });
    const dedup=new Set();
    const unique=issues.filter(v=>{const key=JSON.stringify([v.row,v.column,v.reason]);if(dedup.has(key))return false;dedup.add(key);return true;});
    const held=new Set(unique.filter(v=>v.row>1).map(v=>v.row)).size;
    return {issues:unique,checked:dataset.rows.length,held,status:held?'보완 필요':'선택한 형식 검사 통과'};
  }
  return {review,required};
})();
if(typeof module!=='undefined')module.exports=CSVReview;
