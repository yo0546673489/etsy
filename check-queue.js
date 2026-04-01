const {Queue}=require('C:/etsy/הנחות/node_modules/bullmq');
async function check() {
  const q=new Queue('etsy-discounts-execute',{connection:{host:'185.241.4.225',port:6380}});
  const waiting=await q.getWaiting();
  const active=await q.getActive();
  const failed=await q.getFailed();
  console.log('Waiting:', waiting.length, JSON.stringify(waiting.map(j=>({id:j.id,taskId:j.data?.taskId}))));
  console.log('Active:', active.length, JSON.stringify(active.map(j=>({id:j.id,taskId:j.data?.taskId}))));
  console.log('Failed:', failed.length);
  await q.close();
}
check().catch(e=>console.log('Error:',e.message));
