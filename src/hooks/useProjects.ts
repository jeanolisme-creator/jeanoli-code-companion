import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Project } from '@/types';

const STORAGE_KEY = 'jeanoli-projects';
const CREDENTIALS_KEY = 'jeanoli-github-credentials';

function loadFromStorage(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveToStorage(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => loadFromStorage());
  const [isLoading] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{ login: string; token: string } | null>(() => {
    try {
      const raw = localStorage.getItem(CREDENTIALS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const loadProjects = useCallback(async () => {
    setProjects(loadFromStorage());
  }, []);

  const saveProject = useCallback(async (project: Project, githubLogin?: string, githubToken?: string) => {
    const token = githubToken || project.token;
    const login = githubLogin || savedCredentials?.login || '';

    setProjects(prev => {
      const existing = prev.findIndex(p => p.fullName.toLowerCase() === project.fullName.toLowerCase());
      const updated = existing >= 0
        ? prev.map((p, i) => i === existing ? { ...project, token: token || p.token } : p)
        : [...prev, { ...project, token }];
      saveToStorage(updated);
      return updated;
    });

    if (token && login) {
      const creds = { login, token };
      setSavedCredentials(creds);
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
    }
  }, [savedCredentials]);

  const deleteProject = useCallback(async (fullName: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.fullName !== fullName);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  return { projects, isLoading, savedCredentials, saveProject, deleteProject, loadProjects };
}
