// Retry the failed job in etsy-discounts-execute and clean up discount-execute
const {Queue}=require('C:/etsy/הנחות/node_modules/bullmq');

async function main() {
  const newQueue=new Queue('etsy-discounts-execute',{connection:{host:'185.241.4.225',port:6380}});
  const oldQueue=new Queue('discount-execute',{connection:{host:'185.241.4.225',port:6380}});

  // Clean up old queue
  await oldQueue.obliterate({force:true});
  console.log('Old queue (discount-execute) obliterated');

  // Retry failed job in new queue
  const failed=await newQueue.getFailed();
  console.log('Failed jobs:', failed.length);
  for (const job of failed) {
    console.log('Retrying job:', job.id, 'taskId:', job.data?.taskId);
    await job.retry();
  }

  // Check status
  const waiting=await newQueue.getWaiting();
  const active=await newQueue.getActive();
  console.log('After retry - Waiting:', waiting.length, 'Active:', active.length);

  await newQueue.close();
  await oldQueue.close();
}
main().catch(e=>console.log('Error:',e.message));
