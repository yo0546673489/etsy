'use strict';
const { ImapFlow } = require('./node_modules/imapflow');
const { simpleParser } = require('./node_modules/mailparser');

async function main() {
  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: 'a05832261551@gmail.com', pass: 'ovmp vyok huwe qjkz' },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const uids = await client.search({ from: 'etsy.com', since }, { uid: true });
    const uidArr = Array.isArray(uids) ? uids : [];
    console.log('Found', uidArr.length, 'Etsy emails in last 7 days');

    let checked = 0;
    for (const uid of uidArr) {
      if (checked >= 5) break;
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg) continue;
      const parsed = await simpleParser(msg.source);
      const subject = (parsed.subject || '').toLowerCase();
      if (!subject.includes('message') && !subject.includes('conversation') && !subject.includes('sent you')) continue;
      checked++;

      console.log('\n=== UID', uid, '===');
      console.log('SUBJECT:', parsed.subject);
      console.log('FROM:', parsed.from && parsed.from.value[0].address);

      const html = parsed.html || '';
      const text = parsed.text || '';
      const combined = html + ' ' + text;

      // Find etsy URLs
      const found = [];
      const re = /https?:\/\/[^\s"'<>]+/g;
      let m;
      while ((m = re.exec(combined)) !== null) {
        const url = m[0];
        if (url.includes('etsy') || url.includes('ablink')) {
          found.push(url.substring(0, 120));
        }
      }
      console.log('Etsy/ablink URLs:', found.slice(0, 5));
    }
  } finally {
    lock.release();
    await client.logout();
  }
}
main().catch(e => console.error('Error:', e.message));
