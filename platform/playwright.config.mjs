import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:20000,workers:1,
 use:{baseURL:'http://127.0.0.1:4173',headless:true,launchOptions:process.env.CP_CHROMIUM_PATH?{executablePath:process.env.CP_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu']}:{}},
 webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory ..',url:'http://127.0.0.1:4173/platform/admin/preview.html',reuseExistingServer:false},
 reporter:'list'});
