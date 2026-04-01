const {Queue}=require('C:/etsy/הנחות/node_modules/bullmq');

async function checkQueue(name) {
  const q=new Queue(name,{connection:{host:'185.241.4.225',port:6380}});
  const waiting=await q.getWaiting();
  const active=await q.getActive();
  const failed=await q.getFailed();
  const completed=await q.getCompleted();
  console.log(`\n=== Queue: ${name} ===`);
  console.log('Waiting:', waiting.length, waiting.map(j=>({id:j.id,taskId:j.data?.taskId})));
  console.log('Active:', active.length, active.map(j=>({id:j.id,taskId:j.data?.taskId})));
  console.log('Failed:', failed.length, failed.map(j=>({id:j.id,taskId:j.data?.taskId,err:j.failedReason?.substring(0,50)})));
  console.log('Completed:', completed.length, completed.map(j=>({id:j.id,taskId:j.data?.taskId})));
  await q.close();
}

async function main() {
  await checkQueue('etsy-discounts-execute');
  await checkQueue('discount-execute');
}
main().catch(e=>console.log('Error:',e.message));
