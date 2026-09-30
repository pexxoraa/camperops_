import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createApp } from '../app.js';
import { createDatabase, setDatabaseForTest } from '../config/database.js';
import { configureRealtime } from '../services/localRealtimeService.js';

async function startFixture() {
  const db=await createDatabase(':memory:');
  db.prepare('INSERT INTO organizations(id,name,country_code,operator_type,created_at) VALUES(99,?,?,?,?)')
    .run('Other Programme','ZZ','Research','2026-09-29T00:00:00Z');
  db.prepare('INSERT INTO expeditions(id,organization_id,name,region,status,created_at) VALUES(99,99,?,?,?,?)')
    .run('Other Expedition','Antarctic Region','Active','2026-09-29T00:00:00Z');
  setDatabaseForTest(db);
  const server=http.createServer(createApp());
  configureRealtime(server);
  await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const base='http://127.0.0.1:'+address.port;
  return {db,server,base,port:address.port};
}

async function login(base,email,password){
  const response=await fetch(base+'/api/auth/login',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password}),
  });
  assert.equal(response.status,200);
  return response.json();
}

async function api(base,token,path,options={}){
  return fetch(base+path,{
    ...options,
    headers:{'content-type':'application/json',authorization:'Bearer '+token,...(options.headers||{})},
  });
}
test('HTTP auth, tenant isolation, CRUD, routes and search preserve core behavior', async (t)=>{
  const fixture=await startFixture();
  t.after(async()=>{
    await new Promise((resolve)=>fixture.server.close(resolve));
    fixture.db.close();
  });
  const commander=await login(fixture.base,'commander@camperops.local','CamperOps123!');
  const field=await login(fixture.base,'field@camperops.local','Field123!');

  let response=await api(fixture.base,commander.token,'/api/bootstrap');
  const bootstrap=await response.json();
  assert.equal(response.status,200);
  assert.equal(bootstrap.expeditions.length,2);
  assert.ok(bootstrap.expeditions.some((x)=>x.region.includes('Antarctic')));
  assert.ok(bootstrap.expeditions.some((x)=>x.region.includes('Arctic')));

  response=await api(fixture.base,field.token,'/api/vehicles',{
    method:'POST',body:JSON.stringify({expedition_id:1,code:'DENIED',name:'Denied Vehicle'}),
  });
  assert.equal(response.status,403);

  response=await api(fixture.base,commander.token,'/api/realtime/ticket?expedition_id=99');
  assert.equal(response.status,403);
  response=await api(fixture.base,commander.token,'/api/locations',{
    method:'POST',body:JSON.stringify({expedition_id:1,name:'Integration Test Camp',type:'Camp',latitude:-75.5,longitude:124.5}),
  });
  assert.equal(response.status,201);
  const location=await response.json();

  response=await api(fixture.base,commander.token,'/api/personnel',{
    method:'POST',body:JSON.stringify({expedition_id:1,name:'Integration Tester',role:'Field Engineer',team:'Test',location_id:location.id}),
  });
  assert.equal(response.status,201);
  const person=await response.json();

  response=await api(fixture.base,commander.token,'/api/vehicles',{
    method:'POST',body:JSON.stringify({expedition_id:1,code:'IT-V01',name:'Integration Rover',type:'Ground',location_id:location.id,fuel_percent:90,range_km:250}),
  });
  assert.equal(response.status,201);
  const vehicle=await response.json();

  response=await api(fixture.base,commander.token,'/api/ops/routes',{
    method:'POST',
    body:JSON.stringify({expedition_id:1,name:'Integration Traverse',start_lat:-75.5,start_lon:124.5,end_lat:-75.7,end_lon:125.1,vehicle_id:vehicle.id,personnel_id:person.id}),
  });
  assert.equal(response.status,201);
  const route=await response.json();
  assert.ok(route.distance_km>0);
  assert.ok(route.eta_minutes>0);
  assert.ok(route.fuel_liters>0);
  response=await api(fixture.base,commander.token,'/api/ops/search?expedition_id=1&q=Integration');
  assert.equal(response.status,200);
  const search=await response.json();
  assert.ok(search.items.some((x)=>x.kind==='personnel'&&x.id===person.id));
  assert.ok(search.items.some((x)=>x.kind==='route'&&x.id===route.id));

  response=await fetch(fixture.base+'/api/public/arctic-research-stations');
  const arctic=await response.json();
  assert.equal(response.status,200);
  assert.equal(arctic.live,false);
  assert.ok(arctic.items.length>20);
  assert.ok(arctic.items.every((x)=>x.verification_status));

  response=await fetch(fixture.base+'/api/public/facilities');
  const antarctic=await response.json();
  assert.equal(response.status,200);
  assert.ok(antarctic.length>50);
  assert.ok(antarctic.every((x)=>x.live===false));
});
test('realtime websocket requires authorized ticket and session token', async (t)=>{
  const fixture=await startFixture();
  t.after(async()=>{
    await new Promise((resolve)=>fixture.server.close(resolve));
    fixture.db.close();
  });
  const commander=await login(fixture.base,'commander@camperops.local','CamperOps123!');
  const response=await api(fixture.base,commander.token,'/api/realtime/ticket?expedition_id=1');
  assert.equal(response.status,200);
  const {ticket}=await response.json();

  const message=await new Promise((resolve,reject)=>{
    const ws=new WebSocket('ws://127.0.0.1:'+fixture.port+'/ws/expeditions/1?ticket='+encodeURIComponent(ticket));
    const timer=setTimeout(()=>reject(new Error('WebSocket timeout')),3000);
    ws.on('open',()=>ws.send(JSON.stringify({type:'auth',token:commander.token})));
    ws.on('message',(data)=>{
      clearTimeout(timer);
      const parsed=JSON.parse(data.toString());
      ws.close();
      resolve(parsed);
    });
    ws.on('error',reject);
  });
  assert.equal(message.type,'auth.ok');
  assert.equal(message.expedition_id,1);
});

