/* ===== التقارير: يومي / Z و X / مبيعات ومقارنة / إقفال الشهر ===== */
const accTabs=cur=>tabs(cur,[['accounts','تقارير مخصصة'],['rpDaily','تقرير يومي'],['rpZ','تقارير Z / X'],['rpCmp','مبيعات ومقارنة'],['rpMonth','إقفال الشهر']],'accTab');
A.accTab=t=>go(t.dataset.v);
const RP={cur:null,cmp:null};
const ymOf=d=>d.slice(0,7);
const pd=s=>new Date(s+'T12:00:00');
const addDays=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return dayStr(d)};
function addMonths(s,n){const d=pd(s),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return dayStr(d)}
const addYears=(s,n)=>addMonths(s,12*n);
const monthRange=ym=>{const [y,m]=ym.split('-').map(Number);return{from:ym+'-01',to:ym+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0')}};

/* --- المُجمِّع: يجمع المبيعات والمرتجعات والتكلفة والضريبة ... حسب فلاتر --- */
function agg(f){
  const r={n:0,sales:0,ret:0,disc:0,cost:0,tax:0,qty:0,byM:{},byCat:{},byBr:{},byHour:{},byDay:{},byUser:{},byProd:{},first:0,last:0};
  const add=(o,k,v)=>{o[k]=(o[k]||0)+v};
  D.sales.forEach(d=>{
    if((f.from&&d.day<f.from)||(f.to&&d.day>f.to)||(f.br&&d.br!==f.br)||(f.ses&&d.session!==f.ses))return;
    const sg=d.type==='return'?-1:1;let amt=0,cost=0,hit=false;
    d.lines.forEach(l=>{
      if(f.cat&&(l.cat||'')!==f.cat)return;hit=true;
      const a=l.price*l.qty,c=l.cost*l.qty,k=l.cat||'بدون فئة';
      amt+=a;cost+=c;r.qty+=l.qty*(l.uf||1)*sg;
      const x=r.byCat[k]=r.byCat[k]||{s:0,c:0,q:0};x.s+=a*sg;x.c+=c*sg;x.q+=l.qty*(l.uf||1)*sg;
      const y=r.byProd[l.n]=r.byProd[l.n]||{s:0,q:0};y.s+=a*sg;y.q+=l.qty*(l.uf||1)*sg;
    });
    if(!hit)return;
    const tot=f.cat?amt:Math.abs(d.total);
    if(sg>0){r.sales+=tot;r.n++;if(!f.cat)r.disc+=(d.disc||0)}else r.ret+=tot;
    r.cost+=cost*sg;if(!f.cat)r.tax+=(d.tax||0);
    add(r.byM,d.method,tot*sg);add(r.byBr,d.br,tot*sg);add(r.byDay,d.day,tot*sg);add(r.byUser,d.user,tot*sg);add(r.byHour,new Date(d.ts).getHours(),sg>0?tot:0);
    if(!r.first||d.no<r.first)r.first=d.no;if(d.no>r.last)r.last=d.no;
  });
  r.net=r2(r.sales-r.ret);r.exTax=r2(r.net-r.tax);r.profit=r2(r.exTax-r.cost);
  r.margin=r.exTax?r2(r.profit/r.exTax*100):0;r.avg=r.n?r2(r.sales/r.n):0;return r;
}
function cashAgg(f){
  const o={ex:0,inc:0,col:{},colT:0};
  D.cash.forEach(c=>{if((f.from&&c.day<f.from)||(f.to&&c.day>f.to)||(f.br&&c.br!==f.br)||(f.ses&&c.session!==f.ses))return;if(c.type==='exp')o.ex+=c.amount;else o.inc+=c.amount});
  D.cpay.forEach(p=>{if((f.from&&p.day<f.from)||(f.to&&p.day>f.to))return;if(f.ses&&p.session!==f.ses)return;o.col[p.method]=(o.col[p.method]||0)+p.amount;o.colT+=p.amount});
  o.ex=r2(o.ex);o.inc=r2(o.inc);o.colT=r2(o.colT);return o;
}
const obj2rows=(o,fn)=>Object.keys(o).sort().map(k=>fn?fn(k,o[k]):[k,r2(o[k])]);

/* --- عرض / تصدير / طباعة أي تقرير --- */
function rpFmt(v,t){return t==='m'?money(v):t==='n'?fmt(v):t==='p'?(fmt(v)+'%'):esc(v)}
function rpHtml(rp){
  return `<h2 style="text-align:center;margin:4px 0">${esc(rp.title)}</h2><div class="mut" style="text-align:center">${esc(rp.meta)}</div>
  ${rp.cards?`<div class="g2" style="margin:10px 0">${rp.cards.map(c=>`<div class="card" style="margin:0"><div class="mut">${esc(c[0])}</div><div class="ttl" style="margin:2px 0">${esc(rpFmt(c[1],c[2]||'m').replace(/&amp;/g,'&'))}</div></div>`).join('')}</div>`:''}
  ${rp.sections.map(s=>`<h3 style="margin:14px 0 4px">${esc(s.h)}</h3>${s.rows.length?tbl(s.head,s.rows.map(r=>`<tr>${r.map((v,i)=>`<td${i===0?' class="l"':''}>${rpFmt(v,s.t[i])}</td>`).join('')}</tr>`).join('')):'<div class="mut">لا توجد بيانات</div>'}`).join('')}`;
}
function rpShow(rp,tab){
  RP.cur=rp;
  $('rpOut').innerHTML=`<div class="row" style="margin-bottom:8px"><button class="p" data-a="rpPrint">🖨 طباعة A4</button><button data-a="rpExcel">⬇️ تصدير Excel</button>${rp.z?'<button data-a="rpPrintZ">🧾 طباعة 90 مم</button>':''}${rp.close?'<button class="p" data-a="rpClose">🔒 اعتماد الإقفال</button>':''}</div><div class="card">${rpHtml(rp)}</div>`;
}
A.rpPrint=()=>printHtml(`<img class="pl" src="${logoSrc()}" alt="">`+rpHtml(RP.cur).replace(/class="tw"/g,''),'a4');
A.rpExcel=async()=>{
  const rp=RP.cur,rows=[[rp.title],[rp.meta],[]];
  (rp.cards||[]).forEach(c=>rows.push([c[0],c[1]]));
  rp.sections.forEach(s=>{rows.push([],[s.h],s.head);s.rows.forEach(r=>rows.push(r))});
  const p=await saveX(`الحسابات/${rp.folder||'تقارير'}`,`${rp.title}.xlsx`.replace(/[\\/:*?"<>|]/g,'-'),wbOf([['التقرير',rows]]));
  if(p)say('تم حفظ الملف: '+p);
};
const cardsOf=a=>[['عدد الفواتير',a.n,'n'],['إجمالي المبيعات',a.sales],['المرتجعات',a.ret],['الصافي',a.net],['الضريبة',a.tax],['الخصومات',a.disc],['التكلفة',a.cost],['الربح (بدون الضريبة)',a.profit],['هامش الربح',a.margin,'p'],['متوسط الفاتورة',a.avg]];

/* ===== تقرير يومي ===== */
V.rpDaily=()=>{
  if(!can('acc_reports')){say('ليس لديك صلاحية الحسابات',1);return go('home')}
  setMain(`<div class="ttl">الحسابات</div>${accTabs('rpDaily')}<div class="card"><div class="row"><input type="date" id="rdD" value="${dayStr()}" style="max-width:190px"><select id="rdB" style="max-width:220px"><option value="">كل الفروع</option>${BR.map(b=>`<option>${esc(b)}</option>`).join('')}</select><button class="p" data-a="rdRun">عرض التقرير اليومي</button></div></div><div id="rpOut"></div>`);
  A.rdRun();
};
A.rdRun=()=>{
  const day=$('rdD').value,br=$('rdB').value,f={from:day,to:day,br},a=agg(f),c=cashAgg(f);
  const sess=D.sessions.filter(s=>s.day===day&&(!br||s.br===br));
  const pur=D.purchases.filter(d=>d.status==='received'&&d.date===day&&(!br||d.br===br)),pret=D.pret.filter(x=>x.date===day&&(!br||x.br===br));
  const top=Object.keys(a.byProd).map(k=>[k,r3(a.byProd[k].q),r2(a.byProd[k].s)]).sort((x,y)=>y[2]-x[2]).slice(0,10);
  rpShow({title:'التقرير اليومي '+day+(br?' - '+br:''),meta:'تاريخ الطباعة: '+nowStr(),folder:'تقارير يومية',cards:cardsOf(a).concat([['المصروفات',c.ex],['الإيرادات',c.inc],['تحصيلات العملاء',c.colT]]),
    sections:[
     {h:'حسب طريقة الدفع',head:['الطريقة','الصافي'],t:'sm',rows:obj2rows(a.byM)},
     {h:'حسب الفرع',head:['الفرع','الصافي'],t:'sm',rows:obj2rows(a.byBr)},
     {h:'حسب فئة المنتج',head:['الفئة','المبيعات','التكلفة','الربح','الكمية'],t:'smmmn',rows:Object.keys(a.byCat).sort().map(k=>[k,r2(a.byCat[k].s),r2(a.byCat[k].c),r2(a.byCat[k].s-a.byCat[k].c),r3(a.byCat[k].q)])},
     {h:'حسب الكاشير',head:['الموظف','الصافي'],t:'sm',rows:obj2rows(a.byUser)},
     {h:'المبيعات بالساعة',head:['الساعة','المبيعات'],t:'sm',rows:Object.keys(a.byHour).map(Number).sort((x,y)=>x-y).map(h=>[h+':00',r2(a.byHour[h])])},
     {h:'أعلى 10 منتجات',head:['المنتج','الكمية','المبيعات'],t:'smn'.replace('n','n').slice(0,1)+'nm',rows:top},
     {h:'الجلسات',head:['#','الفرع','النقطة','الموظف','الحالة','فرق الجلسة'],t:'ssssss',rows:sess.map(s=>[s.id,s.br,s.pos,s.user,s.status==='open'?'مفتوحة':'مغلقة',s.status==='closed'?diffTxt(s.diff):'—'])},
     {h:'المشتريات المستلمة اليوم',head:['#','المورد','الفرع','القيمة'],t:'sssm',rows:pur.map(d=>[d.id,d.supName,d.br,puTotal(d)])},
     {h:'مرتجعات الموردين اليوم',head:['#','المورد','القيمة'],t:'ssm',rows:pret.map(x=>[x.id,x.supName,x.total])}
    ]});
};

/* ===== تقارير Z و X ===== */
V.rpZ=()=>{
  if(!can('acc_reports')){say('ليس لديك صلاحية الحسابات',1);return go('home')}
  const l=D.sessions.slice().sort((a,b)=>b.id-a.id).slice(0,100);
  setMain(`<div class="ttl">الحسابات</div>${accTabs('rpZ')}<div class="card"><div class="mut" style="margin-bottom:6px">تقرير Z للجلسة المغلقة (نهائي)، وتقرير X للجلسة المفتوحة (جاري ولا يُغلق الجلسة).</div>${l.length?tbl(['#','الفرع','نقطة البيع','الموظف','الفتح','الحالة',''],l.map(s=>`<tr><td>${s.id}</td><td>${esc(s.br)}</td><td>${esc(s.pos)}</td><td>${esc(s.user)}</td><td>${esc(s.odt)}</td><td>${s.status==='open'?'<span class="badge b-draft">مفتوحة</span>':'<span class="badge b-done">مغلقة</span>'}</td><td><button class="p" data-a="zRun" data-id="${s.id}">${s.status==='open'?'تقرير X':'تقرير Z'}</button></td></tr>`).join('')):'<div class="mut">لا توجد جلسات</div>'}</div><div id="rpOut"></div>`);
};
A.zRun=t=>{
  const s=D.sessions.find(x=>x.id===+t.dataset.id),a=agg({ses:s.id}),c=cashAgg({ses:s.id}),sc=sesCalc(s.id),kind=s.status==='open'?'X':'Z';
  const bm=METHODS.map(m=>[m,r2(sc.m[m].s),r2(-sc.m[m].r),r2(sc.m[m].s+sc.m[m].r)]);
  const rows=[['رقم الجلسة',s.id],['الفرع',s.br],['نقطة البيع',s.pos],['الموظف',s.user],['وقت الفتح',s.odt],['وقت الإغلاق',s.cdt||'—'],['رصيد بداية الدرج',money(s.opening)],['أرقام الفواتير',a.n?pno(a.first)+' → '+pno(a.last):'—']];
  const sec=[
    {h:'بيانات الجلسة',head:['البند','القيمة'],t:'ss',rows},
    {h:'حسب طريقة الدفع',head:['الطريقة','المبيعات','المرتجعات','الصافي'],t:'smmm',rows:bm},
    {h:'مصروفات وإيرادات الجلسة',head:['البند','القيمة'],t:'sm',rows:[['المصروفات',c.ex],['الإيرادات',c.inc],['تحصيلات من العملاء',c.colT]]}];
  if(s.status==='closed')sec.push({h:'جرد الدرج عند الإغلاق',head:['الطريقة','المتوقع','الفعلي','الفرق'],t:'smmm',rows:METHODS.filter(m=>s.act&&s.act[m]!==undefined).map(m=>[m,s.exp[m],s.act[m],s.df[m]])});
  const rp={title:`تقرير ${kind} - جلسة ${s.id} - ${s.br} ${s.pos}`,meta:'تاريخ الطباعة: '+nowStr(),folder:'تقارير Z',z:s,cards:cardsOf(a).concat(s.status==='closed'?[['إجمالي فرق الجلسة',s.diff]]:[]),sections:sec};
  rpShow(rp);
};
A.rpPrintZ=()=>{
  const rp=RP.cur,s=rp.z,a=agg({ses:s.id}),c=cashAgg({ses:s.id}),sc=sesCalc(s.id);
  const row=(k,v)=>`<div class="rr"><span>${esc(k)}</span><span>${esc(v)}</span></div>`;
  printHtml(`<img src="${logoSrc()}" alt=""><div class="t">تقرير ${s.status==='open'?'X (جاري)':'Z'} — جلسة ${s.id}</div><div class="c">${esc(s.br)} — ${esc(s.pos)}</div><div class="c">${esc(s.user)}</div><div class="c">${esc(s.odt)}${s.cdt?' → '+esc(s.cdt):''}</div><hr>
  ${row('عدد الفواتير',a.n)}${row('إجمالي المبيعات',money(a.sales))}${row('المرتجعات',money(a.ret))}${row('الخصومات',money(a.disc))}${row('الضريبة',money(a.tax))}${row('الصافي',money(a.net))}<hr>
  ${METHODS.map(m=>sc.m[m].s||sc.m[m].r?row(m,money(sc.m[m].s+sc.m[m].r)):'').join('')}<hr>
  ${row('رصيد بداية الدرج',money(s.opening))}${row('المصروفات',money(c.ex))}${row('الإيرادات',money(c.inc))}${row('تحصيلات العملاء',money(c.colT))}
  ${s.status==='closed'?`<hr>${row('النقدي المتوقع',money(s.exp['نقدي']))}${row('النقدي الفعلي',money(s.act['نقدي']||0))}${row('الفرق',diffTxt(s.df['نقدي']||0))}${row('إجمالي فرق الجلسة',diffTxt(s.diff))}`:''}
  <hr><div class="c">${esc(nowStr())}</div>`,'rcpt');
};

/* ===== مبيعات ومقارنة بفترات مماثلة ===== */
V.rpCmp=()=>{
  if(!can('acc_reports')){say('ليس لديك صلاحية الحسابات',1);return go('home')}
  const t=dayStr();
  setMain(`<div class="ttl">الحسابات</div>${accTabs('rpCmp')}<div class="card"><div class="row"><select id="rcP" data-c="rcP" style="max-width:130px"><option value="day">يوم</option><option value="month">شهر</option><option value="year">سنة</option></select>
  <span id="rcIn"><input type="date" id="rcV" value="${t}" style="max-width:190px"></span><select id="rcB" style="max-width:200px"><option value="">كل الفروع</option>${BR.map(b=>`<option>${esc(b)}</option>`).join('')}</select>
  <select id="rcC" style="max-width:220px"><option value="">كل الفئات</option>${distinct('cat').map(c=>`<option>${esc(c)}</option>`).join('')}</select><button class="p" data-a="rcRun">عرض المقارنة</button></div></div><div id="rpOut"></div>`);
  A.rcRun();
};
C.rcP=t=>{const p=t.value,d=dayStr();$('rcIn').innerHTML=p==='day'?`<input type="date" id="rcV" value="${d}" style="max-width:190px">`:p==='month'?`<input type="month" id="rcV" value="${d.slice(0,7)}" style="max-width:190px">`:`<input type="number" id="rcV" value="${d.slice(0,4)}" style="max-width:120px">`};
function periodRange(p,v){
  if(p==='day')return{from:v,to:v};
  if(p==='month')return monthRange(v);
  return{from:v+'-01-01',to:v+'-12-31'};
}
function shiftPeriod(p,v,kind){
  if(p==='day')return kind==='w'?addDays(v,-7):kind==='m'?addMonths(v,-1):addYears(v,-1);
  if(p==='month'){const d=addMonths(v+'-01',kind==='y'?-12:-1);return d.slice(0,7)}
  return String(+v-1);
}
A.rcRun=()=>{
  const p=$('rcP').value,v=$('rcV').value,br=$('rcB').value,cat=$('rcC').value;if(!v){say('اختر الفترة',1);return}
  const kinds=p==='day'?[['w','نفس اليوم الأسبوع الماضي'],['m','نفس التاريخ الشهر الماضي'],['y','نفس التاريخ العام الماضي']]:p==='month'?[['m','الشهر السابق'],['y','نفس الشهر العام الماضي']]:[['y','السنة السابقة']];
  const cur=agg(Object.assign(periodRange(p,v),{br,cat}));
  const comps=kinds.map(k=>{const pv=shiftPeriod(p,v,k[0]);return{label:k[1]+' ('+pv+')',a:agg(Object.assign(periodRange(p,pv),{br,cat}))}});
  const M=[['عدد الفواتير','n','n'],['إجمالي المبيعات','sales','m'],['المرتجعات','ret','m'],['الصافي','net','m'],['التكلفة','cost','m'],['الربح','profit','m'],['هامش الربح %','margin','p'],['متوسط الفاتورة','avg','m'],['الضريبة','tax','m'],['الخصومات','disc','m']];
  const pct=(a,b)=>b?r2((a-b)/Math.abs(b)*100):(a?100:0);
  const head=['المقياس','الفترة الحالية'].concat(...comps.map(c=>[c.label,'الفرق %']));
  const rows=M.map(m=>[m[0],cur[m[1]]].concat(...comps.map(c=>[c.a[m[1]],pct(cur[m[1]],c.a[m[1]])])));
  const types='s'+'m'.repeat(0)+Array(1+comps.length*2).fill('m').join('');
  const catRows=Object.keys(cur.byCat).concat(...comps.map(c=>Object.keys(c.a.byCat))).filter((x,i,a)=>a.indexOf(x)===i).sort().map(k=>[k,r2((cur.byCat[k]||{s:0}).s)].concat(...comps.map(c=>{const b=(c.a.byCat[k]||{s:0}).s;return[r2(b),pct((cur.byCat[k]||{s:0}).s,b)]})));
  const trendKeys=Object.keys(cur.byDay).sort();
  const sec=[{h:'مقارنة المؤشرات',head,t:'s'+Array(head.length-1).fill('m').join(''),rows},
    {h:'مقارنة حسب فئة المنتج',head:['الفئة','الحالي'].concat(...comps.map(c=>[c.label,'الفرق %'])),t:'s'+Array(head.length-1).fill('m').join(''),rows:catRows}];
  if(p!=='day')sec.push({h:p==='month'?'المبيعات اليومية':'المبيعات اليومية (أيام الفترة)',head:['اليوم','الصافي'],t:'sm',rows:trendKeys.map(k=>[k,r2(cur.byDay[k])])});
  rpShow({title:`مبيعات ${p==='day'?'يوم':p==='month'?'شهر':'سنة'} ${v}${br?' - '+br:''}${cat?' - '+cat:''}`,meta:'مقارنة بفترات مماثلة — '+nowStr(),folder:'مبيعات ومقارنة',cards:cardsOf(cur),sections:sec});
};

/* ===== إقفال الشهر ===== */
V.rpMonth=()=>{
  if(!can('acc_reports')){say('ليس لديك صلاحية الحسابات',1);return go('home')}
  const prev=addMonths(dayStr(),-1).slice(0,7);
  setMain(`<div class="ttl">الحسابات</div>${accTabs('rpMonth')}<div class="card"><div class="row"><input type="month" id="rmM" value="${prev}" style="max-width:190px"><select id="rmB" style="max-width:220px"><option value="">كل الفروع</option>${BR.map(b=>`<option>${esc(b)}</option>`).join('')}</select><button class="p" data-a="rmRun">عرض تقرير الإقفال</button></div></div><div id="rpOut"></div>
  <div class="card"><div class="ttl">الإقفالات المعتمدة سابقًا</div>${D.closings.length?tbl(['الشهر','الفرع','المبيعات','الصافي','الربح','بواسطة','التاريخ'],D.closings.slice().reverse().map(c=>`<tr><td>${esc(c.ym)}</td><td>${esc(c.br||'الكل')}</td><td>${money(c.sales)}</td><td>${money(c.net)}</td><td>${money(c.profit)}</td><td>${esc(c.by)}</td><td>${esc(c.at)}</td></tr>`).join('')):'<div class="mut">لا توجد إقفالات</div>'}</div>`);
};
A.rmRun=()=>{
  const ym=$('rmM').value,br=$('rmB').value;if(!ym){say('اختر الشهر',1);return}
  const R=monthRange(ym),f=Object.assign({},R,{br}),a=agg(f),c=cashAgg(f);
  const inM=d=>d>=R.from&&d<=R.to;
  const pur=D.purchases.filter(d=>d.status==='received'&&inM(d.date)&&(!br||d.br===br)),pret=D.pret.filter(x=>inM(x.date)&&(!br||x.br===br));
  const purT=r2(pur.reduce((s,d)=>s+puTotal(d),0)),pretT=r2(pret.reduce((s,x)=>s+x.total,0));
  const pays=D.payments.filter(x=>inM(x.day)),payT=r2(pays.reduce((s,x)=>s+x.amount,0));
  const bySup={};pur.forEach(d=>{bySup[d.supName]=(bySup[d.supName]||0)+puTotal(d)});
  const sess=D.sessions.filter(s=>inM(s.day)&&(!br||s.br===br)),open=sess.filter(s=>s.status==='open').length,diff=r2(sess.reduce((s,x)=>s+(x.diff||0),0));
  const pr=D.payrolls[ym],payroll=pr?r2(pr.lines.reduce((s,l)=>s+l.net,0)):0;
  const debts=r2(D.customers.reduce((s,x)=>s+Math.max(0,cusBalance(x.id)),0));
  const fin=r2(a.profit-c.ex+c.inc-payroll);
  const rp={title:'تقرير إقفال شهر '+ym+(br?' - '+br:''),meta:'تاريخ الطباعة: '+nowStr()+(open?` — تنبيه: يوجد ${open} جلسة مفتوحة في هذا الشهر`:''),folder:'إقفال الشهور',close:{ym,br,sales:a.sales,net:a.net,profit:a.profit},
    cards:cardsOf(a).concat([['المصروفات',c.ex],['الإيرادات',c.inc],['تحصيلات العملاء',c.colT],['المشتريات المستلمة',purT],['مرتجعات الموردين',pretT],['دفعات الموردين',payT],['المرتبات المعتمدة',payroll],['فروق الجلسات',diff],['ديون العملاء الحالية',debts],['الربح بعد المصروفات والمرتبات',fin]]),
    sections:[
     {h:'حسب الفرع',head:['الفرع','الصافي'],t:'sm',rows:obj2rows(a.byBr)},
     {h:'حسب طريقة الدفع',head:['الطريقة','الصافي'],t:'sm',rows:obj2rows(a.byM)},
     {h:'حسب فئة المنتج',head:['الفئة','المبيعات','التكلفة','الربح','الكمية'],t:'smmmn',rows:Object.keys(a.byCat).sort().map(k=>[k,r2(a.byCat[k].s),r2(a.byCat[k].c),r2(a.byCat[k].s-a.byCat[k].c),r3(a.byCat[k].q)])},
     {h:'المبيعات اليومية',head:['اليوم','الصافي'],t:'sm',rows:obj2rows(a.byDay)},
     {h:'المشتريات حسب المورد',head:['المورد','القيمة'],t:'sm',rows:Object.keys(bySup).sort().map(k=>[k,r2(bySup[k])])},
     {h:'الجلسات',head:['#','الفرع','النقطة','الموظف','الحالة','الفرق'],t:'ssssss',rows:sess.map(s=>[s.id,s.br,s.pos,s.user,s.status==='open'?'مفتوحة':'مغلقة',s.status==='closed'?s.diff:'—'])}]};
  rpShow(rp);
};
A.rpClose=async()=>{
  const c=RP.cur.close;if(!can('acc_reports'))return;
  if(D.closings.some(x=>x.ym===c.ym&&(x.br||'')===(c.br||''))&&!(await dlg('هذا الشهر تم اعتماد إقفاله سابقًا. اعتماد نسخة جديدة؟',{yes:'اعتماد'})))return;
  D.closings.push(Object.assign({at:nowStr(),by:ME.name},c));save('closings');
  await A.rpExcel();say('تم اعتماد إقفال شهر '+c.ym);V.rpMonth();
};
