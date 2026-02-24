import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Project, RepoFile, OpenFile } from '@/types';

export function useGithubFiles() {
  const [fileTree, setFileTree] = useState<RepoFile[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const projectRef = useRef<Project | null>(null);
  const filesContentCache = useRef<Record<string, string>>({});

  const parseOwnerRepo = (fullName: string) => {
    const [owner, repo] = fullName.split('/');
    return { owner, repo };
  };

  // Build real preview from actual GitHub files
  const buildRealPreview = useCallback(async (project: Project, files: RepoFile[], extraFiles?: Record<string, string>) => {
    const { owner, repo } = parseOwnerRepo(project.fullName);
    const branch = project.branch || 'main';
    const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;

    // Merge cached files with any extra content (from edits)
    const allContent = { ...filesContentCache.current, ...extraFiles };

    // Try to load index.html
    let indexHtml = allContent['index.html'];
    if (!indexHtml && files.some(f => f.path === 'index.html')) {
      try {
        const { data } = await supabase.functions.invoke('github-repo-files', {
          body: { owner, repo, branch, token: project.token, action: 'file', path: 'index.html' },
        });
        if (data?.ok && data.content) {
          indexHtml = data.content;
          filesContentCache.current['index.html'] = indexHtml;
        }
      } catch {}
    }

    // For static HTML sites - inject <base> so all relative URLs resolve
    if (indexHtml) {
      // Check if it already has a <base> tag
      if (!indexHtml.includes('<base ')) {
        indexHtml = indexHtml.replace(
          /<head([^>]*)>/i,
          `<head$1><base href="${rawBase}" />`
        );
      }

      // Also load any local CSS files referenced
      const cssMatches = [...indexHtml.matchAll(/href=["']([^"']+\.css)["']/g)];
      for (const match of cssMatches) {
        const cssPath = match[1];
        if (cssPath.startsWith('http')) continue;
        const cachedCss = allContent[cssPath];
        if (cachedCss) {
          // Inline the CSS with raw base for url() references
          const cssWithBase = cachedCss.replace(/url\(['"]?(?!data:|http)([^'")]+)['"]?\)/g, `url('${rawBase}$1')`);
          indexHtml = indexHtml.replace(match[0], `data-original-href="${cssPath}"`);
          indexHtml = indexHtml.replace('</head>', `<style data-file="${cssPath}">${cssWithBase}</style></head>`);
        }
      }

      setPreviewHtml(indexHtml);
      return;
    }

    // For React/JS projects - load key source files and render a rich project overview
    const keyFiles = ['package.json', 'README.md', 'src/App.tsx', 'src/App.jsx', 'src/App.js', 'src/main.tsx', 'src/index.tsx'];
    const toFetch = keyFiles.filter(f => files.some(rf => rf.path === f) && !allContent[f]);
    
    if (toFetch.length > 0) {
      try {
        const { data } = await supabase.functions.invoke('github-repo-files', {
          body: { owner, repo, branch, token: project.token, action: 'batch', path: toFetch },
        });
        if (data?.ok && data.files) {
          Object.assign(filesContentCache.current, data.files);
          Object.assign(allContent, data.files);
        }
      } catch {}
    }

    // Parse package.json for dependencies
    let deps: string[] = [];
    let scripts: string[] = [];
    let description = '';
    if (allContent['package.json']) {
      try {
        const pkg = JSON.parse(allContent['package.json']);
        deps = Object.keys(pkg.dependencies || {}).slice(0, 15);
        scripts = Object.keys(pkg.scripts || {});
        description = pkg.description || '';
      } catch {}
    }

    // Parse README
    const readme = allContent['README.md'] || '';
    const readmeHtml = readme
      ? readme
          .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/```[\s\S]*?```/g, (m) => `<pre>${m.slice(3, -3)}</pre>`)
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br/>')
      : '';

    // Get the main app source for code preview
    const appSource = allContent['src/App.tsx'] || allContent['src/App.jsx'] || allContent['src/App.js'] || '';
    const escapedSource = appSource
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Build file tree HTML
    const dirs: Record<string, string[]> = {};
    files.filter(f => !f.path.includes('node_modules') && !f.path.startsWith('.')).slice(0, 80).forEach(f => {
      const dir = f.path.includes('/') ? f.path.split('/').slice(0, -1).join('/') : '.';
      if (!dirs[dir]) dirs[dir] = [];
      dirs[dir].push(f.path.split('/').pop() || f.path);
    });

    const treeHtml = Object.entries(dirs).sort(([a], [b]) => a.localeCompare(b))
      .map(([dir, dirFiles]) =>
        `<div class="dir"><div class="dn">📁 ${dir}</div>${dirFiles.map(f => `<div class="fl">📄 ${f}</div>`).join('')}</div>`
      ).join('');

    setPreviewHtml(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${project.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#09090b;color:#e4e4e7;min-height:100vh}
.hd{padding:20px 24px;border-bottom:1px solid #27272a;display:flex;align-items:center;gap:14px;background:#0c0c10}
.hd .logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff;flex-shrink:0}
.hd h1{font-size:18px;font-weight:700;color:#fafafa}
.hd .sub{font-size:11px;color:#71717a;margin-top:2px}
.badge{display:inline-flex;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.2);margin-left:6px}
.tabs{display:flex;border-bottom:1px solid #27272a;background:#0c0c10}
.tab{padding:10px 20px;font-size:12px;font-weight:600;color:#71717a;cursor:pointer;border-bottom:2px solid transparent;transition:.2s}
.tab:hover{color:#a1a1aa}
.tab.active{color:#818cf8;border-bottom-color:#818cf8}
.panel{display:none;padding:24px;overflow:auto;max-height:calc(100vh - 140px)}
.panel.active{display:block}
.readme h1{font-size:26px;font-weight:800;margin-bottom:14px;background:linear-gradient(135deg,#fafafa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.readme h2{font-size:18px;font-weight:700;margin:18px 0 8px;color:#e4e4e7}
.readme h3{font-size:15px;font-weight:600;margin:14px 0 6px;color:#a1a1aa}
.readme p{margin-bottom:8px;line-height:1.6;color:#a1a1aa}
.readme code{background:#1e1e2e;padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#818cf8}
.readme pre{background:#1e1e2e;padding:14px;border-radius:8px;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:12px;color:#a1a1aa;margin:10px 0;border:1px solid #27272a}
.readme a{color:#818cf8;text-decoration:none}
.readme strong{color:#fafafa}
.code-view{background:#0f0f14;border-radius:10px;border:1px solid #27272a;overflow:hidden}
.code-view .ch{padding:8px 14px;background:#18181b;border-bottom:1px solid #27272a;font-size:11px;color:#71717a;font-family:'JetBrains Mono',monospace}
.code-view pre{padding:14px;margin:0;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6;color:#a1a1aa;overflow-x:auto;max-height:400px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.card{background:#18181b;border-radius:10px;border:1px solid #27272a;padding:16px}
.card h3{font-size:13px;font-weight:700;color:#fafafa;margin-bottom:10px}
.dep{display:inline-flex;padding:3px 10px;margin:2px;border-radius:6px;font-size:11px;background:#27272a;color:#a1a1aa}
.script{font-family:'JetBrains Mono',monospace;font-size:11px;color:#818cf8;padding:4px 0}
.tree{background:#0d0d14}
.dir{margin-bottom:8px}
.dn{font-size:12px;font-weight:600;color:#a1a1aa;margin-bottom:3px}
.fl{font-size:11px;color:#52525b;padding:1px 0 1px 18px;font-family:'JetBrains Mono',monospace}
.fl:hover{color:#818cf8}
.stats{display:flex;gap:20px;padding:14px 24px;border-top:1px solid #27272a;background:#0c0c10}
.stat{font-size:11px;color:#52525b}.stat b{color:#818cf8}
.no{color:#52525b;font-style:italic;padding:40px;text-align:center}
@media(max-width:768px){.grid2{grid-template-columns:1fr}}
</style>
<script>
function showTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  document.getElementById('panel-'+id).classList.add('active');
}
</script>
</head>
<body>
<div class="hd">
  <div class="logo">${project.name.charAt(0).toUpperCase()}</div>
  <div>
    <h1>${project.name}<span class="badge">${project.language || 'Code'}</span></h1>
    <div class="sub">${project.fullName} · ${branch}${description ? ' · ' + description : ''}</div>
  </div>
</div>
<div class="tabs">
  <div class="tab active" id="tab-readme" onclick="showTab('readme')">📖 README</div>
  <div class="tab" id="tab-code" onclick="showTab('code')">💻 Código</div>
  <div class="tab" id="tab-deps" onclick="showTab('deps')">📦 Dependências</div>
  <div class="tab" id="tab-tree" onclick="showTab('tree')">📂 Arquivos</div>
</div>
<div class="panel active" id="panel-readme">
  <div class="readme">
    ${readmeHtml || '<div class="no">Nenhum README.md encontrado neste repositório</div>'}
  </div>
</div>
<div class="panel" id="panel-code">
  ${escapedSource ? `
  <div class="code-view">
    <div class="ch">${files.some(f => f.path === 'src/App.tsx') ? 'src/App.tsx' : files.some(f => f.path === 'src/App.jsx') ? 'src/App.jsx' : 'src/App.js'}</div>
    <pre>${escapedSource}</pre>
  </div>` : '<div class="no">Nenhum arquivo principal encontrado (App.tsx/jsx/js)</div>'}
</div>
<div class="panel" id="panel-deps">
  <div class="grid2">
    <div class="card">
      <h3>📦 Dependências (${deps.length})</h3>
      <div>${deps.length > 0 ? deps.map(d => `<span class="dep">${d}</span>`).join('') : '<span class="no">Nenhuma</span>'}</div>
    </div>
    <div class="card">
      <h3>⚡ Scripts</h3>
      <div>${scripts.length > 0 ? scripts.map(s => `<div class="script">$ npm run ${s}</div>`).join('') : '<span class="no">Nenhum</span>'}</div>
    </div>
  </div>
</div>
<div class="panel tree" id="panel-tree">
  <div style="padding:4px 0 10px;font-size:12px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.5px">📂 Estrutura (${files.length} arquivos)</div>
  ${treeHtml}
</div>
<div class="stats">
  <div class="stat"><b>${files.length}</b> arquivos</div>
  <div class="stat"><b>${Object.keys(dirs).length}</b> diretórios</div>
  <div class="stat"><b>${project.language || '—'}</b></div>
  <div class="stat"><b>${branch}</b></div>
</div>
</body>
</html>`);
  }, []);

  const loadFileTree = useCallback(async (project: Project) => {
    setIsLoadingTree(true);
    projectRef.current = project;
    filesContentCache.current = {};
    const { owner, repo } = parseOwnerRepo(project.fullName);

    try {
      const { data, error } = await supabase.functions.invoke('github-repo-files', {
        body: { owner, repo, branch: project.branch, token: project.token, action: 'tree' },
      });

      if (error || !data?.ok) {
        toast.error('Erro ao carregar arquivos do repositório');
        return;
      }

      const treeFiles: RepoFile[] = data.files || [];
      setFileTree(treeFiles);
      
      // Auto-load important files
      const importantFiles = findImportantFiles(treeFiles);
      if (importantFiles.length > 0) {
        await loadBatchFiles(project, importantFiles);
      }

      // Build preview
      await buildRealPreview(project, treeFiles);
    } catch {
      toast.error('Erro de conexão ao buscar arquivos');
    } finally {
      setIsLoadingTree(false);
    }
  }, [buildRealPreview]);

  const findImportantFiles = (files: RepoFile[]): string[] => {
    const priority = [
      'index.html', 'src/App.tsx', 'src/App.jsx', 'src/App.js',
      'src/index.tsx', 'src/main.tsx', 'src/main.jsx',
      'src/index.css', 'src/App.css', 'style.css', 'styles.css',
      'README.md', 'package.json',
    ];
    const found: string[] = [];
    for (const p of priority) {
      const match = files.find(f => f.path === p);
      if (match && match.size < 100000) found.push(match.path);
      if (found.length >= 6) break;
    }
    return found;
  };

  const loadBatchFiles = async (project: Project, paths: string[]) => {
    const { owner, repo } = parseOwnerRepo(project.fullName);
    setIsLoadingFile(true);

    try {
      const { data, error } = await supabase.functions.invoke('github-repo-files', {
        body: { owner, repo, branch: project.branch, token: project.token, action: 'batch', path: paths },
      });

      if (error || !data?.ok) return;

      const batchFiles = data.files as Record<string, string>;
      Object.assign(filesContentCache.current, batchFiles);

      const newFiles: OpenFile[] = Object.entries(batchFiles).map(
        ([path, content]) => ({ path, content: content as string })
      );

      setOpenFiles(newFiles);
      setActiveFileIndex(0);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const loadSingleFile = useCallback(async (project: Project, filePath: string) => {
    const existingIndex = openFiles.findIndex(f => f.path === filePath);
    if (existingIndex >= 0) {
      setActiveFileIndex(existingIndex);
      return;
    }

    const { owner, repo } = parseOwnerRepo(project.fullName);
    setIsLoadingFile(true);

    try {
      const { data, error } = await supabase.functions.invoke('github-repo-files', {
        body: { owner, repo, branch: project.branch, token: project.token, action: 'file', path: filePath },
      });

      if (error || !data?.ok) {
        toast.error(`Erro ao abrir ${filePath}`);
        return;
      }

      filesContentCache.current[data.path] = data.content;

      setOpenFiles(prev => {
        const newFiles = [...prev, { path: data.path, content: data.content }];
        setActiveFileIndex(newFiles.length - 1);
        return newFiles;
      });
    } finally {
      setIsLoadingFile(false);
    }
  }, [openFiles]);

  const closeFile = useCallback((index: number) => {
    setOpenFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (activeFileIndex >= next.length) setActiveFileIndex(Math.max(0, next.length - 1));
      else if (index < activeFileIndex) setActiveFileIndex(activeFileIndex - 1);
      return next;
    });
  }, [activeFileIndex]);

  const updateFileContent = useCallback((index: number, content: string) => {
    setOpenFiles(prev => {
      const updated = prev.map((f, i) => i === index ? { ...f, content, modified: true } : f);
      // Update cache for preview
      const file = updated[index];
      if (file) {
        filesContentCache.current[file.path] = content;
      }
      return updated;
    });

    // Rebuild preview with updated content
    if (projectRef.current && fileTree.length > 0) {
      buildRealPreview(projectRef.current, fileTree);
    }
  }, [fileTree, buildRealPreview]);

  const resetFiles = useCallback(() => {
    setFileTree([]);
    setOpenFiles([]);
    setActiveFileIndex(0);
    setPreviewHtml('');
    filesContentCache.current = {};
  }, []);

  return {
    fileTree, openFiles, activeFileIndex, isLoadingTree, isLoadingFile, previewHtml,
    loadFileTree, loadSingleFile, closeFile, updateFileContent, setActiveFileIndex, resetFiles,
  };
}
