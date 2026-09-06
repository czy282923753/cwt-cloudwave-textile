// Disposable peers only: never starts a CWT service, publishes a port or calls a Provider.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validateComposeGraph } from '../scripts/preflight-compose-graph.mjs';
const image = process.env.CWT_BACKUP_TEST_IMAGE;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }).trim();

test('normalized topology routes five Provider callers and denies private cross-environment/gateway access', { skip: !image, timeout: 180000 }, () => {
  const prefix = `cwt-egress-lab-${process.pid}`;
  const digest = `sha256:${'a'.repeat(64)}`;
  const graph = JSON.parse(execFileSync('docker', ['compose', '--file', resolve('compose.yaml'), '--profile', 'staging', '--profile', 'production-ai', 'config', '--format', 'json', '--no-env-resolution', '--no-path-resolution'], { encoding: 'utf8', env: { ...process.env, CWT_IMAGE_REFERENCE: `cwt.invalid/app@${digest}`, CWT_IMAGE_INDEX_DIGEST: digest, CWT_IMAGE_CHILD_DIGEST: `sha256:${'b'.repeat(64)}`, CWT_PROXY_IMAGE_REFERENCE: `cwt.invalid/proxy@${digest}`, CWT_CLOUDFLARE_RANGES_FILE: resolve('deploy/proxy/cloudflare-ranges.lab.conf') } }));
  validateComposeGraph(graph);
  const folder = mkdtempSync(join(tmpdir(), 'cwt-egress-fixture-'));
  const containers = [], networks = [];
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=provider.test', '-addext', 'subjectAltName=DNS:provider.test', '-keyout', join(folder, 'key.pem'), '-out', join(folder, 'cert.pem')], { stdio: 'ignore' });
    writeFileSync(join(folder, 'peer.cjs'), `const fs=require('fs'); require('net').createServer(s=>s.end('synthetic')).listen(43210,'0.0.0.0');require('https').createServer({key:fs.readFileSync('/fixture/key.pem'),cert:fs.readFileSync('/fixture/cert.pem')},(q,s)=>s.end('synthetic')).listen(4443,'0.0.0.0');`);
    writeFileSync(join(folder, 'probe.cjs'), `const assert=require('assert/strict'),net=require('net'),https=require('https'),fs=require('fs');
async function tcp(host,port){return new Promise(resolve=>{const s=net.connect({host,port});s.setTimeout(600);s.once('connect',()=>{s.destroy();resolve(true)});for(const e of ['error','timeout'])s.once(e,()=>{s.destroy();resolve(false)});});}
(async()=>{const c=JSON.parse(process.argv[2]); if(c.provider){assert.equal(await tcp('provider.test',4443),true);await new Promise((resolve,reject)=>https.get('https://provider.test:4443',{ca:fs.readFileSync('/fixture/cert.pem')},r=>{let b='';r.on('data',v=>b+=v);r.on('end',()=>b==='synthetic'?resolve():reject(Error('wrong peer')))}).on('error',reject));}
for(const host of c.deny)assert.equal(await tcp(host,43210),false,'private route '+host);
for(const host of c.providerDeny)assert.equal(await tcp(host,4443),false,'dormant worker provider route');
const routes=fs.readFileSync('/proc/net/route','utf8').trim().split('\\n').slice(1).map(l=>l.trim().split(/\\s+/)).filter(r=>r[1]==='00000000').map(r=>r[2].match(/../g).reverse().map(x=>parseInt(x,16)).join('.'));
assert.deepEqual(routes,c.gateway?[c.gateway]:[]);})().catch(e=>{console.error(e.message);process.exitCode=1});`);
    for (const [name, config] of Object.entries(graph.networks)) {
      const actual = `${prefix}-${name}`;
      docker(['network', 'create', ...(config.internal ? ['--internal'] : []), actual]); networks.push(actual);
    }
    function start(name, attachments, alias) {
      const id = `${prefix}-${name}`;
      const entries = Object.entries(attachments);
      docker(['create', '--pull', 'never', '--name', id, '--network', 'none', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '-v', `${folder}:/fixture:ro`, image, 'node', '/fixture/peer.cjs']); containers.push(id);
      docker(['network', 'disconnect', 'none', id]);
      for (const [network, options] of entries) docker(['network', 'connect', '--gw-priority', String(options?.gw_priority ?? 0), ...(alias ? ['--alias', alias] : []), `${prefix}-${network}`, id]);
      docker(['start', id]);
      return JSON.parse(docker(['inspect', id]))[0];
    }
    const peers = {};
    for (const name of ['web-production', 'scheduler-production', 'worker-production', 'valkey-production', 'web-staging', 'scheduler-staging', 'worker-staging', 'valkey-staging']) peers[name] = start(name, graph.services[name].networks);
    const provider = start('provider', { 'production-outbound': { gw_priority: 1 }, 'staging-outbound': null }, 'provider.test');
    const address = (peer, network) => peer.NetworkSettings.Networks[`${prefix}-${network}`].IPAddress;
    for (const role of ['web-production', 'scheduler-production', 'web-staging', 'scheduler-staging', 'worker-staging', 'worker-production']) {
      const env = role.endsWith('production') ? 'production' : 'staging';
      const other = env === 'production' ? 'staging' : 'production';
      const attachment = peers[role].NetworkSettings.Networks[`${prefix}-${env}-outbound`];
      const gateway = attachment?.Gateway;
      const deny = [address(peers[`web-${other}`], `${other}-ingress`), address(peers[`web-${other}`], `${other}-backend`), address(peers[`valkey-${other}`], `${other}-backend`), ...(gateway ? [gateway] : [])];
      const providerDeny = role === 'worker-production' ? ['production', 'staging'].map(e => address(provider, `${e}-outbound`)) : [];
      docker(['exec', `${prefix}-${role}`, 'node', '/fixture/probe.cjs', JSON.stringify({ provider: role !== 'worker-production', deny, providerDeny, gateway })]);
    }
  } finally {
    for (const name of containers.reverse()) { try { docker(['rm', '-f', name]); } catch {} }
    for (const name of networks.reverse()) { try { docker(['network', 'rm', name]); } catch {} }
    rmSync(folder, { recursive: true, force: true });
  }
});
