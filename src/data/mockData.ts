import type { AIModel } from '@/types';

export const aiModels: AIModel[] = [
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'OpenRouter', tokens: '200k' },
  { id: 'gpt-4', name: 'GPT-4 Turbo', provider: 'OpenRouter', tokens: '128k' },
  { id: 'llama-3', name: 'Llama 3 70B', provider: 'OpenRouter', tokens: '8k' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', provider: 'Google Gemini', tokens: '1M' },
  { id: 'gemini-flash', name: 'Gemini 1.5 Flash', provider: 'Google Gemini', tokens: '1M' },
  { id: 'llama2', name: 'Llama 2 (local)', provider: 'Ollama Local', tokens: '4k' },
  { id: 'codellama', name: 'CodeLlama (local)', provider: 'Ollama Local', tokens: '16k' },
];

export const sampleCode = `// Selecione um projeto e abra um arquivo para começar a editar`;
