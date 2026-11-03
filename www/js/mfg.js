/* ===== التصنيع: قوائم المكونات (BOM) + أوامر التصنيع ===== */
const MF={tab:'ord',id:0};
const MST={draft:['مسودة','b-draft'],done:['تم التصنيع','b-done'],cancelled:['ملغي','b-cancel']};
const moOf=id=>D.mfg.find(m=>m.id===id);
const bomOf=pid=>D.boms.find(b=>b.pid===pid);
const moOut=m=>(m.outAct>0?m.outAct:m.qty);
function moCost(m){
  const comp=r2(m.comps.reduce((s,x)=>s+x.act*x.cost,0)),tot=r2(comp+(m.extra||0)),out=moOut(m);
  return{comp,extra:m.extra||0,tot,out,unit:out>0?r3(tot/out):0};
}
V.mfg=()=>{
  if(!can('mfg_view')){say('ليس لديك صلاحية التصنيع',1);return go('home')}
  const T=[['ord','أوامر التصنيع'],['bom','قوائم المكونات (BOM)']];
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">التصنيع</div>${can('mfg_edit')?'<button class="p" data-a="mfgNew">➕ أمر تصنيع جديد</button>':''}</div>${tabs(MF.tab,T,'mfTab')}<div class="card" id="mfL"></div>`);
  mfList();
};
A.mfTab=t=>{MF.tab=t.dataset.v;V.mfg()};
function mfList(){
  if(MF.tab==='bom'){
    $('mfL').innerHTML=D.boms.length?tbl(['المنتج النهائي','الكمية الناتجة','عدد المكونات','المكونات',''],D.boms.map(b=>{const p=PI.id[b.pid];return `<tr><td class="l">${esc(p?p.name:b.pid)}</td><td>${fmt(b.out)} ${esc(p?p.unit:'')}</td><td>${b.items.length}</td><td class="l">${b.items.map(i=>{const c=PI.id[i.id];return esc(c?c.name:i.id)+' ('+fmt(i.qty)+')'}).join('، ')}</td><td>${can('mfg_edit')?`<button class="p" data-a="bomMo" data-id="${esc(b.pid)}">أمر تصنيع</button> <button class="d" data-a="bomDel" data-id="${esc(b.pid)}">حذف</button>`:''}</td></tr>`}).join('')):'<div class="mut">لا توجد قوائم مكونات. احفظ قائمة من داخل أي أمر تصنيع.</div>';
    return;
  }
  const l=D.mfg.slice().sort((a,b)=>b.id-a.id).slice(0,200);
  $('mfL').innerHTML=l.length?tbl(['#','المنتج','الكمية','الفرع','التاريخ','إجمالي التكلفة','تكلفة الوحدة','الحالة'],l.map(m=>{const c=moCost(m);return `<tr class="clk" data-a="mfgOpen" data-id="${m.id}"><td>${m.id}</td><td class="l">${esc(m.name||'—')}</td><td>${fmt(moOut(m))} ${esc(m.unit)}</td><td>${esc(m.br)}</td><td>${esc(m.date)}</td><td>${m.comps.length?money(c.tot):'—'}</td><td>${m.status==='done'?money(c.unit):'—'}</td><td><span class="badge ${MST[m.status][1]}">${MST[m.status][0]}</span></td></tr>`}).join('')):'<div class="mut">لا توجد أوامر تصنيع</div>';
}
A.mfgOpen=t=>go('mfgEdit',+t.dataset.id);
A.mfgNew=()=>{
  if(!can('mfg_edit')){say('ليس لديك صلاحية',1);return}
  const m={id:++D.cnt.mfg,pid:null,name:'',unit:'',br:BR[0],qty:1,outAct:null,extra:0,upd:true,comps:[],status:'draft',date:dayStr(),user:ME.name,ts:Date.now()};
  D.mfg.push(m);save('mfg','cnt');go('mfgEdit',m.id);
};
A.bomDel=async t=>{if(await dlg('حذف قائمة المكونات؟',{yes:'حذف'})){D.boms=D.boms.filter(b=>b.pid!==t.dataset.id);save('boms');mfList()}};
function loadBom(m){
  const b=bomOf(m.pid);if(!b)return false;
  const f=b.out>0?m.qty/b.out:1;
  m.comps=b.items.map(i=>{const p=PI.id[i.id];return{id:i.id,n:p?p.name:i.id,unit:p?p.unit:'',plan:r3(i.qty*f),act:r3(i.qty*f),cost:p?pCost(p):0}});
  return true;
}
A.bomMo=t=>{
  const p=PI.id[t.dataset.id];if(!p)return;
  const m={id:++D.cnt.mfg,pid:p.id,name:p.name,unit:p.unit,br:BR[0],qty:bomOf(p.id).out,outAct:null,extra:0,upd:true,comps:[],status:'draft',date:dayStr(),user:ME.name,ts:Date.now()};
  loadBom(m);D.mfg.push(m);save('mfg','cnt');go('mfgEdit',m.id);
};

