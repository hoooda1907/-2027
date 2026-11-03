/* ===== العروض (قسم فرعي من نقطة البيع) ===== */
const OFR={rows:[],all:false};
const endOfDay=ts=>{const d=new Date(ts);d.setHours(23,59,59,999);return d.getTime()};
const offActive=o=>!!o&&Date.now()>=o.start&&Date.now()<=o.end;
const offLeft=o=>Math.max(0,Math.ceil((o.end-Date.now())/86400000));
const nrm=r=>(r.p?r.p:PI.id[r.id]);
V.offers=()=>{
  if(!can('offer_view')){say('ليس لديك صلاحية العروض',1);return go('home')}
  setMain(`<div class="row"><button data-a="go" data-v="posBranch">‹ نقطة البيع</button><div class="ttl" style="flex:1;margin:0">🏷️ العروض</div></div>
  <div class="card"><div class="ttl" style="font-size:16px">الفروع التي تُتاح فيها العروض</div><div class="row">${BR.map((b,i)=>`<label style="border:1px solid var(--bd);border-radius:8px;padding:8px 12px"><input type="checkbox" data-c="ofBr" data-n="${i}"${offerBrOn(b)?' checked':''}> ${esc(b)}</label>`).join('')}</div></div>
  <div class="card"><input id="ofQ" data-i="ofQ" data-k="ofQ" placeholder="امسح الباركود أو ابحث بالاسم لإضافة منتج للعرض ثم Enter" autocomplete="off"><div id="ofR"></div></div>
  <div class="card"><div class="row"><label><input type="checkbox" id="ofAll" data-c="ofAll"> تحديد الكل</label>
   <span class="lbl" style="margin:0">مدة العرض (أيام):</span><input id="ofBulk" type="number" min="1" style="max-width:110px" placeholder="مثال: 7">
   <button data-a="ofBulkGo">تطبيق المدة على المحدد</button><button data-a="ofExp">⬇️ تصدير المنتجات</button><button data-a="ofImp">⬆️ استيراد بعد إضافة بيانات العرض</button>
   <button class="p" data-a="ofOk">✅ تفعيل العروض المحددة</button></div><div id="ofT" style="margin-top:8px"></div></div>
  <div class="card"><div class="ttl">العروض الحالية والمنتهية</div><div id="ofA"></div></div>`);
  ofRows();ofActive();
};
I.ofQ=t=>{const q=norm(t.value);$('ofR').innerHTML=q.length<2?'':search(q,10).map(p=>`<div class="row" style="padding:8px;border-bottom:1px solid var(--bd);cursor:pointer" data-a="ofPick" data-id="${esc(p.id)}"><span style="flex:1">${esc(p.name)}</span><span class="mut">${esc(p.bc)} — ${money(pPrice(p))}</span></div>`).join('')};
function ofAdd(p){
  if(!OFR.rows.find(r=>r.id===p.id))OFR.rows.push({id:p.id,price:'',days:'',until:'',sel:true});
  $('ofQ').value='';$('ofR').innerHTML='';ofRows();$('ofQ').focus();
}
A.ofPick=t=>ofAdd(PI.id[t.dataset.id]);
K.ofQ=(t,e)=>{if(e.key!=='Enter')return;const v=norm(t.value);if(!v)return;let m=find(v);if(!m.length)m=search(v,3);if(m.length===1)ofAdd(m[0]);else if(!m.length)say('المنتج غير موجود',1)};
function ofRows(){
  $('ofT').innerHTML=OFR.rows.length?tbl(['','اسم المنتج','التكلفة','سعر البيع','سعر العرض','مدة العرض (أيام)','أو حتى تاريخ',''],OFR.rows.map((r,i)=>{const p=PI.id[r.id];
    return `<tr><td><input type="checkbox" data-c="ofSel" data-n="${i}"${r.sel?' checked':''} style="min-width:0"></td><td class="l">${esc(p.name)}</td><td>${money(pCost(p))}</td><td>${money(pPrice(p))}</td><td><input inputmode="decimal" value="${esc(r.price)}" data-c="ofF" data-n="${i}" data-f="price"></td><td><input inputmode="numeric" value="${esc(r.days)}" data-c="ofF" data-n="${i}" data-f="days"></td><td><input type="date" value="${esc(r.until)}" data-c="ofF" data-n="${i}" data-f="until" style="min-width:140px"></td><td><button class="d" data-a="ofDel" data-n="${i}">✕</button></td></tr>`}).join('')):'<div class="mut">القائمة فارغة — أضف منتجات من خانة البحث أعلاه</div>';
}
C.ofBr=t=>{if(!can('offer_stop')){say('تغيير فروع العروض يحتاج صلاحية «إيقاف العروض»',1);t.checked=!t.checked;return}const b=BR[+t.dataset.n];D.set.offerBr=D.set.offerBr||{};D.set.offerBr[b]=t.checked;save('set');say(t.checked?'العروض متاحة في «'+b+'»':'العروض متوقفة في «'+b+'»')};
C.ofSel=t=>{OFR.rows[+t.dataset.n].sel=t.checked};
C.ofAll=t=>{OFR.rows.forEach(r=>r.sel=t.checked);ofRows()};
C.ofF=t=>{OFR.rows[+t.dataset.n][t.dataset.f]=norm(t.value)};
A.ofDel=t=>{OFR.rows.splice(+t.dataset.n,1);ofRows()};
A.ofBulkGo=()=>{
  const d=parseInt(norm($('ofBulk').value),10);if(!(d>0)){say('اكتب عدد الأيام',1);return}
  OFR.rows.forEach(r=>{if(r.sel){r.days=String(d);r.until=''}});ofRows();
};
function ofWindow(r){
  const now=Date.now();let end;
  if(r.until){end=endOfDay(new Date(r.until+'T12:00:00').getTime())}
  else{const d=parseInt(r.days,10);if(!(d>0))return null;end=endOfDay(now+(d-1)*86400000)}
  return end<now?null:{start:now,end};
}
A.ofOk=async()=>{
  if(!can('offer_add')){say('ليس لديك صلاحية إضافة العروض',1);return}
  const sel=OFR.rows.filter(r=>r.sel);if(!sel.length){say('حدد منتجات أولًا',1);return}
  const bad=[];let n=0;
  sel.forEach(r=>{
    const p=PI.id[r.id],price=num(r.price),w=ofWindow(r);
    if(isNaN(price)||price<=0||price>=pPrice(p)||!w){bad.push(p.name);return}
    if(pCost(p)>0&&price<pCost(p)&&!(p.allowLoss||can('pos_sell_loss'))){bad.push(p.name);return}
    p.offer={price,start:w.start,end:w.end,days:parseInt(r.days,10)||0};n++;
  });
  if(n)save('products');
  OFR.rows=OFR.rows.filter(r=>!(r.sel&&PI.id[r.id].offer&&offActive(PI.id[r.id].offer)&&!bad.includes(PI.id[r.id].name)));
  ofRows();ofActive();
  say(n?`تم تفعيل ${n} عرض`+(bad.length?` — تعذّر ${bad.length} (تأكد من سعر العرض الأقل من سعر البيع والمدة)`:''):'لم يتم تفعيل أي عرض: سعر العرض يجب أن يكون أقل من سعر البيع وبمدة صحيحة',!n);
};
function ofActive(){
  const l=D.products.filter(p=>p.offer);
  $('ofA').innerHTML=l.length?tbl(['المنتج','سعر البيع','سعر العرض','الخصم','ينتهي','الحالة',''],l.sort((a,b)=>b.offer.end-a.offer.end).slice(0,300).map(p=>{const o=p.offer,on=offActive(o);
    return `<tr><td class="l">${esc(p.name)}</td><td>${money(pPrice(p))}</td><td><b>${money(o.price)}</b></td><td>${money(pPrice(p)-o.price)}</td><td>${new Date(o.end).toLocaleDateString('ar-EG')}</td><td>${on?`<span class="badge b-done">نشط — متبقي ${offLeft(o)} يوم</span>`:'<span class="badge b-cancel">العرض منتهي — عاد السعر الأصلي</span>'}</td><td><button class="d" data-a="ofCancel" data-id="${esc(p.id)}">${on?'إلغاء':'حذف'}</button></td></tr>`}).join('')):'<div class="mut">لا توجد عروض</div>';
}
A.ofCancel=t=>{if(!can('offer_stop')){say('إيقاف العروض يحتاج صلاحية «إيقاف العروض»',1);return}delete PI.id[t.dataset.id].offer;save('products');ofActive()};
A.ofExp=async()=>{
  if(!OFR.rows.length){say('لا توجد منتجات في القائمة',1);return}
  const rows=[['باركود','المنتج','التكلفة','سعر البيع','سعر العرض','مدة العرض (أيام)','حتى تاريخ']].concat(OFR.rows.map(r=>{const p=PI.id[r.id];return[String(p.bc),p.name,pCost(p),pPrice(p),r.price===''?'':num(r.price),r.days===''?'':parseInt(r.days,10),r.until]}));
  const p=await saveX(`نقطة البيع/العروض/${dayStr()}`,`عروض - ${dayStr()}.xlsx`,wbOf([['العروض',rows]]));if(p)say('تم حفظ الملف: '+p);
};
A.ofImp=()=>{
  if(!can('offer_add')){say('ليس لديك صلاحية إضافة العروض',1);return}
  const inp=document.createElement('input');inp.type='file';inp.accept='.xlsx,.xls,.csv';
  inp.onchange=async()=>{
    const f=inp.files[0];if(!f)return;
    const rows=await readRows(f),col=mapCols(rows.shift()||[],[['price',/سعر العرض|offer/],['days',/مدة|أيام|days/],['until',/حتى|until/],['bc',/باركود|barcode/]]);
    if(col.bc===undefined||col.price===undefined){say('الملف يجب أن يحتوي عمودي «باركود» و«سعر العرض»',1);return}
    let n=0;
    rows.forEach(r=>{const m=find(cell(r[col.bc]));if(m.length!==1)return;
      const p=m[0];let row=OFR.rows.find(x=>x.id===p.id);if(!row){row={id:p.id,price:'',days:'',until:'',sel:true};OFR.rows.push(row)}
      row.price=cell(r[col.price]);if(col.days!==undefined)row.days=cell(r[col.days]);
      if(col.until!==undefined&&r[col.until]!==''){const v=r[col.until],d=typeof v==='number'?new Date(Math.round((v-25569)*86400000)):new Date(v);if(!isNaN(d))row.until=dayStr(d)}
      row.sel=true;n++});
    ofRows();say('تم استيراد بيانات العرض لعدد '+n+' منتج');
  };
  inp.click();
};
