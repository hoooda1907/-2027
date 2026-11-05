/* ===== المستخدم والصلاحيات ===== */
let ME=null;
const can=p=>!!ME&&!!(ME.owner||ME.admin||(ME.perms&&(ME.perms.sys_admin||ME.perms[p])));

/* ===== فهرس المنتجات ===== */
let PI={id:{},bc:{},bz:{},pre:{},ref:{},ubc:{},s:{},cats:[],pcats:[]};
function reindex(){
  PI={id:{},bc:{},bz:{},pre:{},ref:{},ubc:{},s:{},cats:[],pcats:[]};
  const cs={},ps={};
  D.products.forEach(p=>{
    PI.id[p.id]=p;PI.s[p.id]=(p.name+' '+p.bc+' '+p.ref).toLowerCase();
    if(p.bc){
      (PI.bc[p.bc]=PI.bc[p.bc]||[]).push(p);
      const z=p.bc.replace(/^0+/,'');(PI.bz[z]=PI.bz[z]||[]).push(p);
      if(/^2\d{12}$/.test(p.bc)||/^2\d{6}$/.test(p.bc)){const k=p.bc.slice(0,7);(PI.pre[k]=PI.pre[k]||[]).push(p)}
    }
    if(p.ref){const r=p.ref.toLowerCase();(PI.ref[r]=PI.ref[r]||[]).push(p)}
    (p.uoms||[]).forEach(x=>{if(x.bc)(PI.ubc[x.bc]=PI.ubc[x.bc]||[]).push({p,u:x.u})});
    if(p.cat)cs[p.cat]=1;if(p.pcat)ps[p.pcat]=1;
  });
  ((D.set.cats||{}).cat||[]).forEach(c=>{cs[c]=1});((D.set.cats||{}).pcat||[]).forEach(c=>{ps[c]=1});
  PI.cats=Object.keys(cs).sort();PI.pcats=Object.keys(ps).sort();
}
/* باركود الميزان: 13 رقم يبدأ بـ 2، أول 7 أرقام = كود الصنف، 5 أرقام = الوزن بالجرام */
function scale(code){const c=cell(code);return /^2\d{12}$/.test(c)?{pre:c.slice(0,7),g:parseInt(c.slice(7,12),10)}:null}
function find(code){
  code=cell(code);if(!code)return[];
  let m=PI.bc[code]||PI.bz[code.replace(/^0+/,'')]||PI.ref[code.toLowerCase()];
  if(m)return m.slice();
  const s=scale(code);
  if(s&&PI.pre[s.pre]){
    m=PI.pre[s.pre].slice();
    if(m.length>1){const k=m.filter(p=>/كج|kg|كيلو/i.test(p.unit));if(k.length)m=k}
    return m;
  }
  return [];
}
function scaleQty(code,p){const s=scale(code);return(s&&p.bc!==cell(code)&&s.g>0)?s.g/1000:0}
/* بحث بالباركود مع دعم باركود وحدات القياس المتعددة: يُرجع [{p,u}] حيث u اسم الوحدة أو null للوحدة الأساسية */
function findU(code){
  code=cell(code);if(!code)return[];
  const u=PI.ubc[code];if(u)return u.map(x=>({p:x.p,u:x.u}));
  return find(code).map(p=>({p,u:null}));
}
const uomDef=n=>D.uoms.find(x=>x.name===n);
/* معلومات وحدة: f = عدد الوحدات الأساسية في هذه الوحدة، price = سعر الوحدة */
function unitInfo(p,uname){
  if(!uname)return{u:'',f:1,price:null};
  const l=(p.uoms||[]).find(x=>x.u===uname),d=uomDef(uname),f=d?d.ratio:1;
  const pr=l&&l.price!==''&&l.price!=null?+l.price:r2(pPrice(p)*f);
  return{u:uname,f,price:pr};
}
const prodUnits=p=>[''].concat((p.uoms||[]).map(x=>x.u));
const uomText=(d,base)=>d.type==='bigger'?`1 ${d.name} = ${fmt(d.ratio)} ${base||'وحدة أساسية'}`:d.type==='smaller'?`1 ${base||'وحدة أساسية'} = ${fmt(r3(1/d.ratio))} ${d.name}`:`${d.name} = ${base||'الأساسية'}`;
function search(q,limit){
  const w=norm(q).toLowerCase().split(/\s+/).filter(Boolean);if(!w.length)return[];
  const out=[];
  for(let i=0;i<D.products.length&&out.length<limit;i++){
    const p=D.products[i],s=PI.s[p.id];let ok=true;
    for(let j=0;j<w.length;j++){if(s.indexOf(w[j])<0){ok=false;break}}
    if(ok)out.push(p);
  }
  return out;
}
const pPrice=p=>{const v=parseFloat(p.price);return isNaN(v)?0:v};
/* السعر الفعلي: سعر العرض لو العرض ساري، وإلا السعر العادي (ينتهي العرض تلقائيًا ويعود السعر) */
const offerBrOn=br=>{const m=D.set.offerBr||{};return br?m[br]!==false:BR.some(b=>m[b]!==false)};
function effPrice(p,br){const n=pPrice(p),o=p.offer;if(o&&offerBrOn(br)&&Date.now()>=o.start&&Date.now()<=o.end&&o.price<n)return{price:o.price,orig:n,offer:true};return{price:n,orig:n,offer:false}}
const savings=r=>r.type==='return'?0:r2(r.lines.reduce((s,l)=>s+Math.max(0,(l.orig||l.pre||l.price)-(l.pre||l.price))*l.qty,0));
/* منع البيع بأقل من التكلفة، إلا لمن لديه الصلاحية أو إذا فُعّل «السماح بالبيع بخسارة» في المنتج */
const lossBlocked=(p,price)=>{const c=pCost(p);return c>0&&price<c&&!(p.allowLoss||can('pos_sell_loss'))};
const pCost=p=>{const v=parseFloat(p.cost);return isNaN(v)?0:v};

