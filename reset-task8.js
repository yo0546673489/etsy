const {Client}=require('C:/etsy/הנחות/node_modules/pg');
const c=new Client({connectionString:'postgresql://postgres:postgres_dev_password@185.241.4.225:5433/etsy_platform'});
c.connect().then(async()=>{
  await c.query("UPDATE discount_tasks SET status='pending', error_message=NULL, retry_count=0, started_at=NULL, completed_at=NULL WHERE id=8");
  console.log('Task 8 reset to pending');
  const t=await c.query("SELECT id,action,status FROM discount_tasks WHERE id=8");
  console.log(JSON.stringify(t.rows[0]));
  await c.end();
}).catch(e=>console.log(e.message));
