import { useState, useCallback } from 'react';
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

  const parseOwnerRepo = (fullName: string) => {
    const [owner, repo] = fullName.split('/');
    return { owner, repo };
  };

  const loadFileTree = useCallback(async (project: Project) => {
    setIsLoadingTree(true);
    const { owner, repo } = parseOwnerRepo(project.fullName);

    try {
      const { data, error } = await supabase.functions.invoke('github-repo-files', {
        body: { owner, repo, branch: project.branch, token: project.token, action: 'tree' },
      });

      if (error || !data?.ok) {
        toast.error('Erro ao carregar arquivos do repositório');
        return;
      }

      setFileTree(data.files || []);
      
      // Auto-load important files
      const importantFiles = findImportantFiles(data.files || []);
      if (importantFiles.length > 0) {
        await loadBatchFiles(project, importantFiles);
      }

      // Build preview
      await buildPreview(project, data.files || []);
    } catch {
      toast.error('Erro de conexão ao buscar arquivos');
    } finally {
      setIsLoadingTree(false);
    }
  }, []);

  const findImportantFiles = (files: RepoFile[]): string[] => {
    const priority = [
      'index.html',
      'src/App.tsx', 'src/App.jsx', 'src/App.js',
      'src/index.tsx', 'src/index.jsx', 'src/main.tsx', 'src/main.jsx',
      'src/index.css', 'src/App.css', 'style.css', 'styles.css',
      'README.md',
      'package.json',
    ];

    const found: string[] = [];
    for (const p of priority) {
      if (files.some(f => f.path === p || f.path.endsWith(`/${p}`))) {
        const match = files.find(f => f.path === p || f.path.endsWith(`/${p}`));
        if (match && match.size < 100000) found.push(match.path);
      }
      if (found.length >= 5) break;
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

      const newFiles: OpenFile[] = Object.entries(data.files as Record<string, string>).map(
        ([path, content]) => ({ path, content: content as string })
      );

      setOpenFiles(newFiles);
      setActiveFileIndex(0);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const loadSingleFile = useCallback(async (project: Project, filePath: string) => {
    // Check if already open
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
    setOpenFiles(prev => prev.map((f, i) => i === index ? { ...f, content, modified: true } : f));
  }, []);

  const buildPreview = async (project: Project, files: RepoFile[]) => {
    const { owner, repo } = parseOwnerRepo(project.fullName);
    
    // Priority: index.html for static sites
    const indexHtml = files.find(f => f.path === 'index.html');
    if (indexHtml) {
      try {
        const { data } = await supabase.functions.invoke('github-repo-files', {
          body: { owner, repo, branch: project.branch, token: project.token, action: 'file', path: 'index.html' },
        });
        if (data?.ok && data.content) {
          setPreviewHtml(data.content);
          return;
        }
      } catch {}
    }

    // For React/JS projects, build a smart preview from package.json + README
    const previewFiles = files
      .filter(f => !f.path.includes('node_modules') && !f.path.includes('.git'))
      .slice(0, 50);

    const filesByDir: Record<string, string[]> = {};
    previewFiles.forEach(f => {
      const dir = f.path.includes('/') ? f.path.split('/').slice(0, -1).join('/') : '/';
      if (!filesByDir[dir]) filesByDir[dir] = [];
      filesByDir[dir].push(f.path.split('/').pop() || f.path);
    });

    // Try to fetch README for rich preview
    let readmeContent = '';
    const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md');
    if (readmeFile) {
      try {
        const { data } = await supabase.functions.invoke('github-repo-files', {
          body: { owner, repo, branch: project.branch, token: project.token, action: 'file', path: readmeFile.path },
        });
        if (data?.ok) readmeContent = data.content;
      } catch {}
    }

    // Generate preview HTML
    const structureHtml = Object.entries(filesByDir)
      .map(([dir, dirFiles]) =>
        `<div class="dir"><div class="dir-name">📁 ${dir === '/' ? 'root' : dir}</div>${dirFiles.map(f => `<div class="file">📄 ${f}</div>`).join('')}</div>`
      ).join('');

    const readmeHtml = readmeContent
      ? readmeContent
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.+?)`/g, '<code>$1</code>')
          .replace(/\n/g, '<br/>')
      : '';

    setPreviewHtml(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${project.name} — Preview</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #0a0a0f; color: #e4e4e7; min-height: 100vh; padding: 0; }
  
  .header { padding: 24px 32px; border-bottom: 1px solid #1e1e2e; background: #0f0f18; display: flex; align-items: center; gap: 16px; }
  .header .logo { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: #fff; }
  .header h1 { font-size: 20px; font-weight: 700; color: #fff; }
  .header .meta { font-size: 12px; color: #71717a; margin-top: 2px; }
  .badge { display: inline-flex; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); margin-left: 8px; }

  .content { display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: calc(100vh - 80px); }
  .readme-section { padding: 32px; border-right: 1px solid #1e1e2e; overflow: auto; }
  .readme-section h1 { font-size: 28px; font-weight: 800; margin-bottom: 16px; background: linear-gradient(135deg,#fff,#818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .readme-section h2 { font-size: 20px; font-weight: 700; margin: 20px 0 10px; color: #e4e4e7; }
  .readme-section h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: #a1a1aa; }
  .readme-section p, .readme-section br + br { margin-bottom: 8px; }
  .readme-section code { background: #1e1e2e; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #818cf8; }
  .readme-section strong { color: #fff; }
  .no-readme { color: #52525b; font-style: italic; padding: 40px; text-align: center; }

  .tree-section { padding: 24px; overflow: auto; background: #0d0d14; }
  .tree-title { font-size: 13px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
  .dir { margin-bottom: 12px; }
  .dir-name { font-size: 13px; font-weight: 600; color: #a1a1aa; margin-bottom: 4px; }
  .file { font-size: 12px; color: #52525b; padding: 2px 0 2px 20px; font-family: 'JetBrains Mono', monospace; }
  .file:hover { color: #818cf8; }

  .stats { display: flex; gap: 24px; padding: 16px 32px; border-top: 1px solid #1e1e2e; background: #0f0f18; }
  .stat { font-size: 12px; color: #52525b; }
  .stat strong { color: #818cf8; }

  @media (max-width: 768px) { .content { grid-template-columns: 1fr; } .readme-section { border-right: none; border-bottom: 1px solid #1e1e2e; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">${project.name.charAt(0).toUpperCase()}</div>
    <div>
      <h1>${project.name} <span class="badge">${project.language}</span></h1>
      <div class="meta">${project.fullName} • ${project.branch}</div>
    </div>
  </div>
  <div class="content">
    <div class="readme-section">
      ${readmeHtml ? readmeHtml : '<div class="no-readme">Nenhum README.md encontrado</div>'}
    </div>
    <div class="tree-section">
      <div class="tree-title">📂 Estrutura do Projeto (${files.length} arquivos)</div>
      ${structureHtml}
    </div>
  </div>
  <div class="stats">
    <div class="stat"><strong>${files.length}</strong> arquivos</div>
    <div class="stat"><strong>${Object.keys(filesByDir).length}</strong> diretórios</div>
    <div class="stat"><strong>${project.language}</strong></div>
    <div class="stat"><strong>${project.branch}</strong></div>
  </div>
</body>
</html>`);
  };

  const resetFiles = useCallback(() => {
    setFileTree([]);
    setOpenFiles([]);
    setActiveFileIndex(0);
    setPreviewHtml('');
  }, []);

  return {
    fileTree, openFiles, activeFileIndex, isLoadingTree, isLoadingFile, previewHtml,
    loadFileTree, loadSingleFile, closeFile, updateFileContent, setActiveFileIndex, resetFiles,
  };
}
