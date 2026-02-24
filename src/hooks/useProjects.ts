import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Project } from '@/types';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{ login: string; token: string } | null>(null);

  // Load projects from database
  const loadProjects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('github_projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading projects:', error);
        return;
      }

      const loaded: Project[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        fullName: p.full_name,
        account: p.account,
        accountAvatar: p.account_avatar || p.account.substring(0, 2).toUpperCase(),
        isPrivate: p.is_private,
        lastSync: new Date(p.last_sync || p.updated_at).toLocaleString('pt-BR'),
        language: p.language || 'Unknown',
        branch: p.branch || 'main',
        token: p.github_token || undefined,
      }));

      setProjects(loaded);

      // Load saved credentials from first project with token
      const withToken = data?.find((p: any) => p.github_token && p.github_login);
      if (withToken) {
        setSavedCredentials({
          login: (withToken as any).github_login || '',
          token: (withToken as any).github_token || '',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const saveProject = useCallback(async (project: Project, githubLogin?: string, githubToken?: string) => {
    if (!user) return;

    const token = githubToken || project.token;
    const login = githubLogin || savedCredentials?.login || '';

    const { error } = await supabase
      .from('github_projects')
      .upsert({
        user_id: user.id,
        name: project.name,
        full_name: project.fullName,
        account: project.account,
        account_avatar: project.accountAvatar,
        is_private: project.isPrivate,
        language: project.language,
        branch: project.branch,
        github_token: token || null,
        github_login: login || null,
        repo_url: `https://github.com/${project.fullName}.git`,
        last_sync: new Date().toISOString(),
      }, { onConflict: 'user_id,full_name' });

    if (error) {
      console.error('Error saving project:', error);
      toast.error('Erro ao salvar projeto');
      return;
    }

    // Update saved credentials
    if (token && login) {
      setSavedCredentials({ login, token });
    }

    await loadProjects();
  }, [user, savedCredentials, loadProjects]);

  const deleteProject = useCallback(async (fullName: string) => {
    if (!user) return;
    await supabase
      .from('github_projects')
      .delete()
      .eq('user_id', user.id)
      .eq('full_name', fullName);
    await loadProjects();
  }, [user, loadProjects]);

  return { projects, isLoading, savedCredentials, saveProject, deleteProject, loadProjects };
}
