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
  'If', 'It', 'Is', 'In', 'Ai', 'GJ', 'Re',
]);

function extractBuyerName(parsed) {
  const subject = parsed.subject || '';
  // "Etsy Conversation with Michelle"
  const convoMatch = subject.match(/conversation with (.+?)(?:\s*$)/i);
  if (convoMatch) return convoMatch[1].trim();
  // "Message from Flore Collas"
  const fromMatch = subject.match(/message from (.+?)(?:\s*[-–—]|\s*$)/i);
  if (fromMatch) return fromMatch[1].trim();
  // "Flore sent you a message"
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
  return null;
}

function extractConversationId(parsed) {
  const html = parsed.html || '';
  const text = parsed.text || '';
  const combined = html + ' ' + text;

  // Direct Etsy conversation URL
  const directMatch = combined.match(/etsy\.com\/(?:messages|your\/conversations)\/(\d+)/i);
  if (directMatch) return directMatch[1];

  // ablink URL — extract numeric ID from the end of the tracking URL
  // e.g. ablink.account.etsy.com/ls/click?...&c=conversation_id
  const ablinkMatch = combined.match(/ablink\.account\.etsy\.com\/[^"'<>\s]*/g);
  if (ablinkMatch) {
    for (const url of ablinkMatch) {
      // Try to find conversation ID in query params
      const cidMatch = url.match(/[?&](?:conversation_id|cid|id)=(\d+)/i);
      if (cidMatch) return cidMatch[1];
    }
  }

  return null;
}

async function main() {
  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: 'a05832261551@gmail.com', pass: 'ovmp vyok huwe qjkz' },
    logger: false,
  });

  await client.connect();
  console.log('Connected to IMAP');

  const lock = await client.getMailboxLock('INBOX');
  try {
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const uids = await client.search({ from: 'etsy.com', since }, { uid: true });
    const uidArr = Array.isArray(uids) ? uids : [];
    console.log('Total Etsy emails in last 60 days:', uidArr.length);

    // First: load stores from DB to map email → store_id
    const storesResult = await pool.query('SELECT id, store_email, store_number FROM stores');
    const emailToStore = {};
    for (const s of storesResult.rows) {
      if (s.store_email) emailToStore[s.store_email.toLowerCase()] = s.id;
    }
    console.log('Stores loaded:', storesResult.rows.length);

    // Load all "Unknown Customer" conversations
    const unknownConvs = await pool.query(
      "SELECT id, store_id, etsy_conversation_url, last_message_at FROM conversations WHERE customer_name = 'Unknown Customer' ORDER BY store_id, last_message_at DESC"
    );
    console.log('Unknown Customer conversations:', unknownConvs.rows.length);

    // Build lookup: store_id → list of conversations
    const storeConvs = {};
    for (const c of unknownConvs.rows) {
      if (!storeConvs[c.store_id]) storeConvs[c.store_id] = [];
      storeConvs[c.store_id].push(c);
    }

    // Collect email data: storeId + buyerName + date
    const emailData = []; // {storeId, buyerName, date}

    for (const uid of uidArr) {
      try {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
        if (!msg) continue;
        const parsed = await simpleParser(msg.source);
        const subject = (parsed.subject || '').toLowerCase();
        if (!subject.includes('message') && !subject.includes('conversation') && !subject.includes('sent you')) continue;

        const buyerName = extractBuyerName(parsed);
        if (!buyerName || SKIP_NAMES.has(buyerName) || buyerName.length < 2) continue;

        const storeEmail = extractStoreEmail(parsed);
        const storeId = storeEmail ? emailToStore[storeEmail] : null;
        if (!storeId) continue;

        emailData.push({ storeId, buyerName, date: parsed.date || new Date(), uid });
      } catch(e) { /* skip */ }
    }

    console.log('Valid email entries collected:', emailData.length);

    // Now match: for each (storeId, buyerName) pair, find the Unknown Customer conversation
    // with closest date to the email's date
    let updated = 0;
    const updatedConvIds = new Set();

    // Sort email data by date DESC (most recent first)
    emailData.sort((a, b) => b.date - a.date);

    for (const ed of emailData) {
      const convList = storeConvs[ed.storeId];
      if (!convList || convList.length === 0) continue;

      // Find the closest conversation by date (within 30 days of email)
      const emailTime = ed.date.getTime();
      let bestConv = null;
      let bestDiff = Infinity;

      for (const conv of convList) {
        if (updatedConvIds.has(conv.id)) continue;
        const convTime = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0;
        const diff = Math.abs(emailTime - convTime);
        if (diff < bestDiff && diff < 30 * 24 * 3600 * 1000) { // within 30 days
          bestDiff = diff;
          bestConv = conv;
        }
      }

      if (bestConv) {
        await pool.query('UPDATE conversations SET customer_name = $1 WHERE id = $2', [ed.buyerName, bestConv.id]);
        updatedConvIds.add(bestConv.id);
        console.log(`Updated conv ${bestConv.id} (store ${ed.storeId}) → ${ed.buyerName}`);
        updated++;
      }
    }

    console.log('\nDone! Updated', updated, 'conversations');

    // Final stats
    const remaining = await pool.query("SELECT COUNT(*) FROM conversations WHERE customer_name = 'Unknown Customer'");
    console.log('Remaining Unknown Customer:', remaining.rows[0].count);

  } finally {
    lock.release();
    await client.logout();
    pool.end();
  }
}

main().catch(e => { console.error('Fatal error:', e.message); pool.end(); });
