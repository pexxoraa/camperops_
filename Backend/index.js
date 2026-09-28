import http from 'node:http';
import { env } from './config/env.js';
import { initDatabase } from './config/database.js';
import { createApp } from './app.js';
import { configureRealtime } from './services/realtimeService.js';

initDatabase();
const app=createApp();
const server=http.createServer(app);
configureRealtime(server);

server.listen(env.port,'127.0.0.1',()=>{
  console.log('PolarOps backend listening on http://localhost:'+env.port);
});

export { app, server };
