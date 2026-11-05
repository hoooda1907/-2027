/* عميل JSON-RPC لأودو (يعمل في العملية الرئيسية لتجنب قيود CORS) */
const http = require('http');
const https = require('https');

function rpc(url, service, method, args) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(/^https?:\/\//i.test(url) ? url : 'http://' + url); } catch (e) { return reject(new Error('عنوان الخادم غير صحيح')); }
    const body = JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args }, id: Date.now() });
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname.replace(/\/+$/, '') + '/jsonrpc', method: 'POST', timeout: 30000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.error) reject(new Error((j.error.data && j.error.data.message) || j.error.message || 'خطأ من أودو'));
          else resolve(j.result);
        } catch (e) { reject(new Error('رد غير صالح من الخادم (تأكد من العنوان)')); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('انتهت مهلة الاتصال')); });
    req.on('error', (e) => reject(new Error('لا يوجد اتصال: ' + (e.code || e.message))));
    req.write(body);
    req.end();
  });
}
async function call(cfg, service, method, args) {
  try { return { ok: true, result: await rpc(cfg.url, service, method, args) }; }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
}
module.exports = { rpc, call };
