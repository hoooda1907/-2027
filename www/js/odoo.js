/* ===== الربط مع أودو 15 (JSON-RPC عبر العملية الرئيسية) ===== */
const OD={uid:null,sig:'',busy:false,ps:{},pl:{}};
const odCfg=()=>{if(!D.set.odoo)D.set.odoo={on:false,url:'',db:'',user:'',key:'',every:15,cfg:{},pick:{},pm:{},last:'',lastTs:0,msg:''};return D.set.odoo};
const odReady=()=>{const c=odCfg();return !!(c.on&&c.url&&c.db&&c.user&&c.key&&api&&api.odooRpc)};
async function odRaw(service,method,args){
  if(!api||!api.odooRpc)throw new Error('الربط متاح في نسخة ويندوز فقط');
  const r=await api.odooRpc({url:odCfg().url},service,method,args);
  if(!r.ok)throw new Error(r.error);return r.result;
}
async function odLogin(){
  const c=odCfg(),uid=await odRaw('common','authenticate',[c.db,c.user,c.key,{}]);
  if(!uid)throw new Error('بيانات الدخول إلى أودو غير صحيحة (قاعدة البيانات / المستخدم / مفتاح API)');
  OD.uid=uid;OD.sig=c.url+'|'+c.db+'|'+c.user+'|'+c.key;return uid;
}
async function odx(model,method,args,kw){
  const c=odCfg();if(!OD.uid||OD.sig!==c.url+'|'+c.db+'|'+c.user+'|'+c.key)await odLogin();
  return odRaw('object','execute_kw',[c.db,OD.uid,c.key,model,method,args||[],kw||{}]);
}
const isNet=e=>/لا يوجد اتصال|انتهت مهلة|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/.test(String(e.message||e));
const syBadge=d=>{
  if(!odCfg().on)return '';
  const s=d.sy;
  if(s&&s.s==='ok')return `<span class="sync sy-ok" title="${esc(s.at||'')}">✓ في أودو</span>`;
  if(s&&s.s==='er')return `<span class="sync sy-er" title="${esc(s.err||'')}">⚠ خطأ مزامنة</span>`;
  return '<span class="sync sy-no">⏳ لم تتزامن</span>';
};
const odPending=()=>({
  sales:D.sales.filter(d=>!d.sy||d.sy.s!=='ok').length,
  pur:D.purchases.filter(d=>d.status==='received'&&(!d.sy||d.sy.s!=='ok')).length
});

/* --- تعريف المنتجات والشركاء --- */
async function odProd(p){
  if(p.oid)return p.oid;
  let r=[];
  if(p.bc)r=await odx('product.product','search_read',[[['barcode','=',p.bc]]],{fields:['id'],limit:1});
  if(!r.length&&p.ref)r=await odx('product.product','search_read',[[['default_code','=',p.ref]]],{fields:['id'],limit:1});
  if(!r.length)throw new Error('المنتج «'+p.name+'» غير موجود في أودو (باركود '+p.bc+')');
  p.oid=r[0].id;save('products');return p.oid;
}
async function odPartner(rec,kind,coll){
  if(!rec)return false;if(rec.oid)return rec.oid;
  const r=await odx('res.partner','search_read',[[['name','=',rec.name]]],{fields:['id'],limit:1});
  if(r.length){rec.oid=r[0].id;save(coll);return rec.oid}
  const vals={name:rec.name};if(rec.phone)vals.phone=rec.phone;vals[kind==='sup'?'supplier_rank':'customer_rank']=1;
  rec.oid=await odx('res.partner','create',[vals]);save(coll);return rec.oid;
}

