
-- Table to persist GitHub projects, credentials, and repo URLs
CREATE TABLE public.github_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  account TEXT NOT NULL,
  account_avatar TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  language TEXT DEFAULT 'Unknown',
  branch TEXT DEFAULT 'main',
  github_token TEXT,
  github_login TEXT,
  repo_url TEXT,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, full_name)
);

-- Enable RLS
ALTER TABLE public.github_projects ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "Users can view own projects"
ON public.github_projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
ON public.github_projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
ON public.github_projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
ON public.github_projects FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_github_projects_updated_at
BEFORE UPDATE ON public.github_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
