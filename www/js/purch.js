/* ===== المشتريات ===== */
const PU={doc:null,f:'',st:'',tab:'inv'};
const ST={draft:['جاري الاستلام','b-draft'],received:['تم الاستلام','b-done'],cancelled:['ملغاة','b-cancel']};
const puTotal=d=>r2(d.lines.reduce((s,l)=>s+l.qty*l.cost,0));
const supById=id=>D.suppliers.find(s=>s.id===id);
const supByName=n=>D.suppliers.find(s=>nm(s.name)===nm(n));
function supBalance(id){
  const s=supById(id);if(!s)return 0;
  const p=D.purchases.filter(d=>d.sup===id&&d.status==='received').reduce((a,d)=>a+puTotal(d),0);
  const pay=D.payments.filter(x=>x.sup===id).reduce((a,x)=>a+x.amount,0),rt=D.pret.filter(x=>x.sup===id).reduce((a,x)=>a+x.total,0);
  return r2((s.open||0)+p-pay-rt);   // موجب = مستحق للمورد علينا
}

/* ملفات Excel: المشتريات / الفرع / التاريخ / "الفرع - المورد - التاريخ" */
function purFile(d){
  const n=D.purchases.filter(x=>x.br===d.br&&nm(x.supName)===nm(d.supName)&&x.date===d.date&&x.id<d.id&&x.status!=='draft').length;
  return{folder:`المشتريات/${d.br}/${d.date}`,name:`${d.br} - ${d.supName} - ${d.date}${n?` (${n+1})`:''}.xlsx`};
}
function savePurFile(d){
  const rows=[['فاتورة مشتريات رقم',d.id],['المورد',d.supName],['الفرع (المخزن)',d.br],['التاريخ',d.date],['القائم بالاستلام',d.emp],['الحالة',ST[d.status][0]],['وقت الاستلام',d.rdt||''],[],['الباركود','الاسم','الكمية','التكلفة','الإجمالي','سعر البيع']];
  d.lines.forEach(l=>{const p=PI.id[l.id];rows.push([String(l.b),l.n,l.qty,l.cost,r2(l.qty*l.cost),p?pPrice(p):''])});
  rows.push([],['','','','إجمالي الفاتورة',puTotal(d)]);
  const f=purFile(d);return saveX(f.folder,f.name,wbOf([['الفاتورة',rows]]));
}
function saveSupStmt(id){
  const s=supById(id);if(!s)return;
  const inv=D.purchases.filter(d=>d.sup===id).sort((a,b)=>a.id-b.id),pay=D.payments.filter(x=>x.sup===id).sort((a,b)=>a.ts-b.ts);
  const sm=[['المورد',s.name],['الهاتف',s.phone],['العنوان',s.addr],['رصيد افتتاحي',s.open||0],['الرصيد الحالي (موجب = مستحق للمورد)',supBalance(id)]];
  const iv=[['رقم الفاتورة','التاريخ','الفرع','القيمة','الحالة']].concat(inv.map(d=>[d.id,d.date,d.br,puTotal(d),ST[d.status][0]]));
  const py=[['التاريخ','المبلغ','الطريقة','ملاحظة','بواسطة']].concat(pay.map(x=>[x.dt,x.amount,x.method,x.note,x.user]));
  const rt=[['رقم المرتجع','التاريخ','عن فاتورة','القيمة']].concat(D.pret.filter(x=>x.sup===id).map(x=>[x.id,x.dt,x.pur,x.total]));
  return saveX('الحسابات/الموردين',`${s.name}.xlsx`,wbOf([['الملخص',sm],['الفواتير',iv],['الدفعات',py],['المرتجعات',rt]]));
}

