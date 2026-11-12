const $=s=>document.querySelector(s),MT=5;
let PW=210,PH=297,mode='ids';
let cards=[],cur=0,uid=0,E=null;
const ph={w:4,h:6,img:null,n:8,gap:2,guides:true};
const nc=()=>({id:++uid,w:8.6,h:5.6,f:null,b:null});
for(let i=0;i<5;i++)cards.push(nc());
const say=m=>{const e=$('#msg');e.textContent=m;clearTimeout(say.t);say.t=setTimeout(()=>e.textContent='',5000)};

/* ---------- durable offline storage (IndexedDB) ---------- */
let storageReady=false, saveTimer=0;
const DB_NAME='alhammam-local', DB_STORE='workspace';
function openLocalDB(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>q.result.createObjectStore(DB_STORE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
function canvasData(c){try{return c?c.toDataURL('image/jpeg',.88):null}catch(e){return null}}
function queueSave(){if(!storageReady)return;clearTimeout(saveTimer);saveTimer=setTimeout(saveState,450)}
async function saveState(){
 try{
  const state={version:1,mode,cards:cards.map(c=>({id:c.id,w:c.w,h:c.h,f:canvasData(c.f),b:canvasData(c.b)})),
   ph:{w:ph.w,h:ph.h,n:ph.n,gap:ph.gap,guides:ph.guides,img:canvasData(ph.img)},
   gy:$('#gy').value,gx:$('#gx').value,php:$('#php').value,fmt:$('#fmt').value,dpi:$('#dpi').value};
  const db=await openLocalDB();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(state,'current');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
 }catch(e){say('تعذّر حفظ البيانات محلياً؛ تأكد من توفر مساحة كافية')}
}
function dataCanvas(url){return new Promise(resolve=>{if(!url)return resolve(null);const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);resolve(c)};im.onerror=()=>resolve(null);im.src=url})}
async function restoreState(){
 try{
  const db=await openLocalDB();const state=await new Promise((res,rej)=>{const q=db.transaction(DB_STORE).objectStore(DB_STORE).get('current');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});db.close();if(!state)return;
  if(Array.isArray(state.cards)&&state.cards.length){cards=await Promise.all(state.cards.map(async c=>({id:c.id||++uid,w:c.w||8.6,h:c.h||5.6,f:await dataCanvas(c.f),b:await dataCanvas(c.b)})));uid=Math.max(uid,...cards.map(c=>c.id||0))}
  if(state.ph){Object.assign(ph,{w:state.ph.w||4,h:state.ph.h||6,n:state.ph.n||8,gap:state.ph.gap??2,guides:state.ph.guides!==false,img:await dataCanvas(state.ph.img)})}
  if(state.gy)$('#gy').value=state.gy;if(state.gx)$('#gx').value=state.gx;
  if(state.php)$('#php').value=state.php;if(state.fmt)$('#fmt').value=state.fmt;if(state.dpi)$('#dpi').value=state.dpi;
  $('#phw').value=ph.w;$('#phh').value=ph.h;$('#phn').value=ph.n;$('#phg').value=ph.gap;$('#phk').checked=ph.guides;
  $('#oy').textContent=$('#gy').value+' mm';$('#ox').textContent=$('#gx').value+' mm';$('#ophg').textContent=ph.gap+' mm';
  setMode(state.mode==='ph'?'ph':'ids');
 }catch(e){console.warn('Local restore failed',e)}
}


/* ---------- layout & drawing ---------- */
function layout(){
 const gy=+$('#gy').value,gx=+$('#gx').value,P=[[]];let y=MT;
 for(const c of cards){
  if(!c.f&&!c.b)continue;
  const w=c.w*10,h=c.h*10;
  if(y+h>PH-MT&&P[P.length-1].length){P.push([]);y=MT}
  const x0=(PW-(2*w+gx))/2;
  P[P.length-1].push({c,x:x0,bx:x0+w+gx,y,w,h});
  y+=h+gy;
 }
 return P;
}
function page(i,dpi){
 const k=dpi/25.4,cv=document.createElement('canvas');
 cv.width=Math.round(PW*k);cv.height=Math.round(PH*k);
 const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);x.imageSmoothingQuality='high';
 if(mode==='ph'){
  for(const r of phLayout()[i]||[]){
   if(ph.img){const a=ph.img,t=r.w/r.h,sr=a.width/a.height;let sw=a.width,sh=a.height;if(sr>t)sw=sh*t;else sh=sw/t;x.drawImage(a,(a.width-sw)/2,(a.height-sh)/2,sw,sh,r.x*k,r.y*k,r.w*k,r.h*k)}
   if(ph.guides){x.strokeStyle='#8a8a8a';x.lineWidth=Math.max(1,k*.15);x.strokeRect(r.x*k,r.y*k,r.w*k,r.h*k)}
  }
  return cv;
 }
 for(const r of layout()[i]||[]){
  if(r.c.f)x.drawImage(r.c.f,r.x*k,r.y*k,r.w*k,r.h*k);
  if(r.c.b)x.drawImage(r.c.b,r.bx*k,r.y*k,r.w*k,r.h*k);
 }
 return cv;
}
function draw(){
 const n=L().length;cur=Math.max(0,Math.min(cur,n-1));
 const p=page(cur,96),cv=$('#cv');cv.width=p.width;cv.height=p.height;cv.getContext('2d').drawImage(p,0,0);
 $('#pg').textContent=`الصفحة ${cur+1} / ${n} — ${mode==='ph'?$('#php').selectedOptions[0].text:'A4'}`;queueSave();
}

