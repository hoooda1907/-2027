/* ===== شاشة المنتجات: عرض + إضافة + تعديل + فلترة + فئات + وحدات قياس متعددة ===== */
const prodTabs=cur=>tabs(cur,[['products','المنتجات'],['pcats','فئات المنتجات'],['uoms','وحدات القياس المتعددة']],'prTab');
A.prTab=t=>go(t.dataset.v);
const PRD={lim:100};
const distinct=k=>{const o={};D.products.forEach(p=>{if(p[k])o[p[k]]=1});((D.set.cats||{})[k]||[]).forEach(c=>{o[c]=1});return Object.keys(o).sort((a,b)=>a.localeCompare(b,'ar'))};
const totStock=(p,br)=>br?stk(br,p.id):BR.reduce((a,b)=>a+stk(b,p.id),0);
/* ترتيب بالسعر: hi = الأعلى أولًا، lo = الأقل أولًا */
function sortProducts(l,mode){
  if(mode==='hi')l.sort((a,b)=>pPrice(b)-pPrice(a)||String(a.name).localeCompare(String(b.name),'ar'));
  else if(mode==='lo')l.sort((a,b)=>pPrice(a)-pPrice(b)||String(a.name).localeCompare(String(b.name),'ar'));
  else l.sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  return l;
}
const optList=(arr,sel,all)=>(all?`<option value="">${all}</option>`:'')+arr.map(x=>`<option${x===sel?' selected':''}>${esc(x)}</option>`).join('');
const SORTS='<option value="name">الترتيب: الاسم</option><option value="hi">السعر: الأعلى أولًا</option><option value="lo">السعر: الأقل أولًا</option>';

