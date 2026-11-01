/* ===== أدوات أساسية ===== */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s==null?'':s).trim();
const cell=v=>typeof v==='number'?String(v):norm(v);
const dg=s=>String(s==null?'':s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const nm=t=>norm(t).replace(/[أإآ]/g,'ا').replace(/\s+/g,' ').toLowerCase();
function sha256(s){
  const K=[],Hh=[];(function(){let n=2,c=0;while(c<64){let p=true;for(let i=2;i*i<=n;i++)if(n%i===0){p=false;break}if(p){if(c<8)Hh[c]=(Math.pow(n,.5)%1*4294967296)|0;K[c]=(Math.pow(n,1/3)%1*4294967296)|0;c++}n++}})();
  const m=unescape(encodeURIComponent(s)),l=m.length,w=new Array((((l+8)>>6)+1)*16).fill(0);
  for(let i=0;i<l;i++)w[i>>2]|=m.charCodeAt(i)<<(24-(i%4)*8);
  w[l>>2]|=0x80<<(24-(l%4)*8);w[(((l+8)>>6)+1)*16-1]=l*8;
  const h=Hh.slice(0),r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let i=0;i<w.length;i+=16){
    const t=w.slice(i,i+16),a=h.slice(0);
    for(let j=0;j<64;j++){
      if(j>=16){const x=t[j-15],y=t[j-2];t[j]=(t[j-16]+(r(x,7)^r(x,18)^(x>>>3))+t[j-7]+(r(y,17)^r(y,19)^(y>>>10)))|0}
      const T1=(a[7]+(r(a[4],6)^r(a[4],11)^r(a[4],25))+((a[4]&a[5])^(~a[4]&a[6]))+K[j]+t[j])|0;
      const T2=((r(a[0],2)^r(a[0],13)^r(a[0],22))+((a[0]&a[1])^(a[0]&a[2])^(a[1]&a[2])))|0;
      a.pop();a.unshift((T1+T2)|0);a[4]=(a[4]+T1)|0;
    }
    for(let j=0;j<8;j++)h[j]=(h[j]+a[j])|0;
  }
  return h.map(x=>('00000000'+(x>>>0).toString(16)).slice(-8)).join('');
}
const H=s=>sha256('aswaq-badr|'+s);
const OWNER_H='b7a951ceb193ade6515588f213e61ca76226e7280cd595f581f442f9d084eeb9',CODE_H='3e6ada63eb2f92b96a84cd242fe68a28ef8e955200bddd1eb3396356e9e8432f',ADMIN_H0='20636d9b6b00ae3add017aa5ed88deda0f7ec6ea12c5efe0f366718ac418b8a0';
const r2=n=>Math.round((+n||0)*100)/100;
const r3=n=>Math.round((+n||0)*1000)/1000;
const fmt=n=>String(r3(n));
const money=n=>r2(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=s=>{const v=parseFloat(dg(s).replace(/,/g,'').replace('٫','.'));return isNaN(v)?NaN:v};
const p2=n=>String(n).padStart(2,'0');
const dayStr=(d=new Date())=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const nowStr=(d=new Date())=>`${d.getFullYear()}/${p2(d.getMonth()+1)}/${p2(d.getDate())}  ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const pno=n=>String(n).padStart(5,'0');
const diffTxt=d=>d>0?`+${money(d)} زيادة`:d<0?`${money(d)} عجز`:'مطابق';
const tbl=(h,rows,cls)=>`<div class="tw"><table class="${cls||''}"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;

const BR=['شارع الإسكندرية','فرع المساكن','المخازن الرئيسية','جراند هيلز'];
const POSN=['صباحي 1','صباحي 2','مسائي 1','مسائي 2'];
const METHODS=['نقدي','فيزا','فودافون كاش','أجل','أخرى'];

function say(m,err){const t=$('toast');if(!t)return;t.textContent=m;t.className=err?'show err':'show';clearTimeout(say._t);say._t=setTimeout(()=>{t.className=''},err?7000:3500)}

/* ===== نوافذ ===== */
function openModal(h){$('mb').innerHTML=h;$('md').hidden=false}
function closeModal(){$('md').hidden=true;$('mb').innerHTML=''}
function dlg(text,o){
  o=Object.assign({input:false,type:'text',ph:'',yes:'تأكيد',no:'إلغاء',val:''},o||{});
  return new Promise(res=>{
    openModal(`<div class="card"><div class="pre">${esc(text)}</div>${o.input?`<input id="dlgIn" type="${o.type}" placeholder="${esc(o.ph)}" value="${esc(o.val)}" style="margin-top:8px">`:''}<div class="row" style="margin-top:12px"><button class="f p" id="dlgY">${esc(o.yes)}</button>${o.no?`<button class="f" id="dlgN">${esc(o.no)}</button>`:''}</div></div>`);
    const inp=$('dlgIn');if(inp){inp.focus();inp.onkeydown=e=>{if(e.key==='Enter')$('dlgY').click()}}
    $('dlgY').onclick=()=>{const v=inp?inp.value:true;closeModal();res(v)};
    if($('dlgN'))$('dlgN').onclick=()=>{closeModal();res(inp?null:false)};
  });
}
async function askCode(txt){
  const p=await dlg(txt||'أدخل الرمز الإضافي للمتابعة',{input:true,type:'password',ph:'الرمز'});
  if(p===null)return false;
  if(H('code|'+norm(dg(p)))!==CODE_H){say('الرمز غير صحيح',1);return false}
  return true;
}
/* نموذج متعدد الحقول: fields=[{k,l,t:text|number|date|select|area,v,o:[]}] */
function formDlg(title,fields,ok){
  return new Promise(res=>{
    const f=fields.map(x=>{
      const id='fd_'+x.k,v=x.v==null?'':x.v;
      let el;
      if(x.t==='select')el=`<select id="${id}">${(x.o||[]).map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
      else if(x.t==='area')el=`<textarea id="${id}" rows="2">${esc(v)}</textarea>`;
      else el=`<input id="${id}" type="${x.t||'text'}" value="${esc(v)}">`;
      return `<div class="lbl">${esc(x.l)}</div>${el}`;
    }).join('');
    openModal(`<div class="card"><div class="ttl">${esc(title)}</div>${f}<div class="row" style="margin-top:12px"><button class="f p" id="fdY">${esc(ok||'حفظ')}</button><button class="f" id="fdN">إلغاء</button></div></div>`);
    const first=$('fd_'+fields[0].k);if(first)first.focus();
    $('fdY').onclick=()=>{const o={};fields.forEach(x=>o[x.k]=$('fd_'+x.k).value);closeModal();res(o)};
    $('fdN').onclick=()=>{closeModal();res(null)};
  });
}

/* ===== تفويض الأحداث ===== */
const A={},I={},C={},K={};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&A[t.dataset.a])A[t.dataset.a](t,e)});
document.addEventListener('input',e=>{const t=e.target.closest('[data-i]');if(t&&I[t.dataset.i])I[t.dataset.i](t,e)});
document.addEventListener('change',e=>{const t=e.target.closest('[data-c]');if(t&&C[t.dataset.c])C[t.dataset.c](t,e)});
document.addEventListener('keydown',e=>{const t=e.target.closest('[data-k]');if(t&&K[t.dataset.k])K[t.dataset.k](t,e)});

/* ===== قاعدة البيانات (ملفات JSON عبر Electron) ===== */
const D={products:[],stock:{},sales:[],sessions:[],cash:[],purchases:[],suppliers:[],payments:[],transfers:[],employees:[],customers:[],cpay:[],held:[],
  cnt:{sale:0,pur:0,ses:0,tr:0,pay:0,cash:0,prod:0,sup:0,emp:0,cus:0,cpay:0,ord:0},set:{}};
const api=(typeof window!=='undefined'&&window.winApi)?window.winApi:null;
async function dbSet(k,v){
  if(api&&api.dbSave)return api.dbSave(k,v);
  try{localStorage.setItem('db_'+k,JSON.stringify(v))}catch(e){}
}
async function dbLoad(){
  let all={};
  if(api&&api.dbLoad)all=(await api.dbLoad())||{};
  else Object.keys(D).forEach(k=>{try{const v=localStorage.getItem('db_'+k);if(v)all[k]=JSON.parse(v)}catch(e){}});
  Object.keys(D).forEach(k=>{if(all[k]!==undefined&&all[k]!==null)D[k]=all[k]});
  D.cnt=Object.assign({sale:0,pur:0,ses:0,tr:0,pay:0,cash:0,prod:0,sup:0,emp:0,cus:0,cpay:0,ord:0},D.cnt);
}
const _dirty={};let _tmr=null;
function save(){for(let i=0;i<arguments.length;i++)_dirty[arguments[i]]=1;clearTimeout(_tmr);_tmr=setTimeout(flush,400)}
async function flush(){
  clearTimeout(_tmr);const ks=Object.keys(_dirty);
  for(const k of ks){delete _dirty[k];try{await dbSet(k,D[k])}catch(e){say('تعذر حفظ البيانات: '+k,1)}}
}
if(api&&api.onFlush)api.onFlush(flush);

/* ===== حفظ ملفات Excel على سطح المكتب ===== */
async function saveX(folder,name,wb){
  if(api&&api.saveFile){
    try{return await api.saveFile({folder,name,b64:XLSX.write(wb,{bookType:'xlsx',type:'base64'})})}
    catch(e){say('تعذر حفظ ملف '+name+' (هل هو مفتوح في Excel؟ أغلقه وسيُحدَّث لاحقًا)',1);return null}
  }
  try{
    const blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/octet-stream'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();return name;
  }catch(e){return null}
}
function wbOf(sheets){const wb=XLSX.utils.book_new();sheets.forEach(s=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s[1]),s[0]));return wb}
async function readRows(file){
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''});
}
/* تحديد أعمدة الشيت من عناوينها: spec=[[key,regex],...] بالترتيب */
function mapCols(h,spec){
  const o={};
  h.forEach((c,i)=>{const t=norm(c).toLowerCase();for(const s of spec){if(o[s[0]]===undefined&&s[1].test(t)){o[s[0]]=i;break}}});
  return o;
}
function setMain(h,cls){const m=$('main');m.className=cls||'';m.innerHTML=h;m.scrollTop=0}