/* ---------- icons ---------- */
const IC={
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 trash:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
 pdf:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
 scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
 rot:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
 spark:'<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
 undo:'<path d="M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13"/>',
 crop:'<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',
 user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 10h5M6 14h3"/><circle cx="16.5" cy="11.5" r="2"/>'
};
const ic=n=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

/* ---------- cards list ---------- */
function thumb(cv){
 const t=document.createElement('canvas');t.width=72;t.height=Math.max(1,Math.round(72*cv.height/cv.width));
 t.getContext('2d').drawImage(cv,0,0,t.width,t.height);return t.toDataURL('image/jpeg',.7);
}
function list(){
 const box=$('#cards');box.innerHTML='';
 cards.forEach((c,i)=>{
  const d=document.createElement('div');d.className='card';
  const side=(k,l)=>`<div class="fb${c[k]?' on':''}">${c[k]?`<img src="${thumb(c[k])}" alt="">`:ic('upload')}<span>${c[k]?'✓ تغيير '+l:'رفع '+l}</span><input type="file" accept="image/*" data-s="${k}"></div>`;
  d.innerHTML=`<div class="ch">${ic('card')}<b>البطاقة ${i+1}</b><small>وطنية أو سكن</small></div>
  <div class="r">${side('f','الوجه')}<label>العرض (cm)<input type="number" step="0.1" min="1" max="20" value="${c.w}" data-k="w"></label></div>
  <div class="r">${side('b','الظهر')}<label>الارتفاع (cm)<input type="number" step="0.1" min="1" max="28" value="${c.h}" data-k="h"></label></div>
  <button class="del" data-del>${ic('trash')}حذف البطاقة</button>`;
  d.querySelectorAll('[data-s]').forEach(n=>n.onchange=()=>pick(c,n.dataset.s,n));
  d.querySelectorAll('input[data-k]').forEach(n=>n.oninput=()=>{c[n.dataset.k]=Math.max(1,+n.value||1);draw()});
  d.querySelector('[data-del]').onclick=()=>{cards=cards.filter(x=>x!==c);list();draw()};
  box.append(d);
 });
 queueSave();
}
function pick(c,s,n){
 const f=n.files[0];n.value='';if(!f)return;
 const r=new FileReader();
 r.onload=()=>{const im=new Image();im.onload=()=>edit(im,c,s);im.onerror=()=>say('تعذّر فتح الصورة');im.src=r.result};
 r.onerror=()=>say('تعذّر قراءة الملف');
 r.readAsDataURL(f);
}

