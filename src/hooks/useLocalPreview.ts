import { useState, useCallback, useRef } from 'react';
import type { Project } from '@/types';

const LOCAL_API = 'http://localhost:7799';
const PORT_STORAGE_KEY = 'local-preview-port';

type LocalPreviewStatus = 'idle' | 'checking' | 'starting' | 'running' | 'unavailable';

export function useLocalPreview() {
  const [status, setStatus] = useState<LocalPreviewStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const currentPort = useRef<number | null>(null);

  /** Check if local-deploy-server is reachable */
  const isServerAvailable = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${LOCAL_API}/api/status`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  /** Find next free port or reuse existing one for a project */
  const getPortForProject = useCallback(async (projectName: string): Promise<number> => {
    // Check saved port mapping
    try {
      const saved = JSON.parse(localStorage.getItem(PORT_STORAGE_KEY) || '{}');
      if (saved[projectName]) return saved[projectName];
    } catch {}

    // Find which ports are already in use
    try {
      const res = await fetch(`${LOCAL_API}/api/status`, {
        signal: AbortSignal.timeout(2000),
      });
      const data = await res.json();
      const usedPorts = new Set((data.servers || []).map((s: any) => s.port));

      // Pick first available port starting at 4001
      for (let p = 4001; p <= 4500; p++) {
        if (!usedPorts.has(p)) {
          // Save mapping
          try {
            const saved = JSON.parse(localStorage.getItem(PORT_STORAGE_KEY) || '{}');
            saved[projectName] = p;
            localStorage.setItem(PORT_STORAGE_KEY, JSON.stringify(saved));
          } catch {}
          return p;
        }
      }
    } catch {}

    return 4001;
  }, []);

  /** Start local preview for a React project */
  const startLocalPreview = useCallback(async (project: Project): Promise<boolean> => {
    setStatus('checking');

    const available = await isServerAvailable();
    if (!available) {
      setStatus('unavailable');
      return false;
    }

    setStatus('starting');

    try {
      // Check if project already running
      const statusRes = await fetch(`${LOCAL_API}/api/status`, {
        signal: AbortSignal.timeout(2000),
      });
      const statusData = await statusRes.json();
      const existing = (statusData.servers || []).find(
        (s: any) => s.project === project.name || s.project === project.fullName.split('/')[1]
      );

      if (existing) {
        currentPort.current = existing.port;
        setPreviewUrl(`http://localhost:${existing.port}`);
        setStatus('running');
        return true;
      }

      // Start new dev server
      const port = await getPortForProject(project.fullName);
      const res = await fetch(`${LOCAL_API}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: project.fullName,
          port,
          branch: project.branch,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        currentPort.current = port;
        setPreviewUrl(data.url || `http://localhost:${port}`);
        setStatus('running');
        return true;
      }

      setStatus('unavailable');
      return false;
    } catch (err) {
      console.error('Local preview error:', err);
      setStatus('unavailable');
      return false;
    }
  }, [isServerAvailable, getPortForProject]);

  /** Stop the local preview server */
  const stopLocalPreview = useCallback(async () => {
    if (currentPort.current) {
      try {
        await fetch(`${LOCAL_API}/api/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ port: currentPort.current }),
          signal: AbortSignal.timeout(3000),
        });
      } catch {}
    }
    currentPort.current = null;
    setPreviewUrl(null);
    setStatus('idle');
  }, []);

  /** Reset state without stopping server */
  const reset = useCallback(() => {
    currentPort.current = null;
    setPreviewUrl(null);
    setStatus('idle');
  }, []);

  return {
    status,
    previewUrl,
    startLocalPreview,
    stopLocalPreview,
    reset,
    isServerAvailable,
  };
}
