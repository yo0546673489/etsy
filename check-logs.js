const fs=require('fs');
const log=fs.readFileSync('C:/Users/Administrator/.pm2/logs/etsy-discounts-out.log','utf8');
const lines=log.split('\n').slice(-20);
console.log('=== OUT LOG (last 20) ===');
console.log(lines.join('\n'));
const err=fs.readFileSync('C:/Users/Administrator/.pm2/logs/etsy-discounts-error.log','utf8');
const errLines=err.split('\n').slice(-8);
console.log('\n=== ERROR LOG (last 8) ===');
console.log(errLines.join('\n'));