/* ---------- image editor ---------- */
const fq=(c,f)=>{const m=Math.round(Math.min(c.width,c.height)*f),w=c.width-m,h=c.height-m;return[[m,m],[w,m],[w,h],[m,h]]};
function toCv(im){
 const k=Math.min(1,2200/Math.max(im.width,im.height)),c=document.createElement('canvas');
 c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
 c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c;
}
const dd=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function orient(q,c){
 const wd=dd(q[0],q[1])+dd(q[3],q[2]),ht=dd(q[0],q[3])+dd(q[1],q[2]);
 return(wd<ht)===(c.w>=c.h)?[q[1],q[2],q[3],q[0]]:q;
}
function lcc(mk,w,h){
 const n=w*h,lab=new Int32Array(n),st=new Int32Array(n);let bc=0,bn=0,id=0;
 for(let s=0;s<n;s++){
  if(lab[s]||!mk[s])continue;
  id++;let sp=0,cnt=0;st[sp++]=s;lab[s]=id;
  while(sp){
   const p=st[--sp],i=p%w,j=(p/w)|0;cnt++;
   if(i>0&&!lab[p-1]&&mk[p-1]){lab[p-1]=id;st[sp++]=p-1}
   if(i<w-1&&!lab[p+1]&&mk[p+1]){lab[p+1]=id;st[sp++]=p+1}
   if(j>0&&!lab[p-w]&&mk[p-w]){lab[p-w]=id;st[sp++]=p-w}
   if(j<h-1&&!lab[p+w]&&mk[p+w]){lab[p+w]=id;st[sp++]=p+w}
  }
  if(cnt>bn){bn=cnt;bc=id}
 }
 return{lab,bc,bn};
}
function fitLine(P){
 const n=P.length;let mx=0,my=0;for(const p of P){mx+=p[0];my+=p[1]}mx/=n;my/=n;
 let a=0,b=0,c=0;for(const p of P){const u=p[0]-mx,v=p[1]-my;a+=u*u;b+=u*v;c+=v*v}
 const t=.5*Math.atan2(2*b,a-c);return{x:mx,y:my,dx:Math.cos(t),dy:Math.sin(t)};
}
/* تدقيق الزوايا: تركيب خط مستقيم لكل ضلع ثم تقاطع الأضلاع (يتجاوز استدارة زوايا البطاقة) */
function refine(q,B){
 const cx=(q[0][0]+q[1][0]+q[2][0]+q[3][0])/4,cy=(q[0][1]+q[1][1]+q[2][1]+q[3][1])/4,L=[];
 for(let s=0;s<4;s++){
  const a=q[s],b=q[(s+1)%4],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  const P=B.filter(p=>{const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(len*len);return t>.12&&t<.88&&Math.abs((p[0]-a[0])*nx+(p[1]-a[1])*ny)<len*.07});
  if(P.length<8)return null;
  let l=fitLine(P);
  const res=P.map(p=>Math.abs((p[0]-l.x)*l.dy-(p[1]-l.y)*l.dx)),med=res.slice().sort((u,v)=>u-v)[res.length>>1];
  const P2=P.filter((p,i)=>res[i]<=Math.max(2*med,.9));if(P2.length>=8)l=fitLine(P2);
  let ox=l.dy,oy=-l.dx;if(ox*((a[0]+b[0])/2-cx)+oy*((a[1]+b[1])/2-cy)<0){ox=-ox;oy=-oy}
  l.x+=ox*.5;l.y+=oy*.5;L.push(l);
 }
 const X=(l1,l2)=>{const d=l1.dx*l2.dy-l1.dy*l2.dx;if(Math.abs(d)<1e-6)return null;const t=((l2.x-l1.x)*l2.dy-(l2.y-l1.y)*l2.dx)/d;return[l1.x+t*l1.dx,l1.y+t*l1.dy]};
 const r=[X(L[3],L[0]),X(L[0],L[1]),X(L[1],L[2]),X(L[2],L[3])],lim=dd(q[0],q[2])*.12;
 return r.some((p,i)=>!p||dd(p,q[i])>lim)?null:r;
}
function detect(cv){
 const k=Math.min(1,220/Math.max(cv.width,cv.height)),w=Math.max(8,Math.round(cv.width*k)),h=Math.max(8,Math.round(cv.height*k));
 const t=document.createElement('canvas');t.width=w;t.height=h;
 const x=t.getContext('2d');x.drawImage(cv,0,0,w,h);
 const d=x.getImageData(0,0,w,h).data,n=w*h,m=Math.max(2,Math.round(Math.min(w,h)*.04)),bs=[[],[],[]];
 for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(i<m||j<m||i>=w-m||j>=h-m){const o=(j*w+i)*4;for(let c=0;c<3;c++)bs[c].push(d[o+c])}
 const bg=bs.map(a=>a.sort((p,q)=>p-q)[a.length>>1]),dist=new Uint8Array(n);
 for(let p=0;p<n;p++){const o=p*4;dist[p]=Math.min(255,Math.hypot(d[o]-bg[0],d[o+1]-bg[1],d[o+2]-bg[2])*.6)}
 const H=new Array(256).fill(0);dist.forEach(v=>H[v]++);
 let sum=0,sB=0,wB=0,best=0,th=40;
 for(let i=0;i<256;i++)sum+=i*H[i];
 for(let i=0;i<256;i++){wB+=H[i];if(!wB)continue;const wF=n-wB;if(!wF)break;sB+=i*H[i];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;th=i}}
 th=Math.max(th,25);
 const mk=new Uint8Array(n),out=new Uint8Array(n),st=new Int32Array(n);let sp=0;
 const tw=Math.max(34,th*.5);
 for(let p=0;p<n;p++)if(dist[p]>th){mk[p]=1;st[sp++]=p}
 while(sp){
  const p=st[--sp],i=p%w,j=(p/w)|0;
  if(i>0&&!mk[p-1]&&dist[p-1]>tw){mk[p-1]=1;st[sp++]=p-1}
  if(i<w-1&&!mk[p+1]&&dist[p+1]>tw){mk[p+1]=1;st[sp++]=p+1}
  if(j>0&&!mk[p-w]&&dist[p-w]>tw){mk[p-w]=1;st[sp++]=p-w}
  if(j<h-1&&!mk[p+w]&&dist[p+w]>tw){mk[p+w]=1;st[sp++]=p+w}
 }
 const push=p=>{if(!mk[p]&&!out[p]){out[p]=1;st[sp++]=p}};
 for(let i=0;i<w;i++){push(i);push(n-1-i)}
 for(let j=0;j<h;j++){push(j*w);push(j*w+w-1)}
 while(sp){const p=st[--sp],i=p%w,j=(p/w)|0;if(i>0)push(p-1);if(i<w-1)push(p+1);if(j>0)push(p-w);if(j<h-1)push(p+w)}
 for(let p=0;p<n;p++)mk[p]=out[p]?0:1;
 const{lab,bc,bn}=lcc(mk,w,h);
 if(bn<n*.08||bn>n*.97)return null;
 const P=[];for(let p=0;p<n;p++)if(lab[p]===bc)P.push([p%w,(p/w)|0]);
 const K=Math.max(2,Math.round(P.length*.003));
 const b4=f=>{const s=P.slice().sort((a,b)=>f(b)-f(a)).slice(0,K);return[s.reduce((a,b)=>a+b[0],0)/K+.5,s.reduce((a,b)=>a+b[1],0)/K+.5]};
 const rq=[b4(p=>-p[0]-p[1]),b4(p=>p[0]-p[1]),b4(p=>p[0]+p[1]),b4(p=>p[1]-p[0])],B=[];
 for(let p=0;p<n;p++){
  if(lab[p]!==bc)continue;const i=p%w,j=(p/w)|0;
  if(i===0||j===0||i===w-1||j===h-1||lab[p-1]!==bc||lab[p+1]!==bc||lab[p-w]!==bc||lab[p+w]!==bc)B.push([i+.5,j+.5]);
 }
 return(refine(rq,B)||rq).map(p=>[p[0]/k,p[1]/k]);
}
function face(o){
 const k=Math.min(1,160/Math.max(o.width,o.height)),w=Math.max(8,Math.round(o.width*k)),h=Math.max(8,Math.round(o.height*k));
 const t=document.createElement('canvas');t.width=w;t.height=h;
 const x=t.getContext('2d');x.drawImage(o,0,0,w,h);
 const d=x.getImageData(0,0,w,h).data,n=w*h,mk=new Uint8Array(n);
 for(let p=0;p<n;p++){
  const R=d[p*4],G=d[p*4+1],B=d[p*4+2],Cb=128-.1687*R-.3313*G+.5*B,Cr=128+.5*R-.4187*G-.0813*B;
  mk[p]=(Cb>77&&Cb<127&&Cr>133&&Cr<173&&R>70&&R>B)?1:0;
 }
 const{lab,bc,bn}=lcc(mk,w,h);
 if(bn<n*.012)return null;
 let x0=w,y0=h,x1=0;
 for(let p=0;p<n;p++)if(lab[p]===bc){const i=p%w,j=(p/w)|0;if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j}
 const bw=x1-x0+1,bh=Math.max(1,(function(){let y1=0;for(let p=0;p<n;p++)if(lab[p]===bc){const j=(p/w)|0;if(j>y1)y1=j}return y1})()-y0+1);
 return{x:x0/k,y:y0/k,w:bw/k,h:Math.min(bh,bw*1.35)/k};
}
function phQ(o){
 const W=o.width,H=o.height,r=ph.w/ph.h,f=face(o);
 let cw,ch,x0,y0;
 if(f){ch=f.h*1.9;cw=ch*r;x0=f.x+f.w/2-cw/2;y0=f.y-f.h*.45}
 else{ch=Math.min(H*.8,W*.8/r);cw=ch*r;x0=(W-cw)/2;y0=(H-ch)/2}
 const s=Math.min(1,W/cw,H/ch);cw*=s;ch*=s;
 x0=Math.max(0,Math.min(W-cw,x0));y0=Math.max(0,Math.min(H-ch,y0));
 return[[x0,y0],[x0+cw,y0],[x0+cw,y0+ch],[x0,y0+ch]];
}
const defQ=b=>E.c===ph?phQ(b):orient(detect(b)||fq(b,.04),E.c);
const rs=()=>['sh','br','ct'].forEach(i=>{E[i]=0;$('#'+i).value=0;$('#o'+i).textContent=0});
function edit(im,c,s){
 const o=toCv(im);
 E={c,s,orig:o,base:o,cv:o,q:null,k:0,sh:0,br:0,ct:0,d:-1};
 E.q=defQ(o);rs();
 $('#e5 span').textContent=c===ph?'تعرّف ذكي على الوجه':'تعرّف ذكي على الهوية';
 $('#ed').showModal();pe();
}
function qp(u,v){
 const q=E.q;
 return[(1-v)*((1-u)*q[0][0]+u*q[1][0])+v*((1-u)*q[3][0]+u*q[2][0]),(1-v)*((1-u)*q[0][1]+u*q[1][1])+v*((1-u)*q[3][1]+u*q[2][1])];
}
function pe(){
 const c=E.cv,e=$('#ec'),x=e.getContext('2d'),W=c.width,H=c.height,q=E.q,r=Math.max(11,W*.02);
 e.width=W;e.height=H;x.drawImage(c,0,0);
 x.save();x.fillStyle='rgba(6,14,34,.62)';x.beginPath();x.rect(0,0,W,H);
 x.moveTo(q[0][0],q[0][1]);for(let i=1;i<4;i++)x.lineTo(q[i][0],q[i][1]);x.closePath();x.fill('evenodd');x.restore();
 x.lineWidth=Math.max(1,r/8);x.strokeStyle='rgba(243,217,139,.55)';x.beginPath();
 for(const t of[1/3,2/3]){let a=qp(t,0),b=qp(t,1);x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);a=qp(0,t);b=qp(1,t);x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1])}
 x.stroke();
 if(E.c===ph&&!E.k){
  x.setLineDash([r,r*.6]);x.lineWidth=Math.max(1.5,r/6);x.strokeStyle='rgba(255,255,255,.85)';x.beginPath();
  for(let i=0;i<=48;i++){const t=i/48*6.2832,p=qp(.5+.27*Math.cos(t),.44+.34*Math.sin(t));i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])}
  x.stroke();x.setLineDash([]);
 }
 x.lineWidth=Math.max(2,r/4);x.strokeStyle='#e8c25a';x.beginPath();
 q.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.stroke();
 q.forEach((p,i)=>{
  x.beginPath();x.arc(p[0],p[1],r*1.25,0,7);x.fillStyle='rgba(232,194,90,.28)';x.fill();
  x.beginPath();x.arc(p[0],p[1],r*.8,0,7);x.fillStyle=E.d===i?'#fff':'#e8c25a';x.fill();
  x.lineWidth=r/4;x.strokeStyle='#0b1b3a';x.stroke();
 });
 if(E.d>=0){
  const p=q[E.d],R=Math.max(56,W*.1),cx=p[0]>W/2?R+10:W-R-10,cy=R+10,s=R/3;
  x.save();x.beginPath();x.arc(cx,cy,R,0,7);x.clip();x.fillStyle='#000';x.fillRect(cx-R,cy-R,2*R,2*R);
  x.drawImage(c,p[0]-s,p[1]-s,2*s,2*s,cx-R,cy-R,2*R,2*R);x.restore();
  x.lineWidth=Math.max(3,r/3);x.strokeStyle='#e8c25a';x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();
  x.lineWidth=1.5;x.strokeStyle='#fff';x.beginPath();x.moveTo(cx-R*.25,cy);x.lineTo(cx+R*.25,cy);x.moveTo(cx,cy-R*.25);x.lineTo(cx,cy+R*.25);x.stroke();
 }
}
function warp(src,q,W,H){
 const sw=src.width,sh=src.height,S=src.getContext('2d').getImageData(0,0,sw,sh).data;
 const o=document.createElement('canvas');o.width=W;o.height=H;
 const x=o.getContext('2d'),d=x.createImageData(W,H),D=d.data;
 for(let j=0;j<H;j++){
  const v=j/(H-1);
  for(let i=0;i<W;i++){
   const u=i/(W-1);
   const px=(1-v)*((1-u)*q[0][0]+u*q[1][0])+v*((1-u)*q[3][0]+u*q[2][0]);
   const py=(1-v)*((1-u)*q[0][1]+u*q[1][1])+v*((1-u)*q[3][1]+u*q[2][1]);
   const x0=Math.min(sw-2,Math.max(0,Math.floor(px))),y0=Math.min(sh-2,Math.max(0,Math.floor(py)));
   const fx=Math.min(1,Math.max(0,px-x0)),fy=Math.min(1,Math.max(0,py-y0));
   const a=(y0*sw+x0)*4,b=a+4,c=a+sw*4,e=c+4,k=(j*W+i)*4;
   for(let t=0;t<4;t++)D[k+t]=(S[a+t]*(1-fx)+S[b+t]*fx)*(1-fy)+(S[c+t]*(1-fx)+S[e+t]*fx)*fy;
  }
 }
 x.putImageData(d,0,0);return o;
}
function enh(src){
 const o=document.createElement('canvas');o.width=src.width;o.height=src.height;
 const x=o.getContext('2d');x.drawImage(src,0,0);
 const d=x.getImageData(0,0,o.width,o.height),p=d.data,n=p.length/4;
 for(let ch=0;ch<3;ch++){
  const h=new Uint32Array(256);
  for(let i=0;i<n;i++)h[p[i*4+ch]]++;
  let lo=0,hi=255,a=0;const t=n*.01;
  for(;lo<255&&(a+=h[lo])<t;lo++);
  a=0;for(;hi>0&&(a+=h[hi])<t;hi--);
  const r=Math.max(1,hi-lo);
  for(let i=0;i<n;i++)p[i*4+ch]=Math.max(0,Math.min(255,(p[i*4+ch]-lo)*255/r));
 }
 x.putImageData(d,0,0);return o;
}
function rot(src){
 const o=document.createElement('canvas');o.width=src.height;o.height=src.width;
 const x=o.getContext('2d');x.translate(o.width,0);x.rotate(Math.PI/2);x.drawImage(src,0,0);return o;
}
function sharp(src,a){
 const w=src.width,h=src.height,o=document.createElement('canvas');o.width=w;o.height=h;
 const x=o.getContext('2d');x.drawImage(src,0,0);
 const I=x.getImageData(0,0,w,h),p=I.data,b=new Float32Array(p.length),s=a/100;
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=(j*w+i)*4,l=i?k-4:k,r=i<w-1?k+4:k;for(let c=0;c<3;c++)b[k+c]=(p[l+c]+p[k+c]+p[r+c])/3}
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const k=(j*w+i)*4,u=j?k-w*4:k,d=j<h-1?k+w*4:k;
  for(let c=0;c<3;c++){const bl=(b[u+c]+b[k+c]+b[d+c])/3,v=s>0?p[k+c]+s*2*(p[k+c]-bl):p[k+c]+(-s)*(bl-p[k+c]);p[k+c]=v<0?0:v>255?255:v}
 }
 x.putImageData(I,0,0);return o;
}
function adj(src,b,c){
 const o=document.createElement('canvas');o.width=src.width;o.height=src.height;
 const x=o.getContext('2d');x.drawImage(src,0,0);
 const I=x.getImageData(0,0,o.width,o.height),p=I.data,f=1+c/100,s=b*2.55;
 for(let i=0;i<p.length;i+=4)for(let k=0;k<3;k++){const v=(p[i+k]-128)*f+128+s;p[i+k]=v<0?0:v>255?255:v}
 x.putImageData(I,0,0);return o;
}
function up(){
 let r=E.base;
 if(E.k){if(E.br||E.ct)r=adj(r,E.br,E.ct);if(E.sh)r=sharp(r,E.sh)}
 E.cv=r;pe();
}
function crop(){
 const W=Math.round(E.c.w/2.54*300),H=Math.round(E.c.h/2.54*300);
 E.base=warp(E.base,E.q,W,H);E.q=fq(E.base,0);E.k=1;up();
}
$('#e1').onclick=crop;
$('#e2').onclick=()=>{E.base=enh(E.base);up()};
$('#e3').onclick=()=>{E.base=rot(E.base);E.q=E.k?fq(E.base,0):defQ(E.base);up()};
$('#e4').onclick=()=>{E.base=E.orig;E.k=0;E.q=defQ(E.base);rs();up()};
$('#e5').onclick=()=>{if(E.k){E.base=E.orig;E.k=0}E.q=defQ(E.base);up()};
[['sh','osh'],['br','obr'],['ct','oct']].forEach(([i,o])=>$('#'+i).oninput=()=>{E[i]=+$('#'+i).value;$('#'+o).textContent=E[i];cancelAnimationFrame(E.r);E.r=requestAnimationFrame(up)});
$('#ok').onclick=()=>{if(!E.k)crop();E.c[E.s]=E.cv;$('#ed').close();list();draw()};
$('#no').onclick=()=>$('#ed').close();
function phLayout(){
 const m=5,g=ph.gap,w=ph.w*10,h=ph.h*10,cols=Math.max(1,Math.floor((PW-2*m+g)/(w+g))),rows=Math.max(1,Math.floor((PH-2*m+g)/(h+g))),per=cols*rows,P=[];
 const x0=(PW-(cols*w+(cols-1)*g))/2;
 for(let n=0;n<ph.n;n++){
  const q=n%per;if(!q)P.push([]);
  P[P.length-1].push({x:x0+(q%cols)*(w+g),y:m+((q/cols)|0)*(h+g),w,h});
 }
 return P.length?P:[[]];
}
const L=()=>mode==='ph'?phLayout():layout();
function applyPaper(){if(mode==='ph'){const q=$('#php').value.split(',');PW=+q[0];PH=+q[1]}else{PW=210;PH=297}}
function setMode(m){
 mode=m;cur=0;$('#idc').hidden=m!=='ids';$('#phc').hidden=m!=='ph';
 $('#t1').className=m==='ids'?'on':'';$('#t2').className=m==='ph'?'on':'';
 applyPaper();draw();
}
(()=>{
 const e=$('#ec');
 const pt=ev=>{const r=e.getBoundingClientRect();return[(ev.clientX-r.left)*e.width/r.width,(ev.clientY-r.top)*e.height/r.height]};
 e.onpointerdown=ev=>{
  E.d=-1;const p=pt(ev),R=Math.max(34,e.width*.07);let b=1e9;
  E.q.forEach((q,i)=>{const m=Math.hypot(q[0]-p[0],q[1]-p[1]);if(m<R&&m<b){b=m;E.d=i}});
  if(E.d>=0){e.setPointerCapture(ev.pointerId);pe()}
 };
 e.onpointermove=ev=>{
  if(E.d<0)return;const p=pt(ev);
  E.q[E.d]=[Math.max(0,Math.min(e.width,p[0])),Math.max(0,Math.min(e.height,p[1]))];pe();
 };
 e.onpointerup=e.onpointercancel=()=>{E.d=-1;pe()};
})();

