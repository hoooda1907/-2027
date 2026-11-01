/* ===== الموظفون والصلاحيات ===== */
const PERMS=[
 ['نقطة البيع',[['pos_sell','بيع فقط (فتح جلسة وإتمام الفواتير)'],['pos_return','المرتجعات'],['pos_expense','مصروفات / نفقات نقطة البيع'],['pos_income','إيرادات نقطة البيع'],['pos_close','إغلاق الجلسة'],['pos_review','مراجعة الفواتير'],['pos_delorder','حذف الطلبات المعلّقة (وحذف/مسح الطلب)'],['pos_assign','تحديد موظفي فتح الجلسات']]],
 ['العملاء',[['cus_view','عرض العملاء وحساباتهم'],['cus_edit','إضافة وتعديل العملاء وأرصدتهم'],['cus_pay','تسجيل دفعات العملاء']]],
 ['المشتريات',[['pur_view','عرض المشتريات'],['pur_edit','إنشاء وتعديل الفواتير'],['pur_confirm','تأكيد الاستلام'],['pur_cancel','إلغاء الفواتير'],['price_edit','تعديل سعر البيع']]],
 ['المخزون',[['inv_view','عرض الأرصدة'],['inv_transfer','التحويل بين الفروع'],['inv_count','الجرد'],['inv_adjust','تسوية واستيراد الأرصدة']]],
 ['الحسابات',[['acc_reports','تقارير المبيعات والأرباح'],['acc_suppliers','عرض الموردين'],['acc_pay','تسجيل دفعات الموردين'],['acc_edit','تعديل بيانات وأرصدة الموردين']]],
 ['الموارد البشرية',[['hr_view','عرض الموظفين'],['hr_edit','إضافة وتعديل الموظفين والصلاحيات']]],
 ['النظام',[['sys_import','استيراد وتحديث البيانات'],['sys_admin','مدير النظام (كل الصلاحيات)']]]
];
const ALLP=[].concat.apply([],PERMS.map(g=>g[1].map(x=>x[0])));
const ROLES={
 'مستخدم نقطة البيع (كاشير)':['pos_sell'],
 'مدير نقطة البيع':['pos_sell','pos_return','pos_expense','pos_income','pos_close','pos_review','pos_delorder','pos_assign','cus_view','cus_pay'],
 'مستخدم العملاء':['cus_view'],
 'مدير العملاء':['cus_view','cus_edit','cus_pay'],
 'مستخدم المشتريات':['pur_view','pur_edit'],
 'مدير المشتريات':['pur_view','pur_edit','pur_confirm','pur_cancel','price_edit','acc_suppliers'],
 'مستخدم المخزون':['inv_view','inv_count'],
 'مدير المخزون':['inv_view','inv_count','inv_transfer','inv_adjust'],
 'مستخدم المحاسبة':['acc_reports'],
 'مدير المحاسبة':['acc_reports','acc_suppliers','acc_pay','acc_edit'],
 'مستخدم الموارد البشرية':['hr_view'],
 'مدير الموارد البشرية':['hr_view','hr_edit'],
 'مدير النظام':['sys_admin','sys_import']
};
const HR={cur:null};
const PLBL={};PERMS.forEach(g=>g[1].forEach(p=>PLBL[p[0]]=p[1]));
function saveEmpFile(){
  const rows=[['الاسم','هاتف العمل','البريد','القسم','المنصب','المدير','الحساب','دخول بالرقم السري','الصلاحيات']].concat(D.employees.map(e=>[e.name,e.phone,e.email,e.dept,e.job,e.mgr,e.active===false?'موقوف':'مفعّل',e.pin?'نعم':'لا',Object.keys(e.perms||{}).filter(k=>e.perms[k]).map(k=>PLBL[k]||k).join(' | ')]));
  return saveX('الموارد البشرية','الموظفون.xlsx',wbOf([['الموظفون',rows]]));
}
V.employees=()=>{
  if(!can('hr_view')){say('ليس لديك صلاحية الموظفين',1);return go('home')}
  setMain(`<div class="row"><div class="ttl" style="flex:1;margin:0">الموظفون والصلاحيات</div>${can('hr_edit')?'<button class="p" data-a="empNew">➕ موظف جديد</button>':''}</div>
  <div class="card"><input id="eF" data-i="empFlt" placeholder="بحث بالاسم أو المنصب" style="max-width:320px"></div><div class="card" id="eL"></div>`);
  empList();
};
I.empFlt=()=>empList();
function empList(){
  const q=nm($('eF').value);
  const l=D.employees.filter(e=>!q||nm(e.name).includes(q)||nm(e.job).includes(q));
  $('eL').innerHTML=tbl(['الاسم','المنصب','القسم','الدخول','عدد الصلاحيات',''],l.map(e=>`<tr class="clk" data-a="empOpen" data-id="${e.id}"><td class="l">${esc(e.name)}</td><td>${esc(e.job)}</td><td>${esc(e.dept)}</td><td>${e.pin?'<span class="badge b-done">مفعّل</span>':'<span class="badge b-cancel">بدون رقم سري</span>'}</td><td>${Object.keys(e.perms||{}).filter(k=>e.perms[k]).length}</td><td>${e.active===false?'<span class="badge b-cancel">موقوف</span>':''}</td></tr>`).join(''));
}
A.empOpen=t=>go('empEdit',t.dataset.id);
A.empNew=()=>{
  const e={id:'E'+(++D.cnt.emp),name:'',phone:'',email:'',dept:'',job:'',mgr:'',pin:'',perms:{},active:true,isNew:true};
  HR.cur=e;go('empEdit',null);
};
V.empEdit=id=>{
  if(id)HR.cur=JSON.parse(JSON.stringify(D.employees.find(e=>e.id===id)));
  const e=HR.cur;if(!e){go('employees');return}
  const ed=can('hr_edit'),dis=ed?'':' disabled';
  const f=(l,k,t)=>`<div><div class="lbl">${l}</div><input ${t?`type="${t}"`:''} id="ee_${k}" value="${esc(e[k])}"${dis}></div>`;
  setMain(`<div class="row"><button data-a="go" data-v="employees">‹ الموظفون</button><div class="ttl" style="margin:0;flex:1">${e.isNew?'موظف جديد':esc(e.name)}</div></div>
  <div class="card"><div class="g2">${f('الاسم','name')}${f('هاتف العمل','phone')}${f('البريد الإلكتروني','email')}${f('القسم','dept')}${f('المنصب الوظيفي','job')}${f('المدير','mgr')}
   <div><div class="lbl">الرقم السري للدخول (4 أرقام على الأقل)</div><input id="ee_pin" value="${esc(e.pin)}" inputmode="numeric"${dis}></div>
   <div><div class="lbl">الحساب</div><label><input type="checkbox" id="ee_active"${e.active!==false?' checked':''}${dis}> مفعّل</label></div>
   <div><div class="lbl">عدد الطلبات المتاحة له في نقطة البيع</div><input id="ee_maxOrders" type="number" min="1" value="${e.maxOrders>0?e.maxOrders:3}"${dis}></div></div></div>
  <div class="card"><div class="ttl">الصلاحيات</div>
   ${ed?`<div class="lbl">تطبيق دور جاهز (يضيف صلاحياته لما هو محدد)</div><div class="row">${Object.keys(ROLES).map(r=>`<button data-a="roleAdd" data-r="${esc(r)}">${esc(r)}</button>`).join('')}<button class="d" data-a="roleClr">إلغاء الكل</button></div>`:''}
   <div class="g2" style="margin-top:10px">${PERMS.map(g=>`<div class="card" style="margin:0"><b>${g[0]}</b>${g[1].map(p=>`<div style="margin-top:6px"><label><input type="checkbox" data-c="permChk" data-p="${p[0]}"${e.perms[p[0]]?' checked':''}${dis}> ${p[1]}</label></div>`).join('')}</div>`).join('')}</div></div>
  ${ed?`<div class="row"><button class="p" data-a="empSave">💾 حفظ</button>${e.isNew?'':'<button class="d" data-a="empDel">🗑 حذف الموظف</button>'}</div>`:''}`);
};
C.permChk=t=>{HR.cur.perms[t.dataset.p]=t.checked};
A.roleAdd=t=>{ROLES[t.dataset.r].forEach(p=>HR.cur.perms[p]=true);readEmp();V.empEdit(null)};
A.roleClr=()=>{HR.cur.perms={};readEmp();V.empEdit(null)};
function readEmp(){
  const e=HR.cur;['name','phone','email','dept','job','mgr','pin'].forEach(k=>{const el=$('ee_'+k);if(el)e[k]=k==='pin'?norm(dg(el.value)):norm(el.value)});
  const a=$('ee_active');if(a)e.active=a.checked;const mo=$('ee_maxOrders');if(mo){const v=parseInt(mo.value,10);e.maxOrders=v>0?v:3}
}
A.empSave=()=>{
  readEmp();const e=HR.cur;
  if(!e.name){say('اكتب اسم الموظف',1);return}
  if(e.pin&&!/^\d{4,}$/.test(e.pin)){say('الرقم السري 4 أرقام على الأقل',1);return}
  if(nm(e.name)===nm('أسواق بدر')||nm(e.name)===nm('Mahmoud')){say('هذا الاسم محجوز',1);return}
  const dup=D.employees.find(x=>nm(x.name)===nm(e.name)&&x.id!==e.id);if(dup){say('يوجد موظف بنفس الاسم',1);return}
  if(e.pin&&D.employees.some(x=>x.id!==e.id&&x.pin===e.pin&&nm(x.name)===nm(e.name))){say('بيانات الدخول مكررة',1);return}
  const isNew=e.isNew;delete e.isNew;
  if(isNew)D.employees.push(e);else D.employees[D.employees.findIndex(x=>x.id===e.id)]=e;
  save('employees','cnt');saveEmpFile();say('تم حفظ الموظف');go('employees');
};
A.empDel=async()=>{
  if(!(await dlg('حذف هذا الموظف؟',{yes:'حذف'})))return;
  D.employees=D.employees.filter(x=>x.id!==HR.cur.id);save('employees');saveEmpFile();go('employees');
};
