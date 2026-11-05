/* ===== نقطة البيع ===== */
const V={};
const POS={br:'',ses:null,oid:0,cat:'',q:'',lim:60,buf:'',fresh:true,payOpen:false,pmSel:'نقدي'};
const LAST={v:'home',a:null};

function go(v,arg){LAST.v=v;LAST.a=arg;clearInterval(PR.t);V[v](arg)}
A.go=t=>go(t.dataset.v);
A.home=()=>go('home');

/* --- اختيار الفرع ثم نقطة البيع --- */
V.posBranch=()=>setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">نقطة البيع — اختر الفرع</div>${can('offer_view')?'<button class="p" data-a="go" data-v="offers">🏷️ العروض</button>':''}</div><div style="height:10px"></div><div class="tiles">${BR.map(b=>`<button class="tile2" data-a="posBr" data-v="${esc(b)}">${esc(b)}</button>`).join('')}</div>`);
A.posBr=t=>{POS.br=t.dataset.v;go('posPoints')};
const openSes=(b,p)=>D.sessions.find(s=>s.status==='open'&&s.br===b&&s.pos===p);
const posKey=(b,p)=>b+'|'+p;
const posStaff=(b,p)=>((D.set.posUsers||{})[posKey(b,p)])||[];
const posAllowed=(b,p)=>{const l=posStaff(b,p);return !l.length||l.includes(ME.name)||can('pos_close')||can('pos_assign')};
V.posPoints=()=>{
  const b=POS.br;
  setMain(`<div class="row"><button data-a="go" data-v="posBranch">‹ الفروع</button><div class="ttl" style="flex:1;margin:0">${esc(b)} — اختر نقطة البيع</div></div><div class="tiles" style="margin-top:12px">${posOf(b).map(p=>{
    const s=openSes(b,p),st=posStaff(b,p);
    const staff=`<div class="mut">الموظفون المصرّح لهم: ${st.length?esc(st.join('، ')):'كل من لديه صلاحية البيع'}</div>${can('offer_view')?'<button data-a="go" data-v="offers">🏷️ العروض</button>':''}${can('pos_assign')?`<button data-a="posStaff" data-b="${esc(b)}" data-v="${p}">👥 تحديد الموظفين</button>`:''}`;
    return s?`<div class="tile2 open"><b>${p}</b><div class="mut">⚠️ جلسة #${s.id} مفتوحة ولم تُغلق بعد — طلبات معلقة: ${liveHeld(s.id).length}</div><div class="mut">فتحها ${esc(s.user)} — ${esc(s.odt)}</div>${staff}<div class="row"><button class="f p" data-a="posResume" data-id="${s.id}">استكمال البيع</button>${can('pos_close')?`<button class="f" data-a="sesClose" data-id="${s.id}">إغلاق الجلسة</button>`:''}</div></div>`
    :`<div class="tile2"><b>${p}</b><div class="mut">لا توجد جلسة مفتوحة</div>${staff}<button class="p" data-a="posOpen" data-v="${p}">فتح جلسة</button></div>`}).join('')}</div>`);
};
A.posStaff=t=>{
  const b=t.dataset.b,p=t.dataset.v,cur=posStaff(b,p);
  const emps=D.employees.filter(e=>e.active!==false&&e.perms&&e.perms.pos_sell);
  openModal(`<div class="card"><div class="ttl">موظفو ${esc(b)} / ${esc(p)}</div><div class="mut">اترك الكل بدون تحديد ليتمكن أي موظف لديه صلاحية البيع من فتح الجلسة.</div>
  <div style="max-height:46vh;overflow:auto;margin-top:8px">${emps.map(e=>`<div style="padding:6px 0"><label><input type="checkbox" class="stc" value="${esc(e.name)}"${cur.includes(e.name)?' checked':''}> ${esc(e.name)}</label></div>`).join('')||'<div class="mut">لا يوجد موظفون لديهم صلاحية البيع</div>'}</div>
  <div class="row" style="margin-top:10px"><button class="f p" data-a="posStaffOk" data-b="${esc(b)}" data-v="${esc(p)}">حفظ</button><button class="f" data-a="closeMd">إلغاء</button></div></div>`);
};
A.posStaffOk=t=>{
  const l=[...document.querySelectorAll('.stc')].filter(x=>x.checked).map(x=>x.value);
  D.set.posUsers=D.set.posUsers||{};D.set.posUsers[posKey(t.dataset.b,t.dataset.v)]=l;save('set');closeModal();say('تم حفظ الموظفين');
  if(LAST.v==='posPoints')V.posPoints();
};
A.closeMd=()=>closeModal();
A.posOpen=async t=>{
  if(!can('pos_sell')){say('ليس لديك صلاحية البيع',1);return}
  const p=t.dataset.v;if(openSes(POS.br,p)){go('posPoints');return}
  if(!posAllowed(POS.br,p)){say('غير مصرّح لك بفتح جلسة في هذه النقطة',1);return}
  const v=await dlg(`فتح جلسة ${p} — ${POS.br}\nاكتب رصيد بداية الدرج (نقدي)`,{input:true,ph:'0',yes:'فتح الجلسة'});
  if(v===null)return;
  const c=norm(v)===''?0:num(v);if(isNaN(c)||c<0){say('رقم غير صحيح',1);return}
  const s={id:++D.cnt.ses,br:POS.br,pos:p,user:ME.name,ots:Date.now(),odt:nowStr(),day:dayStr(),opening:c,status:'open'};
  D.sessions.push(s);save('sessions','cnt');await flush();
  POS.ses=s;POS.oid=0;POS.cat='';POS.q='';go('pos');
};
A.posResume=t=>{
  if(!can('pos_sell')){say('ليس لديك صلاحية البيع',1);return}
  const s=D.sessions.find(x=>x.id==t.dataset.id);if(!s)return;
  if(!posAllowed(s.br,s.pos)){say('غير مصرّح لك بهذه النقطة',1);return}
  POS.ses=s;POS.oid=0;POS.q='';go('pos');
};

/* --- الطلبات المعلّقة (3 لكل موظف افتراضيًا، والحذف للمدير فقط) --- */
const heldOf=sid=>D.held.filter(o=>o.ses===sid);
/* طلب معلق فعلي = به أصناف وقيمته أكبر من صفر (الفارغ أو صفر القيمة لا يمنع إغلاق الجلسة) */
const liveHeld=sid=>heldOf(sid).filter(o=>o.lines.length&&r2(o.lines.reduce((s,l)=>s+l.price*l.qty,0))>0);
const maxOrd=()=>ME.admin?50:(ME.maxOrders>0?ME.maxOrders:3);
function mkOrder(){
  const s=POS.ses,mine=heldOf(s.id).filter(o=>o.user===ME.name).length;
  if(mine>=maxOrd()){say('وصلت للحد الأقصى من الطلبات المتاحة لك ('+maxOrd()+')',1);return null}
  const n=heldOf(s.id).reduce((m,x)=>Math.max(m,x.n),0)+1;
  const o={id:++D.cnt.ord,ses:s.id,user:ME.name,n,cust:null,custName:'',lines:[],sel:-1,ts:Date.now()};
  D.held.push(o);save('held','cnt');return o;
}
function curOrder(){
  let o=D.held.find(x=>x.id===POS.oid&&x.ses===POS.ses.id);
  if(!o){const l=heldOf(POS.ses.id),mine=l.filter(x=>x.user===ME.name);o=mine.length?mine[mine.length-1]:(mkOrder()||l[l.length-1])}
  if(o)POS.oid=o.id;return o;
}
Object.defineProperty(POS,'order',{get:curOrder});
function renderOrdersBar(){
  const s=POS.ses,cur=curOrder().id;
  $('obar').innerHTML='<b style="color:var(--pri2)">الطلبات:</b>'+heldOf(s.id).map(o=>`<span class="otab${o.id===cur?' on':''}" data-a="ordSel" data-id="${o.id}">طلب ${o.n}${o.custName?' — '+esc(o.custName):''}${o.lines.length?` (${o.lines.length})`:''} <small class="mut">${esc(o.user)}</small>${can('pos_delorder')?`<i data-a="ordDel" data-id="${o.id}" title="حذف الطلب">✕</i>`:''}</span>`).join('')+'<button data-a="ordNew">➕ طلب جديد</button>';
}
function renderAllPos(){renderOrdersBar();renderOrder();renderCust()}
A.ordSel=t=>{POS.oid=+t.dataset.id;const o=curOrder();POS.fresh=true;POS.buf=o.sel>=0&&o.lines[o.sel]?String(o.lines[o.sel].qty):'';renderAllPos()};
A.ordNew=()=>{const o=mkOrder();if(!o)return;POS.oid=o.id;renderAllPos()};
A.ordDel=async t=>{
  if(!can('pos_delorder')){say('حذف الطلبات للمدير فقط',1);return}
  const o=D.held.find(x=>x.id===+t.dataset.id);if(!o)return;
  if(!(await dlg(`حذف الطلب ${o.n}${o.lines.length?' وبه '+o.lines.length+' صنف':''}؟`,{yes:'حذف'})))return;
  D.held.splice(D.held.indexOf(o),1);save('held');if(POS.oid===o.id)POS.oid=0;renderAllPos();
};

/* --- شاشة البيع --- */
V.pos=()=>{
  const s=POS.ses;
  setMain(`<div class="pos">
  <div class="op">
    <div class="oph">جلسة #${s.id} — ${esc(s.br)} / ${esc(s.pos)}</div>
    <div class="row" style="padding:6px 8px"><button id="cchip" data-a="posCust" class="f"></button>${can('pos_discount')?'<button data-a="posDisc">🏷️ خصم</button>':''}<button data-a="posUom">UOM</button></div>
    <div class="ol" id="ol"></div>
    <div id="otax" class="mut" style="padding:0 10px"></div>
    <div id="odisc" class="mut" style="padding:2px 10px"></div>
    <div class="ot"><span>الإجمالي</span><span id="otot">0.00</span></div>
    <div class="npd">${['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>`<button data-a="npk" data-k="${k}">${k}</button>`).join('')}
      <button class="d" data-a="posDel">حذف السطر</button>${can('pos_delorder')?'<button class="d" data-a="posClr">مسح الطلب</button>':'<span></span>'}<button data-a="posRev">الفواتير</button></div>
    <button class="p paybtn" data-a="posPay">الدفع ›</button>
  </div>
  <div class="pm">
    <div class="obar" id="obar"></div>
    <div class="pbar"><input id="pq" data-i="posQ" data-k="posQ" placeholder="امسح الباركود أو اكتب اسم المنتج ثم Enter" autocomplete="off">
      ${can('pos_expense')?'<button data-a="posCash" data-t="exp">💸 مصروف</button>':''}${can('pos_income')?'<button data-a="posCash" data-t="inc">💰 إيراد</button>':''}
      ${can('pos_assign')?`<button data-a="posStaff" data-b="${esc(s.br)}" data-v="${esc(s.pos)}">👥 الموظفون</button>`:''}
      <button data-a="go" data-v="posPoints">خروج من الجلسة</button></div>
    <div class="cats" id="cats"></div><div class="grid" id="pg"></div>
  </div></div>`,'posm');
  renderAllPos();renderCats();renderGrid();$('pq').focus();
};
const orderGross=o=>r2(o.lines.reduce((s,l)=>s+l.price*l.qty,0));
function orderDisc(o){const g=orderGross(o);if(!o.disc||!g)return 0;const v=o.disc.mode==='pct'?g*o.disc.val/100:o.disc.val;return r2(Math.min(Math.max(v,0),g))}
/* الضريبة (اختيارية): شاملة السعر أو مضافة عليه، وتستثني المنتجات المعفاة */
const taxCfg=()=>{const T=D.set.tax;return(T&&T.on)?{rate:+T.rate||0,incl:T.incl!==false}:null};
function orderTax(o){
  const T=taxCfg(),g=orderGross(o);if(!T||!g)return 0;
  const f=(g-orderDisc(o))/g;let base=0;o.lines.forEach(l=>{if(l.tx!==false)base+=l.price*l.qty*f});
  return r2(T.incl?base*T.rate/100/(1+T.rate/100):base*T.rate/100);
}
const orderTotal=()=>{const o=curOrder(),T=taxCfg();return r2(orderGross(o)-orderDisc(o)+(T&&!T.incl?orderTax(o):0))};
function renderOrder(){
  const o=curOrder();
  $('ol').innerHTML=o.lines.map((l,i)=>`<div class="ln${i===o.sel?' sel':''}" data-a="posSel" data-i="${i}"><div class="n">${esc(l.n)}${l.u?` <span class="badge b-draft">${esc(l.u)}</span>`:''}</div><div class="dd">${fmt(l.qty)} × ${money(l.price)}${l.orig>l.price?` <span class="badge b-done">عرض — خصم ${money((l.orig-l.price)*l.qty)}</span>`:''}</div><div class="t">${money(l.price*l.qty)}</div></div>`).join('')||'<div class="mut" style="padding:20px;text-align:center">الطلب فارغ</div>';
  const tv=orderTax(o);$('otax').innerHTML=tv>0?`${taxCfg().incl?'منها ':''}ضريبة ${taxCfg().rate}% : <b>${money(tv)}</b>`:'';
  const dv=orderDisc(o);$('odisc').innerHTML=dv>0?`خصم ${o.disc.mode==='pct'?o.disc.val+'%':''} : <b>− ${money(dv)}</b> ${can('pos_discount')?'<span data-a="posDiscClr" style="cursor:pointer;color:var(--bad);font-weight:700">✕ إلغاء الخصم</span>':''}`:'';
  $('otot').textContent=money(orderTotal());
  const e=$('ol').querySelector('.sel');if(e)e.scrollIntoView({block:'nearest'});
  save('held');
}
function renderCust(){const o=curOrder();$('cchip').textContent=o.cust?'👤 '+o.custName+(cusBalance(o.cust)?'  (دين '+money(cusBalance(o.cust))+')':''):'👤 اختيار العميل'}
function renderCats(){
  const c=[['','الكل']].concat(PI.pcats.map(x=>[x,x]),[['__none','بدون فئة']]);
  $('cats').innerHTML=c.map(x=>`<button class="${POS.cat===x[0]&&!POS.q?'on':''}" data-a="posCat" data-v="${esc(x[0])}">${esc(x[1])}</button>`).join('');
}
function renderGrid(){
  let list;
  if(POS.q)list=search(POS.q,POS.lim+1);
  else{list=[];for(let i=0;i<D.products.length&&list.length<=POS.lim;i++){const p=D.products[i];
    if(POS.cat===''||(POS.cat==='__none'?!p.pcat:p.pcat===POS.cat))list.push(p)}}
  const more=list.length>POS.lim;if(more)list=list.slice(0,POS.lim);
  $('pg').innerHTML=list.map(p=>`<div class="tile" data-a="posProd" data-id="${esc(p.id)}"><div>${esc(p.name)}</div><div class="pr">${money(pPrice(p))}</div></div>`).join('')
    +(more?'<div class="tile" data-a="posMore"><b>عرض المزيد…</b></div>':'')||'<div class="mut" style="padding:20px">لا توجد منتجات</div>';
}
A.posCat=t=>{POS.cat=t.dataset.v;POS.q='';POS.lim=60;$('pq').value='';renderCats();renderGrid()};
A.posMore=()=>{POS.lim+=120;renderGrid()};
I.posQ=t=>{POS.q=norm(t.value);POS.lim=60;renderCats();renderGrid()};
K.posQ=(t,e)=>{
  if(e.key!=='Enter')return;
  const v=norm(t.value);if(!v)return;
  let m=findU(v);if(!m.length)m=search(v,5).map(p=>({p,u:null}));
  if(m.length===1){const x=m[0],q=x.u?0:scaleQty(v,x.p);if(!x.u&&scale(v)&&x.p.bc!==v&&!q)say('الوزن في الباركود = 0، أُضيف الصنف بكمية 1 (عدّلها من لوحة الأرقام)',1);posAdd(x.p,q,x.u);t.value='';POS.q='';renderCats();renderGrid()}
  else if(!m.length){say('الباركود '+v+' غير موجود',1);t.select()}
};
A.posProd=t=>{const p=PI.id[t.dataset.id];if(p)posAdd(p,0)};
function lineFor(p,uname){
  const ui=unitInfo(p,uname),ef=effPrice(p,POS.ses&&POS.ses.br),price=uname?ui.price:ef.price;
  return{id:p.id,n:p.name,b:p.bc,price,orig:(!uname&&ef.offer)?ef.orig:undefined,cost:r3(pCost(p)*ui.f),cat:p.cat||'',u:ui.u,uf:ui.f,tx:!p.notax};
}
function lossMsg(p,price,cost){return 'لا يمكن بيع «'+p.name+'» بأقل من التكلفة (التكلفة '+money(cost)+' والسعر '+money(price)+') — يلزم صلاحية «البيع بخسارة» أو تفعيل السماح داخل المنتج'}
function posAdd(p,q,uname){
  if(isNaN(parseFloat(p.price))){say('لا يوجد سعر لهذا الصنف',1);return}
  const ln=lineFor(p,uname);
  if(lossBlocked(p,ln.price/ln.uf)){say(lossMsg(p,ln.price,ln.cost),1);return}
  ln.qty=q>0?q:1;
  const o=curOrder();o.lines.push(ln);
  o.sel=o.lines.length-1;POS.buf=String(o.lines[o.sel].qty);POS.fresh=true;say('');renderOrder();renderOrdersBar();
  const f=$('pq');if(f)f.focus();
}
A.posSel=t=>{const o=curOrder();o.sel=+t.dataset.i;POS.buf=String(o.lines[o.sel].qty);POS.fresh=true;renderOrder()};
A.npk=t=>{
  const o=curOrder(),l=o.lines[o.sel];if(!l)return;const k=t.dataset.k;
  if(k==='⌫'){
    let b=POS.buf.slice(0,-1);POS.fresh=false;
    if(b===''){o.lines.splice(o.sel,1);o.sel=o.lines.length-1;if(o.sel>=0)POS.buf=String(o.lines[o.sel].qty);POS.fresh=true;renderOrder();renderOrdersBar();return}
    POS.buf=b;
  }else{
    if(POS.fresh){POS.buf=k==='.'?'0.':k;POS.fresh=false}
    else{if(k==='.'&&POS.buf.includes('.'))return;POS.buf+=k}
  }
  l.qty=parseFloat(POS.buf)||0;renderOrder();
};
A.posDel=()=>{const o=curOrder();if(o.sel<0)return;o.lines.splice(o.sel,1);o.sel=o.lines.length-1;if(o.sel>=0)POS.buf=String(o.lines[o.sel].qty);renderOrder();renderOrdersBar()};
A.posClr=async()=>{
  if(!can('pos_delorder')){say('مسح الطلب للمدير فقط',1);return}
  const o=curOrder();if(o.lines.length&&await dlg('مسح أصناف الطلب الحالي؟',{yes:'مسح'})){o.lines=[];o.sel=-1;renderOrder();renderOrdersBar()}
};
A.posRev=()=>{if(can('pos_review'))go('review');else say('ليس لديك صلاحية مراجعة الفواتير',1)};

/* --- زر UOM: تبديل وحدة السطر المحدد (قطعة ← كرتونة ← ...) مع تغيير السعر --- */
A.posUom=()=>{
  const o=curOrder(),l=o.lines[o.sel];if(!l){say('اختر سطرًا أولًا',1);return}
  const p=PI.id[l.id],us=prodUnits(p);
  if(us.length<2){say('لا توجد وحدات قياس أخرى لهذا المنتج',1);return}
  const nx=us[(us.indexOf(l.u||'')+1)%us.length],nl=lineFor(p,nx);
  if(lossBlocked(p,nl.price/nl.uf)){say(lossMsg(p,nl.price,nl.cost),1);return}
  l.u=nl.u;l.uf=nl.uf;l.price=nl.price;l.orig=nl.orig;l.cost=nl.cost;
  renderOrder();say('الوحدة: '+(l.u||p.unit||'الأساسية')+' — السعر '+money(l.price));
};

/* --- خصم نقطة البيع (نسبة أو مبلغ) --- */
A.posDisc=async()=>{
  if(!can('pos_discount')){say('ليس لديك صلاحية إعطاء خصم',1);return}
  const o=curOrder(),g=orderGross(o);if(!g){say('أضف أصنافًا أولًا',1);return}
  const maxP=ME.admin?100:(ME.maxDisc>=0?ME.maxDisc:10);
  const r=await formDlg('خصم على الطلب',[{k:'m',l:'نوع الخصم',t:'select',o:['نسبة %','مبلغ'],v:o.disc&&o.disc.mode==='amt'?'مبلغ':'نسبة %'},{k:'v',l:'القيمة',t:'number',v:o.disc?o.disc.val:''},{k:'n',l:'السبب (اختياري)',t:'text',v:o.disc?o.disc.reason||'':''}],'تطبيق الخصم');
  if(!r)return;
  const v=num(r.v),mode=r.m==='مبلغ'?'amt':'pct';
  if(isNaN(v)||v<=0){say('اكتب قيمة الخصم',1);return}
  const amt=mode==='pct'?g*v/100:v,pct=amt/g*100;
  if(pct>maxP+1e-9){say('الخصم أكبر من الحد المسموح لك ('+maxP+'%)',1);return}
  if(amt>g){say('الخصم أكبر من قيمة الطلب',1);return}
  const f=1-amt/g;const bad=o.lines.find(l=>{const p=PI.id[l.id];return p&&lossBlocked(p,l.price*f/(l.uf||1))});
  if(bad){say('الخصم يجعل «'+bad.n+'» أقل من التكلفة — غير مسموح',1);return}
  o.disc={mode,val:v,reason:norm(r.n)};save('held');renderOrder();say('تم تطبيق الخصم');
};
A.posDiscClr=()=>{const o=curOrder();delete o.disc;save('held');renderOrder()};

/* --- اختيار العميل --- */
A.posCust=()=>{
  openModal(`<div class="card"><div class="ttl">اختيار العميل</div><input id="cq" data-i="custQ" placeholder="ابحث بالاسم أو رقم الهاتف" autocomplete="off"><div id="cres" style="max-height:44vh;overflow:auto"></div>
  <div class="row" style="margin-top:10px"><button class="f p" data-a="custNewPOS">➕ عميل جديد</button><button class="f" data-a="custNone">بدون عميل</button><button class="f" data-a="closeMd">إغلاق</button></div></div>`);
  custRes('');$('cq').focus();
};
I.custQ=t=>custRes(t.value);
function custRes(q){
  const w=nm(q),l=D.customers.filter(c=>!w||nm(c.name).includes(w)||String(c.phone).includes(w)).slice(0,30);
  $('cres').innerHTML=l.map(c=>{const b=cusBalance(c.id);return `<div class="row" style="padding:8px;border-bottom:1px solid var(--bd);cursor:pointer" data-a="custPick" data-id="${c.id}"><span style="flex:1">${esc(c.name)}</span><span class="mut">${esc(c.phone)}</span>${b?`<b style="color:var(--wr)">${money(b)}</b>`:''}</div>`}).join('')||'<div class="mut" style="padding:8px">لا يوجد عملاء مطابقون</div>';
}
function setCust(c){
  const o=curOrder();o.cust=c?c.id:null;o.custName=c?c.name:'';save('held');closeModal();renderOrdersBar();renderCust();
  if(POS.payOpen)A.posPay();
}
A.custPick=t=>setCust(cusById(t.dataset.id));
A.custNone=()=>setCust(null);
A.custNewPOS=async()=>{
  const r=await formDlg('عميل جديد',[{k:'n',l:'الاسم'},{k:'p',l:'رقم الهاتف'}],'إضافة');if(!r)return;
  if(!norm(r.n)){say('اكتب اسم العميل',1);return}
  const c=cusNew(r.n,r.p);setCust(c);
};

/* --- مصروفات وإيرادات --- */
A.posCash=async t=>{
  const exp=t.dataset.t==='exp';
  const r=await formDlg(exp?'تسجيل مصروف نقطة بيع':'تسجيل إيراد نقطة بيع',[{k:'a',l:'المبلغ',t:'number'},{k:'n',l:'البيان / السبب',t:'text'}],'تسجيل');
  if(!r)return;const a=num(r.a);if(isNaN(a)||a<=0||!norm(r.n)){say('اكتب المبلغ والبيان',1);return}
  const s=POS.ses,d=new Date();
  D.cash.push({id:++D.cnt.cash,type:exp?'exp':'inc',amount:a,note:norm(r.n),session:s.id,br:s.br,pos:s.pos,user:ME.name,dt:nowStr(d),day:dayStr(d),ts:d.getTime()});
  save('cash','cnt');saveSes(s.id);say(exp?'تم تسجيل المصروف':'تم تسجيل الإيراد');
};

/* --- الدفع (مع حساب العميل) --- */
function payCustHtml(o,t){
  if(!o.cust)return '<div class="mut" style="margin:6px 0">لم يتم اختيار عميل (مطلوب في البيع الأجل أو الدفع الجزئي)</div>';
  const c=cusById(o.cust),st=cusStats(o.cust),led=cusLedger(o.cust).slice(-5).reverse();
  return `<div class="card" style="background:var(--pl);margin:8px 0"><div class="row"><b style="flex:1">${esc(c.name)} ${c.phone?'— '+esc(c.phone):''}</b><button data-a="custPayPOS">💵 تسديد دفعة</button><button data-a="custFull">كشف الحساب</button></div>
  <div class="g2" style="margin-top:6px;font-size:14px"><div>إجمالي مشترياته: <b>${money(st.buy)}</b></div><div>المسدد: <b>${money(st.paid)}</b></div><div>الدين الحالي: <b style="color:var(--wr)">${money(st.debt)}</b></div><div id="cusAfter">بعد هذه الفاتورة: <b></b></div></div>
  ${led.length?tbl(['التاريخ','العملية','القيمة','المتبقي','الطريقة'],led.map(e=>`<tr><td>${esc(e.dt.slice(0,16))}</td><td>${esc(e.type)}</td><td>${money(e.value)}</td><td>${money(e.rem)}</td><td>${esc(e.method)}</td></tr>`).join('')):''}</div>`;
}
A.posPay=()=>{
  const o=curOrder();
  if(!o.lines.length){say('الطلب فارغ',1);return}
  if(o.lines.some(l=>!(l.qty>0))){say('يوجد صنف كميته صفر',1);return}
  const t=orderTotal(),sel=POS.pmSel||'نقدي';POS.payOpen=true;
  openModal(`<div class="card"><div class="ttl">الدفع</div>
  <div style="font-size:24px;font-weight:700;text-align:center">المبلغ المستحق: ${money(t)}</div>
  <div class="row" style="margin-top:8px"><button class="f" data-a="posCust">${o.cust?'👤 '+esc(o.custName)+' — تغيير العميل':'👤 اختيار العميل'}</button></div>
  ${payCustHtml(o,t)}
  <div class="row" style="margin:10px 0">${METHODS.map(m=>`<label style="flex:1 1 30%;border:1px solid var(--bd);border-radius:8px;padding:8px;text-align:center;cursor:pointer"><input type="radio" name="pm" value="${m}" data-c="payM"${m===sel?' checked':''}> ${m}</label>`).join('')}</div>
  <div class="lbl">المبلغ المدفوع</div><input id="payPaid" data-i="payPaid" data-k="payPaid" inputmode="decimal" style="font-size:22px;text-align:center">
  <div style="font-size:20px;font-weight:700;text-align:center;margin:10px 0"><span id="payLbl">الباقي للعميل</span>: <span id="payChg">0.00</span></div>
  <div class="row"><button class="f p" data-a="payOk">تأكيد الدفع</button><button class="f" data-a="payNo">رجوع</button></div></div>`);
  payUpd();$('payPaid').focus();
};
function payCalc(){
  const t=orderTotal(),p=num($('payPaid').value),d=isNaN(p)?NaN:r2(p-t);
  $('payLbl').textContent=(isNaN(d)||d>=0)?'الباقي للعميل':'المتبقي على العميل';$('payChg').textContent=isNaN(d)?'—':money(Math.abs(d));
  const o=curOrder(),a=$('cusAfter');
  if(a&&o.cust){const add=isNaN(d)?t:Math.max(0,-d);a.innerHTML='الدين بعد هذه الفاتورة: <b style="color:var(--wr)">'+money(cusBalance(o.cust)+add)+'</b>'}
}
function payUpd(){
  const m=document.querySelector('input[name=pm]:checked').value;POS.pmSel=m;
  $('payPaid').value=(m==='فيزا'||m==='فودافون كاش')?String(orderTotal()):(m==='أجل'?'0':'');payCalc();
}
C.payM=payUpd;I.payPaid=payCalc;K.payPaid=(t,e)=>{if(e.key==='Enter')A.payOk()};
A.payNo=()=>{POS.payOpen=false;closeModal()};
A.custFull=()=>{const o=curOrder();POS.payOpen=false;closeModal();go('cusEdit',o.cust)};
A.custPayPOS=async()=>{
  const o=curOrder();if(!o.cust)return;
  const r=await formDlg('تسديد دفعة من حساب العميل — '+o.custName,[{k:'a',l:'المبلغ',t:'number'},{k:'m',l:'طريقة الدفع',t:'select',o:['نقدي','فيزا','فودافون كاش','أخرى']},{k:'n',l:'ملاحظة',t:'text'}],'تسجيل الدفعة');
  if(!r){A.posPay();return}
  const a=num(r.a);if(isNaN(a)||a<=0){say('اكتب مبلغًا صحيحًا',1);A.posPay();return}
  cusAddPay(o.cust,a,r.m,r.n,POS.ses.id);say('تم تسجيل الدفعة');A.posPay();
};
A.payOk=async()=>{
  const m=document.querySelector('input[name=pm]:checked').value,paid=num($('payPaid').value),t=orderTotal(),o=curOrder();
  if(isNaN(paid)||paid<0){say('اكتب المبلغ المدفوع',1);return}
  if(['نقدي','فيزا','فودافون كاش'].includes(m)&&paid<t){say('المبلغ المدفوع أقل من قيمة الفاتورة',1);return}
  if((m==='أجل'||paid<t)&&!o.cust){say('اختر العميل أولًا — البيع الأجل أو الدفع الجزئي يحتاج حساب عميل',1);return}
  const s=POS.ses,now=new Date();
  const doc={no:++D.cnt.sale,type:'sale',ts:now.getTime(),dt:nowStr(now),day:dayStr(now),br:s.br,pos:s.pos,session:s.id,user:ME.name,cust:o.cust||null,custName:o.custName||'',
    lines:o.lines.map(l=>({id:l.id,n:l.n,b:l.b,price:l.price,orig:l.orig,cost:l.cost,cat:l.cat,qty:l.qty,u:l.u||'',uf:l.uf||1,tx:l.tx!==false})),total:t,paid,method:m,ret:o.lines.map(()=>0)};
  const dsc=orderDisc(o),TX=taxCfg();
  if(TX){doc.tax=orderTax(o);doc.taxMode=TX.incl?'incl':'excl';doc.taxRate=TX.rate}
  if(dsc>0){
    /* توزيع الخصم على الأصناف: تصبح أسعار الأصناف صافية بعد الخصم فتتسق التقارير والمرتجعات */
    const g=orderGross(o),base=r2(g-dsc);let left=base;
    doc.lines.forEach((l,i)=>{const lt=i===doc.lines.length-1?left:r2(l.price*l.qty*(base/g));left=r2(left-lt);l.pre=l.price;l.price=r3(lt/l.qty)});
    doc.disc=dsc;doc.discNote=(o.disc.mode==='pct'?o.disc.val+'%':'مبلغ')+(o.disc.reason?' — '+o.disc.reason:'');doc.gross=g;
  }
  D.sales.push(doc);doc.lines.forEach(l=>addStk(doc.br,l.id,-l.qty*(l.uf||1)));
  D.held.splice(D.held.indexOf(o),1);POS.oid=0;POS.payOpen=false;
  save('sales','stock','cnt','held');closeModal();await flush();saveSes(doc.session);if(doc.cust)saveCusStmt(doc.cust);
  go('posReceipt',doc);
};
V.posReceipt=d=>{
  setMain(`<div class="row" style="justify-content:center;margin-bottom:10px"><button class="p" style="font-size:20px;padding:14px 26px" data-a="printLast">🖨️ طباعة الفاتورة (90 مم)</button><button style="font-size:20px;padding:14px 26px" data-a="posNew">🆕 طلب جديد</button></div>${rcptDiv(d)}`);
  POS.last=d;
};
A.printLast=()=>printDoc(POS.last);
A.posNew=()=>go('pos');

/* --- الفاتورة المطبوعة --- */
function rcptHtml(r){
  const ret=r.type==='return';
  const rows=r.lines.map(l=>`<tr><td class="nm">${esc(l.n)}${l.u?' ['+esc(l.u)+']':''}${l.orig>l.price?' (عرض)':''}</td><td>${fmt(l.qty)}</td><td>${money(l.price)}</td><td>${money(l.price*l.qty)}</td></tr>`).join('');
  const diff=r2(r.paid-r.total);
  const foot=ret?`<div class="rr"><span>إجمالي المرتجع</span><span>${money(-r.total)}</span></div><div class="rr"><span>طريقة الاسترداد</span><span>${esc(r.method)}</span></div>`
   :`${r.disc>0?`<div class="rr"><span>الإجمالي قبل الخصم</span><span>${money(r.gross)}</span></div><div class="rr"><span>إجمالي الخصم</span><span>− ${money(r.disc)}</span></div>`:''}${r.tax?`<div class="rr"><span>الإجمالي قبل الضريبة</span><span>${money(r.total-r.tax)}</span></div><div class="rr"><span>ضريبة القيمة المضافة ${r.taxRate}%</span><span>${money(r.tax)}</span></div>`:''}${savings(r)>0?`<div class="rr"><span>إجمالي قيمة التوفير</span><span>${money(savings(r))}</span></div>`:''}<div class="rr"><span>المبلغ المستحق</span><span>${money(r.total)}</span></div><div class="rr"><span>المبلغ المدفوع (${esc(r.method)})</span><span>${money(r.paid)}</span></div><div class="rr"><span>${diff>=0?'الباقي':'المتبقي على العميل'}</span><span>${money(Math.abs(diff))}</span></div>`;
  return `<img src="${logoSrc()}" alt=""><div class="t">${ret?'فاتورة مرتجع':'فاتورة'} رقم ${pno(r.no)}</div>${ret&&r.ref?`<div class="c">عن الفاتورة رقم ${pno(r.ref)}</div>`:''}<div class="c">${esc(r.dt)}</div><div class="c">${esc(r.br)} — ${esc(r.pos||'')} — ${esc(r.user)}</div>${r.custName?`<div class="c">العميل: ${esc(r.custName)}</div>`:''}<hr><table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><hr>${foot}`;
}
const rcptDiv=d=>`<div class="rcpt">${rcptHtml(d)}</div>`;
/* الطباعة: kind=rcpt إيصال 90 مم، kind=a4 مستند A4 */
function printHtml(html,kind){
  const pa=$('pa');pa.className=kind==='a4'?'a4doc':'rcpt';pa.innerHTML=html;
  $('pgs').textContent=kind==='a4'?'@page{size:A4;margin:12mm}':'@page{size:90mm auto;margin:0}';
  window.print();
}
function printDoc(d){printHtml(rcptHtml(d),'rcpt')}

/* --- ملف Excel الخاص بكل جلسة: نقطة البيع / الفرع / التاريخ / نقطة البيع / "الفرع - الموظف - التاريخ" --- */
function sesFile(s){
  const n=D.sessions.filter(x=>x.br===s.br&&x.pos===s.pos&&x.day===s.day&&x.id<s.id).length;
  return{folder:`نقطة البيع/${s.br}/${s.day}/${s.pos}`,name:`${s.br} - ${s.user} - ${s.day}${n?` (${n+1})`:''}.xlsx`};
}
function saveSes(sid){
  const s=D.sessions.find(x=>x.id===sid);if(!s)return;
  const ds=D.sales.filter(d=>d.session===sid).sort((a,b)=>a.ts-b.ts);
  const ops=[['رقم الفاتورة','النوع','التاريخ والوقت','الموظف','طريقة الدفع','الباركود','اسم المنتج','فئة المنتج','التكلفة','السعر','الكمية','الإجمالي']];
  const iv=[['رقم الفاتورة','النوع','التاريخ والوقت','الموظف','طريقة الدفع','إجمالي الفاتورة','المدفوع','الباقي / المتبقي','إجمالي التكلفة','الربح','الفاتورة الأصلية','الحالة']];
  let st=0,rt=0;
  ds.forEach(d=>{
    const sg=d.type==='return'?-1:1,tn=sg<0?'مرتجع':'بيع',no=pno(d.no);let cost=0;
    d.lines.forEach(l=>{cost+=l.cost*l.qty*sg;ops.push([no,tn,d.dt,d.user,d.method,String(l.b),l.n,l.cat||'',l.cost,l.price,r3(l.qty*sg),r2(l.price*l.qty*sg)])});
    cost=r2(cost);const rq=(d.ret||[]).reduce((a,b)=>a+b,0),tq=d.lines.reduce((a,l)=>a+l.qty,0);
    iv.push([no,tn,d.dt,d.user,d.method,d.total,d.paid,sg>0?r2(d.paid-d.total):'',cost,r2(d.total-cost),d.ref?pno(d.ref):'',sg>0&&rq>0?(rq>=tq?'مرتجع كلي':'مرتجع جزئي'):'']);
    if(sg>0)st+=d.total;else rt+=d.total;
  });
  const cs=D.cash.filter(c=>c.session===sid),cr=[['النوع','المبلغ','البيان','التاريخ والوقت','الموظف']].concat(cs.map(c=>[c.type==='exp'?'مصروف':'إيراد',c.amount,c.note,c.dt,c.user]));
  const c=sesCalc(sid);
  const sm=[['رقم الجلسة',s.id],['الفرع',s.br],['نقطة البيع',s.pos],['الموظف',s.user],['وقت الفتح',s.odt],['رصيد بداية الدرج',s.opening],['الحالة',s.status==='open'?'مفتوحة':'مغلقة'],[],
    ['إجمالي المبيعات',r2(st)],['إجمالي المرتجعات',r2(-rt)],['صافي المبيعات',r2(st+rt)],['مصروفات',c.ex],['إيرادات',c.inc],[],['طريقة الدفع','المبيعات','المرتجعات','الصافي']];
  METHODS.forEach(m=>sm.push([m,r2(c.m[m].s),r2(-c.m[m].r),r2(c.m[m].s+c.m[m].r)]));
  if(s.status==='closed'){sm.push([],['أغلقها',s.cby],['وقت الإغلاق',s.cdt],[],['طريقة الدفع','المتوقع','الفعلي','الفرق']);
    METHODS.forEach(m=>sm.push([m,m==='أجل'?'':s.exp[m],s.act[m]===undefined?'':s.act[m],s.df[m]===undefined?'':s.df[m]]));sm.push(['إجمالي الفرق (زيادة + / عجز -)',s.diff])}
  const f=sesFile(s);
  return saveX(f.folder,f.name,wbOf([['المعاملات',ops],['الفواتير',iv],['مصروفات وإيرادات',cr],['الملخص',sm]]));
}

/* --- إغلاق الجلسة --- */
function sesCalc(id){
  const r={};METHODS.forEach(m=>r[m]={s:0,r:0});
  D.sales.filter(d=>d.session===id).forEach(d=>{if(d.type==='sale')r[d.method].s+=d.total;else r[d.method].r+=d.total});
  let ex=0,inc=0;D.cash.filter(c=>c.session===id).forEach(c=>{if(c.type==='exp')ex+=c.amount;else inc+=c.amount});
  const col={};METHODS.forEach(m=>col[m]=0);D.cpay.filter(p=>p.session===id).forEach(p=>{col[p.method]=(col[p.method]||0)+p.amount});
  return{m:r,ex:r2(ex),inc:r2(inc),col};
}
const sesExp=(c,m,op)=>r2(c.m[m].s+c.m[m].r+(c.col[m]||0)+(m==='نقدي'?op+c.inc-c.ex:0));
A.sesClose=t=>{if(can('pos_close'))go('sesClose',+t.dataset.id);else say('إغلاق الجلسة للمدير فقط',1)};
V.sesClose=id=>{
  const s=D.sessions.find(x=>x.id===id);if(!s||s.status!=='open'){go('posPoints');return}
  const c=sesCalc(id);let net=0;
  const rows=METHODS.map(m=>{const x=c.m[m],exp=sesExp(c,m,s.opening);net+=x.s+x.r;
    return `<tr><td>${m}</td><td>${money(x.s)}</td><td>${money(-x.r)}</td><td>${m==='أجل'?'—':money(exp)}</td><td>${m==='أجل'?'—':`<input inputmode="decimal" data-i="sesAct" data-m="${m}" data-e="${exp}">`}</td><td class="df">—</td></tr>`}).join('');
  setMain(`<div class="row"><button data-a="go" data-v="posPoints">‹ رجوع</button><div class="ttl" style="margin:0;flex:1">إغلاق الجلسة #${s.id} — ${esc(s.br)} / ${esc(s.pos)}</div></div>
  <div class="card mut">فتحها ${esc(s.user)} في ${esc(s.odt)} — رصيد البداية: ${money(s.opening)} — مصروفات: ${money(c.ex)} — إيرادات: ${money(c.inc)} — تحصيلات من العملاء: ${money(Object.values(c.col).reduce((a,b)=>a+b,0))}${liveHeld(s.id).length?` — <b class="err">طلبات معلقة: ${liveHeld(s.id).length} (يجب إنهاؤها أو حذفها قبل الإغلاق)</b>`:''}</div>
  <div class="card">${tbl(['الطريقة','المبيعات','المرتجعات','المتوقع','الفعلي','الفرق'],rows)}<div class="ttl" style="text-align:center;margin-top:10px">صافي المبيعات: ${money(net)}</div>
  <button class="p" style="width:100%" data-a="sesDo" data-id="${s.id}">🔒 إغلاق الجلسة</button></div>`);
};
I.sesAct=t=>{const a=num(t.value);t.closest('tr').querySelector('.df').textContent=isNaN(a)?'—':diffTxt(r2(a-(+t.dataset.e)))};
A.sesDo=async t=>{
  const s=D.sessions.find(x=>x.id==t.dataset.id);if(!s)return;
  if(liveHeld(s.id).length){say('يوجد '+liveHeld(s.id).length+' طلبات معلقة في هذه الجلسة، أكملها أو احذفها أولًا',1);return}
  const c=sesCalc(s.id),act={},exp={},df={};let bad=false;
  document.querySelectorAll('#main input[data-m]').forEach(i=>{const a=num(i.value);if(isNaN(a)||a<0)bad=true;else act[i.dataset.m]=a});
  if(bad){say('اكتب المبلغ الفعلي الموجود لكل طريقة دفع',1);return}
  METHODS.forEach(m=>{exp[m]=sesExp(c,m,s.opening);if(act[m]!==undefined)df[m]=r2(act[m]-exp[m])});
  const tot=r2(Object.values(df).reduce((a,b)=>a+b,0));
  if(!(await dlg('نتيجة الجرد: '+diffTxt(tot)+'\nهل تريد إغلاق الجلسة؟',{yes:'إغلاق الجلسة',no:'رجوع'})))return;
  D.held=D.held.filter(o=>o.ses!==s.id);save('held');
  Object.assign(s,{status:'closed',cdt:nowStr(),cby:ME.name,exp,act,df,diff:tot,sum:c});
  save('sessions');await flush();
  await saveSes(s.id);
  if(POS.ses&&POS.ses.id===s.id){POS.ses=null;POS.oid=0}
  say(`تم إغلاق الجلسة #${s.id} — النتيجة: ${diffTxt(tot)}`,tot<0);go('posPoints');
};

/* ===== مراجعة الفواتير والمرتجعات ===== */
const RV={doc:null};
V.review=()=>{
  setMain(`<div class="ttl">مراجعة الفواتير والمرتجعات</div><div class="card"><div class="row"><input type="date" id="vDay" value="${dayStr()}" data-c="rvList" style="max-width:180px"><input id="vNo" placeholder="رقم الفاتورة" data-i="rvList" style="max-width:160px"><select id="vBr" data-c="rvList" style="max-width:200px"><option value="">كل الفروع</option>${BR.map(b=>`<option>${b}</option>`).join('')}</select></div><div class="ttl" id="vSum" style="font-size:15px;margin-top:8px"></div><div id="vList"></div></div><div id="vDet"></div>`);
  rvList();
};
C.rvList=rvList;I.rvList=rvList;
function rvList(){
  const day=$('vDay').value,q=norm(dg($('vNo').value)),br=$('vBr').value;
  let l=q?D.sales.filter(d=>String(d.no)===String(parseInt(q,10))):D.sales.filter(d=>d.day===day&&(!br||d.br===br));
  l=l.slice().sort((a,b)=>b.ts-a.ts);
  const sl=l.filter(d=>d.type==='sale'),rt=l.filter(d=>d.type==='return');
  const st=r2(sl.reduce((s,d)=>s+d.total,0)),rv=r2(rt.reduce((s,d)=>s+d.total,0));
  $('vSum').textContent=`مبيعات: ${money(st)} — مرتجعات: ${money(-rv)} — الصافي: ${money(st+rv)} — عدد الفواتير: ${sl.length}`;
  $('vList').innerHTML=l.length?tbl(['#','الوقت','الفرع','نقطة البيع','المستخدم','العميل','الدفع','الإجمالي','الحالة','أودو'],l.slice(0,200).map(d=>{
    const rq=(d.ret||[]).reduce((a,b)=>a+b,0),tq=d.lines.reduce((a,x)=>a+x.qty,0);
    const tag=d.type==='return'?'<span class="badge b-cancel">مرتجع</span>':(rq>0?`<span class="badge b-draft">${rq>=tq?'مرتجع كلي':'مرتجع جزئي'}</span>`:'');
    return `<tr class="clk" data-a="rvOpen" data-no="${d.no}"><td>${pno(d.no)}</td><td>${esc(d.dt.slice(-8))}</td><td>${esc(d.br)}</td><td>${esc(d.pos||'')}</td><td>${esc(d.user)}</td><td>${esc(d.custName||'')}</td><td>${esc(d.method)}</td><td><b>${money(d.total)}</b></td><td>${tag}</td><td>${syBadge(d)}</td></tr>`}).join('')):'<div class="mut">لا توجد فواتير</div>';
}
A.rvOpen=t=>{
  const d=D.sales.find(x=>String(x.no)===t.dataset.no);if(!d)return;RV.doc=d;
  const left=d.type==='sale'&&can('pos_return')&&d.lines.some((l,i)=>r2(l.qty-(d.ret[i]||0))>0);
  $('vDet').innerHTML=`<div class="card">${rcptDiv(d)}<div id="vRet"></div><div class="row"><button class="f p" data-a="rvPrint">🖨️ طباعة</button>${left?'<button class="f" data-a="rvRetForm">↩️ مرتجع</button>':''}</div></div>`;
  $('vDet').scrollIntoView({behavior:'smooth'});
};
A.rvPrint=()=>printDoc(RV.doc);
A.rvRetForm=()=>{
  const d=RV.doc;
  $('vRet').innerHTML=`<div class="mut">اكتب الكمية المرتجعة لكل صنف</div>${tbl(['الصنف','المتاح للإرجاع','الكمية المرتجعة'],d.lines.map((l,i)=>{const av=r2(l.qty-(d.ret[i]||0));return av<=0?'':`<tr><td class="l">${esc(l.n)}</td><td>${fmt(av)}</td><td><input inputmode="decimal" value="0" data-q="${i}" data-av="${av}"></td></tr>`}).join(''))}<div class="row" style="margin:8px 0"><button class="f p" data-a="rvRetOk">تأكيد المرتجع</button></div>`;
};
A.rvRetOk=async()=>{
  const d=RV.doc;if(!d)return;const q={};let any=false,bad=false;
  document.querySelectorAll('#vRet input[data-q]').forEach(i=>{const v=num(i.value);if(isNaN(v)||v<0||v>+i.dataset.av)bad=true;else if(v>0){q[+i.dataset.q]=v;any=true}});
  if(bad){say('كمية مرتجعة غير صحيحة',1);return}if(!any){say('اكتب كمية للإرجاع',1);return}
  const s=(d.session&&D.sessions.find(x=>x.id===d.session&&x.status==='open'))||D.sessions.find(x=>x.status==='open'&&x.br===d.br);
  if(!s){say('لا توجد جلسة مفتوحة في هذا الفرع لتسجيل المرتجع عليها',1);return}
  const lines=[];Object.keys(q).forEach(i=>{const l=d.lines[i];lines.push({id:l.id,n:l.n,b:l.b,price:l.price,cost:l.cost,cat:l.cat,qty:q[i],u:l.u||'',uf:l.uf||1,tx:l.tx});d.ret[i]=r3((d.ret[i]||0)+q[i]);addStk(d.br,l.id,q[i]*(l.uf||1))});
  let base=0,tx=0;lines.forEach(l=>{const a=l.price*l.qty;base+=a;if(d.taxMode&&l.tx!==false)tx+=d.taxMode==='excl'?a*d.taxRate/100:a*d.taxRate/100/(1+d.taxRate/100)});
  const tot=-r2(base+(d.taxMode==='excl'?tx:0)),taxv=-r2(tx),now=new Date();
  const doc={no:++D.cnt.sale,type:'return',ts:now.getTime(),dt:nowStr(now),day:dayStr(now),br:d.br,pos:s.pos,session:s.id,user:ME.name,cust:d.cust||null,custName:d.custName||'',lines,total:tot,paid:tot,method:d.method,ref:d.no};
  if(d.taxMode){doc.tax=taxv;doc.taxMode=d.taxMode;doc.taxRate=d.taxRate}
  D.sales.push(doc);save('sales','stock','cnt');await flush();saveSes(doc.session);if(d.session!==doc.session)saveSes(d.session);if(doc.cust)saveCusStmt(doc.cust);
  say('تم تسجيل المرتجع رقم '+pno(doc.no));rvList();A.rvOpen({dataset:{no:String(doc.no)}});
};
