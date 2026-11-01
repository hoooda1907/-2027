/* ===== المخزون ===== */
const INV={tab:'bal',tr:{from:BR[2],to:BR[0],lines:[]},cn:{br:BR[0],lines:[]}};
const tabs=(cur,list,act)=>`<div class="row" style="margin-bottom:10px">${list.map(x=>`<button class="${cur===x[0]?'p':''}" data-a="${act}" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>`;
V.inventory=()=>{
  if(!can('inv_view')){say('ليس لديك صلاحية المخزون',1);return go('home')}
  const T=[['bal','الأرصدة'],['tr','التحويل بين الفروع'],['cn','الجرد الفعلي']];
  setMain(`<div class="ttl">المخزون</div>${tabs(INV.tab,T,'invTab')}<div id="invB"></div>`);
  ({bal:invBal,tr:invTr,cn:invCn})[INV.tab]();
};
A.invTab=t=>{INV.tab=t.dataset.v;V.inventory()};

/* --- الأرصدة --- */
function invBal(){
  $('invB').innerHTML=`<div class="card"><div class="row"><input id="ivQ" data-i="ivQ" placeholder="بحث بالاسم أو الباركود" style="max-width:300px"><select id="ivBr" data-c="ivQ" style="max-width:200px"><option value="">كل الفروع</option>${BR.map(b=>`<option>${b}</option>`).join('')}</select><label><input type="checkbox" id="ivNz" data-c="ivQ"> ما له رصيد فقط</label>
  ${can('inv_adjust')?'<button data-a="ivImp">📥 استيراد أرصدة من Excel</button>':''}</div></div><div class="card" id="ivL"></div>`;
  ivList();
}
I.ivQ=C.ivQ=()=>ivList();
function ivList(){
  const q=norm($('ivQ').value),br=$('ivBr').value,nz=$('ivNz').checked;
  const cols=br?[br]:BR;let n=0,rows='';
  const src=q?search(q,400):D.products;
  for(let i=0;i<src.length&&n<150;i++){
    const p=src[i],v=cols.map(b=>stk(b,p.id)),tot=r3(v.reduce((a,b)=>a+b,0));
    if(nz&&!tot)continue;n++;
    rows+=`<tr><td>${esc(p.bc)}</td><td class="l">${esc(p.name)}</td><td>${esc(p.cat)}</td>${v.map(x=>`<td${x<0?' style="color:var(--bad)"':''}>${fmt(x)}</td>`).join('')}${br?'':`<td><b>${fmt(tot)}</b></td>`}${can('inv_adjust')?`<td><button data-a="ivAdj" data-id="${esc(p.id)}">تسوية</button></td>`:''}</tr>`;
  }
  $('ivL').innerHTML=tbl(['الباركود','الاسم','الفئة'].concat(cols,br?[]:['الإجمالي'],can('inv_adjust')?['']:[]),rows)+`<div class="mut" style="margin-top:6px">يظهر أول 150 صنفًا — استخدم البحث للوصول لأي صنف.</div>`;
}
A.ivAdj=async t=>{
  const p=PI.id[t.dataset.id];
  const r=await formDlg('تسوية رصيد: '+p.name,[{k:'b',l:'الفرع',t:'select',o:BR},{k:'q',l:'الرصيد الصحيح الجديد',t:'number'}],'تسوية');
  if(!r)return;const q=num(r.q);if(isNaN(q)){say('رقم غير صحيح',1);return}
  D.stock[r.b]=D.stock[r.b]||{};D.stock[r.b][p.id]=r3(q);save('stock');say('تمت التسوية');ivList();
};
A.ivImp=async()=>{
  const r=await formDlg('استيراد أرصدة (أعمدة: باركود + الكمية)',[{k:'b',l:'الفرع الذي ستُسجَّل عليه الأرصدة',t:'select',o:BR}],'اختيار الملف');
  if(!r)return;
  const inp=document.createElement('input');inp.type='file';inp.accept='.xlsx,.xls,.csv';
  inp.onchange=async()=>{const f=inp.files[0];if(!f)return;const res=importStock(await readRows(f),r.b);
    if(!res||res.err){say(res?res.err:'ملف فارغ',1);return}say(`تم تسجيل ${res.ok} رصيدًا في «${r.b}» — غير مطابق: ${res.miss}`);ivList()};
  inp.click();
};

/* --- التحويل بين الفروع --- */
function invTr(){
  const t=INV.tr;
  $('invB').innerHTML=`<div class="card"><div class="g2"><div><div class="lbl">من فرع</div><select data-c="trBr" data-f="from">${BR.map(b=>`<option${b===t.from?' selected':''}>${b}</option>`).join('')}</select></div><div><div class="lbl">إلى فرع</div><select data-c="trBr" data-f="to">${BR.map(b=>`<option${b===t.to?' selected':''}>${b}</option>`).join('')}</select></div></div>
  ${can('inv_transfer')?'<input id="trAdd" data-k="trAdd" data-i="trQ" placeholder="امسح الباركود أو اكتب اسم الصنف ثم Enter" style="margin-top:8px" autocomplete="off"><div id="trRes"></div>':''}<div id="trL"></div>
  ${can('inv_transfer')?'<button class="p" style="width:100%;margin-top:8px" data-a="trGo">تنفيذ التحويل</button>':''}</div>
  <div class="card"><div class="ttl">آخر التحويلات</div>${D.transfers.length?tbl(['#','التاريخ','من','إلى','عدد الأصناف','بواسطة'],D.transfers.slice(-30).reverse().map(x=>`<tr><td>${x.no}</td><td>${esc(x.dt)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td>${x.lines.length}</td><td>${esc(x.user)}</td></tr>`).join('')):'<div class="mut">لا توجد تحويلات</div>'}</div>`;
  trLines();
}
C.trBr=t=>{INV.tr[t.dataset.f]=t.value};
function trLines(){
  const t=INV.tr;
  $('trL').innerHTML=t.lines.length?tbl(['الباركود','الاسم','رصيد المصدر','الكمية',''],t.lines.map((l,i)=>`<tr><td>${esc(l.b)}</td><td class="l">${esc(l.n)}</td><td>${fmt(stk(t.from,l.id))}</td><td><input inputmode="decimal" value="${l.qty}" data-c="trQty" data-n="${i}"></td><td><button class="d" data-a="trDel" data-n="${i}">✕</button></td></tr>`).join('')):'<div class="mut" style="padding:8px">أضف الأصناف المراد تحويلها</div>';
}
C.trQty=t=>{const v=num(t.value);if(!isNaN(v)&&v>0)INV.tr.lines[+t.dataset.n].qty=v;trLines()};
A.trDel=t=>{INV.tr.lines.splice(+t.dataset.n,1);trLines()};
function addToList(list,p,q,after){
  const e=list.find(l=>l.id===p.id);
  if(e)e.qty=r3(e.qty+(q>0?q:1));else list.push({id:p.id,b:p.bc,n:p.name,qty:q>0?q:1,sys:0});
  after();
}
I.trQ=t=>{const q=norm(t.value);$('trRes').innerHTML=q.length<2?'':search(q,10).map(p=>`<div class="row" style="padding:6px;border-bottom:1px solid var(--bd);cursor:pointer" data-a="trPick" data-id="${esc(p.id)}"><span style="flex:1">${esc(p.name)}</span><span class="mut">${esc(p.bc)}</span></div>`).join('')};
A.trPick=t=>{const p=PI.id[t.dataset.id];addToList(INV.tr.lines,p,0,()=>{trLines();$('trAdd').value='';$('trRes').innerHTML=''})};
K.trAdd=(t,e)=>{if(e.key!=='Enter')return;const v=norm(t.value);let m=find(v);if(!m.length)m=search(v,3);
  if(m.length===1){addToList(INV.tr.lines,m[0],scaleQty(v,m[0]),()=>{trLines();t.value='';$('trRes').innerHTML=''})}else if(!m.length)say('الصنف غير موجود',1)};
A.trGo=async()=>{
  const t=INV.tr;
  if(t.from===t.to){say('اختر فرعين مختلفين',1);return}
  if(!t.lines.length){say('لا توجد أصناف',1);return}
  const neg=t.lines.filter(l=>stk(t.from,l.id)<l.qty);
  if(neg.length&&!(await dlg(`${neg.length} صنف رصيده في «${t.from}» أقل من الكمية المحوَّلة. هل تريد المتابعة؟`,{yes:'متابعة'})))return;
  t.lines.forEach(l=>{addStk(t.from,l.id,-l.qty);addStk(t.to,l.id,l.qty)});
  D.transfers.push({no:++D.cnt.tr,dt:nowStr(),ts:Date.now(),from:t.from,to:t.to,user:ME.name,lines:t.lines.map(l=>({id:l.id,b:l.b,n:l.n,qty:l.qty}))});
  save('stock','transfers','cnt');await flush();
  const tr=D.transfers[D.transfers.length-1],day=dayStr();
  saveX(`المخزون/${tr.from}/${day}`,`تحويل ${tr.no} - من ${tr.from} إلى ${tr.to} - ${day}.xlsx`,wbOf([['التحويل',[['رقم التحويل',tr.no],['من',tr.from],['إلى',tr.to],['التاريخ',tr.dt],['بواسطة',tr.user],[],['الباركود','الاسم','الكمية']].concat(tr.lines.map(l=>[String(l.b),l.n,l.qty]))]]));
  INV.tr.lines=[];say('تم التحويل');invTr();
};

/* --- الجرد الفعلي --- */
function invCn(){
  const c=INV.cn;
  $('invB').innerHTML=`<div class="card"><div class="lbl">الفرع</div><select data-c="cnBr" style="max-width:240px">${BR.map(b=>`<option${b===c.br?' selected':''}>${b}</option>`).join('')}</select>
  ${can('inv_count')?'<input id="cnAdd" data-k="cnAdd" data-i="cnQ" placeholder="امسح الباركود (كل مسح يزيد الكمية 1) أو اكتب الاسم ثم Enter" style="margin-top:8px" autocomplete="off"><div id="cnRes"></div>':''}<div id="cnL"></div>
  <div class="row" style="margin-top:8px"><button data-a="cnExp">⬇️ تصدير Excel</button>${can('inv_adjust')?'<button class="p" data-a="cnOk">✅ اعتماد الجرد وتسوية الأرصدة</button>':''}<button class="d" data-a="cnClr">مسح</button></div></div>`;
  cnLines();
}
C.cnBr=t=>{INV.cn.br=t.value;cnLines()};
function cnLines(){
  const c=INV.cn;
  $('cnL').innerHTML=c.lines.length?tbl(['الباركود','الاسم','النظام','الفعلي','الفرق',''],c.lines.map((l,i)=>{const s=stk(c.br,l.id),d=r3(l.qty-s);
    return `<tr><td>${esc(l.b)}</td><td class="l">${esc(l.n)}</td><td>${fmt(s)}</td><td><input inputmode="decimal" value="${l.qty}" data-c="cnQty" data-n="${i}"></td><td style="color:${d<0?'var(--bad)':d>0?'var(--ok)':'inherit'}">${d>0?'+':''}${fmt(d)}</td><td><button class="d" data-a="cnDel" data-n="${i}">✕</button></td></tr>`}).join('')):'<div class="mut" style="padding:8px">لا توجد أصناف في الجرد</div>';
}
C.cnQty=t=>{const v=num(t.value);if(!isNaN(v)&&v>=0)INV.cn.lines[+t.dataset.n].qty=v;cnLines()};
A.cnDel=t=>{INV.cn.lines.splice(+t.dataset.n,1);cnLines()};
A.cnClr=async()=>{if(INV.cn.lines.length&&await dlg('مسح قائمة الجرد؟',{yes:'مسح'})){INV.cn.lines=[];cnLines()}};
I.cnQ=t=>{const q=norm(t.value);$('cnRes').innerHTML=q.length<2?'':search(q,10).map(p=>`<div class="row" style="padding:6px;border-bottom:1px solid var(--bd);cursor:pointer" data-a="cnPick" data-id="${esc(p.id)}"><span style="flex:1">${esc(p.name)}</span><span class="mut">${esc(p.bc)}</span></div>`).join('')};
A.cnPick=t=>{addToList(INV.cn.lines,PI.id[t.dataset.id],0,()=>{cnLines();$('cnAdd').value='';$('cnRes').innerHTML=''})};
K.cnAdd=(t,e)=>{if(e.key!=='Enter')return;const v=norm(t.value);let m=find(v);if(!m.length)m=search(v,3);
  if(m.length===1){addToList(INV.cn.lines,m[0],scaleQty(v,m[0]),()=>{cnLines();t.value='';$('cnRes').innerHTML=''})}else if(!m.length)say('الصنف غير موجود',1)};
A.cnExp=async()=>{
  const c=INV.cn;if(!c.lines.length){say('لا توجد أصناف',1);return}
  const rows=[['معرف','الباركود','المنتج','الكمية على النظام','الكمية المحسوبة','الفرق','الفرع']].concat(c.lines.map(l=>{const s=stk(c.br,l.id);return[l.id,l.b,l.n,s,l.qty,r3(l.qty-s),c.br]}));
  const p=await saveX(`المخزون/${c.br}/${dayStr()}`,`جرد - ${c.br} - ${dayStr()}.xlsx`,wbOf([['الجرد',rows]]));if(p)say('تم حفظ الملف: '+p);
};
A.cnOk=async()=>{
  const c=INV.cn;if(!c.lines.length){say('لا توجد أصناف',1);return}
  if(!(await dlg(`اعتماد الجرد؟ سيتم تعيين رصيد ${c.lines.length} صنف في «${c.br}» بالكميات الفعلية.`,{yes:'اعتماد'})))return;
  await A.cnExp();
  D.stock[c.br]=D.stock[c.br]||{};c.lines.forEach(l=>{D.stock[c.br][l.id]=r3(l.qty)});
  save('stock');await flush();INV.cn.lines=[];say('تم اعتماد الجرد وتسوية الأرصدة');invCn();
};
