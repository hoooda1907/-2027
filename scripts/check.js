const fs = require('fs');
const need = ['electron-main.js', 'electron-preload.js', 'build/icon.png', 'www/index.html', 'www/logo.png',
  'www/js/lib.js', 'www/js/data.js', 'www/js/pos.js', 'www/js/cus.js', 'www/seed/customers.js', 'www/js/purch.js', 'www/js/inv.js', 'www/js/acc.js', 'www/js/hr.js', 'www/js/app.js',
  'www/seed/products.js', 'www/seed/suppliers.js', 'www/seed/employees.js'];
const miss = need.filter((f) => !fs.existsSync(f));
if (miss.length) { console.error('ملفات ناقصة في المستودع (ارفعها بنفس المسارات):\n' + miss.join('\n')); process.exit(1); }
if (/\$\('/.test(fs.readFileSync('electron-main.js', 'utf8'))) { console.error('electron-main.js غير صحيح (يحتوي كود الواجهة)'); process.exit(1); }
console.log('الملفات سليمة');
