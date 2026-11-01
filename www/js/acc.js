/* ===== الحسابات: تقارير المبيعات والأرباح ===== */
const GROUPS=[['br','الفرع'],['pos','نقطة البيع'],['ses','الجلسة'],['cat','فئة المنتج'],['user','الموظف'],['day','اليوم'],['prod','المنتج'],['method','طريقة الدفع'],['cust','العميل']];
const ACC={rows:null};
V.accounts=()=>{
  if(!can('acc_reports')){say('ليس لديك صلاحية الحسابات',1);return go('home')}
  const t=dayStr(),d1=t.slice(0,8)+'01';
  const opt=(a,all)=>`<option value="">${all}</option>${a.map(x=>`<option>${esc(x)}</option>`).join('')}`;
  setMain(`<div class="ttl">الحسابات — تقارير المبيعات والأرباح</div>
  <div class="card"><div class="g2">
   <div><div class="lbl">من يوم</div><input type="date" id="rf" value="${d1}"></div><div><div class="lbl">إلى يوم</div><input type="date" id="rt" value="${t}"></div>
   <div><div class="lbl">الفرع</div><select id="rb">${opt(BR,'كل الفروع')}</select></div><div><div class="lbl">نقطة البيع</div><select id="rp">${opt(POSN,'الكل')}</select></div>
   <div><div class="lbl">رقم الجلسة</div><input id="rs" inputmode="numeric" placeholder="الكل"></div><div><div class="lbl">فئة المنتج</div><select id="rc">${opt(PI.cats,'كل الفئات')}</select></div>
   <div><div class="lbl">الموظف</div><select id="ru">${opt(D.employees.map(e=>e.name).concat(['أسواق بدر']),'الكل')}</select></div>
   <div><div class="lbl">تجميع حسب</div><select id="rg">${GROUPS.map(g=>`<option value="${g[0]}">${g[1]}</option>`).join('')}</select></div></div>
   <div class="row" style="margin-top:10px"><button class="p" data-a="accRun">عرض التقرير</button><button data-a="accExp">⬇️ تصدير Excel</button></div></div><div id="accOut"></div>`);
};
function accReport(f){
  const g={},tot={s:0,r:0,c:0,q:0,n:0};let ex=0,inc=0;
  const key=(d,l)=>({br:d.br,pos:d.br+' / '+d.pos,ses:'جلسة '+d.session+' ('+d.br+' '+d.pos+')',cat:l.cat||'بدون فئة',user:d.user,day:d.day,prod:l.n,method:d.method,cust:d.custName||'بدون عميل'})[f.g];
  D.sales.forEach(d=>{
    if((f.from&&d.day<f.from)||(f.to&&d.day>f.to)||(f.br&&d.br!==f.br)||(f.pos&&d.pos!==f.pos)||(f.ses&&d.session!==f.ses)||(f.user&&d.user!==f.user))return;
    const sg=d.type==='return'?-1:1;
    d.lines.forEach(l=>{
      if(f.cat&&(l.cat||'')!==f.cat)return;
      const k=key(d,l),x=g[k]=g[k]||{k,s:0,r:0,c:0,q:0};
      const a=l.price*l.qty,c=l.cost*l.qty;
      if(sg>0){x.s+=a;tot.s+=a}else{x.r+=a;tot.r+=a}
      x.c+=c*sg;tot.c+=c*sg;x.q+=l.qty*sg;tot.q+=l.qty*sg;
    });
    if(sg>0)tot.n++;
  });
  D.cash.forEach(c=>{
    if((f.from&&c.day<f.from)||(f.to&&c.day>f.to)||(f.br&&c.br!==f.br)||(f.pos&&c.pos!==f.pos)||(f.ses&&c.session!==f.ses))return;
    if(c.type==='exp')ex+=c.amount;else inc+=c.amount;
  });
  const rows=Object.values(g).sort((a,b)=>String(a.k).localeCompare(String(b.k),'ar'));
  return{rows,tot,ex:r2(ex),inc:r2(inc)};
}
function accFilters(){
  return{from:$('rf').value,to:$('rt').value,br:$('rb').value,pos:$('rp').value,ses:parseInt(dg($('rs').value),10)||0,cat:$('rc').value,user:$('ru').value,g:$('rg').value};
}
const accRow=x=>{const net=x.s-x.r,pr=net-x.c;return[x.k,r2(x.s),r2(x.r),r2(net),r2(x.c),r2(pr),net?r2(pr/net*100):0,r3(x.q)]};
const ACCH=['','المبيعات','المرتجعات','الصافي','التكلفة','الربح','هامش الربح %','الكمية'];
A.accRun=()=>{
  const f=accFilters(),r=accReport(f);ACC.rows=r;ACC.f=f;
  ACCH[0]=GROUPS.find(g=>g[0]===f.g)[1];
  const t=r.tot,net=t.s-t.r,pr=net-t.c;
  $('accOut').innerHTML=`<div class="g2"><div class="card"><div class="mut">إجمالي المبيعات</div><div class="ttl">${money(t.s)}</div></div><div class="card"><div class="mut">المرتجعات</div><div class="ttl">${money(t.r)}</div></div><div class="card"><div class="mut">صافي المبيعات</div><div class="ttl">${money(net)}</div></div>
  <div class="card"><div class="mut">التكلفة</div><div class="ttl">${money(t.c)}</div></div><div class="card"><div class="mut">صافي الربح (هامش ${net?r2(pr/net*100):0}%)</div><div class="ttl" style="color:var(--ok)">${money(pr)}</div></div><div class="card"><div class="mut">عدد الفواتير</div><div class="ttl">${t.n}</div></div>
  <div class="card"><div class="mut">مصروفات نقطة البيع</div><div class="ttl">${money(r.ex)}</div></div><div class="card"><div class="mut">إيرادات نقطة البيع</div><div class="ttl">${money(r.inc)}</div></div></div>
  <div class="card">${r.rows.length?tbl(ACCH,r.rows.map(x=>`<tr>${accRow(x).map((v,i)=>`<td${i?'':' class="l"'}>${i===0?esc(v):i<=5?money(v):i===6?v+'%':fmt(v)}</td>`).join('')}</tr>`).join('')+`<tr style="font-weight:700;background:var(--pl)"><td class="l">الإجمالي</td>${accRow({k:'',s:t.s,r:t.r,c:t.c,q:t.q}).slice(1).map((v,i)=>`<td>${i<5?money(v):i===5?v+'%':v}</td>`).join('')}</tr>`):'<div class="mut">لا توجد بيانات في هذه الفترة</div>'}</div>`;
};
A.accExp=async()=>{
  if(!ACC.rows)A.accRun();const r=ACC.rows,t=r.tot,f=ACC.f;
  const rows=[['من',f.from,'إلى',f.to],['الفرع',f.br||'الكل','نقطة البيع',f.pos||'الكل'],[],ACCH.slice()];
  r.rows.forEach(x=>rows.push(accRow(x)));rows.push(accRow({k:'الإجمالي',s:t.s,r:t.r,c:t.c,q:t.q}));rows.push([],['مصروفات نقطة البيع',r.ex],['إيرادات نقطة البيع',r.inc],['عدد الفواتير',t.n]);
  const p=await saveX(`الحسابات/${dayStr()}`,`تقرير ${f.from} إلى ${f.to} - ${GROUPS.find(g=>g[0]===f.g)[1]}.xlsx`,wbOf([['التقرير',rows]]));if(p)say('تم حفظ التقرير: '+p);
};
