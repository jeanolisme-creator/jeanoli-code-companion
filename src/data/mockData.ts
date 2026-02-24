import type { Project, AIModel } from '@/types';

export const mockProjects: Project[] = [
  { id: 1, name: 'ecommerce-dashboard', fullName: 'jeanoli/ecommerce-dashboard', account: 'jeanoli', accountAvatar: 'JE', isPrivate: true, lastSync: '2 min atrás', language: 'TypeScript', branch: 'main' },
  { id: 2, name: 'api-rest-node', fullName: 'jeanoli/api-rest-node', account: 'jeanoli', accountAvatar: 'JE', isPrivate: true, lastSync: '5 horas atrás', language: 'JavaScript', branch: 'develop' },
  { id: 3, name: 'projeto-cliente-x', fullName: 'jeanoli/projeto-cliente-x', account: 'jeanoli', accountAvatar: 'JE', isPrivate: true, lastSync: '1 dia atrás', language: 'Python', branch: 'main' },
  { id: 4, name: 'blog-astro', fullName: 'jeanoli/blog-astro', account: 'jeanoli', accountAvatar: 'JE', isPrivate: false, lastSync: '3 dias atrás', language: 'Astro', branch: 'main' },
  { id: 5, name: 'react-native-app', fullName: 'mariadev/react-native-app', account: 'mariadev', accountAvatar: 'MD', isPrivate: true, lastSync: '1 semana atrás', language: 'TypeScript', branch: 'main' },
  { id: 6, name: 'landing-page', fullName: 'jeanoli/landing-page', account: 'jeanoli', accountAvatar: 'JE', isPrivate: false, lastSync: '2 semanas atrás', language: 'HTML', branch: 'main' },
  { id: 7, name: 'design-system', fullName: 'mariadev/design-system', account: 'mariadev', accountAvatar: 'MD', isPrivate: false, lastSync: '4 dias atrás', language: 'TypeScript', branch: 'main' },
  { id: 8, name: 'mobile-app', fullName: 'jeanoli/mobile-app', account: 'jeanoli', accountAvatar: 'JE', isPrivate: true, lastSync: '6 horas atrás', language: 'Dart', branch: 'feature/auth' },
];

export const aiModels: AIModel[] = [
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'OpenRouter', tokens: '200k' },
  { id: 'gpt-4', name: 'GPT-4 Turbo', provider: 'OpenRouter', tokens: '128k' },
  { id: 'llama-3', name: 'Llama 3 70B', provider: 'OpenRouter', tokens: '8k' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', provider: 'Google Gemini', tokens: '1M' },
  { id: 'gemini-flash', name: 'Gemini 1.5 Flash', provider: 'Google Gemini', tokens: '1M' },
  { id: 'llama2', name: 'Llama 2 (local)', provider: 'Ollama Local', tokens: '4k' },
  { id: 'codellama', name: 'CodeLlama (local)', provider: 'Ollama Local', tokens: '16k' },
];

export const sampleCode = `import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const ProductCard = ({ 
  id, name, price, image, 
  isFavorite = false, onToggleFavorite 
}: ProductCardProps) => {
  return (
    <Card className="w-full max-w-sm relative group">
      {onToggleFavorite && (
        <button
          onClick={() => onToggleFavorite(id)}
          className="absolute top-2 right-2 p-2 rounded-full 
            bg-white shadow-md opacity-0 group-hover:opacity-100 
            transition-opacity"
        >
          <Heart className={\`w-5 h-5 \${
            isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
          }\`} />
        </button>
      )}
      <img src={image} alt={name} 
        className="w-full h-48 object-cover" />
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{name}</h3>
        <p className="text-muted-foreground mb-3">
          R$ {price.toFixed(2)}
        </p>
        <Button className="w-full gradient-primary">
          Adicionar ao Carrinho
        </Button>
      </CardContent>
    </Card>
  );
};`;
