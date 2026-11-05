/* ===== الموارد البشرية: الحضور (البصمة) + الإضافي + الخصومات + البدلات + التأمينات + المرتبات + سند المرتب ===== */
const hrTabs=cur=>tabs(cur,[['employees','الموظفون والصلاحيات'],['hrAtt','الحضور والانصراف'],['hrPay','المرتبات'],['hrAdv','السلف والتسويات']],'hrTab');
A.hrTab=t=>go(t.dataset.v);
const HRD={salary:0,allow:{transport:0,housing:0,meal:0,other:0},insOn:false,insWage:0,insEmp:11,insCo:18.75,taxFix:0,shiftStart:'09:00',shiftEnd:'17:00',off:[5],grace:10,otRate:1.5,otAfter:30,absF:1,lateF:1,hours:8,code:''};
const hrOf=e=>Object.assign({},HRD,e.hr||{},{allow:Object.assign({},HRD.allow,(e.hr||{}).allow||{})});
const ALW=[['transport','بدل مواصلات'],['housing','بدل سكن'],['meal','بدل وجبات'],['other','بدلات أخرى']];
const ADJ=[['bonus','مكافأة'],['allow','بدل إضافي (هذا الشهر)'],['ot','إضافي بالمبلغ'],['penalty','جزاء'],['ded','خصم آخر']];
const adjLabel=t=>(ADJ.find(x=>x[0]===t)||[t,t])[1];
const toMin=t=>{if(t==null||t==='')return null;const m=/^(\d{1,2}):(\d{2})/.exec(String(t));return m?(+m[1])*60+(+m[2]):null};
const minStr=m=>m==null?'':String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const empById=id=>D.employees.find(e=>e.id===id);
const monthDays=ym=>{const R=monthRange(ym),o=[];for(let d=R.from;d<=R.to;d=addDays(d,1))o.push(d);return o};

/* --- يوم واحد لموظف --- */
function dayInfo(e,day){
  const h=hrOf(e),rec=D.att[e.id+'|'+day]||{},dow=pd(day).getDay();
  const off=h.off.includes(dow)||(D.set.holidays||[]).includes(day)||rec.st==='off';
  const base={rec,late:0,early:0,ot:0,off};
  if(rec.st==='leave')return Object.assign(base,{st:'leave'});
  if(rec.st==='absent')return Object.assign(base,{st:'absent'});
  const inM=toMin(rec.in),outM=toMin(rec.out),s=toMin(h.shiftStart),en=toMin(h.shiftEnd);
  if(inM==null){
    if(day>dayStr())return Object.assign(base,{st:'future'});
    return Object.assign(base,{st:off?'off':'absent'});
  }
  if(off)return Object.assign(base,{st:'present',ot:outM!=null?Math.max(0,outM-inM):0});
  const late=Math.max(0,inM-s-h.grace);
  let early=0,ot=0;
  if(outM!=null){early=Math.max(0,en-outM);const x=outM-en;ot=x>=h.otAfter?x:0}
  return Object.assign(base,{st:'present',late,early,ot});
}
function monthSum(e,ym){
  const o={present:0,absent:0,leave:0,off:0,lateMin:0,earlyMin:0,otMin:0};
  monthDays(ym).forEach(d=>{const i=dayInfo(e,d);if(i.st==='present'){o.present++;o.lateMin+=i.late;o.earlyMin+=i.early;o.otMin+=i.ot}else if(i.st==='absent')o.absent++;else if(i.st==='leave')o.leave++;else if(i.st==='off')o.off++});
  return o;
}
/* --- حساب مرتب شهر --- */
function advDue(e){return D.adv.filter(a=>a.emp===e.id&&a.amount-a.paid>0.005).map(a=>({a,v:r2(Math.min(a.inst>0?a.inst:a.amount,a.amount-a.paid))}))}
function calcPay(e,ym){
  const h=hrOf(e),s=monthSum(e,ym),daily=h.salary/30,hourly=daily/(h.hours||8);
  const adj=t=>r2(D.hradj.filter(x=>x.emp===e.id&&x.ym===ym&&x.type===t).reduce((a,x)=>a+x.amount,0));
  const allowFixed=r2(Object.values(h.allow).reduce((a,b)=>a+(+b||0),0));
  const ot=r2(s.otMin/60*hourly*h.otRate)+adj('ot'),bonus=adj('bonus'),extra=adj('allow');
  const gross=r2(h.salary+allowFixed+extra+ot+bonus);
  const absence=r2(s.absent*daily*h.absF),late=r2((s.lateMin+s.earlyMin)/60*hourly*h.lateF),penalty=adj('penalty'),other=adj('ded');
  const advance=r2(advDue(e).reduce((a,x)=>a+x.v,0));
  const ins=h.insOn?r2(h.insWage*h.insEmp/100):0,insCo=h.insOn?r2(h.insWage*h.insCo/100):0,tax=+h.taxFix||0;
  const ded=r2(absence+late+penalty+other+advance+ins+tax);
  return{emp:e.id,name:e.name,job:e.job,dept:e.dept,ym,salary:h.salary,allow:r2(allowFixed+extra),ot,bonus,gross,absence,late,penalty,other,advance,ins,insCo,tax,ded,net:r2(gross-ded),
    days:s.present,absent:s.absent,leave:s.leave,lateMin:s.lateMin+s.earlyMin,otMin:s.otMin};
}

