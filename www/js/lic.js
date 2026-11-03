/* ===== الترخيص والتفعيل ===== */
const DAY=86400000,TRIAL_DAYS=7,CONTACT='01003057942';
let LIC=null,MID='DEV-0000-0000';
const BSEC=['k7Q2','-rmt-','bind-','93xZ'].join('');
/* كود مرتبط برقم الجهاز: التاريخ + 6 أرقام مشتقة من رقم الجهاز والتاريخ (يصلح على هذا الجهاز في هذا اليوم فقط) */
const boundCode=(mid,d8)=>d8+String(parseInt(H('bind|'+mid+'|'+d8+'|'+BSEC).slice(0,10),16)%1000000).padStart(6,'0');
const adminName=()=>D.set.adminName||'admin';
const licSig=r=>H('lic-7f3a|'+[r.start,r.extra,r.rc,r.type,r.until,r.seen,r.mid].join('|'));
function licMake(o){const r=Object.assign({start:Date.now(),extra:0,rc:0,type:'trial',until:0,seen:Date.now(),mid:MID},o);r.sig=licSig(r);return r}
function licSave(){
  LIC.sig=licSig(LIC);const t=JSON.stringify(LIC);
  if(api&&api.licSave)api.licSave(t).catch(()=>{});
  else{try{localStorage.setItem('rmt_lic',t)}catch(e){}}
}
/* الترخيص محفوظ خارج قاعدة البيانات، فلا يتأثر بحذف البيانات أو استرجاع نسخة احتياطية */
async function licInit(){
  if(api&&api.machineId){try{MID=await api.machineId()}catch(e){}}
  let raws=[];
  if(api&&api.licLoad)raws=(await api.licLoad())||[];
  else{try{const v=localStorage.getItem('rmt_lic');if(v)raws=[v]}catch(e){}}
  raws=raws.filter(Boolean);
  const ok=raws.map(t=>{try{const r=JSON.parse(t);return(r.sig===licSig(r)&&r.mid===MID)?r:null}catch(e){return null}}).filter(Boolean);
  if(ok.length)LIC=ok.sort((a,b)=>b.seen-a.seen)[0];
  else if(raws.length)LIC=licMake({start:0,type:'trial'});   // تم العبث بالملف: مقفول حتى التفعيل
  else LIC=licMake({});
  licSave();
}
const licNow=()=>Math.max(Date.now(),LIC.seen);
function licTick(force){
  const n=Date.now();
  if(n-LIC.seen>5*60000||force){if(n>LIC.seen)LIC.seen=n;licSave()}
}
function licStatus(){
  const now=licNow(),L=LIC;
  if(L.type==='life')return{ok:true,type:'life',left:Infinity};
  if(L.type==='year'){const left=L.until-now;return{ok:left>0,type:'year',left,end:L.until}}
  const end=L.start+(TRIAL_DAYS+7*L.extra)*DAY,left=end-now;
  return{ok:left>0,type:'trial',left,end};
}
const licDays=ms=>Math.max(0,Math.ceil(ms/DAY));
const licTxt=()=>{
  const s=licStatus();
  if(s.type==='life')return'مفعّل مدى الحياة';
  if(s.type==='year')return s.ok?`مفعّل لمدة سنة — ينتهي ${new Date(s.end).toLocaleDateString('ar-EG')} (متبقي ${licDays(s.left)} يوم)`:'انتهى الاشتراك السنوي — يلزم التجديد';
  return s.ok?`فترة تجريبية — متبقي ${licDays(s.left)} يوم`:'انتهت الفترة التجريبية — يلزم التفعيل';
};
function licBanner(){
  const el=$('lic');if(!el)return;
  const s=licStatus();let t='';
  if(ME){
    if(!s.ok)t=`⛔ ${licTxt()} — للتواصل: ${CONTACT}`;
    else if(s.type==='trial')t=`⏳ نسخة تجريبية — متبقي ${licDays(s.left)} يوم — للتفعيل تواصل: ${CONTACT}`;
    else if(s.type==='year'&&s.left<=30*DAY)t=`⚠️ ينتهي اشتراكك بعد ${licDays(s.left)} يوم — للتجديد تواصل: ${CONTACT}`;
  }
  el.textContent=t;el.hidden=!t;
}
/* --- نافذة التفعيل (للعميل: بكود التفعيل) --- */
function actPanel(msg){
  openModal(`<div class="card"><div class="ttl">تفعيل البرنامج</div>${msg?`<div class="err pre" style="margin-bottom:8px">${esc(msg)}</div>`:''}
  <div class="mut" style="margin-bottom:6px">للحصول على كود التفعيل تواصل: <b>${CONTACT}</b></div>
  <div class="mut" style="margin-bottom:10px">رقم هذا الجهاز (أرسله عند طلب الكود): <b style="direction:ltr;display:inline-block">${esc(MID)}</b></div>
  <div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
   <button class="p" data-a="actKind" data-k="year">تفعيل لمدة سنة</button>
   <button class="p" data-a="actKind" data-k="life">تفعيل مدى الحياة</button>
   <button data-a="actKind" data-k="trial">تجديد تجربة أسبوع</button>
   <button data-a="closeMd">إغلاق</button></div></div>`);
}
const KH=()=>({year:YEAR_H,life:LIFE_H,trial:TRIAL_H});
const KL={year:'تفعيل لمدة سنة',life:'تفعيل مدى الحياة',trial:'تجديد تجربة أسبوع'};
/* كود التفعيل المولّد: اليوم(2)+الشهر(2)+السنة(4)+الجزء الثابت — صالح في يوم إصداره فقط */
function genOk(code){
  const c=norm(dg(code)),m=/^(\d{2})(\d{2})(\d{4})(\d{6})$/.exec(c);if(!m)return false;
  const d=new Date(),y=d.getFullYear();
  if(+m[3]<2026||+m[3]>2099)return false;
  if(+m[1]!==d.getDate()||+m[2]!==d.getMonth()+1||+m[3]!==y)return false;
  if(H('sfx|'+m[4])===SFX_H)return true;                       // الشفرة العامة
  return c===boundCode(MID,c.slice(0,8));                      // الشفرة المرتبطة برقم الجهاز
}
A.actKind=async t=>{
  const k=t.dataset.k;closeModal();
  if(k==='trial'){
    if(LIC.type!=='trial'){say('تجديد التجربة غير متاح لهذا الترخيص',1);return}
    if(LIC.rc>=2){say('تم استخدام تجديد التجربة مرتين، لا يمكن تجديدها مرة أخرى',1);return}
  }
  const c=await dlg(KL[k]+'\nللحصول على كود التفعيل تواصل: '+CONTACT,{input:true,type:'password',ph:'كود التفعيل',yes:'تفعيل'});
  if(c===null)return;
  if(!genOk(c)&&H(k+'|'+norm(dg(c)))!==KH()[k]){say('كود التفعيل غير صحيح',1);return}
  licApply(k,false);
};
function licApply(k,owner){
  if(k==='trial'){LIC.extra++;if(!owner)LIC.rc++}
  else if(k==='year'){const base=Math.max(licNow(),LIC.type==='year'?LIC.until:0);LIC.type='year';LIC.until=base+365*DAY}
  else{LIC.type='life'}
  LIC.seen=Math.max(LIC.seen,Date.now());licSave();licBanner();
  say('تم التفعيل بنجاح — '+licTxt());
  if(LAST&&LAST.v==='settings')V.settings();
}
/* --- التفعيل عبر حساب المالك: كود إضافي ثم الخيارات ثم كلمة المرور مرة أخرى --- */
A.licOwner=async()=>{
  if(!ME||!ME.owner){actPanel();return}
  const c=await dlg('أدخل الكود الإضافي للمتابعة',{input:true,type:'password',ph:'الكود'});
  if(c===null)return;
  if(H('act|'+norm(dg(c)))!==ACT_H){say('الكود غير صحيح',1);return}
  openModal(`<div class="card"><div class="ttl">تفعيل البرنامج</div><div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
   <button data-a="ownAct" data-k="trial">تجديد أسبوع تجربة</button><button class="p" data-a="ownAct" data-k="year">تجديد لمدة عام</button><button class="p" data-a="ownAct" data-k="life">تجديد مدى الحياة</button><button data-a="closeMd">إغلاق</button></div></div>`);
};
A.ownAct=async t=>{
  const k=t.dataset.k;closeModal();
  const p=await dlg('أدخل كلمة المرور مرة أخرى للتأكيد',{input:true,type:'password',ph:'كلمة المرور'});
  if(p===null)return;
  if(H('owner|'+norm(dg(p)))!==OWNER_H){say('كلمة المرور غير صحيحة',1);return}
  licApply(k,true);
};
A.actPanel0=()=>actPanel();
