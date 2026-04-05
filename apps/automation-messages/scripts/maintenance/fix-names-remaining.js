'use strict';
const { ImapFlow } = require('./node_modules/imapflow');
const { simpleParser } = require('./node_modules/mailparser');
const { Pool } = require('./node_modules/pg');

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres_dev_password@185.241.4.225:5433/etsy_messages' });

const SKIP_NAMES = new Set([
  'Unknown', 'Unknown Buyer', 'Unknown Customer', 'Customer', 'Buyer',
  'Thank', 'Great', 'Welcome', 'Hi', 'Hello', 'Dear', 'Hey', 'There',
  'You', 'All', 'Sure', 'Sorry', 'Good', 'Best', 'Please', 'Yes', 'No',
  'Ok', 'Okay', 'Do', 'Can', 'So', 'But', 'And', 'The', 'Our', 'We',
  'If', 'It', 'Is', 'In', 'Ai', 'GJ', 'Re', 'By', 'At', 'My', 'Be',
  'None', 'Just', 'Also', 'Only', 'Very', 'Still', 'How', 'What',
]);

function extractBuyerName(parsed) {
  const subject = parsed.subject || '';
  const convoMatch = subject.match(/conversation with (.+?)(?:\s*$)/i);
  if (convoMatch) { const n = convoMatch[1].replace(/\s+about\s+order.*/i, '').trim(); if (n) return n; }
  const fromMatch = subject.match(/message from (.+?)(?:\s*[-–—]|\s*$)/i);
  if (fromMatch) return fromMatch[1].trim();
  const sentMatch = subject.match(/^(.+?) sent you/i);
  if (sentMatch) return sentMatch[1].trim();
  return null;
}

function extractStoreEmail(parsed) {
  const to = parsed.to;
  if (to) {
    const addresses = Array.isArray(to) ? to : [to];
    for (const addr of addresses) {
      const email = addr.value?.[0]?.address?.toLowerCase() || '';
      if (email && email.includes('@')) return email;
    }
  }
  const xfwdFor = parsed.headers.get('x-forwarded-for');
  if (xfwdFor) {
    const raw = typeof xfwdFor === 'string' ? xfwdFor : String(xfwdFor);
    const first = raw.trim().split(/\s+/)[0];
    if (first && first.includes('@')) return first.toLowerCase();
  }
  const deliveredTo = parsed.headers.get('delivered-to');
  if (deliveredTo) {
    const addr = typeof deliveredTo === 'string' ? deliveredTo : String(deliveredTo);
    if (addr.includes('@')) return addr.trim().toLowerCase();
  }
  return null;
}