/* ===== استيراد ملف البصمة ===== */
function toDT(v){
  if(v===''||v==null)return null;
  if(typeof v==='number'){const d=new Date(Math.round((v-25569)*86400000));return{day:d.getUTCFullYear()+'-'+p2(d.getUTCMonth()+1)+'-'+p2(d.getUTCDate()),min:d.getUTCHours()*60+d.getUTCMinutes()}}
  const s=String(v).trim();let m=/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T]+(\d{1,2}):(\d{2})/.exec(s);
  if(m)return{day:m[1]+'-'+p2(+m[2])+'-'+p2(+m[3]),min:+m[4]*60+ +m[5]};
  m=/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})[ T]+(\d{1,2}):(\d{2})/.exec(s);
  if(m)return{day:m[3]+'-'+p2(+m[2])+'-'+p2(+m[1]),min:+m[4]*60+ +m[5]};
  return null;
}
function toDay(v){
  if(typeof v==='number'){return toDT(Math.floor(v)).day}
  const x=toDT(String(v)+' 00:00');return x?x.day:null;
}
function toTime(v){
  if(v===''||v==null)return null;
  if(typeof v==='number')return v<1?Math.round(v*1440):null;
  return toMin(String(v));
}
const ASPEC=[['dt',/وقت|time|datetime|date.?time/],['in',/^(دخول|حضور|check.?in|in|time.?in)$/],['out',/^(خروج|انصراف|check.?out|out|time.?out)$/],['date',/تاريخ|date|day|اليوم/],['code',/كود|رقم|id|code|no/],['name',/اسم|name|employee|الموظف/]];
function importAtt(rows){
  if(!rows.length)return null;
  const col=mapCols(rows.shift(),ASPEC);
  if(col.name===undefined&&col.code===undefined)return{err:'لم أجد عمود اسم أو كود الموظف'};
  if(col.dt===undefined&&col.date===undefined)return{err:'لم أجد عمود التاريخ/الوقت'};
  const byCode={},byName={};D.employees.forEach(e=>{const c=String(hrOf(e).code||'').trim();if(c)byCode[c]=e;byName[nm(e.name)]=e});
  const pun={},unm={};let n=0;
  rows.forEach(r=>{
    const code=col.code!==undefined?cell(r[col.code]):'',name=col.name!==undefined?cell(r[col.name]):'';
    const e=(code&&byCode[code])||(name&&byName[nm(name)]);
    if(!e){const k=name||code;if(k)unm[k]=1;return}
    let day=null,tm=[];
    if(col.dt!==undefined){const x=toDT(r[col.dt]);if(x){day=x.day;tm=[x.min]}}
    if(day===null&&col.date!==undefined){day=toDay(r[col.date]);[col.in,col.out].forEach(c=>{if(c!==undefined){const t=toTime(r[c]);if(t!=null)tm.push(t)}})}
    if(!day||!tm.length)return;
    const k=e.id+'|'+day,p=pun[k]=pun[k]||{min:Infinity,max:-1};tm.forEach(t=>{p.min=Math.min(p.min,t);p.max=Math.max(p.max,t)});n++;
  });
  Object.keys(pun).forEach(k=>{const p=pun[k],rec=D.att[k]=D.att[k]||{};rec.in=minStr(p.min);rec.out=p.max>p.min?minStr(p.max):'';if(rec.st==='absent')rec.st=''});
  save('att');return{n,days:Object.keys(pun).length,unmatched:Object.keys(unm)};
}

