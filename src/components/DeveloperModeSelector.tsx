import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Shield, 
  UserCog, 
  Package, 
  Truck, 
  Palette, 
  Code, 
  User,
  ArrowLeft,
  Eye
} from 'lucide-react';
import type { UserRole } from '../types';

interface DeveloperModeSelectorProps {
  currentViewRole: UserRole | null;
  onSelectRole: (role: UserRole | null) => void;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  controller: {
    label: 'Controlador',
    icon: <Shield className="w-5 h-5" />,
    color: 'bg-purple-500',
    description: 'Controle total de estoque e movimentações'
  },
  admin: {
    label: 'Administrador',
    icon: <UserCog className="w-5 h-5" />,
    color: 'bg-blue-500',
    description: 'Gestão administrativa das unidades'
  },
  warehouse: {
    label: 'Almoxarifado',
    icon: <Package className="w-5 h-5" />,
    color: 'bg-green-500',
    description: 'Gestão de produtos e solicitações'
  },
  driver: {
    label: 'Motorista',
    icon: <Truck className="w-5 h-5" />,
    color: 'bg-yellow-500',
    description: 'Entregas e confirmações'
  },
  designer: {
    label: 'Designer',
    icon: <Palette className="w-5 h-5" />,
    color: 'bg-pink-500',
    description: 'Gestão de móveis e design'
  },
  developer: {
    label: 'Developer',
    icon: <Code className="w-5 h-5" />,
    color: 'bg-slate-700',
    description: 'Configurações e gestão do sistema'
  },
  requester: {
    label: 'Solicitante',
    icon: <User className="w-5 h-5" />,
    color: 'bg-cyan-500',
    description: 'Fazer solicitações de materiais'
  },
};

export function DeveloperModeSelector({ currentViewRole, onSelectRole }: DeveloperModeSelectorProps) {
  if (currentViewRole) {
    const config = roleConfig[currentViewRole];
    return (
      <div className="mb-4">
        <Card className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`${config.color} text-white p-2 rounded-lg`}>
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Visualizando como:</span>
                    <Badge className={`${config.color} text-white`}>
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectRole(null)}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Developer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#3F76FF]" />
              Visualizar Sistema Como:
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione um perfil para testar as funcionalidades específicas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([role, config]) => {
              if (role === 'developer') return null; // Não mostrar o próprio developer
              
              return (
                <Button
                  key={role}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:border-[#3F76FF] hover:bg-[#3F76FF]/5 transition-all"
                  onClick={() => onSelectRole(role)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`${config.color} text-white p-2 rounded-lg`}>
                      {config.icon}
                    </div>
                    <span className="font-semibold">{config.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-left">
                    {config.description}
                  </p>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
