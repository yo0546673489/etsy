module.exports = {
  apps: [
    {
      name: 'etsy-discounts',
      script: 'cmd',
      args: '/c "cd /d C:\\etsy\\הנחות && npx ts-node src/index.ts"',
      cwd: 'C:/etsy/הנחות',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      shell: true,
    },
  ],
};
