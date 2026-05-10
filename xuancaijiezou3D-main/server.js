const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = 'd:\\Projects\\AI\\Games\\jumping-ball\\xuancaijiezou3D-main';
http.createServer((req, res) => {
  const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); res.end('Not found'); }
    else {
      const ext = path.extname(f);
      const ct = {'html':'text/html','js':'text/javascript','css':'text/css'}[ext.slice(1)] || 'application/octet-stream';
      res.writeHead(200, {'Content-Type': ct});
      res.end(d);
    }
  });
}).listen(8080, () => console.log('Server on 8080'));
