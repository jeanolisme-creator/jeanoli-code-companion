import { X, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useState } from 'react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const [statuses, setStatuses] = useState({ openrouter: true, gemini: false, ollama: true });

  const testConnection = (provider: string) => {
    toast.info(`🔄 Testando conexão com ${provider}...`);
    setTimeout(() => {
      setStatuses(prev => ({ ...prev, [provider]: true }));
      toast.success(`✅ Conexão com ${provider} estabelecida!`);
    }, 1500);
  };

  const providers = [
    {
      key: 'openrouter', name: 'OpenRouter', icon: 'OR', color: 'gradient-primary',
      fields: [{ label: 'API Key', placeholder: 'sk-or-v1-xxxx', type: 'password' }, { label: 'Modelo padrão', type: 'select', options: ['Claude 3 Opus', 'GPT-4 Turbo', 'Llama 3 70B'] }],
      models: ['Claude 3 Opus', 'GPT-4 Turbo', 'Llama 3 70B', 'Mixtral 8x7B'],
    },
    {
      key: 'gemini', name: 'Google Gemini', icon: 'GE', color: 'bg-blue-500',
      fields: [{ label: 'API Key', placeholder: 'AIzaSy...', type: 'password' }],
      models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash'],
    },
    {
      key: 'ollama', name: 'Ollama (Servidor Local)', icon: 'OL', color: 'bg-success',
      fields: [{ label: 'URL do Servidor', placeholder: 'http://localhost:11434', type: 'text' }],
      models: ['Llama 2 (7B)', 'CodeLlama (7B)', 'Mistral (7B)'],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>⚙️ Configurações de IA</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {providers.map((p) => (
            <div key={p.key} className="bg-muted rounded-2xl p-5 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl ${p.color} flex items-center justify-center text-primary-foreground font-bold text-sm`}>
                  {p.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{p.name}</h4>
                  <span className={`text-xs flex items-center gap-1 ${statuses[p.key as keyof typeof statuses] ? 'text-success' : 'text-muted-foreground'}`}>
                    {statuses[p.key as keyof typeof statuses] ? <><Wifi className="w-3 h-3" /> Conectado</> : <><WifiOff className="w-3 h-3" /> Desconectado</>}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(p.key)}
                  className="text-xs h-8"
                >
                  Testar
                </Button>
              </div>

              {p.fields.map((field) => (
                <div key={field.label} className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
                  {field.type === 'select' ? (
                    <select className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm">
                      {field.options?.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={field.type} placeholder={field.placeholder} className="h-9 text-sm" />
                  )}
                </div>
              ))}

              <div className="mt-3 space-y-1.5">
                {p.models.map((m) => (
                  <label key={m} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-background">
                    <input type="checkbox" defaultChecked className="rounded" />
                    {m}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onClose(); toast.success('⚙️ Configurações salvas!'); }} className="gradient-primary">
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
