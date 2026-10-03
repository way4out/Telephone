const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||10000;
const file=path.join(__dirname,'nftqr-v1.html');
const html=fs.readFileSync(file,'utf8');
http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/'||u.pathname==='/nftqr'||u.pathname==='/nftqr-v1.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(html)}
 if(u.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,app:'StellarNet NFTQR v1.0',editions:4000,network:'Base Mainnet',chainId:8453}))}
 res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');
}).listen(PORT,'0.0.0.0',()=>console.log('StellarNet NFTQR public frontend listening on '+PORT));