test('cargo IDs, QR lookup and custody history remain linked', async (t) => {
  const fixture = await startFixture()
  t.after(async () => {
    await new Promise((resolve) => fixture.server.close(resolve))
    fixture.db.close()
  })

  const commander = await login(
    fixture.base,
    'commander@camperops.local',
    'CamperOps123!',
  )

  let response = await api(fixture.base, commander.token, '/api/locations', {
    method: 'POST',
    body: JSON.stringify({
      expedition_id: 1,
      name: 'Cargo QR Test Depot',
      type: 'Depot',
      latitude: -75.1,
      longitude: 123.2,
    }),
  })
  assert.equal(response.status, 201)
  const location = await response.json()

  response = await api(fixture.base, commander.token, '/api/cargo', {
    method: 'POST',
    body: JSON.stringify({
      expedition_id: 1,
      code: 'QR-IT-001',
      name: 'QR integration cargo',
      current_location_id: location.id,
      assigned_to: 'Depot Team',
    }),
  })
  assert.equal(response.status, 201)
  const cargo = await response.json()
  assert.equal(cargo.code, 'QR-IT-001')
  assert.equal(cargo.qr_value, 'CAMPEROPS:CARGO:1:QR-IT-001')

  response = await api(
    fixture.base,
    commander.token,
    '/api/cargo/lookup?expedition_id=1&value=' +
      encodeURIComponent(cargo.qr_value),
  )
  assert.equal(response.status, 200)
  const scanned = await response.json()
  assert.equal(scanned.id, cargo.id)

  response = await api(
    fixture.base,
    commander.token,
    '/api/cargo/' + cargo.id + '/custody',
    {
      method: 'POST',
      body: JSON.stringify({
        to_custodian: 'Field Team Bravo',
        location_id: location.id,
        status: 'In Transit',
        note: 'Transferred for field delivery',
      }),
    },
  )
  assert.equal(response.status, 200)
  const transferred = await response.json()
  assert.equal(transferred.assigned_to, 'Field Team Bravo')
  assert.equal(transferred.status, 'In Transit')

  response = await api(
    fixture.base,
    commander.token,
    '/api/cargo/' + cargo.id + '/events',
  )
  assert.equal(response.status, 200)
  const events = await response.json()
  const handoff = events.find((item) => item.custody_action === 'Handoff')
  assert.ok(handoff)
  assert.equal(handoff.from_custodian, 'Depot Team')
  assert.equal(handoff.to_custodian, 'Field Team Bravo')
  assert.equal(handoff.location_name, 'Cargo QR Test Depot')
})
