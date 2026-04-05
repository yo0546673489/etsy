const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmd = `docker exec etsy-db psql -U postgres -d etsy_messages -c "SELECT id, store_number, store_name, store_email, adspower_profile_id FROM stores ORDER BY store_number LIMIT 5;"`;
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('EXEC ERROR:', err); conn.end(); return; }
    stream.on('close', (code) => {
      console.log('Exit code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '185.241.4.225',
  port: 22,
  username: 'root',
  password: 'aA@05466734890',
  readyTimeout: 20000
});

conn.on('error', (err) => {
  console.error('SSH ERROR:', err.message);
});
