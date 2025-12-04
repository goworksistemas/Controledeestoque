import React from 'react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { KeyRound } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDailyCode } from '../utils/dailyCode';

export function DailyCodeDisplay() {
  const { currentUser, getUserDailyCode } = useApp();

  if (!currentUser) return null;

  const dailyCode = getUserDailyCode(currentUser.id);
  const formattedCode = formatDailyCode(dailyCode);

  // Apenas mostrar para controladores, motoristas e pessoas que recebem entregas
  if (!['controller', 'warehouse'].includes(currentUser.role)) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-[#3F76FF]/30 rounded-lg cursor-help">
            <KeyRound className="h-4 w-4 text-[#3F76FF]" />
            <span className="text-sm font-mono tracking-wider text-[#3F76FF]">{formattedCode}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Seu código diário de confirmação</p>
          <p className="text-xs text-gray-500">Válido por 24h • Renova automaticamente</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
