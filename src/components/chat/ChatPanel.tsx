import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Bot, User, Zap, Sparkles, Square, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage, RepoFile, Project } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STORAGE_KEY_MODELS = 'ai-settings-added-models';
const STORAGE_KEY_KEYS = 'ai-settings-api-keys';
const LOCAL_API = 'http://localhost:7799';

interface StoredModel {
  id: string;
  name: string;
  provider: string;
  context: string;
}

interface ChatPanelProps {
  project?: Project | null;
  fileTree?: RepoFile[];
  onFileWritten?: (path: string) => void;
}

function loadModelsFromStorage(): StoredModel[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_MODELS) || '[]');
  } catch { return []; }
}

function loadApiKeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_KEYS) || '{}');
  } catch { return {}; }
}

// ── Extract code blocks with file paths from AI response ──
function extractCodeBlocks(text: string): { filePath: string; content: string }[] {
  const results: { filePath: string; content: string }[] = [];
  // Match patterns like ```tsx file:src/App.tsx or ```// src/App.tsx or ``` filepath: src/App.tsx
  const regex = /```[\w]*\s*(?:file:|filepath:|\/\/\s*)?([^\n]+\.[a-zA-Z]{1,10})\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const filePath = match[1].trim().replace(/^["']|["']$/g, '');
    const content = match[2];
    // Validate it looks like a real file path
    if (filePath.includes('/') || filePath.includes('.')) {
      results.push({ filePath, content });
    }
  }
  return results;
}

// ── Write file to local project via local-deploy-server ──
async function writeFileToProject(project: string, filePath: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_API}/api/write-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, filePath, content }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Build system prompt with project context ──
function buildSystemPrompt(project: Project | null, fileTree: RepoFile[]): string {
  if (!project) return 'Você é um assistente de programação. Ajude o usuário com suas dúvidas.';

  const treeStr = fileTree
    .filter(f => !f.path.includes('node_modules') && !f.path.startsWith('.git/'))
    .slice(0, 200)
    .map(f => `  ${f.path}`)
    .join('\n');

  return `Você é um assistente de programação integrado ao Jeanoli Studio IA. 
Você está trabalhando no projeto "${project.fullName}" (branch: ${project.branch}).

ARQUIVOS DO PROJETO:
${treeStr}

REGRAS IMPORTANTES para modificar arquivos:
1. Quando o usuário pedir para alterar algo no site/projeto, responda com blocos de código contendo o caminho do arquivo.
2. Use o formato: \`\`\`extensão file:caminho/do/arquivo.ext
3. Sempre inclua o conteúdo COMPLETO do arquivo modificado, não apenas trechos.
4. Exemplo:
\`\`\`tsx file:src/App.tsx
import React from 'react';
// ... conteúdo completo
\`\`\`
5. Você pode modificar múltiplos arquivos em uma resposta.
6. Após os blocos de código, explique brevemente o que foi alterado.
7. Para projetos React/Vite, as alterações serão aplicadas automaticamente com hot-reload.
8. Sempre preserve o código existente que não precisa ser alterado.`;
}

