import { useState, useCallback, useRef } from 'react';
import { WebContainer, type FileSystemTree } from '@webcontainer/api';
import { toast } from 'sonner';

type WCStatus = 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error';

let wcInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

async function getWebContainer(): Promise<WebContainer> {
  if (wcInstance) return wcInstance;
  if (bootPromise) return bootPromise;

  bootPromise = WebContainer.boot().then(wc => {
    wcInstance = wc;
    return wc;
  });

  return bootPromise;
}

export function useWebContainer() {
  const [status, setStatus] = useState<WCStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const containerRef = useRef<WebContainer | null>(null);
  const serverReadyRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-100), msg]);
  }, []);

  /**
   * Convert a flat file map { "src/App.tsx": "content" } to WebContainer FileSystemTree
   */
  const filesToTree = useCallback((files: Record<string, string>): FileSystemTree => {
    const tree: FileSystemTree = {};

    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/');
      let current: any = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // File
          current[part] = { file: { contents: content } };
        } else {
          // Directory
          if (!current[part]) {
            current[part] = { directory: {} };
          }
          current = current[part].directory;
        }
      }
    }

    return tree;
  }, []);

  /**
   * Mount files, install deps, and start dev server
   */
  const startProject = useCallback(async (files: Record<string, string>) => {
    try {
      setStatus('booting');
      setPreviewUrl('');
      serverReadyRef.current = false;
      addLog('🔄 Iniciando WebContainer...');

      const wc = await getWebContainer();
      containerRef.current = wc;

      addLog('📁 Montando arquivos do projeto...');
      const tree = filesToTree(files);
      await wc.mount(tree);

      // Check if package.json exists
      if (!files['package.json']) {
        addLog('⚠️ Nenhum package.json encontrado. Criando um básico...');
        await wc.fs.writeFile('/package.json', JSON.stringify({
          name: 'preview-project',
          private: true,
          scripts: { dev: 'vite', start: 'vite' },
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' },
        }, null, 2));
      }

      // Install dependencies
      setStatus('installing');
      addLog('📦 Instalando dependências (npm install)...');

      const installProcess = await wc.spawn('npm', ['install']);

      const installReader = installProcess.output.getReader();
      (async () => {
        while (true) {
          const { done, value } = await installReader.read();
          if (done) break;
          addLog(value);
        }
      })();

      const exitCode = await installProcess.exit;
      if (exitCode !== 0) {
        setStatus('error');
        addLog(`❌ npm install falhou (código ${exitCode})`);
        toast.error('Erro ao instalar dependências do projeto');
        return;
      }

      addLog('✅ Dependências instaladas!');

      // Start dev server
      setStatus('starting');
      addLog('🚀 Iniciando servidor de desenvolvimento...');

      // Listen for server-ready event
      wc.on('server-ready', (_port, url) => {
        if (!serverReadyRef.current) {
          serverReadyRef.current = true;
          setPreviewUrl(url);
          setStatus('ready');
          addLog(`✅ Servidor pronto em ${url}`);
          toast.success('🚀 Preview do projeto React carregado!');
        }
      });

      // Determine the start command from package.json
      let startCmd = 'dev';
      try {
        const pkgContent = files['package.json'];
        if (pkgContent) {
          const pkg = JSON.parse(pkgContent);
          if (pkg.scripts?.dev) startCmd = 'dev';
          else if (pkg.scripts?.start) startCmd = 'start';
        }
      } catch {}

      const devProcess = await wc.spawn('npm', ['run', startCmd]);

      const devReader = devProcess.output.getReader();
      (async () => {
        while (true) {
          const { done, value } = await devReader.read();
          if (done) break;
          addLog(value);
        }
      })();

    } catch (err: any) {
      setStatus('error');
      const msg = err?.message || 'Erro desconhecido';
      addLog(`❌ Erro: ${msg}`);
      
      if (msg.includes('cross-origin') || msg.includes('SharedArrayBuffer')) {
        toast.error('WebContainers requer headers COOP/COEP. Pode não funcionar neste ambiente.');
      } else {
        toast.error(`Erro ao iniciar preview: ${msg}`);
      }
    }
  }, [filesToTree, addLog]);

  /**
   * Write a single file update to the running container
   */
  const writeFile = useCallback(async (path: string, content: string) => {
    if (!containerRef.current) return;
    try {
      await containerRef.current.fs.writeFile(`/${path}`, content);
    } catch (err) {
      console.error('WebContainer writeFile error:', err);
    }
  }, []);

  /**
   * Tear down the container
   */
  const teardown = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.teardown();
      containerRef.current = null;
      wcInstance = null;
      bootPromise = null;
    }
    setStatus('idle');
    setPreviewUrl('');
    setLogs([]);
    serverReadyRef.current = false;
  }, []);

  return {
    status,
    previewUrl,
    logs,
    startProject,
    writeFile,
    teardown,
  };
}
