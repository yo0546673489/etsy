const {Client}=require('C:/etsy/הנחות/node_modules/pg');
const c=new Client({connectionString:'postgresql://postgres:postgres_dev_password@185.241.4.225:5433/etsy_platform'});
c.connect().then(async()=>{
  const t=await c.query("SELECT id,action,status,error_message,retry_count FROM discount_tasks ORDER BY id DESC LIMIT 5");
  console.log(JSON.stringify(t.rows,null,2));
  await c.end();
}).catch(e=>console.log(e.message));
