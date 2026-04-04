import { ImapFlow } from './node_modules/imapflow/lib/imap-flow.js';
import { simpleParser } from './node_modules/mailparser/lib/simple-parser.js';

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

    for (const uid of uidArr.slice(0, 30)) {
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg) continue;
      const parsed = await simpleParser(msg.source);
      const subject = (parsed.subject || '').toLowerCase();
      if (!subject.includes('message') && !subject.includes('conversation') && !subject.includes('sent you')) continue;

      console.log('\n=== UID', uid, '===');
      console.log('SUBJECT:', parsed.subject);

      const html = parsed.html || '';
      const text = parsed.text || '';
      const combined = html + ' ' + text;

      // Find all URLs
      const urlPattern = /https?:\/\/[^\s"'<>]+/g;
      const urls = [];
      let m;
      while ((m = urlPattern.exec(combined)) !== null) {
        if (m[0].includes('etsy') || m[0].includes('ablink')) {
          urls.push(m[0].substring(0, 100));
        }
      }
      console.log('URLs found:', urls.slice(0, 5));
      break;
    }
  } finally {
    lock.release();
    await client.logout();
  }
}
main().catch(e => console.error('Error:', e.message));