/* ===== شاشة الحضور والانصراف ===== */
const HA={ym:dayStr().slice(0,7),emp:''};
V.hrAtt=()=>{
  if(!can('hr_att')){say('ليس لديك صلاحية الحضور والانصراف',1);return go('home')}
  setMain(`<div class="ttl">الموارد البشرية</div>${hrTabs('hrAtt')}<div class="card"><div class="row"><input type="month" id="haM" value="${HA.ym}" data-c="haF" style="max-width:190px"><select id="haE" data-c="haF" style="max-width:260px"><option value="">كل الموظفين (ملخص)</option>${D.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}"${HA.emp===e.id?' selected':''}>${esc(e.name)}</option>`).join('')}</select>
  <button class="p" data-a="haImp">⬆️ رفع ملف البصمة (Excel)</button><button data-a="haHol">📅 إضافة عطلة رسمية</button></div><div class="mut" style="margin-top:6px">الأعمدة المقبولة: اسم/كود الموظف + التاريخ والوقت (كل بصمة في سطر) أو تاريخ + دخول + خروج. العطلات الرسمية: ${(D.set.holidays||[]).join('، ')||'—'}</div></div><div class="card" id="haL"></div>`);
  haList();
};
C.haF=()=>{HA.ym=$('haM').value||HA.ym;HA.emp=$('haE').value;haList()};
function haList(){
  const ym=HA.ym,L=$('haL');
  if(!HA.emp){
    const rows=D.employees.filter(e=>e.active!==false).map(e=>{const s=monthSum(e,ym);return `<tr class="clk" data-a="haOpen" data-id="${e.id}"><td class="l">${esc(e.name)}</td><td>${s.present}</td><td style="color:${s.absent?'var(--bad)':'inherit'}">${s.absent}</td><td>${s.leave}</td><td>${s.lateMin}</td><td>${s.earlyMin}</td><td>${fmt(r2(s.otMin/60))}</td></tr>`}).join('');
    L.innerHTML=tbl(['الموظف','أيام الحضور','أيام الغياب','إجازات','تأخير (دقيقة)','انصراف مبكر (دقيقة)','إضافي (ساعة)'],rows);return;
  }
  const e=empById(HA.emp);
  L.innerHTML=tbl(['اليوم','الدخول','الخروج','الحالة','تأخير','مبكر','إضافي (دقيقة)'],monthDays(ym).map(d=>{
    const i=dayInfo(e,d),r=i.rec,ed=can('hr_att');
    const st=i.st==='present'?'حاضر':i.st==='absent'?'<b style="color:var(--bad)">غياب</b>':i.st==='leave'?'إجازة':i.st==='off'?'عطلة':'—';
    return `<tr><td>${d} ${['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'][pd(d).getDay()]}</td><td><input type="time" value="${esc(r.in||'')}" data-c="haRec" data-d="${d}" data-f="in" style="min-width:110px"${ed?'':' disabled'}></td><td><input type="time" value="${esc(r.out||'')}" data-c="haRec" data-d="${d}" data-f="out" style="min-width:110px"${ed?'':' disabled'}></td>
    <td><select data-c="haRec" data-d="${d}" data-f="st"${ed?'':' disabled'}><option value="">تلقائي (${st.replace(/<[^>]+>/g,'')})</option><option value="leave"${r.st==='leave'?' selected':''}>إجازة مدفوعة</option><option value="absent"${r.st==='absent'?' selected':''}>غياب</option><option value="off"${r.st==='off'?' selected':''}>عطلة</option></select></td><td>${i.late||''}</td><td>${i.early||''}</td><td>${i.ot||''}</td></tr>`}).join(''));
}
A.haOpen=t=>{HA.emp=t.dataset.id;$('haE').value=HA.emp;haList()};
C.haRec=t=>{
  const k=HA.emp+'|'+t.dataset.d,rec=D.att[k]=D.att[k]||{};rec[t.dataset.f]=t.value;
  if(!rec.in&&!rec.out&&!rec.st)delete D.att[k];save('att');haList();
};
A.haHol=async()=>{
  const r=await formDlg('عطلة رسمية',[{k:'d',l:'التاريخ',t:'date',v:dayStr()}],'إضافة');if(!r||!r.d)return;
  D.set.holidays=D.set.holidays||[];if(!D.set.holidays.includes(r.d))D.set.holidays.push(r.d);save('set');V.hrAtt();
};
A.haImp=()=>{
  const inp=document.createElement('input');inp.type='file';inp.accept='.xlsx,.xls,.csv';
  inp.onchange=async()=>{
    const f=inp.files[0];if(!f)return;const r=importAtt(await readRows(f));
    if(!r||r.err){say(r?r.err:'الملف فارغ',1);return}
    say(`تم رفع البصمة: ${r.days} يوم حضور من ${r.n} بصمة`+(r.unmatched.length?` — غير مطابق: ${r.unmatched.slice(0,5).join('، ')}`:''),!!r.unmatched.length);haList();
  };
  inp.click();
};

/* ===== السلف والتسويات ===== */
V.hrAdv=()=>{
  if(!can('hr_pay')){say('ليس لديك صلاحية المرتبات',1);return go('home')}
  const ym=HA.ym,emps=D.employees.filter(e=>e.active!==false);
  setMain(`<div class="ttl">الموارد البشرية</div>${hrTabs('hrAdv')}
  <div class="card"><div class="row"><div class="ttl" style="flex:1;margin:0">تسويات الشهر</div><input type="month" id="hvM" value="${ym}" data-c="hvF" style="max-width:190px"><button class="p" data-a="adjAdd">➕ إضافة (مكافأة / جزاء / إضافي / بدل / خصم)</button></div>
   <div id="hvL"></div></div>
  <div class="card"><div class="row"><div class="ttl" style="flex:1;margin:0">السلف</div><button class="p" data-a="advAdd">➕ سلفة جديدة</button></div>
   ${D.adv.length?tbl(['الموظف','التاريخ','المبلغ','القسط الشهري','المسدد','المتبقي','ملاحظة'],D.adv.slice().reverse().map(a=>`<tr><td class="l">${esc((empById(a.emp)||{}).name||'')}</td><td>${esc(a.date)}</td><td>${money(a.amount)}</td><td>${money(a.inst)}</td><td>${money(a.paid)}</td><td><b>${money(a.amount-a.paid)}</b></td><td class="l">${esc(a.note)}</td></tr>`).join('')):'<div class="mut">لا توجد سلف</div>'}</div>`);
  hvList();
};
C.hvF=()=>{HA.ym=$('hvM').value||HA.ym;hvList()};
function hvList(){
  const l=D.hradj.filter(x=>x.ym===HA.ym);
  $('hvL').innerHTML=l.length?tbl(['الموظف','النوع','المبلغ','ملاحظة','بواسطة',''],l.map(x=>`<tr><td class="l">${esc((empById(x.emp)||{}).name||'')}</td><td>${esc(adjLabel(x.type))}</td><td>${money(x.amount)}</td><td class="l">${esc(x.note)}</td><td>${esc(x.user)}</td><td><button class="d" data-a="adjDel" data-id="${x.id}">حذف</button></td></tr>`).join('')):'<div class="mut">لا توجد تسويات لهذا الشهر</div>';
}
A.adjAdd=async()=>{
  const emps=D.employees.filter(e=>e.active!==false).map(e=>e.name);if(!emps.length){say('لا يوجد موظفون',1);return}
  const r=await formDlg('تسوية مرتب — شهر '+HA.ym,[{k:'e',l:'الموظف',t:'select',o:emps},{k:'t',l:'النوع',t:'select',o:ADJ.map(x=>x[1])},{k:'a',l:'المبلغ',t:'number'},{k:'n',l:'ملاحظة',t:'text'}],'إضافة');if(!r)return;
  const e=D.employees.find(x=>x.name===r.e),t=(ADJ.find(x=>x[1]===r.t)||ADJ[0])[0],a=num(r.a);
  if(!e||isNaN(a)||a<=0){say('اكتب مبلغًا صحيحًا',1);return}
  D.hradj.push({id:++D.cnt.adj,emp:e.id,ym:HA.ym,type:t,amount:a,note:norm(r.n),user:ME.name});save('hradj','cnt');V.hrAdv();
};
A.adjDel=t=>{D.hradj=D.hradj.filter(x=>x.id!==+t.dataset.id);save('hradj');V.hrAdv()};
A.advAdd=async()=>{
  const emps=D.employees.filter(e=>e.active!==false).map(e=>e.name);
  const r=await formDlg('سلفة موظف',[{k:'e',l:'الموظف',t:'select',o:emps},{k:'a',l:'مبلغ السلفة',t:'number'},{k:'i',l:'القسط الشهري',t:'number'},{k:'n',l:'ملاحظة',t:'text'}],'تسجيل');if(!r)return;
  const e=D.employees.find(x=>x.name===r.e),a=num(r.a),i=num(r.i);
  if(!e||isNaN(a)||a<=0){say('اكتب مبلغ السلفة',1);return}
  D.adv.push({id:++D.cnt.adv,emp:e.id,amount:a,inst:(isNaN(i)||i<=0)?a:i,paid:0,date:dayStr(),note:norm(r.n)});save('adv','cnt');V.hrAdv();
};

/* ===== المرتبات وسند المرتب ===== */
const HP={ym:addMonths(dayStr(),-1).slice(0,7)};
function payLines(ym){const ap=D.payrolls[ym];return ap?ap.lines:D.employees.filter(e=>e.active!==false&&hrOf(e).salary>0).map(e=>calcPay(e,ym))}
const PCOLS=[['name','الموظف','s'],['salary','الأساسي','m'],['allow','البدلات','m'],['ot','الإضافي','m'],['bonus','المكافآت','m'],['gross','الإجمالي','m'],['absence','خصم الغياب','m'],['late','خصم التأخير','m'],['penalty','الجزاءات','m'],['advance','السلف','m'],['ins','التأمينات','m'],['tax','ضريبة','m'],['other','خصومات أخرى','m'],['net','الصافي','m']];
V.hrPay=()=>{
  if(!can('hr_pay')){say('ليس لديك صلاحية المرتبات',1);return go('home')}
  setMain(`<div class="ttl">الموارد البشرية</div>${hrTabs('hrPay')}<div class="card"><div class="row"><input type="month" id="hpM" value="${HP.ym}" data-c="hpF" style="max-width:190px"><span id="hpS"></span></div></div><div id="hpL" class="card"></div>`);
  hpRender();
};
C.hpF=()=>{HP.ym=$('hpM').value||HP.ym;hpRender()};
function hpRender(){
  const ym=HP.ym,ap=D.payrolls[ym],lines=payLines(ym);
  $('hpS').innerHTML=ap?`<span class="badge ${ap.status==='paid'?'b-done':'b-draft'}">${ap.status==='paid'?'تم الصرف':'معتمدة'}</span> <span class="mut">${esc(ap.at)} — ${esc(ap.by)}</span>`:'<span class="badge b-draft">مسودة (محسوبة تلقائيًا)</span>';
  const tot=k=>r2(lines.reduce((s,l)=>s+(l[k]||0),0));
  $('hpL').innerHTML=(lines.length?tbl(PCOLS.map(c=>c[1]).concat(['']),lines.map((l,i)=>`<tr><td class="l">${esc(l.name)}</td>${PCOLS.slice(1).map(c=>`<td${c[0]==='net'?' style="font-weight:700"':''}>${money(l[c[0]])}</td>`).join('')}<td><button data-a="slipOne" data-i="${i}">سند</button></td></tr>`).join('')+`<tr style="font-weight:700;background:var(--pl)"><td class="l">الإجمالي</td>${PCOLS.slice(1).map(c=>`<td>${money(tot(c[0]))}</td>`).join('')}<td></td></tr>`):'<div class="mut">لا يوجد موظفون لهم مرتب أساسي. أدخل المرتب من صفحة الموظف (البيانات المالية).</div>')+
  `<div class="mut" style="margin-top:6px">حصة الشركة في التأمينات (غير مخصومة): <b>${money(tot('insCo'))}</b></div>
  <div class="row" style="margin-top:10px"><button data-a="hpExcel">⬇️ تصدير شيت المرتبات</button><button data-a="slipAll">🖨 طباعة كل السندات</button>${ap?(ap.status!=='paid'?'<button class="p" data-a="hpPaid">✅ تسجيل الصرف</button>':'')+'<button class="d" data-a="hpReopen">إعادة فتح المرتبات</button>':'<button class="p" data-a="hpApprove">🔒 اعتماد المرتبات</button>'}</div>`;
}
A.hpApprove=async()=>{
  const ym=HP.ym,lines=payLines(ym);if(!lines.length){say('لا توجد مرتبات',1);return}
  if(!(await dlg('اعتماد مرتبات '+ym+'؟\nسيتم تثبيتها وخصم أقساط السلف من أرصدتها.',{yes:'اعتماد'})))return;
  lines.forEach(l=>{const e=empById(l.emp);if(!e)return;l.advApplied=advDue(e).map(x=>({id:x.a.id,v:x.v}));l.advApplied.forEach(x=>{const a=D.adv.find(y=>y.id===x.id);a.paid=r2(a.paid+x.v)})});
  D.payrolls[ym]={lines,at:nowStr(),by:ME.name,status:'approved'};save('payrolls','adv');await flush();await A.hpExcel();say('تم اعتماد المرتبات');hpRender();
};
A.hpPaid=()=>{D.payrolls[HP.ym].status='paid';D.payrolls[HP.ym].paidAt=nowStr();save('payrolls');hpRender()};
A.hpReopen=async()=>{
  if(!ME.admin){say('إعادة الفتح للإدارة فقط',1);return}
  const ap=D.payrolls[HP.ym];if(!ap||!(await dlg('إعادة فتح مرتبات '+HP.ym+'؟ ستعود أقساط السلف المخصومة.',{yes:'إعادة فتح'})))return;
  ap.lines.forEach(l=>(l.advApplied||[]).forEach(x=>{const a=D.adv.find(y=>y.id===x.id);if(a)a.paid=r2(a.paid-x.v)}));
  delete D.payrolls[HP.ym];save('payrolls','adv');hpRender();
};
A.hpExcel=async()=>{
  const ym=HP.ym,lines=payLines(ym);
  const head=PCOLS.map(c=>c[1]).concat(['أيام الحضور','أيام الغياب','إجازات','دقائق تأخير','دقائق إضافي','حصة الشركة تأمينات']);
  const rows=[['مرتبات شهر '+ym],head].concat(lines.map(l=>PCOLS.map(c=>l[c[0]]).concat([l.days,l.absent,l.leave,l.lateMin,l.otMin,l.insCo])));
  const tot=['الإجمالي'].concat(PCOLS.slice(1).map(c=>r2(lines.reduce((s,l)=>s+(l[c[0]]||0),0))));rows.push(tot);
  const slips=[['الموظف','الوظيفة','بند','المبلغ']];lines.forEach(l=>{slips.push([l.name,l.job,'الأساسي',l.salary],[l.name,l.job,'البدلات',l.allow],[l.name,l.job,'الإضافي',l.ot],[l.name,l.job,'المكافآت',l.bonus],[l.name,l.job,'إجمالي الاستحقاق',l.gross],[l.name,l.job,'إجمالي الخصومات',l.ded],[l.name,l.job,'الصافي',l.net])});
  const p=await saveX(`الموارد البشرية/المرتبات/${ym}`,`مرتبات ${ym}.xlsx`,wbOf([['المرتبات',rows],['السندات',slips]]));if(p)say('تم حفظ شيت المرتبات: '+p);
};
function slipHtml(l,ym){
  const row=(k,v)=>`<tr><td style="text-align:right">${esc(k)}</td><td>${money(v)}</td></tr>`;
  return `<div style="page-break-after:always;padding-bottom:20px"><img class="pl" src="${logoSrc()}" alt=""><h2>سند صرف مرتب — شهر ${esc(ym)}</h2>
  <div class="mt"><span>الموظف: <b>${esc(l.name)}</b></span><span>الوظيفة: ${esc(l.job||'')}</span><span>القسم: ${esc(l.dept||'')}</span></div>
  <div class="mt"><span>أيام الحضور: ${l.days}</span><span>أيام الغياب: ${l.absent}</span><span>إجازات: ${l.leave}</span><span>تأخير: ${l.lateMin} د</span><span>إضافي: ${fmt(r2(l.otMin/60))} س</span></div>
  <table><thead><tr><th>الاستحقاقات</th><th>القيمة</th></tr></thead><tbody>${row('المرتب الأساسي',l.salary)}${row('البدلات',l.allow)}${row('الإضافي',l.ot)}${row('المكافآت',l.bonus)}<tr><td style="text-align:right"><b>إجمالي الاستحقاق</b></td><td><b>${money(l.gross)}</b></td></tr></tbody></table>
  <table><thead><tr><th>الخصومات</th><th>القيمة</th></tr></thead><tbody>${row('الغياب',l.absence)}${row('التأخير والانصراف المبكر',l.late)}${row('الجزاءات',l.penalty)}${row('السلف',l.advance)}${row('التأمينات الاجتماعية',l.ins)}${row('الضريبة',l.tax)}${row('خصومات أخرى',l.other)}<tr><td style="text-align:right"><b>إجمالي الخصومات</b></td><td><b>${money(l.ded)}</b></td></tr></tbody></table>
  <div class="gt2">صافي المرتب المستحق: ${money(l.net)}</div>
  <div class="mt" style="margin-top:40px"><span>توقيع المستلم: ____________</span><span>المحاسب: ____________</span><span>التاريخ: ${esc(dayStr())}</span></div></div>`;
}
A.slipOne=t=>{const l=payLines(HP.ym)[+t.dataset.i];printHtml(slipHtml(l,HP.ym),'a4')};
A.slipAll=()=>{const L=payLines(HP.ym);if(!L.length){say('لا توجد مرتبات',1);return}printHtml(L.map(l=>slipHtml(l,HP.ym)).join(''),'a4')};

/* ===== البيانات المالية والحضور داخل صفحة الموظف ===== */
function hrFields(e){
  const h=hrOf(e),dis=can('hr_pay')?'':' disabled',n=(id,l,v,t)=>`<div><div class="lbl">${l}</div><input id="hh_${id}" ${t?`type="${t}"`:'inputmode="decimal"'} value="${esc(v)}"${dis}></div>`;
  return `<div class="card"><div class="ttl">البيانات المالية والحضور</div><div class="g2">
   ${n('code','كود البصمة (رقم الموظف على جهاز البصمة)',h.code,'text')}${n('salary','المرتب الأساسي الشهري',h.salary)}
   ${ALW.map(a=>n('al_'+a[0],a[1],h.allow[a[0]])).join('')}
   <div><div class="lbl">التأمينات الاجتماعية</div><label><input type="checkbox" id="hh_insOn"${h.insOn?' checked':''}${dis}> مشترك في التأمينات</label></div>${n('insWage','الأجر التأميني',h.insWage)}${n('insEmp','نسبة الموظف %',h.insEmp)}${n('insCo','نسبة الشركة %',h.insCo)}${n('taxFix','ضريبة كسب عمل (مبلغ شهري ثابت)',h.taxFix)}
   ${n('shiftStart','بداية الدوام',h.shiftStart,'time')}${n('shiftEnd','نهاية الدوام',h.shiftEnd,'time')}${n('hours','ساعات العمل اليومية',h.hours)}${n('grace','سماح التأخير (دقيقة)',h.grace)}${n('otAfter','الإضافي يبدأ بعد (دقيقة من نهاية الدوام)',h.otAfter)}${n('otRate','معامل الإضافي (×)',h.otRate)}${n('absF','معامل خصم الغياب (×)',h.absF)}${n('lateF','معامل خصم التأخير (×)',h.lateF)}
   <div><div class="lbl">الإجازة الأسبوعية</div><select id="hh_off"${dis}>${['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map((d,i)=>`<option value="${i}"${(h.off[0]===i)?' selected':''}>${d}</option>`).join('')}</select></div></div></div>`;
}
function readHr(e){
  const v=id=>$('hh_'+id)?norm($('hh_'+id).value):'',nn=id=>{const x=num(v(id));return isNaN(x)?0:x};
  e.hr={code:v('code'),salary:nn('salary'),allow:{},insOn:$('hh_insOn').checked,insWage:nn('insWage'),insEmp:nn('insEmp'),insCo:nn('insCo'),taxFix:nn('taxFix'),shiftStart:v('shiftStart')||'09:00',shiftEnd:v('shiftEnd')||'17:00',hours:nn('hours')||8,grace:nn('grace'),otAfter:nn('otAfter'),otRate:nn('otRate')||1.5,absF:nn('absF'),lateF:nn('lateF'),off:[parseInt($('hh_off').value,10)]};
  ALW.forEach(a=>{e.hr.allow[a[0]]=nn('al_'+a[0])});
  if(e.hr.insOn&&!e.hr.insWage)e.hr.insWage=e.hr.salary;
}
