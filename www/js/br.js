/* ===== الفروع ونقاط البيع (الجلسات): إضافة / حذف / تغيير الاسم ===== */
function brData(){if(!D.set.branches||!D.set.branches.length)D.set.branches=JSON.parse(JSON.stringify(DEFBR));return D.set.branches}
function brSaved(){save('set');syncBranches()}
function migBranch(o,n){
  D.sessions.forEach(x=>{if(x.br===o)x.br=n});D.sales.forEach(x=>{if(x.br===o)x.br=n});D.cash.forEach(x=>{if(x.br===o)x.br=n});
  D.purchases.forEach(x=>{if(x.br===o)x.br=n});D.transfers.forEach(x=>{if(x.from===o)x.from=n;if(x.to===o)x.to=n});
  if(D.stock[o]){D.stock[n]=D.stock[o];delete D.stock[o]}
  const pu=D.set.posUsers||{};Object.keys(pu).forEach(k=>{if(k.startsWith(o+'|')){pu[n+k.slice(o.length)]=pu[k];delete pu[k]}});
  if(POS.br===o)POS.br=n;
  save('sessions','sales','cash','purchases','transfers','stock','set');
}
function migPos(b,o,n){
  D.sessions.forEach(x=>{if(x.br===b&&x.pos===o)x.pos=n});D.sales.forEach(x=>{if(x.br===b&&x.pos===o)x.pos=n});D.cash.forEach(x=>{if(x.br===b&&x.pos===o)x.pos=n});
  const pu=D.set.posUsers||{};if(pu[b+'|'+o]){pu[b+'|'+n]=pu[b+'|'+o];delete pu[b+'|'+o]}
  save('sessions','sales','cash','set');
}
V.branches=()=>{
  if(!can('sys_branches')){say('ليس لديك صلاحية إدارة الفروع',1);return go('home')}
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">الفروع ونقاط البيع</div><button class="p" data-a="brAdd">➕ فرع جديد</button></div>
  <div class="mut" style="margin:6px 0 10px">كل فرع له نقاط بيع (جلسات). يمكنك إضافة فروع وجلسات أو حذفها أو تغيير أسمائها، وتتحدث كل السجلات القديمة بالاسم الجديد.</div>
  ${brData().map(b=>`<div class="card"><div class="row"><b style="flex:1;font-size:18px">🏬 ${esc(b.name)}</b><button data-a="brRen" data-b="${esc(b.name)}">✏️ تغيير اسم الفرع</button><button class="d" data-a="brDel" data-b="${esc(b.name)}">🗑 حذف الفرع</button></div>
   <div class="lbl">نقاط البيع / الجلسات</div><div class="row">${b.pos.map(p=>`<span class="otab">${esc(p)} <i style="color:var(--pri2)" data-a="psRen" data-b="${esc(b.name)}" data-p="${esc(p)}" title="تغيير الاسم">✏️</i><i data-a="psDel" data-b="${esc(b.name)}" data-p="${esc(p)}" title="حذف">✕</i></span>`).join('')||'<span class="mut">لا توجد نقاط بيع</span>'}<button data-a="psAdd" data-b="${esc(b.name)}">➕ جلسة جديدة</button></div></div>`).join('')}`);
};
const nameTaken=(list,n,except)=>list.some(x=>x!==except&&nm(x)===nm(n));
A.brAdd=async()=>{
  const r=await formDlg('فرع جديد',[{k:'n',l:'اسم الفرع'}],'إضافة');if(!r)return;
  const n=norm(r.n);if(!n){say('اكتب اسم الفرع',1);return}
  if(nameTaken(BR,n)){say('اسم الفرع موجود بالفعل',1);return}
  brData().push({name:n,pos:DEFBR[0].pos.slice()});brSaved();say('تمت إضافة الفرع');V.branches();
};
A.brRen=async t=>{
  const o=t.dataset.b,r=await formDlg('تغيير اسم الفرع',[{k:'n',l:'الاسم الجديد',v:o}],'حفظ');if(!r)return;
  const n=norm(r.n);if(!n||n===o)return;if(nameTaken(BR,n,o)){say('اسم الفرع موجود بالفعل',1);return}
  brData().find(b=>b.name===o).name=n;migBranch(o,n);brSaved();say('تم تغيير اسم الفرع');V.branches();
};
A.brDel=async t=>{
  const o=t.dataset.b;
  if(brData().length<2){say('يجب أن يبقى فرع واحد على الأقل',1);return}
  if(D.sessions.some(s=>s.br===o&&s.status==='open')){say('يوجد جلسة مفتوحة في هذا الفرع، أغلقها أولًا',1);return}
  if(Object.keys(D.stock[o]||{}).some(k=>D.stock[o][k]!==0)){say('لا يمكن حذف فرع به أرصدة مخزون. حوّل الأرصدة لفرع آخر أولًا',1);return}
  if(!(await dlg('حذف الفرع «'+o+'»؟\nتبقى فواتيره وتقاريره القديمة محفوظة.',{yes:'حذف الفرع'})))return;
  D.set.branches=brData().filter(b=>b.name!==o);delete D.stock[o];brSaved();save('stock');say('تم حذف الفرع');V.branches();
};
A.psAdd=async t=>{
  const b=brData().find(x=>x.name===t.dataset.b),r=await formDlg('جلسة / نقطة بيع جديدة',[{k:'n',l:'الاسم'}],'إضافة');if(!r)return;
  const n=norm(r.n);if(!n){say('اكتب الاسم',1);return}
  if(nameTaken(b.pos,n)){say('الاسم موجود في هذا الفرع',1);return}
  b.pos.push(n);brSaved();V.branches();
};
A.psRen=async t=>{
  const b=brData().find(x=>x.name===t.dataset.b),o=t.dataset.p,r=await formDlg('تغيير اسم الجلسة',[{k:'n',l:'الاسم الجديد',v:o}],'حفظ');if(!r)return;
  const n=norm(r.n);if(!n||n===o)return;if(nameTaken(b.pos,n,o)){say('الاسم موجود في هذا الفرع',1);return}
  if(D.sessions.some(s=>s.br===b.name&&s.pos===o&&s.status==='open')){say('توجد جلسة مفتوحة بهذا الاسم، أغلقها أولًا',1);return}
  b.pos[b.pos.indexOf(o)]=n;migPos(b.name,o,n);brSaved();V.branches();
};
A.psDel=async t=>{
  const b=brData().find(x=>x.name===t.dataset.b),p=t.dataset.p;
  if(D.sessions.some(s=>s.br===b.name&&s.pos===p&&s.status==='open')){say('توجد جلسة مفتوحة، أغلقها أولًا',1);return}
  if(!(await dlg('حذف الجلسة «'+p+'» من '+b.name+'؟\nتبقى سجلاتها القديمة محفوظة.',{yes:'حذف'})))return;
  b.pos=b.pos.filter(x=>x!==p);brSaved();V.branches();
};