async function main() {
  // First: fix names from message text patterns for specific conversations
  console.log('=== Phase 1: Extract names from message text ===');
  const unknownConvs = await pool.query(
    "SELECT id, store_id FROM conversations WHERE customer_name = 'Unknown Customer'"
  );

  const NAME_PATTERNS = [
    /(?:hello|hi|hey),?\s+([A-Z][a-zA-Z\-]{2,25})[,\.!\n]/g,
    /yes[!,]?\s*([A-Z][a-zA-Z\-]{2,25})[\s,!]/g,
    /dear\s+([A-Z][a-zA-Z\-]{2,25})[,\.!\n]/g,
    /(?:thank you|thanks),?\s+([A-Z][a-zA-Z\-]{2,25})[,\.!\n]/g,
  ];

  for (const conv of unknownConvs.rows) {
    const msgs = await pool.query(
      'SELECT message_text FROM messages WHERE conversation_id = $1 ORDER BY id ASC LIMIT 30',
      [conv.id]
    );
    let found = null;
    for (const msg of msgs.rows) {
      for (const pattern of NAME_PATTERNS) {
        pattern.lastIndex = 0;
        const m = pattern.exec(msg.message_text);
        if (m) {
          const name = m[1].trim();
          if (!SKIP_NAMES.has(name) && name.length > 2) {
            found = name;
            break;
          }
        }
      }
      if (found) break;
    }
    if (found) {
      await pool.query('UPDATE conversations SET customer_name = $1 WHERE id = $2', [found, conv.id]);
      console.log('Phase1 fixed conv', conv.id, '->', found);
    }
  }

  // Phase 2: Search IMAP for older emails (all time)
  console.log('\n=== Phase 2: Search all-time IMAP emails ===');
  const remaining = await pool.query(
    "SELECT COUNT(*) FROM conversations WHERE customer_name = 'Unknown Customer'"
  );
  console.log('Still unknown:', remaining.rows[0].count);
  if (parseInt(remaining.rows[0].count) === 0) { pool.end(); return; }

  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: 'a05832261551@gmail.com', pass: 'ovmp vyok huwe qjkz' },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    // Search ALL Etsy emails (no date filter)
    const since = new Date('2025-01-01');
    const allUids = await client.search({ from: 'etsy.com', since }, { uid: true });
    const uidArr = Array.isArray(allUids) ? allUids : [];
    console.log('Total Etsy emails since Jan 2025:', uidArr.length);

    const storesResult = await pool.query('SELECT id, store_email, store_number FROM stores');
    const emailToStore = {};
    for (const s of storesResult.rows) {
      if (s.store_email) emailToStore[s.store_email.toLowerCase()] = s.id;
    }

    const unknownConvs2 = await pool.query(
      "SELECT id, store_id, etsy_conversation_url, last_message_at FROM conversations WHERE customer_name = 'Unknown Customer' ORDER BY store_id"
    );
    const storeConvs = {};
    for (const c of unknownConvs2.rows) {
      if (!storeConvs[c.store_id]) storeConvs[c.store_id] = [];
      storeConvs[c.store_id].push(c);
    }

    const emailData = [];
    // Only process emails not in last 60 days (already processed those)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    for (const uid of uidArr) {
      try {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
        if (!msg) continue;
        const parsed = await simpleParser(msg.source);
        if (parsed.date && parsed.date > sixtyDaysAgo) continue; // already processed

        const subject = (parsed.subject || '').toLowerCase();
        if (!subject.includes('message') && !subject.includes('conversation') && !subject.includes('sent you')) continue;

        let buyerName = extractBuyerName(parsed);
        if (!buyerName) continue;
        buyerName = buyerName.replace(/\s+about\s+order.*/i, '').replace(/\s+from\s+[A-Za-z][A-Za-z0-9_\-]+\s*$/, '').trim();
        if (!buyerName || SKIP_NAMES.has(buyerName) || buyerName.length < 2) continue;

        const storeEmail = extractStoreEmail(parsed);
        const storeId = storeEmail ? emailToStore[storeEmail] : null;
        if (!storeId) continue;

        emailData.push({ storeId, buyerName, date: parsed.date || new Date() });
      } catch(e) { /* skip */ }
    }

    console.log('Older email entries collected:', emailData.length);
    emailData.sort((a, b) => b.date - a.date);

    let updated = 0;
    const updatedConvIds = new Set();
    for (const ed of emailData) {
      const convList = storeConvs[ed.storeId];
      if (!convList || convList.length === 0) continue;

      let bestConv = null, bestDiff = Infinity;
      for (const conv of convList) {
        if (updatedConvIds.has(conv.id)) continue;
        const convTime = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0;
        const diff = Math.abs(ed.date.getTime() - convTime);
        if (diff < bestDiff && diff < 90 * 24 * 3600 * 1000) {
          bestDiff = diff;
          bestConv = conv;
        }
      }
      if (bestConv) {
        await pool.query('UPDATE conversations SET customer_name = $1 WHERE id = $2', [ed.buyerName, bestConv.id]);
        updatedConvIds.add(bestConv.id);
        console.log('Phase2 fixed conv', bestConv.id, '(store', ed.storeId, ') ->', ed.buyerName);
        updated++;
      }
    }
    console.log('Phase2 updated:', updated);
  } finally {
    lock.release();
    await client.logout();
  }

  const finalCount = await pool.query("SELECT COUNT(*) FROM conversations WHERE customer_name = 'Unknown Customer'");
  console.log('\nFinal Unknown Customer remaining:', finalCount.rows[0].count);
  pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); pool.end(); });