V.purchases=()=>{
  if(!can('pur_view')){say('ليس لديك صلاحية المشتريات',1);return go('home')}
  if(PU.tab==='ret')return purRetList();
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">المشتريات</div>${can('pur_edit')?'<button class="p" data-a="purNew">➕ فاتورة مشتريات جديدة</button>':''}</div>${tabs(PU.tab,[['inv','فواتير المشتريات'],['ret','مرتجعات الموردين']],'puTab')}
  <div class="card"><div class="row"><input id="puF" data-i="puFlt" placeholder="بحث باسم المورد أو رقم الفاتورة" style="max-width:320px"><select id="puS" data-c="puFlt" style="max-width:200px"><option value="">كل الحالات</option><option value="draft">جاري الاستلام</option><option value="received">تم الاستلام</option><option value="cancelled">ملغاة</option></select></div></div>
  <div class="card" id="puL"></div>`);
  puList();
};
I.puFlt=C.puFlt=()=>puList();
function puList(){
  const q=nm($('puF').value),st=$('puS').value;
  const l=D.purchases.filter(d=>(!st||d.status===st)&&(!q||nm(d.supName).includes(q)||String(d.id)===q)).slice().sort((a,b)=>b.id-a.id).slice(0,200);
  $('puL').innerHTML=l.length?tbl(['#','اسم المورد','التاريخ','القائم بالاستلام','الفرع','قيمة الفاتورة','الحالة','أودو'],l.map(d=>`<tr class="clk" data-a="purOpen" data-id="${d.id}"><td>${d.id}</td><td class="l">${esc(d.supName)}</td><td>${esc(d.date)}</td><td>${esc(d.emp)}</td><td>${esc(d.br)}</td><td><b>${money(puTotal(d))}</b></td><td><span class="badge ${ST[d.status][1]}">${ST[d.status][0]}</span></td><td>${d.status==='received'?syBadge(d):''}</td></tr>`).join('')):'<div class="mut">لا توجد فواتير مشتريات</div>';
}
A.purOpen=t=>go('purEdit',+t.dataset.id);
A.purNew=()=>{
  if(!can('pur_edit')){say('ليس لديك صلاحية',1);return}
  const d={id:++D.cnt.pur,sup:null,supName:'',date:dayStr(),emp:ME.name,br:BR[0],status:'draft',lines:[]};
  D.purchases.push(d);save('purchases','cnt');go('purEdit',d.id);
};
V.purEdit=id=>{
  const d=D.purchases.find(x=>x.id===id);if(!d){go('purchases');return}
  PU.doc=d;const ed=d.status==='draft'&&can('pur_edit');
  const hd=(l,f,t,dis)=>`<div><div class="lbl">${l}</div><input ${t?`type="${t}"`:''} value="${esc(d[f])}" data-c="purHdr" data-f="${f}"${(!ed||dis)?' disabled':''}${f==='sup'?'':''}></div>`;
  setMain(`<div class="row"><button data-a="go" data-v="purchases">‹ المشتريات</button><div class="ttl" style="margin:0;flex:1">فاتورة مشتريات #${d.id} <span class="badge ${ST[d.status][1]}">${ST[d.status][0]}</span> ${d.status==='received'?syBadge(d):''}</div></div>
  <div class="card"><div class="g2">
   <div><div class="lbl">اسم المورد</div><input list="supList" value="${esc(d.supName)}" data-c="purHdr" data-f="supName"${ed?'':' disabled'}><datalist id="supList">${D.suppliers.map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist></div>
   ${hd('التاريخ','date','date')}
   <div><div class="lbl">القائم بالاستلام (الموظف)</div><input list="empList" value="${esc(d.emp)}" data-c="purHdr" data-f="emp"${ed?'':' disabled'}><datalist id="empList">${D.employees.map(e=>`<option value="${esc(e.name)}">`).join('')}</datalist></div>
   <div><div class="lbl">فرع الاستلام (المخزن)</div><select data-c="purHdr" data-f="br"${ed?'':' disabled'}>${BR.map(b=>`<option${b===d.br?' selected':''}>${b}</option>`).join('')}</select></div>
  </div></div>
  <div class="card">${ed?'<input id="puAdd" data-k="puAdd" data-i="puAddQ" placeholder="امسح الباركود أو اكتب اسم الصنف ثم Enter لإضافته" autocomplete="off"><div id="puRes"></div>':''}<div id="puLines"></div>
   <div class="ttl" style="text-align:center;margin-top:8px">إجمالي الفاتورة: <span id="puTot">0.00</span></div>
   <div class="row"><button data-a="purPrint">🖨 طباعة الفاتورة</button>${d.status==='received'&&can('pur_return')?'<button data-a="puRetForm">↩️ مرتجع للمورد</button>':''}${ed&&can('pur_confirm')?'<button class="f p" data-a="purRecv">✅ تأكيد الاستلام</button>':''}${d.status!=='cancelled'&&can('pur_cancel')?'<button class="f d" data-a="purCancel">⛔ إلغاء الفاتورة</button>':''}${ed&&!d.lines.length?'<button class="f d" data-a="purDel">🗑 حذف المسودة</button>':''}</div></div>`);
  puLines();if(ed)$('puAdd').focus();
};
C.purHdr=t=>{
  const d=PU.doc,f=t.dataset.f;d[f]=t.value;
  if(f==='supName'){const s=supByName(t.value);d.sup=s?s.id:null}
  save('purchases');
};
function unitOpts(p,sel){return prodUnits(p).map(u=>`<option value="${esc(u)}"${u===sel?' selected':''}>${esc(u||p.unit||'الوحدة الأساسية')}</option>`).join('')}
function puLines(){
  const d=PU.doc,ed=d.status==='draft'&&can('pur_edit'),pe=can('price_edit')||can('pur_edit');
  $('puLines').innerHTML=d.lines.length?tbl(['الباركود','الاسم','الوحدة','الكمية','التكلفة','الإجمالي','سعر البيع',''],d.lines.map((l,i)=>{
    const p=PI.id[l.id],ui=p?unitInfo(p,l.u):{price:null};
    const sp=p?(l.u?ui.price:pPrice(p)):'';
    return `<tr><td>${esc(l.b)}</td><td class="l">${esc(l.n)}</td><td>${ed&&p&&(p.uoms||[]).length?`<select data-c="puUnit" data-i2="${i}">${unitOpts(p,l.u||'')}</select>`:esc(l.u||(p?p.unit:''))}</td><td>${ed?`<input inputmode="decimal" value="${l.qty}" data-c="puLn" data-i2="${i}" data-f="qty">`:fmt(l.qty)}</td><td>${ed?`<input inputmode="decimal" value="${l.cost}" data-c="puLn" data-i2="${i}" data-f="cost">`:money(l.cost)}</td><td><b>${money(l.qty*l.cost)}</b></td><td>${p&&pe?`<input inputmode="decimal" value="${sp}" data-c="puPrice" data-id="${esc(l.id)}" data-u="${esc(l.u||'')}">`:(p?money(sp):'—')}</td><td>${ed?`<button class="d" data-a="puLnDel" data-i2="${i}">✕</button>`:''}</td></tr>`}).join('')):'<div class="mut" style="padding:8px">لا توجد بنود. أضف الأصناف من الخانة أعلاه.</div>';
  $('puTot').textContent=money(puTotal(d));
}
C.puUnit=t=>{
  const d=PU.doc,l=d.lines[+t.dataset.i2],p=PI.id[l.id],ui=unitInfo(p,t.value);
  l.u=ui.u;l.uf=ui.f;l.cost=r3(pCost(p)*ui.f);const x=(p.uoms||[]).find(y=>y.u===ui.u);l.b=(x&&x.bc)||p.bc;
  save('purchases');puLines();
};
C.puLn=t=>{
  const d=PU.doc,l=d.lines[+t.dataset.i2],v=num(t.value);
  if(!isNaN(v)&&v>=0)l[t.dataset.f]=v;save('purchases');puLines();
};
C.puPrice=t=>{
  const p=PI.id[t.dataset.id],v=num(t.value);
  if(!p||isNaN(v)||v<0){say('سعر غير صحيح',1);return}
  if(t.dataset.u){const x=(p.uoms||[]).find(y=>y.u===t.dataset.u);if(x)x.price=v}else p.price=v;
  save('products');say('تم تعديل سعر بيع «'+p.name+(t.dataset.u?'» ('+t.dataset.u+')':'»'));puLines();if(PU.doc&&PU.doc.status==='received')savePurFile(PU.doc);
};
A.puLnDel=t=>{PU.doc.lines.splice(+t.dataset.i2,1);save('purchases');puLines()};
function puAddProd(p,q,uname){
  const d=PU.doc,ui=unitInfo(p,uname),x=(p.uoms||[]).find(y=>y.u===uname);
  d.lines.push({id:p.id,b:(x&&x.bc)||p.bc,n:p.name,qty:q>0?q:1,cost:r3(pCost(p)*ui.f),u:ui.u,uf:ui.f});
  save('purchases');puLines();$('puAdd').value='';$('puRes').innerHTML='';$('puAdd').focus();
}
I.puAddQ=t=>{
  const q=norm(t.value);if(q.length<2){$('puRes').innerHTML='';return}
  const l=search(q,12);
  $('puRes').innerHTML=l.map(p=>`<div class="row" style="padding:6px;border-bottom:1px solid var(--bd);cursor:pointer" data-a="puPick" data-id="${esc(p.id)}"><span style="flex:1">${esc(p.name)}</span><span class="mut">${esc(p.bc)}</span></div>`).join('');
};
A.puPick=t=>{const p=PI.id[t.dataset.id];if(p)puAddProd(p,0)};
K.puAdd=(t,e)=>{
  if(e.key!=='Enter')return;const v=norm(t.value);if(!v)return;
  let m=findU(v);if(!m.length)m=search(v,3).map(p=>({p,u:null}));
  if(m.length===1)puAddProd(m[0].p,m[0].u?0:scaleQty(v,m[0].p),m[0].u);else if(!m.length)say('الصنف غير موجود',1);
};
/* ===== مرتجعات الموردين (من داخل كل فاتورة مستلمة) ===== */
const retOf=(d,i)=>(d.ret||[])[i]||0;
A.puRetForm=()=>{
  const d=PU.doc;
  if(!can('pur_return')){say('ليس لديك صلاحية مرتجعات الموردين',1);return}
  if(d.status!=='received'){say('المرتجع متاح للفواتير المستلمة فقط',1);return}
  const rows=d.lines.map((l,i)=>{const av=r3(l.qty-retOf(d,i));return av<=0?'':`<tr><td class="l">${esc(l.n)}${l.u?' ['+esc(l.u)+']':''}</td><td>${fmt(l.qty)}</td><td>${fmt(retOf(d,i))}</td><td>${fmt(av)}</td><td><input inputmode="decimal" value="0" data-q="${i}" data-av="${av}"></td></tr>`}).join('');
  openModal(`<div class="card"><div class="ttl">مرتجع للمورد — فاتورة #${d.id} (${esc(d.supName)})</div>${rows?tbl(['الصنف','المستلم','سبق إرجاعه','المتاح للإرجاع','كمية المرتجع'],rows):'<div class="mut">تم إرجاع كل كميات الفاتورة</div>'}
  <div class="row" style="margin-top:10px">${rows?'<button class="f" data-a="puRetAll">إرجاع الكل</button><button class="f p" data-a="puRetOk">تأكيد المرتجع</button>':''}<button class="f" data-a="closeMd">إغلاق</button></div></div>`);
};
A.puRetAll=()=>{document.querySelectorAll('#mb input[data-q]').forEach(i=>{i.value=i.dataset.av})};
A.puRetOk=async()=>{
  const d=PU.doc,q={};let any=false,bad=false;
  document.querySelectorAll('#mb input[data-q]').forEach(i=>{const v=num(i.value);if(isNaN(v)||v<0||v>+i.dataset.av+1e-9)bad=true;else if(v>0){q[+i.dataset.q]=v;any=true}});
  if(bad){say('كمية المرتجع لا يمكن أن تتجاوز الكمية المستلمة المتبقية',1);return}
  if(!any){say('اكتب كمية للإرجاع',1);return}
  const lines=Object.keys(q).map(i=>{const l=d.lines[i];return{i:+i,id:l.id,n:l.n,b:l.b,qty:q[i],cost:l.cost,u:l.u||'',uf:l.uf||1}});
  const short=lines.filter(l=>stk(d.br,l.id)<l.qty*l.uf);
  if(short.length&&!(await dlg('رصيد «'+short[0].n+'» في «'+d.br+'» أقل من الكمية المرتجعة. المتابعة ستجعل الرصيد بالسالب. هل تريد المتابعة؟',{yes:'متابعة'})))return;
  d.ret=d.ret||d.lines.map(()=>0);
  lines.forEach(l=>{d.ret[l.i]=r3((d.ret[l.i]||0)+l.qty);addStk(d.br,l.id,-l.qty*l.uf)});
  const now=new Date(),r={id:++D.cnt.pret,pur:d.id,sup:d.sup,supName:d.supName,br:d.br,date:dayStr(now),dt:nowStr(now),ts:now.getTime(),user:ME.name,
    lines:lines.map(l=>({id:l.id,n:l.n,b:l.b,qty:l.qty,cost:l.cost,u:l.u,uf:l.uf})),total:r2(lines.reduce((s,l)=>s+l.qty*l.cost,0))};
  D.pret.push(r);save('pret','purchases','stock','cnt');await flush();closeModal();
  savePretFile(r);saveSupStmt(d.sup);say('تم تسجيل مرتجع المورد رقم '+r.id);go('purEdit',d.id);
};
function savePretFile(r){
  const rows=[['مرتجع مورد رقم',r.id],['المورد',r.supName],['عن فاتورة مشتريات',r.pur],['الفرع',r.br],['التاريخ',r.dt],['بواسطة',r.user],[],['الباركود','الصنف','الوحدة','الكمية المرتجعة','التكلفة','الإجمالي']]
    .concat(r.lines.map(l=>[String(l.b),l.n,l.u,l.qty,l.cost,r2(l.qty*l.cost)]),[[],['','','','','إجمالي المرتجع',r.total]]);
  return saveX(`المشتريات/${r.br}/${r.date}`,`مرتجع مورد ${r.id} - ${r.supName} - ${r.date}.xlsx`,wbOf([['المرتجع',rows]]));
}
A.puTab=t=>{PU.tab=t.dataset.v;V.purchases()};
function purRetList(){
  setMain(`<div class="ttl">المشتريات</div>${tabs(PU.tab,[['inv','فواتير المشتريات'],['ret','مرتجعات الموردين']],'puTab')}<div class="card" id="puL"></div>`);
  const l=D.pret.slice().sort((a,b)=>b.id-a.id).slice(0,200);
  $('puL').innerHTML=l.length?tbl(['#','المورد','عن فاتورة','التاريخ','الفرع','قيمة المرتجع','بواسطة'],l.map(r=>`<tr class="clk" data-a="puRetView" data-id="${r.id}"><td>${r.id}</td><td class="l">${esc(r.supName)}</td><td>${r.pur}</td><td>${esc(r.dt)}</td><td>${esc(r.br)}</td><td><b>${money(r.total)}</b></td><td>${esc(r.user)}</td></tr>`).join('')):'<div class="mut">لا توجد مرتجعات للموردين. تُنشأ من داخل فاتورة مشتريات مستلمة (زر «مرتجع للمورد»).</div>';
}
A.puRetView=t=>{
  const r=D.pret.find(x=>x.id===+t.dataset.id);if(!r)return;
  openModal(`<div class="card"><div class="ttl">مرتجع مورد #${r.id}</div><div class="mut">${esc(r.supName)} — عن فاتورة ${r.pur} — ${esc(r.dt)}</div>${tbl(['الصنف','الوحدة','الكمية','التكلفة','الإجمالي'],r.lines.map(l=>`<tr><td class="l">${esc(l.n)}</td><td>${esc(l.u)}</td><td>${fmt(l.qty)}</td><td>${money(l.cost)}</td><td>${money(l.qty*l.cost)}</td></tr>`).join(''))}<div class="gt" style="font-size:18px;font-weight:700;text-align:center;margin:8px 0">الإجمالي: ${money(r.total)}</div>
  <div class="row"><button class="f p" data-a="puRetPrint" data-id="${r.id}">🖨 طباعة</button><button class="f" data-a="closeMd">إغلاق</button></div></div>`);
};
A.puRetPrint=t=>{
  const r=D.pret.find(x=>x.id===+t.dataset.id);
  printHtml(`<img class="pl" src="${logoSrc()}" alt=""><h2>مرتجع مشتريات رقم ${r.id}</h2><div class="mt"><span>المورد: <b>${esc(r.supName)}</b></span><span>التاريخ: <b>${esc(r.dt)}</b></span></div><div class="mt"><span>عن فاتورة رقم: ${r.pur}</span><span>الفرع: ${esc(r.br)}</span></div>
  <table><thead><tr><th>م</th><th>الصنف</th><th>الكمية</th><th>تكلفة الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${r.lines.map((l,i)=>`<tr><td>${i+1}</td><td style="text-align:right">${esc(l.n)}${l.u?' ['+esc(l.u)+']':''}</td><td>${fmt(l.qty)}</td><td>${money(l.cost)}</td><td>${money(l.qty*l.cost)}</td></tr>`).join('')}</tbody></table><div class="gt2">إجمالي المرتجع: ${money(r.total)}</div>`,'a4');
};
/* طباعة فاتورة المشتريات (A4): المورد والتاريخ والأصناف وإجمالي كل صنف وإجمالي الفاتورة */
A.purPrint=()=>{
  const d=PU.doc;if(!d.lines.length){say('لا توجد بنود للطباعة',1);return}
  const rows=d.lines.map((l,i)=>`<tr><td>${i+1}</td><td style="text-align:right">${esc(l.n)}${l.u?' ['+esc(l.u)+']':''}</td><td>${fmt(l.qty)}</td><td>${money(l.cost)}</td><td>${money(l.qty*l.cost)}</td></tr>`).join('');
  printHtml(`<img class="pl" src="${logoSrc()}" alt=""><h2>فاتورة مشتريات رقم ${d.id}</h2>
  <div class="mt"><span>اسم المورد: <b>${esc(d.supName)}</b></span><span>التاريخ: <b>${esc(d.date)}</b></span></div>
  <div class="mt"><span>الفرع: ${esc(d.br)}</span><span>القائم بالاستلام: ${esc(d.emp)}</span><span>الحالة: ${ST[d.status][0]}</span></div>
  <table><thead><tr><th>م</th><th>الصنف</th><th>الكمية</th><th>تكلفة الوحدة</th><th>إجمالي الصنف</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="gt2">إجمالي الفاتورة: ${money(puTotal(d))}</div>`,'a4');
};
A.purDel=async()=>{
  if(!(await dlg('حذف هذه المسودة؟',{yes:'حذف'})))return;
  D.purchases.splice(D.purchases.indexOf(PU.doc),1);save('purchases');go('purchases');
};
A.purRecv=async()=>{
  const d=PU.doc;
  if(!d.lines.length){say('لا توجد بنود',1);return}
  if(!norm(d.supName)){say('اكتب اسم المورد',1);return}
  if(d.lines.some(l=>!(l.qty>0))){say('يوجد بند كميته صفر',1);return}
  if(!(await dlg(`تأكيد استلام الفاتورة؟\nسيتم زيادة مخزون «${d.br}» وإضافة ${money(puTotal(d))} لرصيد المورد.`,{yes:'تأكيد الاستلام'})))return;
  let s=supByName(d.supName);
  if(!s){s={id:'S'+(++D.cnt.sup),name:norm(d.supName),phone:'',addr:'',note:'',open:0};D.suppliers.push(s);save('suppliers')}
  d.sup=s.id;d.supName=s.name;d.status='received';d.rdt=nowStr();d.rts=Date.now();d.rby=ME.name;
  d.lines.forEach(l=>addStk(d.br,l.id,l.qty*(l.uf||1)));
  save('purchases','stock','cnt');await flush();savePurFile(d);saveSupStmt(d.sup);say('تم تأكيد الاستلام وزيادة المخزون');go('purEdit',d.id);
};
A.purCancel=async()=>{
  const d=PU.doc,was=d.status==='received';
  if(was&&(d.ret||[]).some(x=>x>0)){say('لا يمكن إلغاء فاتورة لها مرتجعات للمورد',1);return}
  if(!(await dlg(was?'إلغاء فاتورة تم استلامها؟\nسيتم خصم الكميات من المخزون وإلغاء أثرها على رصيد المورد.':'إلغاء هذه الفاتورة؟',{yes:'إلغاء الفاتورة',no:'رجوع'})))return;
  if(was&&(d.ret||[]).some(x=>x>0)){say('لا يمكن إلغاء فاتورة لها مرتجعات للمورد',1);return}
  if(was)d.lines.forEach(l=>addStk(d.br,l.id,-l.qty*(l.uf||1)));
  d.status='cancelled';save('purchases','stock');await flush();savePurFile(d);if(d.sup)saveSupStmt(d.sup);go('purEdit',d.id);
};

/* ===== الموردين (الحسابات) ===== */
V.suppliers=()=>{
  if(!can('acc_suppliers')){say('ليس لديك صلاحية الموردين',1);return go('home')}
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">الموردين</div>${can('acc_edit')?'<button class="p" data-a="supNew">➕ مورد جديد</button>':''}</div>
  <div class="card"><input id="sF" data-i="supFlt" placeholder="بحث باسم المورد" style="max-width:320px"></div><div class="card" id="sL"></div>`);
  supList();
};
I.supFlt=()=>supList();
function supList(){
  const q=nm($('sF').value);
  const l=D.suppliers.filter(s=>!q||nm(s.name).includes(q)).slice(0,300);
  $('sL').innerHTML=tbl(['المورد','الهاتف','الرصيد','الحالة'],l.map(s=>{const b=supBalance(s.id);
    return `<tr class="clk" data-a="supOpen" data-id="${s.id}"><td class="l">${esc(s.name)}</td><td>${esc(s.phone)}</td><td><b>${money(Math.abs(b))}</b></td><td>${b>0?'<span class="badge b-draft">مستحق للمورد</span>':b<0?'<span class="badge b-done">مستحق لنا</span>':'—'}</td></tr>`}).join(''))||'';
}
A.supOpen=t=>go('supEdit',t.dataset.id);
/* كشف حساب المورد: فواتير مستلمة + دفعات (بتواريخها وطرق الدفع) مع الرصيد الجاري */
function supLedgerHtml(id){
  const s=supById(id),rows=[];
  D.purchases.forEach(d=>{if(d.sup===id&&d.status==='received')rows.push({ts:d.rts||Date.parse(d.date)||0,dt:d.rdt||d.date,type:'فاتورة مشتريات #'+d.id,det:`${d.lines.length} صنف — ${d.br}`,debit:puTotal(d),credit:0,method:'—'})});
  D.pret.forEach(x=>{if(x.sup===id)rows.push({ts:x.ts,dt:x.dt,type:'مرتجع للمورد #'+x.id,det:`${x.lines.length} صنف — عن فاتورة ${x.pur}`,debit:0,credit:x.total,method:'—'})});
  D.payments.forEach(p=>{if(p.sup===id)rows.push({ts:p.ts,dt:p.dt,type:'دفعة للمورد',det:p.note||'',debit:0,credit:p.amount,method:p.method})});
  rows.sort((a,b)=>a.ts-b.ts);let run=s.open||0;
  const body=(s.open?`<tr><td>—</td><td>رصيد افتتاحي</td><td></td><td></td><td></td><td></td><td><b>${money(run)}</b></td></tr>`:'')+rows.map(r=>{run=r2(run+r.debit-r.credit);return `<tr><td>${esc(r.dt)}</td><td>${esc(r.type)}</td><td class="l">${esc(r.det)}</td><td>${r.debit?money(r.debit):''}</td><td>${r.credit?money(r.credit):''}</td><td>${esc(r.method)}</td><td><b>${money(run)}</b></td></tr>`}).join('');
  return body?tbl(['التاريخ','العملية','التفاصيل','قيمة الفاتورة','المسدد','طريقة الدفع','الرصيد (موجب = مستحق للمورد)'],body):'<div class="mut">لا توجد حركات</div>';
}
A.supNew=async()=>{
  const r=await formDlg('مورد جديد',[{k:'name',l:'اسم المورد'},{k:'phone',l:'الهاتف'}],'إضافة');if(!r)return;
  if(!norm(r.name)){say('اكتب الاسم',1);return}
  if(supByName(r.name)){say('المورد موجود بالفعل',1);return}
  const s={id:'S'+(++D.cnt.sup),name:norm(r.name),phone:norm(r.phone),addr:'',note:'',open:0};D.suppliers.push(s);save('suppliers','cnt');go('supEdit',s.id);
};
V.supEdit=id=>{
  const s=supById(id);if(!s){go('suppliers');return}
  const b=supBalance(id),ce=can('acc_edit');
  const inv=D.purchases.filter(d=>d.sup===id).slice().sort((a,c)=>c.id-a.id);
  const pay=D.payments.filter(x=>x.sup===id).slice().sort((a,c)=>c.ts-a.ts);
  const tot=inv.filter(d=>d.status==='received').reduce((a,d)=>a+puTotal(d),0),paid=pay.reduce((a,x)=>a+x.amount,0);
  setMain(`<div class="row"><button data-a="go" data-v="suppliers">‹ الموردين</button><div class="ttl" style="margin:0;flex:1">${esc(s.name)}</div></div>
  <div class="card"><div class="g2"><div><div class="lbl">الاسم</div><input id="se_name" value="${esc(s.name)}"${ce?'':' disabled'}></div><div><div class="lbl">الهاتف</div><input id="se_phone" value="${esc(s.phone)}"${ce?'':' disabled'}></div><div><div class="lbl">العنوان</div><input id="se_addr" value="${esc(s.addr)}"${ce?'':' disabled'}></div><div><div class="lbl">رصيد افتتاحي (موجب = مستحق للمورد)</div><input id="se_open" inputmode="decimal" value="${s.open||0}"${ce?'':' disabled'}></div></div>
  <div class="lbl">ملاحظات</div><textarea id="se_note" rows="2"${ce?'':' disabled'}>${esc(s.note)}</textarea>
  ${ce?`<div class="row" style="margin-top:8px"><button class="p" data-a="supSave" data-id="${id}">💾 حفظ البيانات</button></div>`:''}</div>
  <div class="g2"><div class="card"><div class="mut">إجمالي التوريدات المستلمة</div><div class="ttl">${money(tot)}</div></div><div class="card"><div class="mut">إجمالي الدفعات</div><div class="ttl">${money(paid)}</div></div>
  <div class="card"><div class="mut">الرصيد الحالي</div><div class="ttl" style="color:${b>0?'var(--wr)':'var(--ok)'}">${money(Math.abs(b))} ${b>0?'مستحق للمورد':b<0?'مستحق لنا':''}</div></div></div>
  <div class="card"><div class="row"><div class="ttl" style="flex:1;margin:0">الدفعات</div>${can('acc_pay')?`<button class="p" data-a="supPay" data-id="${id}">➕ تسجيل دفعة</button>`:''}</div>${pay.length?tbl(['تاريخ التسديد','المبلغ','طريقة الدفع','ملاحظة','بواسطة'],pay.map(x=>`<tr><td>${esc(x.dt)}</td><td><b>${money(x.amount)}</b></td><td>${esc(x.method)}</td><td class="l">${esc(x.note)}</td><td>${esc(x.user)}</td></tr>`).join('')):'<div class="mut">لا توجد دفعات</div>'}</div>
  <div class="card"><div class="ttl">الفواتير التي تم توريدها (بكل تفاصيلها)</div>${inv.length?tbl(['#','تاريخ الفاتورة','وقت الاستلام','الفرع','القائم بالاستلام','القيمة','الحالة','المحتويات',''],inv.map(d=>`<tr><td>${d.id}</td><td>${esc(d.date)}</td><td>${esc(d.rdt||'—')}</td><td>${esc(d.br)}</td><td>${esc(d.emp)}</td><td><b>${money(puTotal(d))}</b></td><td><span class="badge ${ST[d.status][1]}">${ST[d.status][0]}</span></td><td><details><summary>عرض (${d.lines.length})</summary>${tbl(['الباركود','الصنف','الكمية','التكلفة','الإجمالي'],d.lines.map(l=>`<tr><td>${esc(l.b)}</td><td class="l">${esc(l.n)}</td><td>${fmt(l.qty)}</td><td>${money(l.cost)}</td><td>${money(l.qty*l.cost)}</td></tr>`).join(''))}</details></td><td><button data-a="purOpen" data-id="${d.id}">فتح</button></td></tr>`).join('')):'<div class="mut">لا توجد فواتير</div>'}</div>
  <div class="card"><div class="ttl">كشف حساب المورد</div>${supLedgerHtml(id)}</div>`);
};
A.supSave=t=>{
  const s=supById(t.dataset.id),n=norm($('se_name').value),o=num($('se_open').value);
  if(!n){say('اكتب الاسم',1);return}if(isNaN(o)){say('رصيد افتتاحي غير صحيح',1);return}
  const dup=supByName(n);if(dup&&dup.id!==s.id){say('اسم مستخدم لمورد آخر',1);return}
  Object.assign(s,{name:n,phone:norm($('se_phone').value),addr:norm($('se_addr').value),note:norm($('se_note').value),open:o});
  save('suppliers');saveSupStmt(s.id);say('تم حفظ بيانات المورد');go('supEdit',s.id);
};
A.supPay=async t=>{
  const r=await formDlg('تسجيل دفعة للمورد',[{k:'a',l:'المبلغ',t:'number'},{k:'m',l:'طريقة الدفع',t:'select',o:['نقدي','تحويل بنكي','شيك','فودافون كاش','أخرى']},{k:'n',l:'ملاحظة',t:'text'}],'تسجيل الدفعة');
  if(!r)return;const a=num(r.a);if(isNaN(a)||a<=0){say('اكتب مبلغًا صحيحًا',1);return}
  const d=new Date();D.payments.push({id:++D.cnt.pay,sup:t.dataset.id,amount:a,method:r.m,note:norm(r.n),user:ME.name,dt:nowStr(d),day:dayStr(d),ts:d.getTime()});
  save('payments','cnt');saveSupStmt(t.dataset.id);say('تم تسجيل الدفعة');go('supEdit',t.dataset.id);
};