/* --- جلسات نقطة البيع: كل جلسة في البرنامج تقابلها جلسة في أودو --- */
async function odPricelist(cfgId){
  if(OD.pl[cfgId]===undefined){const r=await odx('pos.config','read',[[cfgId]],{fields:['pricelist_id']});OD.pl[cfgId]=(r[0]&&r[0].pricelist_id)?r[0].pricelist_id[0]:false}
  return OD.pl[cfgId];
}
async function odEnsureSession(s){
  const c=odCfg(),cfgId=+c.cfg[s.br];
  if(!cfgId)throw new Error('اربط الفرع «'+s.br+'» برقم إعداد نقطة البيع في أودو');
  if(s.osid){
    const r=await odx('pos.session','read',[[s.osid]],{fields:['state']});
    if(r[0]&&r[0].state==='opened')return{sess:s.osid,pl:await odPricelist(cfgId)};
    throw new Error('جلسة أودو رقم '+s.osid+' ليست مفتوحة (الحالة: '+(r[0]?r[0].state:'غير موجودة')+')');
  }
  const find=()=>odx('pos.session','search_read',[[['config_id','=',cfgId],['state','in',['opened','opening_control']]]],{fields:['id','state'],limit:1});
  let ss=await find();
  if(ss.length&&D.sessions.some(x=>x.osid===ss[0].id&&x.id!==s.id))throw new Error('جلسة أودو المفتوحة للفرع «'+s.br+'» تخص جلسة أخرى من البرنامج — ستُغلق أولًا ثم تُعاد المحاولة');
  if(!ss.length){try{await odx('pos.config','open_session_cb',[[cfgId]],{check_coa:false})}catch(e){}ss=await find()}
  if(!ss.length)throw new Error('تعذر فتح جلسة نقطة بيع في أودو للفرع «'+s.br+'»');
  if(ss[0].state==='opening_control'){try{await odx('pos.session','action_pos_session_open',[[ss[0].id]])}catch(e){}}
  s.osid=ss[0].id;save('sessions');
  return{sess:s.osid,pl:await odPricelist(cfgId)};
}
async function odCloseSession(s){
  if(!s.osid||s.oclosed)return;
  try{await odx('pos.session','action_pos_session_closing_control',[[s.osid]])}
  catch(e){try{await odx('pos.session','action_pos_session_validate',[[s.osid]])}catch(e2){throw new Error('تعذر إغلاق جلسة أودو: '+e.message)}}
  s.oclosed=true;save('sessions');
}
function odStatements(d){
  const c=odCfg(),pm=m=>{const v=+c.pm[m];if(!v)throw new Error('اربط طريقة الدفع «'+m+'» برقمها في أودو');return v};
  const iso=new Date(d.ts).toISOString().replace('T',' ').slice(0,19),st=[];
  if(d.type==='return'){st.push([0,0,{name:iso,payment_method_id:pm(d.method),amount:r2(d.total)}]);return{st,paid:r2(d.total),ret:0}}
  const total=r2(d.total),paid=r2(d.paid);
  if(d.method!=='أجل'){
    st.push([0,0,{name:iso,payment_method_id:pm(d.method),amount:paid}]);
    if(paid<total)st.push([0,0,{name:iso,payment_method_id:pm('أجل'),amount:r2(total-paid)}]);
    return{st,paid:r2(Math.max(paid,0)+(paid<total?total-paid:0)),ret:r2(Math.max(0,paid-total))};
  }
  if(paid>0)st.push([0,0,{name:iso,payment_method_id:pm('نقدي'),amount:paid}]);
  st.push([0,0,{name:iso,payment_method_id:pm('أجل'),amount:r2(total-paid)}]);
  return{st,paid:total,ret:0};
}
async function odPushSale(d){
  const ps=D.sessions.find(x=>x.id===d.session);if(!ps)throw new Error('جلسة الفاتورة غير موجودة');
  const sg=d.type==='return'?-1:1,{sess,pl}=await odEnsureSession(ps),{st,paid,ret}=odStatements(d);
  const lines=[];
  for(let i=0;i<d.lines.length;i++){
    const l=d.lines[i],p=PI.id[l.id];if(!p)throw new Error('المنتج «'+l.n+'» غير موجود محليًا');
    const oid=await odProd(p),sub=r2(l.price*l.qty*sg);
    const uf=l.uf||1,tf=(d.taxMode==='excl'&&l.tx!==false)?1+d.taxRate/100:1,subT=r2(sub*tf);
    lines.push([0,0,{qty:r3(l.qty*uf*sg),price_unit:r3(l.price*tf/uf),price_subtotal:subT,price_subtotal_incl:subT,discount:0,product_id:oid,tax_ids:[[6,false,[]]],id:i+1,pack_lot_ids:[]}]);
  }
  const cust=d.cust?await odPartner(cusById(d.cust),'cus','customers'):false;
  const uid=String(sess).padStart(5,'0')+'-001-'+String(d.no).padStart(4,'0');
  const order={id:uid,data:{name:'Order '+uid,amount_paid:paid,amount_total:r2(d.total),amount_tax:0,amount_return:ret,lines,statement_ids:st,pos_session_id:sess,pricelist_id:pl,
    partner_id:cust,user_id:OD.uid,uid,sequence_number:d.no,creation_date:new Date(d.ts).toISOString(),fiscal_position_id:false,server_id:false,to_invoice:false,employee_id:false},to_invoice:false};
  const r=await odx('pos.order','create_from_ui',[[order],false]);
  const first=Array.isArray(r)?r[0]:r,id=first&&typeof first==='object'?first.id:first;
  d.sy={s:'ok',id,at:nowStr()};
}
/* --- إرسال فاتورة مشتريات كأمر شراء مؤكد واستلام --- */
async function odPushPur(d){
  const c=odCfg(),s=supById(d.sup),pid=await odPartner(s,'sup','suppliers');
  const lines=[];
  for(const l of d.lines){const p=PI.id[l.id];if(!p)throw new Error('المنتج «'+l.n+'» غير موجود محليًا');lines.push([0,0,{product_id:await odProd(p),name:l.n,product_qty:r3(l.qty*(l.uf||1)),price_unit:r3(l.cost/(l.uf||1)),date_planned:d.date+' 12:00:00'}])}
  const vals={partner_id:pid,order_line:lines,date_order:d.date+' 12:00:00',origin:'RMT #'+d.id};
  const pt=+c.pick[d.br];if(pt)vals.picking_type_id=pt;
  const poId=await odx('purchase.order','create',[vals]);
  await odx('purchase.order','button_confirm',[[poId]]);
  let note='';
  try{
    const pk=await odx('stock.picking','search_read',[[['purchase_id','=',poId]]],{fields:['id']});
    for(const k of pk){
      try{await odx('stock.picking','action_set_quantities_to_reservation',[[k.id]])}catch(e){}
      await odx('stock.picking','button_validate',[[k.id]],{context:{skip_immediate:true,skip_backorder:true}});
    }
  }catch(e){note='أُنشئ أمر الشراء ولم يُؤكَّد الاستلام في أودو: '+e.message}
  d.sy={s:'ok',id:poId,at:nowStr(),note};
}
/* --- سحب البيانات الأساسية من أودو --- */
const OTYPE={product:'منتج قابل للتخزين',consu:'مستهلك',service:'خدمة'};
async function odPullProducts(){
  const F=['id','name','barcode','default_code','list_price','standard_price','categ_id','pos_categ_id','uom_id','type'];
  const byOid={};D.products.forEach(p=>{if(p.oid)byOid[p.oid]=p});
  let off=0,add=0,upd=0;
  for(;;){
    const r=await odx('product.product','search_read',[[['active','=',true],['sale_ok','=',true]]],{fields:F,limit:500,offset:off,order:'id'});
    r.forEach(o=>{
      const rec={name:o.name||'',bc:o.barcode||'',ref:o.default_code||'',price:o.list_price,cost:o.standard_price,cat:o.categ_id?String(o.categ_id[1]):'',pcat:o.pos_categ_id?String(o.pos_categ_id[1]):'',unit:o.uom_id?String(o.uom_id[1]):'',type:OTYPE[o.type]||o.type||''};
      let p=byOid[o.id]||(rec.bc&&PI.bc[rec.bc]&&PI.bc[rec.bc][0])||(rec.ref&&PI.ref[rec.ref.toLowerCase()]&&PI.ref[rec.ref.toLowerCase()][0]);
      if(!p){p=Object.assign({id:'odoo.'+o.id,oid:o.id},rec);D.products.push(p);byOid[o.id]=p;add++;return}
      let ch=false;if(p.oid!==o.id){p.oid=o.id;ch=true}
      Object.keys(rec).forEach(k=>{if(rec[k]!==''&&p[k]!==rec[k]){p[k]=rec[k];ch=true}});
      if(ch)upd++;
    });
    if(r.length<500)break;off+=500;
  }
  reindex();save('products');return{add,upd};
}
async function odPullPartners(kind){
  const coll=kind==='sup'?'suppliers':'customers',list=D[coll],rank=kind==='sup'?'supplier_rank':'customer_rank';
  const r=await odx('res.partner','search_read',[[[rank,'>',0],['active','=',true]]],{fields:['id','name','phone','mobile','street'],limit:5000});
  let add=0;
  r.forEach(o=>{
    const name=norm(o.name),phone=norm(o.phone||o.mobile||'');if(!name)return;
    let x=list.find(y=>y.oid===o.id)||list.find(y=>nm(y.name)===nm(name));
    if(x){x.oid=o.id;if(!x.phone&&phone)x.phone=phone;return}
    list.push(kind==='sup'?{id:'S'+(++D.cnt.sup),name,phone,addr:norm(o.street||''),note:'',open:0,oid:o.id}:{id:'C'+(++D.cnt.cus),name,phone,addr:norm(o.street||''),note:'',open:0,oid:o.id});add++;
  });
  save(coll,'cnt');return add;
}
/* --- المزامنة الكاملة --- */
async function odSync(mode){
  if(OD.busy||!odReady())return null;
  OD.busy=true;const c=odCfg(),rep={sales:0,pur:0,closed:0,err:0,net:false,pull:null,errs:[]};
  try{
    if(mode!=='pull'){
      const bySes={};D.sales.filter(d=>!d.sy||d.sy.s!=='ok').forEach(d=>{(bySes[d.session]=bySes[d.session]||[]).push(d)});
      const ids=new Set(Object.keys(bySes).map(Number));D.sessions.forEach(x=>{if(x.status==='closed'&&x.osid&&!x.oclosed)ids.add(x.id)});
      outer:for(const sid of [...ids].sort((a,b)=>a-b)){
        const ses=D.sessions.find(x=>x.id===sid);let failed=false;
        for(const d of (bySes[sid]||[]).sort((a,b)=>a.ts-b.ts)){
          try{await odPushSale(d);rep.sales++}
          catch(e){if(isNet(e)){rep.net=true;break outer}d.sy={s:'er',err:e.message,at:nowStr()};failed=true;rep.err++;if(rep.errs.length<3)rep.errs.push('فاتورة '+pno(d.no)+': '+e.message)}
        }
        if(!failed&&ses&&ses.status==='closed'&&ses.osid&&!ses.oclosed){
          try{await odCloseSession(ses);rep.closed++}
          catch(e){if(isNet(e)){rep.net=true;break outer}rep.err++;if(rep.errs.length<3)rep.errs.push('جلسة '+ses.id+': '+e.message)}
        }
      }
      save('sales');
      if(!rep.net){
        for(const d of D.purchases.filter(x=>x.status==='received'&&(!x.sy||x.sy.s!=='ok')).sort((a,b)=>a.id-b.id)){
          try{await odPushPur(d);rep.pur++}
          catch(e){if(isNet(e)){rep.net=true;break}d.sy={s:'er',err:e.message,at:nowStr()};rep.err++;if(rep.errs.length<3)rep.errs.push('مشتريات '+d.id+': '+e.message)}
        }
        save('purchases');
      }
    }
    if(mode!=='push'&&!rep.net){
      try{const p=await odPullProducts(),cu=await odPullPartners('cus'),su=await odPullPartners('sup');rep.pull={p,cu,su}}
      catch(e){if(isNet(e))rep.net=true;else rep.errs.push('سحب البيانات: '+e.message)}
    }
    c.lastTs=Date.now();c.last=nowStr();
    OD.down=rep.net;
    c.msg=rep.net?'لا يوجد اتصال بأودو حاليًا — ستُعاد المحاولة تلقائيًا':`أُرسل ${rep.sales} فاتورة بيع (وأُغلقت ${rep.closed} جلسة في أودو) و${rep.pur} فاتورة مشتريات`+(rep.err?` — أخطاء: ${rep.err}`:'')+(rep.pull?` — منتجات: +${rep.pull.p.add} / عُدّل ${rep.pull.p.upd}، عملاء +${rep.pull.cu}، موردون +${rep.pull.su}`:'');
    if(rep.errs.length)c.msg+=' | '+rep.errs.join(' | ');
  }catch(e){c.msg='فشلت المزامنة: '+e.message;rep.errs.push(e.message)}
  finally{OD.busy=false;save('set')}
  if(LAST&&LAST.v==='odoo')V.odoo();
  return rep;
}
/* تُستدعى كل دقيقة: إرسال المعلّق إن وُجد، وسحب البيانات الأساسية كل N دقيقة */
function odTick(){
  if(!odReady()||OD.busy)return;
  const c=odCfg(),p=odPending(),due=!c.lastTs||OD.down||Date.now()-c.lastTs>=Math.max(1,c.every)*60000;
  if(due)odSync('all');else if(p.sales+p.pur>0&&Date.now()-(OD.lastPush||0)>=60000){OD.lastPush=Date.now();odSync('push')}
}

