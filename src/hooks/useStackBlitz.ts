import { useState, useCallback, useRef } from 'react';
import sdk from '@stackblitz/sdk';
import type { VM } from '@stackblitz/sdk';

type SBStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useStackBlitz() {
  const [status, setStatus] = useState<SBStatus>('idle');
  const vmRef = useRef<VM | null>(null);

  /**
   * Embed a project into a container element
   */
  const embedProject = useCallback(async (
    container: HTMLElement,
    files: Record<string, string>,
    projectTitle: string,
  ) => {
    try {
      setStatus('loading');

      // Parse package.json if available
      let deps: Record<string, string> = { react: '^18.2.0', 'react-dom': '^18.2.0' };
      let devDeps: Record<string, string> = {};
      let pkgName = projectTitle || 'preview-project';
      let scripts: Record<string, string> = { dev: 'vite' };

      if (files['package.json']) {
        try {
          const pkg = JSON.parse(files['package.json']);
          deps = pkg.dependencies || deps;
          devDeps = pkg.devDependencies || {};
          pkgName = pkg.name || pkgName;
          scripts = pkg.scripts || scripts;
        } catch {}
      }

      // Filter out non-embeddable files
      const projectFiles: Record<string, string> = {};
      for (const [path, content] of Object.entries(files)) {
        if (
          !path.includes('node_modules') &&
          !path.endsWith('.lock') &&
          !path.endsWith('lock.json') &&
          !path.startsWith('.git/')
        ) {
          projectFiles[path] = content;
        }
      }

      // Reconstruct a clean package.json for StackBlitz
      projectFiles['package.json'] = JSON.stringify({
        name: pkgName,
        private: true,
        scripts,
        dependencies: deps,
        devDependencies: devDeps,
      }, null, 2);

      // Determine template based on project structure
      let template: 'node' | 'typescript' = 'node';
      const hasTS = Object.keys(projectFiles).some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      if (hasTS) template = 'typescript';

      // Embed the project
      const vm = await sdk.embedProject(
        container,
        {
          title: projectTitle,
          template,
          files: projectFiles,
        },
        {
          height: '100%',
          width: '100%',
          hideExplorer: true,
          hideNavigation: false,
          hideDevTools: true,
          forceEmbedLayout: true,
          theme: 'dark',
          view: 'preview',
          startScript: scripts.dev ? 'dev' : scripts.start ? 'start' : 'dev',
        }
      );

      vmRef.current = vm;
      setStatus('ready');
      return vm;
    } catch (err: any) {
      console.error('StackBlitz embed error:', err);
      setStatus('error');
      return null;
    }
  }, []);

  /**
   * Write a file update to the running StackBlitz VM
   */
  const writeFile = useCallback(async (path: string, content: string) => {
    if (!vmRef.current) return;
    try {
      await vmRef.current.applyFsDiff({
        create: { [path]: content },
        destroy: [],
      });
    } catch (err) {
      console.error('StackBlitz writeFile error:', err);
    }
  }, []);

  /**
   * Tear down
   */
  const teardown = useCallback(() => {
    vmRef.current = null;
    setStatus('idle');
  }, []);

  return {
    status,
    embedProject,
    writeFile,
    teardown,
  };
}