/* ---------- export / print ---------- */
async function save(name,blob){
 if(window.AndroidBridge&&window.AndroidBridge.saveFile){
  try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(blob)});window.AndroidBridge.saveFile(name,blob.type||'application/octet-stream',data);say('اختر مكان حفظ الملف');return}catch(e){say('تعذّر تجهيز الملف للحفظ');return}
 }
 try{
  const D=window.claude?await window.claude.use('downloads'):null;
  if(D){await D.save({filename:name,data:blob});say('تم الحفظ');return}
 }catch(e){if(e&&e.code==='declined')return;say('تعذّر الحفظ');return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(a.href),5000);say('تم التنزيل: '+name);
}
async function mkpdf(){
 const n=L().length,dpi=+$('#dpi').value,iw=Math.round(PW*dpi/25.4),ih=Math.round(PH*dpi/25.4);
 const W=+(PW/25.4*72).toFixed(2),H=+(PH/25.4*72).toFixed(2),en=new TextEncoder(),parts=[],off=[],kids=[];let len=0;
 const put=x=>{const u=typeof x==='string'?en.encode(x):x;parts.push(u);len+=u.length};
 const ob=(i,s)=>{off[i]=len;put(i+' 0 obj\n'+s+'\nendobj\n')};
 put('%PDF-1.4\n');
 for(let i=0;i<n;i++){
  const b=await new Promise(r=>page(i,dpi).toBlob(r,'image/jpeg',.92));
  const j=new Uint8Array(await b.arrayBuffer()),p=3+3*i,cs=`q ${W} 0 0 ${H} 0 0 cm /I Do Q`;
  kids.push(p+' 0 R');
  ob(p,`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${W} ${H}]/Contents ${p+1} 0 R/Resources<</XObject<</I ${p+2} 0 R>>>>>>`);
  ob(p+1,`<</Length ${cs.length}>>\nstream\n${cs}\nendstream`);
  off[p+2]=len;
  put(`${p+2} 0 obj\n<</Type/XObject/Subtype/Image/Width ${iw}/Height ${ih}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${j.length}>>\nstream\n`);
  put(j);put('\nendstream\nendobj\n');
 }
 ob(1,'<</Type/Catalog/Pages 2 0 R>>');
 ob(2,`<</Type/Pages/Kids[${kids.join(' ')}]/Count ${n}>>`);
 const tot=3+3*n,xo=len;let s=`xref\n0 ${tot}\n0000000000 65535 f \n`;
 for(let i=1;i<tot;i++)s+=String(off[i]).padStart(10,'0')+' 00000 n \n';
 put(s+`trailer\n<</Size ${tot}/Root 1 0 R>>\nstartxref\n${xo}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});
}
const run=async f=>{try{say('جارٍ التجهيز…');await f()}catch(e){say('تعذّر التنفيذ — جرّب دقة أقل')}};
$('#ep').onclick=()=>run(async()=>save((mode==='ph'?'alhammam-photos':'alhammam-ids')+'.pdf',await mkpdf()));
$('#ei').onclick=()=>run(async()=>{
 const png=$('#fmt').value==='png';
 const b=await new Promise(r=>page(cur,+$('#dpi').value).toBlob(r,png?'image/png':'image/jpeg',.93));
 await save(`alhammam-page${cur+1}.${png?'png':'jpg'}`,b);
});
$('#eo').onclick=()=>run(async()=>{
 const box=$('#pp');box.innerHTML='';
 for(let i=0;i<L().length;i++){const im=new Image();im.src=page(i,200).toDataURL('image/jpeg',.9);im.style.cssText=`width:${PW}mm;height:${PH}mm`;box.append(im)}
 await Promise.all([...box.children].map(i=>i.decode().catch(()=>0)));
 say('جارٍ فتح الطباعة');if(window.AndroidBridge&&window.AndroidBridge.printPage)window.AndroidBridge.printPage();else window.print();
});

/* ---------- wiring ---------- */
$('#gy').oninput=()=>{$('#oy').textContent=$('#gy').value+' mm';draw()};
$('#gx').oninput=()=>{$('#ox').textContent=$('#gx').value+' mm';draw()};
$('#add').onclick=()=>{cards.push(nc());list()};
$('#pr').onclick=()=>{cur--;draw()};
$('#nx').onclick=()=>{cur++;draw()};
const SZ=[["3×4 سم",3,4],["3.5×4.5 سم (جواز دولي)",3.5,4.5],["4×6 سم (هوية/جواز)",4,6],["5×5 سم (2×2 إنج)",5.08,5.08],["5×7 سم",5,7],["مخصص",0,0]];
$('#phs').innerHTML=SZ.map((z,i)=>`<option value="${i}">${z[0]}</option>`).join('');
$('#phs').value='2';$('#phw').value=ph.w;$('#phh').value=ph.h;$('#phn').value=ph.n;
const phSync=()=>{
 ph.w=Math.max(1,+$('#phw').value||1);ph.h=Math.max(1,+$('#phh').value||1);
 ph.n=Math.max(1,Math.min(200,+$('#phn').value||1));ph.gap=+$('#phg').value;ph.guides=$('#phk').checked;
 $('#ophg').textContent=ph.gap+' mm';cur=0;draw();
};
$('#phs').onchange=()=>{const z=SZ[$('#phs').value];if(z[1]){$('#phw').value=z[1];$('#phh').value=z[2]}phSync()};
['phw','phh','phn','phg','phk'].forEach(i=>$('#'+i).oninput=phSync);
$('#php').onchange=()=>{applyPaper();phSync()};
$('#phf').onchange=e=>pick(ph,'img',e.target);
$('#phe').onclick=()=>ph.img?edit(ph.img,ph,'img'):say('ارفع صورة أولاً');
$('#t1').onclick=()=>setMode('ids');$('#t2').onclick=()=>setMode('ph');
document.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=ic(e.dataset.i));
restoreState().finally(()=>{storageReady=true;list();draw();});

/* ---------- user backup / restore ---------- */
$('#backup').onclick=()=>run(async()=>{
 const state={version:1,createdAt:new Date().toISOString(),mode,cards:cards.map(c=>({id:c.id,w:c.w,h:c.h,f:canvasData(c.f),b:canvasData(c.b)})),
  ph:{w:ph.w,h:ph.h,n:ph.n,gap:ph.gap,guides:ph.guides,img:canvasData(ph.img)},
  gy:$('#gy').value,gx:$('#gx').value,php:$('#php').value,fmt:$('#fmt').value,dpi:$('#dpi').value};
 await save('alhammam-backup.json',new Blob([JSON.stringify(state)],{type:'application/json'}));
});
$('#restore').onclick=()=>$('#restoreFile').click();
$('#restoreFile').onchange=async e=>{
 const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
 try{const data=JSON.parse(await f.text());if(data.version!==1||!Array.isArray(data.cards)||!data.ph)throw new Error('invalid');
  const db=await openLocalDB();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(data,'current');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
  if(window.AndroidBridge&&window.AndroidBridge.toast)window.AndroidBridge.toast('تم استيراد النسخة الاحتياطية');
  location.reload();
 }catch(err){say('ملف النسخة الاحتياطية غير صالح أو تالف')}
};

/* إبقاء الخادم المحلي حياً ما دامت النافذة مفتوحة */
if(location.hostname==='127.0.0.1'){
 const ping=()=>fetch('/ping',{cache:'no-store'}).catch(()=>{});
 ping();setInterval(ping,3000);
 addEventListener('pagehide',()=>{try{navigator.sendBeacon('/bye')}catch(e){}});
}