V.products=()=>{
  if(!can('prod_view')){say('ليس لديك صلاحية المنتجات',1);return go('home')}
  PRD.lim=100;
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">المنتجات</div>${can('prod_edit')?'<button class="p" data-a="prodNew">➕ منتج جديد</button>':''}</div>${prodTabs('products')}
  <div class="card"><div class="row"><input id="pdQ" data-i="pdFlt" placeholder="بحث بالاسم أو الباركود" style="max-width:260px"><select id="pdC" data-c="pdFlt" style="max-width:220px">${optList(distinct('cat'),'','كل الفئات')}</select>
  <select id="pdB" data-c="pdFlt" style="max-width:190px">${optList(BR,'','كل الفروع (للرصيد)')}</select><select id="pdS" data-c="pdFlt" style="max-width:210px">${SORTS}</select>
  <label><input type="checkbox" id="pdN" data-c="pdFlt"> له رصيد فقط</label></div></div><div class="card" id="pdL"></div>`);
  pdList();
};
I.pdFlt=C.pdFlt=()=>{PRD.lim=100;pdList()};
function pdFiltered(){
  const q=norm($('pdQ').value),cat=$('pdC').value,br=$('pdB').value,nz=$('pdN').checked;
  let l=q?search(q,100000):D.products.slice();
  if(cat)l=l.filter(p=>p.cat===cat);
  if(nz)l=l.filter(p=>totStock(p,br)!==0);
  return sortProducts(l,$('pdS').value);
}
function pdList(){
  const l=pdFiltered(),br=$('pdB').value;
  $('pdL').innerHTML=`<div class="mut" style="margin-bottom:6px">عدد المنتجات: ${l.length}</div>`+tbl(['الباركود','الاسم','الفئة','النوع','الوحدة','التكلفة','السعر','الرصيد'],l.slice(0,PRD.lim).map(p=>`<tr class="clk" data-a="prodOpen" data-id="${esc(p.id)}"><td>${esc(p.bc)}</td><td class="l">${esc(p.name)}</td><td>${esc(p.cat)}</td><td>${esc(p.type)}</td><td>${esc(p.unit)}</td><td>${money(pCost(p))}</td><td><b>${money(pPrice(p))}</b></td><td>${fmt(totStock(p,br))}</td></tr>`).join(''))
    +(l.length>PRD.lim?`<button style="width:100%;margin-top:8px" data-a="pdMore">عرض المزيد (${l.length-PRD.lim})</button>`:'');
}
A.pdMore=()=>{PRD.lim+=200;pdList()};
A.prodOpen=t=>go('prodEdit',t.dataset.id);
A.prodNew=()=>{if(!can('prod_edit')){say('ليس لديك صلاحية',1);return}go('prodEdit',null)};
const PE={uoms:[]};
V.prodEdit=id=>{
  const p=id?PI.id[id]:{id:'',name:'',bc:'',ref:'',cost:'',price:'',cat:'',pcat:'',type:'',unit:''};
  if(id&&!p){go('products');return}
  PE.uoms=JSON.parse(JSON.stringify(p.uoms||[]));PE.p=p;
  const ed=can('prod_edit'),dis=ed?'':' disabled';
  const sel=(k,l)=>{const vals=distinct(k);return `<div><div class="lbl">${l} *</div><select id="pe_${k}" data-c="peSel"${dis}><option value="">— اختر —</option>${vals.map(v=>`<option${v===p[k]?' selected':''}>${esc(v)}</option>`).join('')}${ed?'<option value="__new__">➕ قيمة جديدة…</option>':''}</select></div>`};
  setMain(`<div class="row"><button data-a="go" data-v="products">‹ المنتجات</button><div class="ttl" style="margin:0;flex:1">${id?esc(p.name):'منتج جديد'}</div></div>
  <div class="card"><div class="g2">
   <div><div class="lbl">اسم المنتج *</div><input id="pe_name" value="${esc(p.name)}"${dis}></div>
   <div><div class="lbl">الباركود *</div><input id="pe_bc" value="${esc(p.bc)}" inputmode="numeric"${dis}></div>
   <div><div class="lbl">التكلفة *</div><input id="pe_cost" inputmode="decimal" value="${p.cost===''?'':p.cost}"${dis}></div>
   <div><div class="lbl">سعر البيع *</div><input id="pe_price" inputmode="decimal" value="${p.price===''?'':p.price}"${dis}></div>
   <div><div class="lbl">فئة المنتج *</div><input id="pe_cat" list="catList" value="${esc(p.cat)}"${dis}><datalist id="catList">${distinct('cat').map(v=>`<option value="${esc(v)}">`).join('')}</datalist></div>
   ${sel('type','نوع المنتج')}${sel('unit','وحدة القياس')}
   <div><div class="lbl">فئة نقطة البيع (اختياري — تظهر في شريط الفئات)</div><input id="pe_pcat" list="pcatList" value="${esc(p.pcat)}"${dis}><datalist id="pcatList">${distinct('pcat').map(v=>`<option value="${esc(v)}">`).join('')}</datalist></div>
   <div><div class="lbl">مرجع داخلي (اختياري)</div><input id="pe_ref" value="${esc(p.ref)}"${dis}></div>
   <div><div class="lbl">الضريبة</div><label><input type="checkbox" id="pe_notax"${p.notax?' checked':''}${dis}> معفى من الضريبة</label></div>
   <div><div class="lbl">البيع بخسارة</div><label><input type="checkbox" id="pe_loss"${p.allowLoss?' checked':''}${can('prod_allow_loss')?'':' disabled'}> السماح بالبيع إذا كان سعر البيع أقل من التكلفة</label>${can('prod_allow_loss')?'':'<div class="mut">تغييرها يحتاج صلاحية «السماح بالبيع بخسارة»</div>'}</div></div>
   ${ed?`<div class="row" style="margin-top:10px"><button class="p" data-a="prodSave" data-id="${esc(id||'')}">💾 حفظ المنتج</button></div>`:''}</div>
  <div class="card" id="peUC"></div>
  ${id?`<div class="card"><div class="ttl">الأرصدة</div>${tbl(['الفرع','الرصيد'],BR.map(b=>`<tr><td>${esc(b)}</td><td>${fmt(stk(b,p.id))}</td></tr>`).join(''))}</div>`:''}`);
  peUom();
};
function peUom(){
  const ed=can('prod_edit'),base=(($('pe_unit')&&$('pe_unit').value)||PE.p.unit||'الأساسية');
  $('peUC').innerHTML=`<div class="row"><div class="ttl" style="flex:1;margin:0">وحدات القياس المتعددة (مثال: كرتونة)</div>${ed?'<button data-a="peUAdd">➕ إضافة وحدة قياس</button>':''}</div>
  ${PE.uoms.length?tbl(['الوحدة','عدد القطع / العلاقة','باركود الوحدة','سعر الوحدة',''],PE.uoms.map((x,i)=>{const d=uomDef(x.u);return `<tr><td><select data-c="peUF" data-n="${i}" data-f="u"${ed?'':' disabled'}><option value="">— اختر —</option>${D.uoms.map(u=>`<option${u.name===x.u?' selected':''}>${esc(u.name)}</option>`).join('')}</select></td><td class="l">${d?esc(uomText(d,base)):'—'}</td><td><input value="${esc(x.bc)}" data-c="peUF" data-n="${i}" data-f="bc"${ed?'':' disabled'}></td><td><input inputmode="decimal" value="${x.price===''?'':x.price}" placeholder="${d?money(pPrice(PE.p)*d.ratio):''}" data-c="peUF" data-n="${i}" data-f="price"${ed?'':' disabled'}></td><td>${ed?`<button class="d" data-a="peUDel" data-n="${i}">✕</button>`:''}</td></tr>`}).join('')):'<div class="mut" style="padding:6px">لا توجد وحدات إضافية لهذا المنتج.</div>'}`;
}
A.peUAdd=()=>{if(!D.uoms.length){say('عرّف وحدات القياس أولًا من تبويب «وحدات القياس المتعددة»',1);return}PE.uoms.push({u:'',bc:'',price:''});peUom()};
A.peUDel=t=>{PE.uoms.splice(+t.dataset.n,1);peUom()};
C.peUF=t=>{const x=PE.uoms[+t.dataset.n];x[t.dataset.f]=norm(t.value);if(t.dataset.f==='u')peUom()};
C.peSel=async t=>{
  if(t.value!=='__new__')return;
  const v=await dlg('اكتب القيمة الجديدة',{input:true,type:'text',yes:'إضافة'});
  if(v!==null&&norm(v)){const o=document.createElement('option');o.value=o.textContent=norm(v);t.insertBefore(o,t.querySelector('option[value="__new__"]'));t.value=norm(v)}
  else t.value='';
};
A.prodSave=t=>{
  if(!can('prod_edit')){say('ليس لديك صلاحية',1);return}
  const id=t.dataset.id,g=k=>norm($('pe_'+k).value);
  const nu=PE.uoms.filter(x=>x.u||x.bc||x.price);
  const seenU={};for(const x of nu){if(!x.u||!uomDef(x.u)){say('اختر اسم الوحدة لكل سطر وحدة قياس',1);return}if(seenU[x.u]){say('الوحدة «'+x.u+'» مكررة',1);return}seenU[x.u]=1;
    if(x.price!==''&&(isNaN(num(x.price))||num(x.price)<0)){say('سعر الوحدة «'+x.u+'» غير صحيح',1);return}}
  const rec={name:g('name'),bc:g('bc'),cost:num($('pe_cost').value),price:num($('pe_price').value),cat:g('cat'),type:g('type'),unit:g('unit'),pcat:g('pcat'),ref:g('ref')};
  const miss=[];if(!rec.name)miss.push('الاسم');if(!rec.bc)miss.push('الباركود');if(isNaN(rec.cost)||rec.cost<0)miss.push('التكلفة');if(isNaN(rec.price)||rec.price<0)miss.push('السعر');
  if(!rec.cat)miss.push('الفئة');if(!rec.type||rec.type==='__new__')miss.push('نوع المنتج');if(!rec.unit||rec.unit==='__new__')miss.push('وحدة القياس');
  if(miss.length){say('بيانات إجبارية ناقصة أو غير صحيحة: '+miss.join('، '),1);return}
  const dup=(PI.bc[rec.bc]||[]).find(x=>x.id!==id);if(dup){say('الباركود مستخدم بالفعل للمنتج «'+dup.name+'»',1);return}
  const ubc=nu.map(x=>x.bc).filter(Boolean);
  for(const b of ubc){if(ubc.filter(y=>y===b).length>1||b===rec.bc){say('باركود وحدة القياس «'+b+'» مكرر',1);return}
    const o=(PI.bc[b]||[]).find(x=>x.id!==id)||(PI.ubc[b]||[]).find(x=>x.p.id!==id);if(o){say('باركود الوحدة «'+b+'» مستخدم بالفعل',1);return}}
  let p;const wantLoss=!!$('pe_loss').checked;
  if(id){p=PI.id[id];Object.assign(p,rec);if(can('prod_allow_loss'))p.allowLoss=wantLoss}
  else{p=Object.assign({id:'P'+(++D.cnt.prod)},rec);if(can('prod_allow_loss'))p.allowLoss=wantLoss;D.products.push(p)}
  p.notax=!!$('pe_notax').checked;p.uoms=nu.map(x=>({u:x.u,bc:x.bc,price:x.price===''?'':num(x.price)}));
  reindex();save('products','cnt');say(id?'تم حفظ المنتج':'تمت إضافة المنتج');go('prodEdit',p.id);
};

/* ===== وحدات القياس المتعددة (التعريفات) ===== */
const REL=[['smaller','الوحدة الأساسية أكبر من الثانوية'],['bigger','الوحدة الأساسية أصغر من الثانوية'],['equal','الوحدة الأساسية تساوي الثانوية']];
const relLabel=t=>(REL.find(x=>x[0]===t)||REL[2])[1];
const uomCount=d=>d.type==='bigger'?d.ratio:d.type==='smaller'?r3(1/d.ratio):1;
const ratioOf=(rel,n)=>rel==='bigger'?n:rel==='smaller'?1/n:1;
V.uoms=()=>{
  if(!can('prod_view')){say('ليس لديك صلاحية المنتجات',1);return go('home')}
  const use=n=>D.products.filter(p=>(p.uoms||[]).some(x=>x.u===n)).length;
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">المنتجات</div>${can('prod_edit')?'<button class="p" data-a="uomAdd">➕ وحدة قياس جديدة</button>':''}</div>${prodTabs('uoms')}
  <div class="card"><div class="mut" style="margin-bottom:8px">كل وحدة لها عدد قطع مرتبط بالوحدة الأساسية للمنتج (مثال: كرتونة = 30 قطعة). المخزون يُحسب دائمًا بالوحدة الأساسية ويُفكَّك تلقائيًا عند البيع أو الاستلام بأي وحدة.</div>
  ${D.uoms.length?tbl(['اسم الوحدة','العلاقة','عدد القطع','مثال','عدد المنتجات',''],D.uoms.map((d,i)=>`<tr><td class="l">${esc(d.name)}</td><td class="l">${esc(relLabel(d.type))}</td><td><b>${fmt(uomCount(d))}</b></td><td class="l">${esc(uomText(d,'قطعة'))}</td><td>${use(d.name)}</td><td>${can('prod_edit')?`<button data-a="uomEdit" data-n="${i}">تعديل</button> <button class="d" data-a="uomDel" data-n="${i}">حذف</button>`:''}</td></tr>`).join('')):'<div class="mut">لا توجد وحدات. أضف وحدة أو استورد شيت المنتجات الذي يحتوي أعمدة UOM.</div>'}</div>`);
};
async function uomForm(d){
  const r=await formDlg(d?'تعديل وحدة قياس':'وحدة قياس جديدة',[{k:'n',l:'اسم الوحدة',v:d?d.name:''},{k:'r',l:'العلاقة',t:'select',o:REL.map(x=>x[1]),v:d?relLabel(d.type):REL[1][1]},{k:'c',l:'عدد القطع في الوحدة (أو عدد هذه الوحدة في الأساسية)',t:'number',v:d?uomCount(d):''}],'حفظ');
  if(!r)return null;
  const name=norm(r.n),n=num(r.c),type=(REL.find(x=>x[1]===r.r)||REL[2])[0];
  if(!name){say('اكتب اسم الوحدة',1);return null}
  if(type!=='equal'&&(isNaN(n)||n<=0)){say('اكتب عدد القطع',1);return null}
  if(D.uoms.some(x=>x!==d&&nm(x.name)===nm(name))){say('اسم الوحدة موجود بالفعل',1);return null}
  return{name,type,ratio:type==='equal'?1:ratioOf(type,n)};
}
A.uomAdd=async()=>{const u=await uomForm(null);if(!u)return;D.uoms.push(u);save('uoms');V.uoms()};
A.uomEdit=async t=>{
  const d=D.uoms[+t.dataset.n],old=d.name,u=await uomForm(d);if(!u)return;
  Object.assign(d,u);
  if(old!==u.name)D.products.forEach(p=>(p.uoms||[]).forEach(x=>{if(x.u===old)x.u=u.name}));
  save('uoms','products');reindex();V.uoms();
};
A.uomDel=async t=>{
  const d=D.uoms[+t.dataset.n];
  if(D.products.some(p=>(p.uoms||[]).some(x=>x.u===d.name))){say('الوحدة مستخدمة في منتجات — أزلها منها أولًا',1);return}
  if(await dlg('حذف وحدة القياس «'+d.name+'»؟',{yes:'حذف'})){D.uoms.splice(+t.dataset.n,1);save('uoms');V.uoms()}
};