// ── Direct API streaming helper ──────────────────────────────────
async function streamChat({
  provider, model, apiKey, messages, onDelta, onDone, onError, signal,
}: {
  provider: string;
  model: string;
  apiKey: string;
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}) {
  try {
    let resp: Response;

    const useLocalProxy = async (targetUrl: string, headers: Record<string, string>, body: any): Promise<Response | null> => {
      try {
        const proxyRes = await fetch(`${LOCAL_API}/api/ai-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUrl, headers, body }),
          signal,
        });
        if (proxyRes.ok) return proxyRes;
      } catch {}
      return null;
    };

    if (provider === 'gemini') {
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const systemInstruction = messages.find(m => m.role === 'system');
      const body: any = { contents };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
      }

      const apiVersion = model.includes('2.5') || model.includes('3.') ? 'v1beta' : 'v1';
      resp = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        }
      );

      if (!resp.ok) {
        const text = await resp.text();
        onError(`Gemini erro ${resp.status}: ${text.slice(0, 200)}`);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) onDelta(text);
          } catch {}
        }
      }
      onDone();
      return;
    }

    // OpenAI-compatible providers
    let url: string;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    switch (provider) {
      case 'openrouter':
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers.Authorization = `Bearer ${apiKey}`;
        break;
      case 'ollama':
        url = `${apiKey}/v1/chat/completions`;
        break;
      case 'nvidia':
        url = 'https://integrate.api.nvidia.com/v1/chat/completions';
        headers.Authorization = `Bearer ${apiKey}`;
        break;
      default:
        onError(`Provedor desconhecido: ${provider}`);
        return;
    }

    if (provider === 'nvidia') {
      const proxyResp = await useLocalProxy(url, headers, { model, messages, stream: true });
      if (proxyResp) {
        resp = proxyResp;
      } else {
        resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model, messages, stream: true }),
          signal,
        });
      }
    } else {
      resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
      });
    }

    if (!resp.ok) {
      const text = await resp.text();
      let msg = 'Erro na API';
      try { msg = JSON.parse(text).error?.message || JSON.parse(text).error || msg; } catch {}
      onError(msg);
      return;
    }

    if (!resp.body) { onError('Stream vazio'); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
    onDone();
  } catch (e: any) {
    if (e.name === 'AbortError') return;
    onError(e.message || 'Erro de streaming');
  }
}

// ── Component ─────────────────────────────────────────────────────
const ChatPanel = ({ project, fileTree = [], onFileWritten }: ChatPanelProps) => {
  const [models, setModels] = useState<StoredModel[]>(() => loadModelsFromStorage());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', type: 'assistant', content: 'Olá! Sou seu assistente IA. Selecione um modelo nas configurações e comece a conversar! Posso modificar os arquivos do projeto carregado.', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [applyingFiles, setApplyingFiles] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullResponseRef = useRef('');

  useEffect(() => {
    const handler = () => setModels(loadModelsFromStorage());
    window.addEventListener('focus', handler);
    window.addEventListener('storage', handler);
    return () => { window.removeEventListener('focus', handler); window.removeEventListener('storage', handler); };
  }, []);

  useEffect(() => {
    if (models.length > 0 && !models.find(m => m.id === selectedModel)) {
      setSelectedModel(models[0].id);
    }
  }, [models]);

  const currentModel = models.find(m => m.id === selectedModel);

  const groupedModels = useMemo(() => {
    const groups: Record<string, StoredModel[]> = {};
    const providerLabels: Record<string, string> = {
      openrouter: 'OpenRouter', gemini: 'Google Gemini', ollama: 'Ollama Local', nvidia: 'NVIDIA NIM'
    };
    models.forEach(m => {
      const label = providerLabels[m.provider] || m.provider;
      if (!groups[label]) groups[label] = [];
      groups[label].push(m);
    });
    return groups;
  }, [models]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  // Apply code blocks from AI response to local project
  const applyCodeBlocks = useCallback(async (responseText: string) => {
    if (!project) return;

    const codeBlocks = extractCodeBlocks(responseText);
    if (codeBlocks.length === 0) return;

    setApplyingFiles(codeBlocks.map(b => b.filePath));

    let applied = 0;
    for (const block of codeBlocks) {
      const success = await writeFileToProject(project.fullName, block.filePath, block.content);
      if (success) {
        applied++;
        onFileWritten?.(block.filePath);
      }
    }

    setApplyingFiles([]);

    if (applied > 0) {
      toast.success(`✅ ${applied} arquivo(s) aplicado(s) ao projeto! Hot-reload ativo.`);
      setMessages(prev => [...prev, {
        id: (Date.now() + 10).toString(),
        type: 'system',
        content: `✅ ${applied} arquivo(s) modificado(s): ${codeBlocks.map(b => b.filePath).join(', ')}`,
        timestamp: new Date(),
      }]);
    } else {
      toast.warning('⚠️ Não foi possível aplicar as alterações. Verifique se o local-deploy-server está rodando.');
    }
  }, [project, onFileWritten]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    if (!currentModel) {
      toast.error('Selecione um modelo nas configurações primeiro.');
      return;
    }

    const apiKeys = loadApiKeys();
    const apiKey = apiKeys[currentModel.provider];
    if (!apiKey) {
      toast.error(`Configure a API Key do provedor "${currentModel.provider}" em ⚙️ Configurações.`);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    fullResponseRef.current = '';

    // Build messages with system prompt
    const systemPrompt = buildSystemPrompt(project ?? null, fileTree);
    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...[...messages, userMsg]
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content })),
    ];

    const assistantId = (Date.now() + 1).toString();
    let assistantContent = '';

    const controller = new AbortController();
    abortRef.current = controller;

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      fullResponseRef.current = assistantContent;
      const content = assistantContent;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id === assistantId) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
        }
        return [...prev, { id: assistantId, type: 'assistant' as const, content, timestamp: new Date() }];
      });
    };

    await streamChat({
      provider: currentModel.provider,
      model: currentModel.id,
      apiKey,
      messages: apiMessages,
      signal: controller.signal,
      onDelta: upsertAssistant,
      onDone: async () => {
        setIsStreaming(false);
        abortRef.current = null;
        // Auto-apply code blocks
        if (fullResponseRef.current) {
          await applyCodeBlocks(fullResponseRef.current);
        }
      },
      onError: (err) => {
        setIsStreaming(false);
        abortRef.current = null;
        toast.error(`Erro: ${err}`);
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          type: 'system' as const,
          content: `❌ Erro: ${err}`,
          timestamp: new Date(),
        }]);
      },
    });
  }, [input, isStreaming, currentModel, messages, project, fileTree, applyCodeBlocks]);

  const avatarMap = { user: <User className="w-4 h-4" />, assistant: <Bot className="w-4 h-4" />, system: <Zap className="w-4 h-4" /> };
  const bgMap: Record<string, string> = { user: 'gradient-accent', assistant: 'gradient-primary', system: 'bg-warning' };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Assistente IA
          {project && <span className="text-[10px] text-primary/70 ml-1">• {project.name}</span>}
        </span>
        {models.length > 0 ? (
          <select
            value={selectedModel}
            onChange={(e) => { setSelectedModel(e.target.value); const m = models.find(x => x.id === e.target.value); if (m) toast.info(`🤖 Modelo: ${m.name}`); }}
            className="text-xs bg-muted rounded-lg px-2 py-1.5 border border-border text-foreground max-w-[180px]"
          >
            {Object.entries(groupedModels).map(([provider, list]) => (
              <optgroup key={provider} label={provider}>
                {list.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Adicione modelos em ⚙️ Configurações</span>
        )}
      </div>

      {applyingFiles.length > 0 && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-primary font-medium">
            Aplicando: {applyingFiles.join(', ')}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full ${bgMap[msg.type]} flex items-center justify-center text-primary-foreground shrink-0`}>
                {avatarMap[msg.type]}
              </div>
              <div className={`max-w-[85%] ${msg.type === 'user' ? 'ml-auto' : ''}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.type === 'user'
                    ? 'gradient-primary text-primary-foreground rounded-tr-sm'
                    : msg.type === 'system'
                    ? 'bg-card border-l-3 border-primary text-foreground border border-border'
                    : 'bg-card text-foreground border border-border rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && messages[messages.length - 1]?.type !== 'assistant' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isStreaming ? 'Aguardando resposta...' : project ? `Modificar ${project.name}...` : 'Digite sua mensagem...'}
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm resize-none border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none disabled:opacity-50"
          />
          {isStreaming ? (
            <Button onClick={stopStreaming} size="icon" variant="destructive" className="rounded-xl h-10 w-10 shrink-0">
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={sendMessage} size="icon" className="gradient-primary rounded-xl h-10 w-10 shrink-0" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        {currentModel && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
            {currentModel.name} • {currentModel.context} tokens
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
