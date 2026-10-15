// PICGENR umumiy server: bitta server, hamma saytlar (Netlify, Yandex...) shu yerga ulanadi.
// Ishga tushirish: node server.js   (Node 18+, qo'shimcha paket kerak emas)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,'data'),UP=path.join(DIR,'uploads'),DB=path.join(DIR,'db.json');
fs.mkdirSync(UP,{recursive:true});
let db={};try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){}
let t=null;const save=()=>{clearTimeout(t);t=setTimeout(()=>{fs.writeFile(DB+'.tmp',JSON.stringify(db),e=>{if(!e)fs.rename(DB+'.tmp',DB,()=>{})})},300)};
const MIME={mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/mp4',ogg:'video/ogg'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,PUT,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const body=(req,max)=>new Promise((ok,no)=>{let n=0;const c=[];req.on('data',d=>{n+=d.length;if(n>max){no(new Error('big'));req.destroy()}else c.push(d)});req.on('end',()=>ok(Buffer.concat(c)));req.on('error',no)});
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://x'),p=u.pathname,send=(s,o,h={})=>{res.writeHead(s,{...cors,'Content-Type':'application/json',...h});res.end(typeof o==='string'?o:JSON.stringify(o))};
 if(req.method==='OPTIONS')return send(204,'');
 try{let m;
  if(p==='/')return send(200,{ok:true,name:'PICGENR server'});
  if(m=p.match(/^\/kv\/([A-Za-z0-9_]{1,80})$/)){const k=m[1];
   if(req.method==='GET')return send(200,{v:db[k]===undefined?null:db[k]});
   if(req.method==='PUT'){const b=JSON.parse((await body(req,1.5e6)).toString());if(b.v===null)delete db[k];else db[k]=b.v;save();return send(200,{ok:true})}}
  if(p==='/upload'&&req.method==='POST'){const ext=(u.searchParams.get('ext')||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5);if(!MIME[ext])return send(400,{error:'format'});
   const id=crypto.randomBytes(8).toString('hex')+'.'+ext,fp=path.join(UP,id),ws=fs.createWriteStream(fp);let n=0,bad=false;
   req.on('data',d=>{n+=d.length;if(n>100e6&&!bad){bad=true;req.destroy();ws.destroy();fs.unlink(fp,()=>{})}});
   req.pipe(ws);ws.on('finish',()=>{if(!bad)send(200,{url:'/files/'+id})});ws.on('error',()=>{});return}
  if(m=p.match(/^\/files\/([a-f0-9]{16}\.[a-z0-9]{1,5})$/)){const fp=path.join(UP,m[1]);if(!fs.existsSync(fp))return send(404,{error:'yoq'});
   const st=fs.statSync(fp),h={...cors,'Content-Type':MIME[m[1].split('.')[1]]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'public, max-age=31536000'},r=req.headers.range&&req.headers.range.match(/bytes=(\d*)-(\d*)/);
   if(r){const s=r[1]?+r[1]:0;let e=r[2]?+r[2]:st.size-1;if(e>=st.size)e=st.size-1;if(s>e){res.writeHead(416,h);return res.end()}res.writeHead(206,{...h,'Content-Range':`bytes ${s}-${e}/${st.size}`,'Content-Length':e-s+1});return fs.createReadStream(fp,{start:s,end:e}).pipe(res)}
   res.writeHead(200,{...h,'Content-Length':st.size});return fs.createReadStream(fp).pipe(res)}
  send(404,{error:'topilmadi'})}catch(e){send(400,{error:'xato'})}
}).listen(PORT,()=>console.log('PICGENR server: '+PORT));
