/* ===== شاشة المنتجات: عرض + إضافة + تعديل + فلترة ===== */
const PRD={lim:100};
const distinct=k=>{const o={};D.products.forEach(p=>{if(p[k])o[p[k]]=1});return Object.keys(o).sort((a,b)=>a.localeCompare(b,'ar'))};
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
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">المنتجات</div>${can('prod_edit')?'<button class="p" data-a="prodNew">➕ منتج جديد</button>':''}</div>
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
V.prodEdit=id=>{
  const p=id?PI.id[id]:{id:'',name:'',bc:'',ref:'',cost:'',price:'',cat:'',pcat:'',type:'',unit:''};
  if(id&&!p){go('products');return}
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
   <div><div class="lbl">البيع بخسارة</div><label><input type="checkbox" id="pe_loss"${p.allowLoss?' checked':''}${can('prod_allow_loss')?'':' disabled'}> السماح بالبيع إذا كان سعر البيع أقل من التكلفة</label>${can('prod_allow_loss')?'':'<div class="mut">تغييرها يحتاج صلاحية «السماح بالبيع بخسارة»</div>'}</div></div>
   ${ed?`<div class="row" style="margin-top:10px"><button class="p" data-a="prodSave" data-id="${esc(id||'')}">💾 حفظ المنتج</button></div>`:''}</div>
  ${id?`<div class="card"><div class="ttl">الأرصدة</div>${tbl(['الفرع','الرصيد'],BR.map(b=>`<tr><td>${esc(b)}</td><td>${fmt(stk(b,p.id))}</td></tr>`).join(''))}</div>`:''}`);
};
C.peSel=async t=>{
  if(t.value!=='__new__')return;
  const v=await dlg('اكتب القيمة الجديدة',{input:true,type:'text',yes:'إضافة'});
  if(v!==null&&norm(v)){const o=document.createElement('option');o.value=o.textContent=norm(v);t.insertBefore(o,t.querySelector('option[value="__new__"]'));t.value=norm(v)}
  else t.value='';
};
A.prodSave=t=>{
  if(!can('prod_edit')){say('ليس لديك صلاحية',1);return}
  const id=t.dataset.id,g=k=>norm($('pe_'+k).value);
  const rec={name:g('name'),bc:g('bc'),cost:num($('pe_cost').value),price:num($('pe_price').value),cat:g('cat'),type:g('type'),unit:g('unit'),pcat:g('pcat'),ref:g('ref')};
  const miss=[];if(!rec.name)miss.push('الاسم');if(!rec.bc)miss.push('الباركود');if(isNaN(rec.cost)||rec.cost<0)miss.push('التكلفة');if(isNaN(rec.price)||rec.price<0)miss.push('السعر');
  if(!rec.cat)miss.push('الفئة');if(!rec.type||rec.type==='__new__')miss.push('نوع المنتج');if(!rec.unit||rec.unit==='__new__')miss.push('وحدة القياس');
  if(miss.length){say('بيانات إجبارية ناقصة أو غير صحيحة: '+miss.join('، '),1);return}
  const dup=(PI.bc[rec.bc]||[]).find(x=>x.id!==id);if(dup){say('الباركود مستخدم بالفعل للمنتج «'+dup.name+'»',1);return}
  let p;const wantLoss=!!$('pe_loss').checked;
  if(id){p=PI.id[id];Object.assign(p,rec);if(can('prod_allow_loss'))p.allowLoss=wantLoss}
  else{p=Object.assign({id:'P'+(++D.cnt.prod)},rec);if(can('prod_allow_loss'))p.allowLoss=wantLoss;D.products.push(p)}
  reindex();save('products','cnt');say(id?'تم حفظ المنتج':'تمت إضافة المنتج');go('prodEdit',p.id);
};
