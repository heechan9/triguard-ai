'use strict';
const DashboardState = (()=>{
  const tabs=['map','analysis','details','guide'];
  function read(search,provinces,years){const p=new URLSearchParams(search);return {region:provinces.includes(p.get('region'))?p.get('region'):provinces[0],year:years.includes(Number(p.get('year')))?Number(p.get('year')):years[0],tab:tabs.includes(p.get('tab'))?p.get('tab'):'map'};}
  function link(origin,pathname,region,year,tab){const u=new URL(pathname,origin);u.searchParams.set('region',region);u.searchParams.set('year',String(year));u.searchParams.set('tab',tabs.includes(tab)?tab:'map');u.hash='map';return u.href;}
  return {read,link};
})();
if(typeof module!=='undefined')module.exports=DashboardState;
