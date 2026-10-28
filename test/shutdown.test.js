const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('graceful shutdown closes preconnected browser sockets', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'dispatch-shutdown-'));
  const child = spawn(process.execPath,[path.resolve(__dirname,'../bin.js')],{cwd:dir,env:{...process.env,CODEX_QUEUE_NO_OPEN:'1',CODEX_QUEUE_PORT:'3540'},stdio:['ignore','pipe','pipe']});
  let socket;
  t.after(()=>{socket?.destroy();if(child.exitCode===null)child.kill('SIGKILL');fs.rmSync(dir,{recursive:true,force:true});});
  const port = await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Startup timeout')),5000);
    child.stdout.on('data',b=>{const m=String(b).match(/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(+m[1]);}});
  });
  socket=net.connect(port,'127.0.0.1');
  await once(socket,'connect');
  const done=once(child,'exit');
  child.kill('SIGTERM');
  let timer;
  const result=await Promise.race([done,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),2500);})]);
  clearTimeout(timer);
  assert.ok(result,'Server must exit even with an idle browser socket');
  assert.equal(result[0],0);
  assert.equal(fs.existsSync(path.join(dir,'data/.dispatch-lock')),false);
});