V.mfgEdit=id=>{
  const m=moOf(id);if(!m){go('mfg');return}
  MF.id=id;const ed=m.status==='draft'&&can('mfg_edit');
  setMain(`<div class="row"><button data-a="go" data-v="mfg">‹ التصنيع</button><div class="ttl" style="margin:0;flex:1">أمر تصنيع #${m.id} <span class="badge ${MST[m.status][1]}">${MST[m.status][0]}</span></div></div>
  <div class="card"><div class="lbl">المنتج المراد تصنيعه</div>
   ${m.pid?`<div class="row"><b style="font-size:19px;flex:1">${esc(m.name)}</b><span class="mut">الوحدة: ${esc(m.unit||'—')}</span>${ed?'<button data-a="mfChg">تغيير المنتج</button>':''}</div>`
   :(ed?'<input id="mfPq" data-i="mfPq" placeholder="ابحث باسم المنتج أو الباركود (مثال: كيري رومي)" autocomplete="off"><div id="mfPr"></div>':'<div class="mut">—</div>')}
   <div class="g2" style="margin-top:8px"><div><div class="lbl">الفرع (المخزن)</div><select data-c="mfHdr" data-f="br"${ed?'':' disabled'}>${BR.map(b=>`<option${b===m.br?' selected':''}>${esc(b)}</option>`).join('')}</select></div>
   <div><div class="lbl">الكمية المطلوب تصنيعها ${m.unit?'('+esc(m.unit)+')':''}</div><input inputmode="decimal" value="${m.qty}" data-c="mfHdr" data-f="qty"${ed?'':' disabled'}></div>
   <div><div class="lbl">التاريخ</div><input type="date" value="${esc(m.date)}" data-c="mfHdr" data-f="date"${ed?'':' disabled'}></div></div></div>
  <div class="card"><div class="ttl">المكونات</div>${ed?'<input id="mfCq" data-i="mfCq" placeholder="أضف مكوّنًا: ابحث بالاسم أو الباركود" autocomplete="off"><div id="mfCr"></div>':''}<div id="mfBody"></div></div>`);
  mfBody();
};
const mfM=()=>moOf(MF.id);
I.mfPq=t=>{const q=norm(t.value);$('mfPr').innerHTML=q.length<2?'':search(q,10).map(p=>`<div class="row" style="padding:8px;border-bottom:1px solid var(--bd);cursor:pointer" data-a="mfPickProd" data-id="${esc(p.id)}"><span style="flex:1">${esc(p.name)}</span><span class="mut">${esc(p.bc)} — ${esc(p.unit)}</span></div>`).join('')};
A.mfPickProd=t=>{
  const m=mfM(),p=PI.id[t.dataset.id];m.pid=p.id;m.name=p.name;m.unit=p.unit;
  const b=bomOf(p.id);if(b)m.qty=b.out>0?b.out:1;
  m.comps=[];const loaded=loadBom(m);save('mfg');go('mfgEdit',m.id);
  say(loaded?'تم تحميل مكونات «'+p.name+'» من قائمة المكونات':'لا توجد قائمة مكونات لهذا المنتج — أضف المكونات يدويًا');
};
A.mfChg=()=>{const m=mfM();m.pid=null;m.name='';m.unit='';m.comps=[];save('mfg');go('mfgEdit',m.id)};
I.mfCq=t=>{const q=norm(t.value);$('mfCr').innerHTML=q.length<2?'':search(q,10).map(p=>`<div class="row" style="padding:8px;border-bottom:1px solid var(--bd);cursor:pointer" data-a="mfPickComp" data-id="${esc(p.id)}"><span style="flex:1">${esc(p.name)}</span><span class="mut">${esc(p.bc)} — رصيد ${fmt(stk(mfM().br,p.id))}</span></div>`).join('')};
A.mfPickComp=t=>{
  const m=mfM(),p=PI.id[t.dataset.id];
  if(p.id===m.pid){say('لا يمكن إضافة المنتج النهائي كمكوّن لنفسه',1);return}
  const e=m.comps.find(x=>x.id===p.id);
  if(e){e.plan=r3(e.plan+1);if(!e.actSet)e.act=e.plan}else m.comps.push({id:p.id,n:p.name,unit:p.unit,plan:1,act:1,cost:pCost(p)});
  save('mfg');$('mfCq').value='';$('mfCr').innerHTML='';mfBody();
};
C.mfHdr=t=>{
  const m=mfM(),f=t.dataset.f;
  if(f==='qty'){
    const v=num(t.value);if(isNaN(v)||v<=0){say('كمية غير صحيحة',1);t.value=m.qty;return}
    const k=v/m.qty;m.comps.forEach(x=>{x.plan=r3(x.plan*k);if(!x.actSet)x.act=x.plan});m.qty=v;
  }else m[f]=t.value;
  save('mfg');mfBody();
};
C.mfLn=t=>{
  const m=mfM(),x=m.comps[+t.dataset.n],v=num(t.value);
  if(isNaN(v)||v<0){say('كمية غير صحيحة',1);mfBody();return}
  if(t.dataset.f==='plan'){x.plan=v;if(!x.actSet)x.act=v}else{x.act=v;x.actSet=true}
  save('mfg');mfBody();
};
A.mfDel=t=>{mfM().comps.splice(+t.dataset.n,1);save('mfg');mfBody()};
C.mfExtra=t=>{const m=mfM(),v=num(t.value);m.extra=isNaN(v)||v<0?0:v;save('mfg');mfBody()};
C.mfOut=t=>{const m=mfM(),v=num(t.value);m.outAct=(isNaN(v)||v<=0)?null:v;save('mfg');mfBody()};
C.mfUpd=t=>{mfM().upd=t.checked;save('mfg')};
function mfBody(){
  const m=mfM(),ed=m.status==='draft'&&can('mfg_edit'),done=m.status!=='draft',c=moCost(m);
  const head=done?['المكوّن','الوحدة','الرصيد قبل','الكمية المخططة','الكمية المستهلكة','الرصيد بعد','تكلفة الوحدة','التكلفة']:['المكوّن','الوحدة','رصيد الفرع الآن','الكمية المخططة','الكمية الفعلية','تكلفة الوحدة','التكلفة',''];
  const rows=m.comps.map((x,i)=>done?`<tr><td class="l">${esc(x.n)}</td><td>${esc(x.unit)}</td><td>${fmt(m.before?m.before.comps[x.id]:0)}</td><td>${fmt(x.plan)}</td><td>${fmt(x.act)}</td><td>${fmt(m.after?m.after.comps[x.id]:0)}</td><td>${money(x.cost)}</td><td><b>${money(x.act*x.cost)}</b></td></tr>`
   :`<tr><td class="l">${esc(x.n)}</td><td>${esc(x.unit)}</td><td style="color:${stk(m.br,x.id)<x.act?'var(--bad)':'inherit'}">${fmt(stk(m.br,x.id))}</td><td>${ed?`<input inputmode="decimal" value="${x.plan}" data-c="mfLn" data-n="${i}" data-f="plan">`:fmt(x.plan)}</td><td>${ed?`<input inputmode="decimal" value="${x.act}" data-c="mfLn" data-n="${i}" data-f="act">`:fmt(x.act)}</td><td>${money(x.cost)}</td><td><b>${money(x.act*x.cost)}</b></td><td>${ed?`<button class="d" data-a="mfDel" data-n="${i}">✕</button>`:''}</td></tr>`).join('');
  const prodRow=done&&m.before?`<div class="card" style="background:var(--pl)"><b>${esc(m.name)}</b> — رصيد قبل التصنيع: ${fmt(m.before.prod)} ${esc(m.unit)} ← بعد التصنيع: <b>${fmt(m.after.prod)}</b> ${esc(m.unit)} (أُضيف ${fmt(m.outAct)})</div>`:'';
  $('mfBody').innerHTML=(m.comps.length?tbl(head,rows):'<div class="mut" style="padding:8px">أضف مكونات المنتج</div>')+prodRow+`
  <div class="g2" style="margin-top:10px"><div><div class="lbl">تكاليف إضافية (عمالة / تشغيل / تعبئة)</div><input inputmode="decimal" value="${m.extra||0}" data-c="mfExtra"${ed?'':' disabled'}></div>
   <div><div class="lbl">الكمية المنتجة فعليًا ${m.unit?'('+esc(m.unit)+')':''} — اتركها فارغة = الكمية المطلوبة</div><input inputmode="decimal" value="${m.outAct||''}" placeholder="${m.qty}" data-c="mfOut"${ed?'':' disabled'}></div></div>
  <div class="g2" style="margin-top:10px"><div class="card"><div class="mut">تكلفة المكونات</div><div class="ttl">${money(c.comp)}</div></div><div class="card"><div class="mut">تكاليف إضافية</div><div class="ttl">${money(c.extra)}</div></div>
   <div class="card"><div class="mut">إجمالي تكلفة التصنيع</div><div class="ttl">${money(c.tot)}</div></div><div class="card" style="border-color:var(--pri)"><div class="mut">تكلفة ${esc(m.unit||'الوحدة')} الواحدة من «${esc(m.name||'المنتج')}»</div><div class="ttl" style="color:var(--pri2)">${money(c.unit)}</div></div></div>
  ${ed?`<label><input type="checkbox" data-c="mfUpd"${m.upd?' checked':''}> تحديث تكلفة المنتج في المنتجات بتكلفة الوحدة الجديدة بعد التصنيع</label>`:''}
  <div class="row" style="margin-top:10px">${ed&&can('mfg_edit')?'<button data-a="mfBom">💾 حفظ كقائمة مكونات (BOM)</button>':''}${ed&&can('mfg_run')?'<button class="p" data-a="mfgRun">▶ تنفيذ التصنيع</button>':''}${ed&&!m.comps.length?'<button class="d" data-a="mfgDel">🗑 حذف المسودة</button>':''}${m.status==='done'&&can('mfg_run')?'<button class="d" data-a="mfgRev">↩ عكس التصنيع</button>':''}</div>`;
}
A.mfBom=()=>{
  const m=mfM();if(!m.pid||!m.comps.length){say('اختر المنتج وأضف المكونات أولًا',1);return}
  D.boms=D.boms.filter(b=>b.pid!==m.pid);D.boms.push({pid:m.pid,out:m.qty,items:m.comps.map(x=>({id:x.id,qty:x.plan}))});
  save('boms');say('تم حفظ قائمة المكونات لـ «'+m.name+'»');
};
A.mfgDel=async()=>{if(await dlg('حذف هذه المسودة؟',{yes:'حذف'})){D.mfg.splice(D.mfg.indexOf(mfM()),1);save('mfg');go('mfg')}};
function mfgFile(m){
  const c=moCost(m),rows=[['أمر تصنيع رقم',m.id],['المنتج',m.name],['الفرع',m.br],['التاريخ',m.date],['المنفّذ',m.doneBy||m.user],['وقت التنفيذ',m.doneDt||''],['الحالة',MST[m.status][0]],[],
   ['المكوّن','الوحدة','الرصيد قبل','المخطط','المستهلك فعليًا','الرصيد بعد','تكلفة الوحدة','التكلفة']];
  m.comps.forEach(x=>rows.push([x.n,x.unit,m.before?m.before.comps[x.id]:'',x.plan,x.act,m.after?m.after.comps[x.id]:'',x.cost,r2(x.act*x.cost)]));
  rows.push([],['المنتج النهائي',m.name,'الرصيد قبل',m.before?m.before.prod:'','الكمية المنتجة',moOut(m),'الرصيد بعد',m.after?m.after.prod:''],[],
   ['تكلفة المكونات',c.comp],['تكاليف إضافية',c.extra],['إجمالي التكلفة',c.tot],['الكمية المنتجة ('+m.unit+')',c.out],['تكلفة الوحدة ('+m.unit+')',c.unit]);
  return saveX(`التصنيع/${m.br}/${m.date}`,`أمر تصنيع ${m.id} - ${m.name} - ${m.date}.xlsx`,wbOf([['أمر التصنيع',rows]]));
}
A.mfgRun=async()=>{
  const m=mfM();if(!can('mfg_run')){say('ليس لديك صلاحية تنفيذ التصنيع',1);return}
  if(!m.pid||!m.comps.length){say('اختر المنتج وأضف المكونات',1);return}
  if(m.comps.some(x=>!(x.act>0))){say('يوجد مكوّن كميته الفعلية صفر',1);return}
  const out=moOut(m);if(!(out>0)){say('الكمية المنتجة غير صحيحة',1);return}
  const short=m.comps.filter(x=>stk(m.br,x.id)<x.act);
  if(short.length&&!(await dlg(`${short.length} مكوّن رصيده في «${m.br}» أقل من المطلوب:\n${short.map(x=>x.n).slice(0,5).join('\n')}\nهل تريد المتابعة؟ (سيصبح الرصيد بالسالب)`,{yes:'متابعة'})))return;
  m.comps.forEach(x=>{const p=PI.id[x.id];if(p)x.cost=pCost(p)});
  m.before={comps:{},prod:stk(m.br,m.pid)};m.comps.forEach(x=>{m.before.comps[x.id]=stk(m.br,x.id)});
  m.comps.forEach(x=>addStk(m.br,x.id,-x.act));addStk(m.br,m.pid,out);
  m.after={comps:{},prod:stk(m.br,m.pid)};m.comps.forEach(x=>{m.after.comps[x.id]=stk(m.br,x.id)});
  m.outAct=out;const c=moCost(m);
  if(m.upd){const p=PI.id[m.pid];if(p){p.cost=c.unit;save('products')}}
  m.status='done';m.doneDt=nowStr();m.doneBy=ME.name;m.totalCost=c.tot;m.unitCost=c.unit;
  save('mfg','stock','cnt');await flush();mfgFile(m);
  say(`تم التصنيع — تكلفة ${m.unit||'الوحدة'}: ${money(c.unit)}`);go('mfgEdit',m.id);
};
A.mfgRev=async()=>{
  const m=mfM();if(!can('mfg_run'))return;
  if(!(await dlg('عكس أمر التصنيع؟\nسيتم إرجاع المكونات للمخزون وخصم الكمية المنتجة (تكلفة المنتج لا تتغير).',{yes:'عكس التصنيع'})))return;
  m.comps.forEach(x=>addStk(m.br,x.id,x.act));addStk(m.br,m.pid,-moOut(m));
  m.status='cancelled';save('mfg','stock');await flush();mfgFile(m);go('mfgEdit',m.id);
};