/* --- شاشة الإعدادات --- */
V.odoo=()=>{
  if(!can('sys_odoo')){say('ليس لديك صلاحية الربط مع أودو',1);return go('home')}
  const c=odCfg(),p=odPending();
  setMain(`<div class="ttl">الربط مع أودو (Odoo 15)</div>
  <div class="card"><div class="g2">
   <div><div class="lbl">عنوان الخادم (مثال: https://erp.example.com)</div><input id="od_url" value="${esc(c.url)}" placeholder="https://..."></div>
   <div><div class="lbl">اسم قاعدة البيانات</div><input id="od_db" value="${esc(c.db)}"></div>
   <div><div class="lbl">المستخدم (البريد)</div><input id="od_user" value="${esc(c.user)}"></div>
   <div><div class="lbl">مفتاح API أو كلمة المرور</div><input id="od_key" type="password" value="${esc(c.key)}"></div>
   <div><div class="lbl">مزامنة دورية كل (دقيقة)</div><input id="od_every" type="number" min="1" value="${c.every||15}"></div>
   <div><div class="lbl">التفعيل</div><label><input type="checkbox" id="od_on"${c.on?' checked':''}> تفعيل الربط والمزامنة التلقائية</label></div></div></div>
  <div class="card"><div class="ttl">ربط الفروع (أرقام من أودو)</div><div class="mut">رقم إعداد نقطة البيع (pos.config) لفواتير البيع، ورقم نوع العملية للاستلام (stock.picking.type) لفواتير المشتريات.</div>
   ${tbl(['الفرع','رقم إعداد نقطة البيع','رقم نوع استلام المشتريات'],BR.map((b,i)=>`<tr><td class="l">${esc(b)}</td><td><input inputmode="numeric" id="od_cfg${i}" value="${esc(c.cfg[b]||'')}"></td><td><input inputmode="numeric" id="od_pk${i}" value="${esc(c.pick[b]||'')}"></td></tr>`).join(''))}</div>
  <div class="card"><div class="ttl">ربط طرق الدفع (رقم طريقة الدفع pos.payment.method في أودو)</div>
   <div class="row">${METHODS.map((m,i)=>`<div style="flex:1 1 150px"><div class="lbl">${m}</div><input inputmode="numeric" id="od_pm${i}" value="${esc(c.pm[m]||'')}"></div>`).join('')}</div>
   <div class="mut" style="margin-top:6px">«أجل» يحتاج طريقة دفع من نوع حساب العميل في أودو.</div></div>
  <div class="row"><button class="p" data-a="odSave">💾 حفظ الإعدادات</button><button data-a="odTest">🔌 اختبار الاتصال</button><button data-a="odDisc">🔎 عرض أرقام الإعدادات من أودو</button></div>
  <div class="card" style="margin-top:12px"><div class="ttl">حالة المزامنة</div>
   <div>فواتير بيع لم تتزامن: <b>${p.sales}</b> — فواتير مشتريات لم تتزامن: <b>${p.pur}</b></div>
   <div class="mut">آخر مزامنة: ${esc(c.last||'—')}</div><div class="${/فشل|خطأ|أخطاء/.test(c.msg||'')?'err':'mut'}">${esc(c.msg||'')}</div>
   <div class="row" style="margin-top:8px"><button class="p" data-a="odNow" data-m="all">🔄 مزامنة الآن (إرسال + سحب)</button><button data-a="odNow" data-m="push">⬆️ إرسال الفواتير المعلّقة</button><button data-a="odNow" data-m="pull">⬇️ تحديث المنتجات والأسعار والعملاء والموردين</button></div></div>`);
};
function odRead(){
  const c=odCfg(),g=id=>norm($(id).value);
  c.url=g('od_url');c.db=g('od_db');c.user=g('od_user');c.key=$('od_key').value;c.every=Math.max(1,parseInt(g('od_every'),10)||15);c.on=$('od_on').checked;
  BR.forEach((b,i)=>{c.cfg[b]=g('od_cfg'+i);c.pick[b]=g('od_pk'+i)});METHODS.forEach((m,i)=>{c.pm[m]=g('od_pm'+i)});OD.uid=null;
}
A.odSave=()=>{odRead();save('set');say('تم حفظ إعدادات الربط')};
A.odTest=async()=>{
  odRead();save('set');const c=odCfg();
  try{
    const v=await odRaw('common','version',[]);await odLogin();
    say('نجح الاتصال — أودو '+(v.server_version||'')+' (المستخدم رقم '+OD.uid+')');
  }catch(e){say('فشل الاتصال: '+e.message,1)}
};
A.odDisc=async()=>{
  odRead();save('set');
  try{
    const cf=await odx('pos.config','search_read',[[]],{fields:['id','name'],limit:100});
    const pm=await odx('pos.payment.method','search_read',[[]],{fields:['id','name'],limit:100});
    const pt=await odx('stock.picking.type','search_read',[[['code','=','incoming']]],{fields:['id','name','warehouse_id'],limit:100});
    openModal(`<div class="card"><div class="ttl">أرقام من أودو</div><b>نقاط البيع (pos.config)</b>${tbl(['الرقم','الاسم'],cf.map(x=>`<tr><td>${x.id}</td><td class="l">${esc(x.name)}</td></tr>`).join(''))}
    <b>طرق الدفع</b>${tbl(['الرقم','الاسم'],pm.map(x=>`<tr><td>${x.id}</td><td class="l">${esc(x.name)}</td></tr>`).join(''))}
    <b>أنواع الاستلام</b>${tbl(['الرقم','الاسم'],pt.map(x=>`<tr><td>${x.id}</td><td class="l">${esc((x.warehouse_id?x.warehouse_id[1]+': ':'')+x.name)}</td></tr>`).join(''))}
    <button class="p" style="width:100%;margin-top:10px" data-a="closeMd">إغلاق</button></div>`);
  }catch(e){say('تعذر الجلب: '+e.message,1)}
};
A.odNow=async t=>{
  odRead();save('set');
  if(!odReady()){say('فعّل الربط واملأ بيانات الاتصال أولًا (ويعمل في نسخة ويندوز)',1);return}
  say('جاري المزامنة…');const r=await odSync(t.dataset.m);if(r)say(odCfg().msg,!!r.errs.length||r.net);
};
