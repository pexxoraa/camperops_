import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { get } from '../config/database.js';
import { decodeRealtimeTicket, decodeToken } from '../security.js';

const rooms=new Map();
const room=id=>{id=Number(id);if(!rooms.has(id))rooms.set(id,new Set());return rooms.get(id);};

export function makeEvent(type,expeditionId,entityType,entityId,data={}) {
  return {event_id:randomUUID(),type,expedition_id:Number(expeditionId),entity_type:entityType||null,
    entity_id:entityId?Number(entityId):null,occurred_at:new Date().toISOString(),data};
}

export function broadcast(expeditionId,event) {
  const payload=JSON.stringify(event);let sent=0;
  for(const ws of room(expeditionId)) if(ws.readyState===1&&ws.polaropsAuthenticated){ws.send(payload);sent++;}
  return sent;
}

export function configureRealtime(server) {
  const wss=new WebSocketServer({noServer:true});
  server.on('upgrade',(request,socket,head)=>{
    try{
      const url=new URL(request.url,'http://localhost'),match=url.pathname.match(/^\/ws\/expeditions\/(\d+)$/);
      if(!match){socket.destroy();return;}
      const expeditionId=Number(match[1]),ticket=decodeRealtimeTicket(url.searchParams.get('ticket')||'');
      const user=get('SELECT * FROM users WHERE id=? AND active=1',Number(ticket.uid));
      const expedition=get('SELECT * FROM expeditions WHERE id=?',expeditionId);
      if(Number(ticket.eid)!==expeditionId||!user||!expedition||Number(user.organization_id)!==Number(ticket.oid)||Number(expedition.organization_id)!==Number(user.organization_id)){socket.destroy();return;}
      wss.handleUpgrade(request,socket,head,ws=>{
        ws.polaropsAuthenticated=false;room(expeditionId).add(ws);
        ws.on('message',buffer=>{
          try{
            const msg=JSON.parse(buffer.toString());
            if(msg.type==='auth'){
              const session=decodeToken(msg.token||'');
              if(Number(session.uid)!==Number(ticket.uid)||Number(session.oid)!==Number(ticket.oid)){ws.close(4401,'Unauthorized');return;}
              ws.polaropsAuthenticated=true;
              ws.send(JSON.stringify({type:'auth.ok',expedition_id:expeditionId,user_id:session.uid,server_time:new Date().toISOString()}));
            }else if(msg.type==='ping')ws.send(JSON.stringify({type:'pong',server_time:new Date().toISOString()}));
          }catch{ws.send(JSON.stringify({type:'error',detail:'Invalid realtime message'}));}
        });
        ws.on('close',()=>room(expeditionId).delete(ws));
      });
    }catch{socket.destroy();}
  });
  return wss;
}