/* ===== المخزون ===== */
const stk=(b,id)=>((D.stock[b]||{})[id])||0;
function addStk(b,id,d){D.stock[b]=D.stock[b]||{};D.stock[b][id]=r3((D.stock[b][id]||0)+d)}

/* ===== استيراد المنتجات (إضافة + مقارنة وتحديث) ===== */
const PSPEC=[['ubc',/uom price\/barcode/],['utype',/uom price\/type/],['uratio',/نسبة أكبر|factor_inv|bigger ratio/],['uname',/uom price\/unit of measure/],['uprice',/uom price\/price/],['uid',/uom price\/id/],['qty',/الكمية في اليد|on hand|qty_available/],['pcat',/نقطة|pos/],['cat',/فئة|categ/],['type',/نوع|type/],['ref',/مرجع|reference|default_code/],['bc',/باركود|barcode/],['ext',/معرف|external|^id$/],['cost',/تكلف|cost/],['price',/سعر|price/],['unit',/وحدة|unit|uom/],['name',/اسم|name|المنتج|product/]];
function addUom(p,g){
  const name=cell(g('uname'));if(!name)return 0;
  const t=cell(g('utype')).toLowerCase(),ratio=parseFloat(g('uratio'));
  const type=t==='bigger'?'bigger':t==='smaller'?'smaller':'equal',r=(isNaN(ratio)||ratio<=0)?1:ratio;
  let d=uomDef(name);if(d){d.type=type;d.ratio=r}else D.uoms.push({name,type,ratio:r});
  p.uoms=p.uoms||[];
  const pr=g('uprice')===''?'':parseFloat(g('uprice')),bc=cell(g('ubc'));
  const e=p.uoms.find(x=>x.u===name);
  if(e){if(bc)e.bc=bc;if(pr!==''&&!isNaN(pr))e.price=pr}else p.uoms.push({u:name,bc,price:(pr===''||isNaN(pr))?'':pr});
  return 1;
}
function importProducts(rows){
  if(!rows.length)return null;
  const h=rows.shift(),col=mapCols(h,PSPEC);
  if(col.name===undefined||(col.bc===undefined&&col.ext===undefined))return{err:'لم أجد أعمدة الاسم والباركود في الشيت'};
  const g0=(r,k)=>col[k]===undefined?'':r[col[k]];
  let add=0,upd=0,same=0,uoms=0,last=null;const FIELDS=['bc','ref','name','cost','price','cat','pcat','type','unit'],qty={};
  rows.forEach(r=>{
    const g=k=>g0(r,k);
    const rec={bc:cell(g('bc')),ref:cell(g('ref')),name:cell(g('name')),cost:g('cost')===''?'':parseFloat(g('cost')),price:g('price')===''?'':parseFloat(g('price')),
      cat:cell(g('cat')),pcat:cell(g('pcat')),type:cell(g('type')),unit:cell(g('unit'))};
    const ext=cell(g('ext'));
    /* سطر تابع لمنتج سابق (تصدير أودو: وحدات إضافية في أسطر بدون اسم) */
    if(!rec.name&&!rec.bc&&!ext){if(last&&addUom(last,g))uoms++;return}
    if(rec.cost!==''&&isNaN(rec.cost))rec.cost='';if(rec.price!==''&&isNaN(rec.price))rec.price='';
    let p=ext?PI.id[ext]:null;
    if(!p&&!ext&&rec.bc&&PI.bc[rec.bc])p=PI.bc[rec.bc][0];
    if(!p){const id=ext||rec.bc||('P'+(++D.cnt.prod));p=Object.assign({id},rec);D.products.push(p);PI.id[id]=p;if(rec.bc)(PI.bc[rec.bc]=PI.bc[rec.bc]||[]).push(p);add++}
    else{let ch=false;FIELDS.forEach(f=>{if(rec[f]!==''&&p[f]!==rec[f]){p[f]=rec[f];ch=true}});if(ch)upd++;else same++}
    if(addUom(p,g))uoms++;
    const q=num(g('qty'));if(!isNaN(q))qty[p.id]=q;
    last=p;
  });
  reindex();save('products','cnt','uoms');return{add,upd,same,uoms,qty};
}
/* ===== الموردين ===== */
function importSuppliers(rows){
  if(!rows.length)return null;
  const h=rows[0].map(cell).join(' ');if(/اسم|name/i.test(h))rows.shift();
  const have={};D.suppliers.forEach(s=>have[nm(s.name)]=1);let add=0,skip=0;
  rows.forEach(r=>{const n=cell(r[0]);if(!n)return;if(have[nm(n)]){skip++;return}have[nm(n)]=1;
    D.suppliers.push({id:'S'+(++D.cnt.sup),name:n,phone:'',addr:'',note:'',open:0});add++});
  save('suppliers','cnt');return{add,skip};
}
/* ===== الموظفين ===== */
const ESPEC=[['mgr',/^المدير|manager/],['name',/اسم|name/],['phone',/هاتف|phone|mobile/],['email',/بريد|mail/],['dept',/قسم|depart/],['job',/منصب|job|position/]];
function importEmployees(rows){
  if(!rows.length)return null;
  const col=mapCols(rows.shift(),ESPEC);if(col.name===undefined)col.name=0;
  const g=(r,k)=>col[k]===undefined?'':cell(r[col[k]]);let add=0,upd=0;
  rows.forEach(r=>{
    const n=g(r,'name');if(!n)return;
    const rec={name:n,phone:g(r,'phone'),email:g(r,'email'),dept:g(r,'dept'),job:g(r,'job'),mgr:g(r,'mgr')};
    const e=D.employees.find(x=>nm(x.name)===nm(n));
    if(e){Object.assign(e,rec);upd++}
    else{const ne=Object.assign({id:'E'+(++D.cnt.emp),pin:'',perms:{},active:true},rec);
      if(/كاشير/.test(rec.job)&&typeof ROLES!=='undefined')ROLES['مستخدم نقطة البيع (كاشير)'].forEach(p=>ne.perms[p]=true);
      D.employees.push(ne);add++}
  });
  save('employees','cnt');if(typeof saveEmpFile==='function')saveEmpFile();return{add,upd};
}
/* ===== أرصدة المخزون من شيت (باركود + كمية) لفرع محدد ===== */
function importStock(rows,br){
  if(!rows.length)return null;
  const col=mapCols(rows.shift(),[['bc',/باركود|barcode/],['qty',/^(?!.*محسوب).*(الكمية|qty|quantity)/]]);
  if(col.bc===undefined||col.qty===undefined)return{err:'لم أجد عمودي الباركود والكمية'};
  const acc={};let miss=0;
  rows.forEach(r=>{const q=num(r[col.qty]);if(isNaN(q))return;const m=find(cell(r[col.bc]));if(m.length!==1){miss++;return}acc[m[0].id]=(acc[m[0].id]||0)+q});
  D.stock[br]=D.stock[br]||{};Object.keys(acc).forEach(id=>{D.stock[br][id]=r3(acc[id])});
  save('stock');return{ok:Object.keys(acc).length,miss};
}
