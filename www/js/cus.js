/* ===== العملاء وحساباتهم (البيع الأجل) ===== */
const CU={debt:false};
const cusById=id=>D.customers.find(c=>c.id===id);
function cusNew(name,phone,addr){
  const c={id:'C'+(++D.cnt.cus),name:norm(name),phone:norm(phone),addr:norm(addr||''),note:'',open:0};
  D.customers.push(c);save('customers','cnt');return c;
}
/* أثر الفاتورة على دين العميل: البيع الأجل/الجزئي يزيد الدين، ومرتجع فاتورة أجل ينقصه */
const cusDebtOf=d=>d.type==='sale'?Math.max(0,r2(d.total-d.paid)):(d.method==='أجل'?d.total:0);
function cusStats(id){
  const c=cusById(id)||{open:0};let buy=0,paidSale=0,debt=0;
  D.sales.forEach(d=>{if(d.cust!==id)return;buy+=d.total;if(d.type==='sale')paidSale+=Math.min(d.total,d.paid);debt+=cusDebtOf(d)});
  const pay=D.cpay.filter(p=>p.cust===id).reduce((a,p)=>a+p.amount,0);
  return{buy:r2(buy),paid:r2(paidSale+pay),pay:r2(pay),open:c.open||0,debt:r2((c.open||0)+debt-pay)};
}
const cusBalance=id=>cusStats(id).debt;
function cusAddPay(id,amount,method,note,session){
  const d=new Date();
  D.cpay.push({id:++D.cnt.cpay,cust:id,amount,method,note:norm(note),user:ME.name,session:session||null,dt:nowStr(d),day:dayStr(d),ts:d.getTime()});
  save('cpay','cnt');saveCusStmt(id);
  if(session)saveSes(session);
}
/* كشف الحساب بالترتيب الزمني مع الرصيد الجاري */
function cusLedger(id){
  const c=cusById(id)||{open:0},rows=[];
  D.sales.forEach(d=>{if(d.cust!==id)return;
    if(d.type==='sale')rows.push({ts:d.ts,dt:d.dt,type:'فاتورة بيع #'+pno(d.no),value:d.total,paid:Math.min(d.total,d.paid),rem:Math.max(0,r2(d.total-d.paid)),method:d.method,delta:Math.max(0,r2(d.total-d.paid)),doc:d});
    else rows.push({ts:d.ts,dt:d.dt,type:'مرتجع #'+pno(d.no),value:d.total,paid:0,rem:cusDebtOf(d),method:d.method,delta:cusDebtOf(d),doc:d})});
  D.cpay.forEach(p=>{if(p.cust!==id)return;rows.push({ts:p.ts,dt:p.dt,type:'دفعة من العميل',value:p.amount,paid:p.amount,rem:-p.amount,method:p.method,delta:-p.amount,note:p.note})});
  rows.sort((a,b)=>a.ts-b.ts);
  let run=c.open||0;rows.forEach(r=>{run=r2(run+r.delta);r.bal=run});
  return rows;
}
const linesTbl=l=>tbl(['الصنف','الكمية','السعر','الإجمالي'],l.map(x=>`<tr><td class="l">${esc(x.n)}</td><td>${fmt(x.qty)}</td><td>${money(x.price)}</td><td>${money(x.price*x.qty)}</td></tr>`).join(''));

function saveCusStmt(id){
  const c=cusById(id);if(!c)return;const st=cusStats(id),led=cusLedger(id);
  const sm=[['العميل',c.name],['الهاتف',c.phone],['العنوان',c.addr],['رصيد افتتاحي',c.open||0],['إجمالي المشتريات (بعد المرتجعات)',st.buy],['إجمالي المسدد',st.paid],['الدين الحالي (المتبقي)',st.debt]];
  const inv=[['رقم الفاتورة','التاريخ','النوع','طريقة الدفع','الباركود','الصنف','الكمية','السعر','الإجمالي','إجمالي الفاتورة','المسدد','المتبقي']];
  led.filter(r=>r.doc).forEach(r=>{const d=r.doc;d.lines.forEach((l,i)=>inv.push([pno(d.no),d.dt,d.type==='return'?'مرتجع':'بيع',d.method,String(l.b),l.n,l.qty,l.price,r2(l.price*l.qty),i?'':d.total,i?'':r.paid,i?'':r.rem]))});
  const py=[['التاريخ','المبلغ','طريقة الدفع','ملاحظة','بواسطة']].concat(D.cpay.filter(p=>p.cust===id).map(p=>[p.dt,p.amount,p.method,p.note,p.user]));
  const lg=[['التاريخ','العملية','القيمة','المسدد','المتبقي منها','الطريقة','الرصيد']].concat(led.map(r=>[r.dt,r.type,r.value,r.paid,r.rem,r.method,r.bal]));
  return saveX('العملاء',`${c.name}.xlsx`,wbOf([['الملخص',sm],['كشف الحساب',lg],['الفواتير',inv],['الدفعات',py]]));
}

