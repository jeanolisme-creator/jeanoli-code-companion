#!/usr/bin/env node

/**
 * Jeanoli Studio IA - Local Deploy Server
 * 
 * Este script gerencia servidores Vite locais para projetos.
 * Execute com: node local-deploy-server.js
 * 
 * API:
 *   POST /api/deploy  { project, port, branch }  → Inicia dev server
 *   POST /api/stop    { port }                    → Para dev server
 *   GET  /api/status                              → Lista servidores ativos
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const API_PORT = 7799;
const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(require('os').homedir(), 'projects');
const activeServers = new Map();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res, data, status = 200) {
  res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function startDevServer(projectPath, port) {
  if (activeServers.has(port)) {
    const existing = activeServers.get(port);
    existing.process.kill();
    activeServers.delete(port);
  }

  // Install deps if needed
  const nodeModules = path.join(projectPath, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    console.log(`📦 Instalando dependências em ${projectPath}...`);
    execSync('npm install', { cwd: projectPath, stdio: 'inherit' });
  }

  console.log(`🚀 Iniciando Vite na porta ${port} para ${projectPath}`);
  
  const child = spawn('npx', ['vite', '--port', String(port), '--host', '0.0.0.0'], {
    cwd: projectPath,
    stdio: 'pipe',
    shell: true,
  });

  child.stdout.on('data', d => console.log(`[${port}] ${d.toString().trim()}`));
  child.stderr.on('data', d => console.error(`[${port}] ${d.toString().trim()}`));
  child.on('exit', code => {
    console.log(`[${port}] Processo encerrado (code ${code})`);
    activeServers.delete(port);
  });

  activeServers.set(port, {
    process: child,
    project: path.basename(projectPath),
    port,
    startedAt: new Date().toISOString(),
  });

  return { url: `http://localhost:${port}`, port, project: path.basename(projectPath) };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${API_PORT}`);

  if (url.pathname === '/api/deploy' && req.method === 'POST') {
    const { project, port, branch } = await parseBody(req);
    if (!project || !port) return sendJson(res, { error: 'project e port são obrigatórios' }, 400);
    if (port < 4002 || port > 4500) return sendJson(res, { error: 'Porta deve ser entre 4002 e 4500' }, 400);

    const repoName = project.includes('/') ? project.split('/')[1] : project;
    const projectPath = path.join(PROJECTS_DIR, repoName);

    if (!fs.existsSync(projectPath)) {
      // Try to clone
      try {
        console.log(`📥 Clonando ${project}...`);
        const branchArg = branch ? `-b ${branch}` : '';
        execSync(`git clone ${branchArg} https://github.com/${project}.git ${projectPath}`, { stdio: 'inherit' });
      } catch (err) {
        return sendJson(res, { error: `Projeto não encontrado em ${projectPath} e clone falhou` }, 404);
      }
    }

    try {
      const result = startDevServer(projectPath, port);
      return sendJson(res, { ok: true, ...result });
    } catch (err) {
      return sendJson(res, { error: err.message }, 500);
    }
  }

  if (url.pathname === '/api/stop' && req.method === 'POST') {
    const { port } = await parseBody(req);
    const entry = activeServers.get(port);
    if (entry) {
      entry.process.kill();
      activeServers.delete(port);
      return sendJson(res, { ok: true, message: `Servidor na porta ${port} encerrado` });
    }
    return sendJson(res, { error: 'Nenhum servidor ativo nesta porta' }, 404);
  }

  if (url.pathname === '/api/status' && req.method === 'GET') {
    const servers = [];
    for (const [port, info] of activeServers) {
      servers.push({ port, project: info.project, startedAt: info.startedAt });
    }
    return sendJson(res, { servers });
  }

  // ── AI Proxy (resolve CORS para NVIDIA, Gemini, etc.) ──────────
  if (url.pathname === '/api/ai-proxy' && req.method === 'POST') {
    const { targetUrl, headers: reqHeaders, body } = await parseBody(req);
    if (!targetUrl) return sendJson(res, { error: 'targetUrl é obrigatório' }, 400);

    try {
      const https = targetUrl.startsWith('https') ? require('https') : require('http');
      const parsed = new URL(targetUrl);

      const proxyHeaders = { 'Content-Type': 'application/json', ...(reqHeaders || {}) };
      const payload = typeof body === 'string' ? body : JSON.stringify(body);

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { ...proxyHeaders, 'Content-Length': Buffer.byteLength(payload) },
      };

      // Stream response back
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const proxyReq = https.request(options, (proxyRes) => {
        proxyRes.on('data', chunk => res.write(chunk));
        proxyRes.on('end', () => res.end());
      });

      proxyReq.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      });

      proxyReq.write(payload);
      proxyReq.end();
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
    return;
  }

  sendJson(res, { error: 'Rota não encontrada' }, 404);
});

server.listen(API_PORT, () => {
  console.log(`\n🔧 Jeanoli Studio - Local Deploy Server`);
  console.log(`   API rodando em http://localhost:${API_PORT}`);
  console.log(`   Diretório de projetos: ${PROJECTS_DIR}`);
  console.log(`   Portas disponíveis: 4002 - 4500\n`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando todos os servidores...');
  for (const [port, info] of activeServers) {
    info.process.kill();
    console.log(`   Porta ${port} encerrada`);
  }
  process.exit(0);
});
