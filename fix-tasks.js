const {Client}=require('C:/etsy/הנחות/node_modules/pg');
const c=new Client({connectionString:'postgresql://postgres:postgres_dev_password@185.241.4.225:5433/etsy_platform'});
c.connect().then(async()=>{
  await c.query("UPDATE discount_tasks SET status='cancelled' WHERE id=7");
  console.log('Cancelled task 7');
  const t=await c.query("SELECT id,action,status,shop_id FROM discount_tasks WHERE id IN (7,8)");
  console.log(JSON.stringify(t.rows));
  await c.end();
}).catch(e=>console.log(e.message));