/* ===== فئات المنتجات وفئات نقطة البيع: إضافة / تعديل / حذف ===== */
const CT={kind:'cat'};
V.pcats=()=>{
  if(!can('prod_view')){say('ليس لديك صلاحية المنتجات',1);return go('home')}
  const k=CT.kind,names=distinct(k),cnt={};D.products.forEach(p=>{if(p[k])cnt[p[k]]=(cnt[p[k]]||0)+1});
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">المنتجات</div>${can('prod_edit')?'<button class="p" data-a="catAdd">➕ فئة جديدة</button>':''}</div>${prodTabs('pcats')}
  <div class="row" style="margin-bottom:8px"><button class="${k==='cat'?'p':''}" data-a="catKind" data-v="cat">فئات المنتج</button><button class="${k==='pcat'?'p':''}" data-a="catKind" data-v="pcat">فئات نقطة البيع (شريط الاختصارات)</button></div>
  <div class="card">${names.length?tbl(['الفئة','عدد المنتجات',''],names.map((n,i)=>`<tr><td class="l">${esc(n)}</td><td>${cnt[n]||0}</td><td>${can('prod_edit')?`<button data-a="catRen" data-n="${esc(n)}">تعديل</button> <button class="d" data-a="catDel" data-n="${esc(n)}">حذف</button>`:''}</td></tr>`).join('')):'<div class="mut">لا توجد فئات</div>'}</div>`);
};
A.catKind=t=>{CT.kind=t.dataset.v;V.pcats()};
function catList(){D.set.cats=D.set.cats||{cat:[],pcat:[]};D.set.cats[CT.kind]=D.set.cats[CT.kind]||[];return D.set.cats[CT.kind]}
A.catAdd=async()=>{
  const r=await formDlg('فئة جديدة',[{k:'n',l:'اسم الفئة'}],'إضافة');if(!r)return;const n=norm(r.n);
  if(!n){say('اكتب الاسم',1);return}if(distinct(CT.kind).some(x=>nm(x)===nm(n))){say('الفئة موجودة بالفعل',1);return}
  catList().push(n);save('set');reindex();V.pcats();
};
A.catRen=async t=>{
  const o=t.dataset.n,r=await formDlg('تعديل الفئة',[{k:'n',l:'الاسم الجديد',v:o}],'حفظ');if(!r)return;const n=norm(r.n);if(!n||n===o)return;
  const exists=distinct(CT.kind).some(x=>x===n);
  if(exists&&!(await dlg('الفئة «'+n+'» موجودة. دمج «'+o+'» فيها؟',{yes:'دمج'})))return;
  D.products.forEach(p=>{if(p[CT.kind]===o)p[CT.kind]=n});
  if(CT.kind==='cat'){D.sales.forEach(d=>d.lines.forEach(l=>{if(l.cat===o)l.cat=n}));save('sales')}
  const L=catList(),i=L.indexOf(o);if(i>=0)L.splice(i,1);if(!exists&&!L.includes(n))L.push(n);
  save('products','set');reindex();V.pcats();
};
A.catDel=async t=>{
  const o=t.dataset.n,c=D.products.filter(p=>p[CT.kind]===o).length;
  if(!(await dlg(c?`الفئة مستخدمة في ${c} منتج. سيتم إزالتها منهم (يصبحون بدون فئة). المتابعة؟`:'حذف الفئة «'+o+'»؟',{yes:'حذف'})))return;
  D.products.forEach(p=>{if(p[CT.kind]===o)p[CT.kind]=''});const L=catList(),i=L.indexOf(o);if(i>=0)L.splice(i,1);
  save('products','set');reindex();V.pcats();
};
