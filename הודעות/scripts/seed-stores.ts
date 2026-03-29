import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://etsy_user:etsy_pass@localhost:5432/etsy_messages',
});

const stores = [
  { store_number: 1,  store_name: 'חנות 1',  store_email: 'etsy054667@gmail.com',          serial: '1' },
  { store_number: 2,  store_name: 'חנות 2',  store_email: 'dds357784@gmail.com',           serial: '2' },
  { store_number: 3,  store_name: 'חנות 3',  store_email: 'smwl40651@gmail.com',           serial: '3' },
  { store_number: 4,  store_name: 'חנות 4',  store_email: 'syrh866@gmail.com',             serial: '4' },
  { store_number: 5,  store_name: 'חנות 5',  store_email: 'bjcjfbm@outlook.co.il',         serial: '5' },
  { store_number: 6,  store_name: 'חנות 6',  store_email: 'yr0786049@gmail.com',           serial: '6' },
  { store_number: 7,  store_name: 'חנות 7',  store_email: 'yhb07766@gmail.com',            serial: '7' },
  { store_number: 8,  store_name: 'חנות 8',  store_email: 'fsccec2026@hotmail.com',        serial: '8' },
  { store_number: 9,  store_name: 'חנות 9',  store_email: 'kbqrgd@gmail.com',              serial: '9' },
  { store_number: 10, store_name: 'חנות 10', store_email: 'Prodigitaecomm@gmail.com',      serial: '10' },
  { store_number: 11, store_name: 'חנות 11', store_email: 'leftist@outlook.co.il',         serial: '11' },
  { store_number: 12, store_name: 'חנות 12', store_email: 'tctcy22@gmail.com',             serial: '12' },
  { store_number: 13, store_name: 'חנות 13', store_email: 'hygfff672@gmail.com',           serial: '13' },
  { store_number: 14, store_name: 'חנות 14', store_email: 'dnkdnek@outlook.com',           serial: '14' },
  { store_number: 15, store_name: 'חנות 15', store_email: 'pearl199711@hotmail.com',       serial: '15' },
  { store_number: 16, store_name: 'חנות 16', store_email: 'hxjxjdjdj@outlook.co.il',      serial: '16' },
  { store_number: 17, store_name: 'חנות 17', store_email: 'Lily20@outlook.co.il',          serial: '17' },
  { store_number: 18, store_name: 'חנות 18', store_email: 'gfdyhgt@outlook.co.il',         serial: '18' },
  { store_number: 19, store_name: 'חנות 19', store_email: 'Yair47@outlook.co.il',          serial: '19' },
  { store_number: 20, store_name: 'חנות 20', store_email: 'cdexwcv53x3@outlook.co.il',     serial: '20' },
  { store_number: 21, store_name: 'חנות 21', store_email: 'shmulik18@outlook.com',         serial: '21' },
  { store_number: 22, store_name: 'חנות 22', store_email: 'Pertush@outlook.co.il',         serial: '22' },
  { store_number: 23, store_name: 'חנות 23', store_email: 'cewvty4c@outlook.co.il',        serial: '23' },
  { store_number: 24, store_name: 'חנות 24', store_email: 'sbdreha@outlook.co.il',         serial: '24' },
];

async function seed() {
  for (const store of stores) {
    await pool.query(
      `INSERT INTO stores (store_number, store_name, store_email, adspower_profile_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (store_number) DO UPDATE SET
         store_name = $2, store_email = $3, adspower_profile_id = $4, updated_at = NOW()`,
      [store.store_number, store.store_name, store.store_email, store.serial]
    );
    console.log(`Seeded store ${store.store_number}: ${store.store_email}`);
  }
  console.log('Done!');
  await pool.end();
}

seed().catch(console.error);
