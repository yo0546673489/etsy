@echo off
set PM2_HOME=C:\Users\Administrator\.pm2
set PATH=%PATH%;C:\Users\Administrator\AppData\Roaming\npm;C:\Program Files\nodejs
cd /d C:\etsy\הודעות
pm2 resurrect