/* --- قائمة العملاء --- */
V.customers=()=>{
  if(!can('cus_view')){say('ليس لديك صلاحية العملاء',1);return go('home')}
  const tot=r2(D.customers.reduce((a,c)=>a+Math.max(0,cusBalance(c.id)),0));
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">العملاء</div>${can('cus_edit')?'<button class="p" data-a="cusNew">➕ عميل جديد</button>':''}</div>
  <div class="card"><div class="row"><input id="cF" data-i="cusFlt" placeholder="بحث بالاسم أو رقم الهاتف" style="max-width:320px"><label><input type="checkbox" id="cD" data-c="cusFlt"> عليهم ديون فقط</label><b style="margin-inline-start:auto">إجمالي الديون: <span style="color:var(--wr)">${money(tot)}</span></b></div></div><div class="card" id="cL"></div>`);
  cusList();
};
I.cusFlt=C.cusFlt=()=>cusList();
function cusList(){
  const q=nm($('cF').value),dbt=$('cD').checked;
  let l=D.customers.filter(c=>!q||nm(c.name).includes(q)||String(c.phone).includes(q)).map(c=>({c,s:cusStats(c.id)}));
  if(dbt)l=l.filter(x=>x.s.debt>0);
  l.sort((a,b)=>b.s.debt-a.s.debt||String(a.c.name).localeCompare(String(b.c.name),'ar'));
  $('cL').innerHTML=tbl(['العميل','الهاتف','إجمالي المشتريات','المسدد','الدين / المتبقي'],l.slice(0,300).map(x=>`<tr class="clk" data-a="cusOpen" data-id="${x.c.id}"><td class="l">${esc(x.c.name)}</td><td>${esc(x.c.phone)}</td><td>${money(x.s.buy)}</td><td>${money(x.s.paid)}</td><td><b style="color:${x.s.debt>0?'var(--wr)':'inherit'}">${money(x.s.debt)}</b></td></tr>`).join(''))+(l.length>300?'<div class="mut">يظهر أول 300 عميل — استخدم البحث.</div>':'');
}
A.cusOpen=t=>go('cusEdit',t.dataset.id);
A.cusNew=async()=>{
  const r=await formDlg('عميل جديد',[{k:'n',l:'الاسم'},{k:'p',l:'رقم الهاتف'},{k:'a',l:'العنوان'}],'إضافة');if(!r)return;
  if(!norm(r.n)){say('اكتب الاسم',1);return}
  const c=cusNew(r.n,r.p,r.a);go('cusEdit',c.id);
};

/* --- صفحة العميل --- */
V.cusEdit=id=>{
  const c=cusById(id);if(!c){go('customers');return}
  const st=cusStats(id),led=cusLedger(id),ed=can('cus_edit'),dis=ed?'':' disabled';
  const docs=led.filter(r=>r.doc).slice().reverse(),pays=D.cpay.filter(p=>p.cust===id).slice().sort((a,b)=>b.ts-a.ts);
  setMain(`<div class="row"><button data-a="go" data-v="customers">‹ العملاء</button><div class="ttl" style="margin:0;flex:1">${esc(c.name)}</div>${can('cus_pay')?`<button class="p" data-a="cusPay" data-id="${id}">💵 تسديد دفعة</button>`:''}</div>
  <div class="g2" style="margin-top:10px"><div class="card"><div class="mut">إجمالي المشتريات (بعد المرتجعات)</div><div class="ttl">${money(st.buy)}</div></div><div class="card"><div class="mut">إجمالي المسدد</div><div class="ttl" style="color:var(--ok)">${money(st.paid)}</div></div>
  <div class="card"><div class="mut">الدين / المتبقي على العميل</div><div class="ttl" style="color:${st.debt>0?'var(--wr)':'var(--ok)'}">${money(st.debt)}</div></div></div>
  <div class="card"><div class="g2"><div><div class="lbl">الاسم</div><input id="cu_name" value="${esc(c.name)}"${dis}></div><div><div class="lbl">الهاتف</div><input id="cu_phone" value="${esc(c.phone)}"${dis}></div><div><div class="lbl">العنوان</div><input id="cu_addr" value="${esc(c.addr)}"${dis}></div><div><div class="lbl">رصيد افتتاحي (دين سابق)</div><input id="cu_open" inputmode="decimal" value="${c.open||0}"${dis}></div></div>
  <div class="lbl">ملاحظات</div><textarea id="cu_note" rows="2"${dis}>${esc(c.note)}</textarea>${ed?`<div class="row" style="margin-top:8px"><button class="p" data-a="cusSave" data-id="${id}">💾 حفظ البيانات</button></div>`:''}</div>
  <div class="card"><div class="ttl">الفواتير التي اشتراها</div>${docs.length?tbl(['التاريخ','الفاتورة','القيمة','المسدد','المتبقي منها','طريقة الدفع','المحتويات'],docs.map(r=>`<tr><td>${esc(r.dt)}</td><td>${esc(r.type)}</td><td><b>${money(r.value)}</b></td><td>${money(r.paid)}</td><td style="color:${r.rem>0?'var(--wr)':'inherit'}">${money(r.rem)}</td><td>${esc(r.method)}</td><td><details><summary>عرض (${r.doc.lines.length})</summary>${linesTbl(r.doc.lines)}</details></td></tr>`).join('')):'<div class="mut">لا توجد فواتير</div>'}</div>
  <div class="card"><div class="ttl">الدفعات التي سدّدها</div>${pays.length?tbl(['التاريخ والوقت','المبلغ','طريقة الدفع','ملاحظة','بواسطة'],pays.map(p=>`<tr><td>${esc(p.dt)}</td><td><b>${money(p.amount)}</b></td><td>${esc(p.method)}</td><td class="l">${esc(p.note)}</td><td>${esc(p.user)}</td></tr>`).join('')):'<div class="mut">لا توجد دفعات</div>'}</div>
  <div class="card"><div class="ttl">كشف الحساب</div>${led.length||c.open?tbl(['التاريخ','العملية','القيمة','المسدد','المتبقي منها','الطريقة','الرصيد'],(c.open?`<tr><td>—</td><td>رصيد افتتاحي</td><td></td><td></td><td></td><td></td><td>${money(c.open)}</td></tr>`:'')+led.map(r=>`<tr><td>${esc(r.dt)}</td><td>${esc(r.type)}</td><td>${money(r.value)}</td><td>${money(r.paid)}</td><td>${money(r.rem)}</td><td>${esc(r.method)}</td><td><b>${money(r.bal)}</b></td></tr>`).join('')):'<div class="mut">لا توجد حركات</div>'}</div>`);
};
A.cusSave=t=>{
  const c=cusById(t.dataset.id),n=norm($('cu_name').value),o=num($('cu_open').value);
  if(!n){say('اكتب الاسم',1);return}if(isNaN(o)){say('رصيد افتتاحي غير صحيح',1);return}
  Object.assign(c,{name:n,phone:norm($('cu_phone').value),addr:norm($('cu_addr').value),note:norm($('cu_note').value),open:o});
  save('customers');saveCusStmt(c.id);say('تم حفظ بيانات العميل');go('cusEdit',c.id);
};
A.cusPay=async t=>{
  const r=await formDlg('تسديد دفعة من العميل',[{k:'a',l:'المبلغ',t:'number'},{k:'m',l:'طريقة الدفع',t:'select',o:['نقدي','فيزا','فودافون كاش','تحويل بنكي','أخرى']},{k:'n',l:'ملاحظة',t:'text'}],'تسجيل الدفعة');
  if(!r)return;const a=num(r.a);if(isNaN(a)||a<=0){say('اكتب مبلغًا صحيحًا',1);return}
  cusAddPay(t.dataset.id,a,r.m,r.n,null);say('تم تسجيل الدفعة');go('cusEdit',t.dataset.id);
};
function importCustomers(rows){
  if(!rows.length)return null;
  if(/اسم|name/i.test(cell(rows[0][0])))rows.shift();
  const have={};D.customers.forEach(c=>have[nm(c.name)+'|'+c.phone]=1);let add=0,skip=0;
  rows.forEach(r=>{const n=cell(r[0]),p=cell(r[1]);if(!n)return;const k=nm(n)+'|'+p;if(have[k]){skip++;return}have[k]=1;
    D.customers.push({id:'C'+(++D.cnt.cus),name:n,phone:p,addr:'',note:'',open:0});add++});
  save('customers','cnt');return{add,skip};
}
