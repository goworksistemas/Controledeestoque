import React, { useContext, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ThemeContext } from '../App';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Package, Building2, LogOut, User, Menu, Moon, Sun, KeyRound } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';
import { GoworkLogo } from './GoworkLogo';
import { DailyCodeDisplay } from './DailyCodeDisplay';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { authService } from '../utils/auth';

export function AppHeader() {
  const { currentUser, currentUnit, logout, getAvailableUnits, setCurrentUnit } = useApp();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isMobile = useIsMobile();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  
  const availableUnits = getAvailableUnits();

  React.useEffect(() => {
    // Get access token directly from localStorage
    const token = localStorage.getItem('gowork_auth_token');
    console.log('🔑 Token recuperado do localStorage:', token ? 'Token encontrado' : 'Token NÃO encontrado');
    console.log('🔑 Token completo:', token);
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Update token when dialog opens or user changes
  React.useEffect(() => {
    if (showChangePassword || currentUser) {
      const token = localStorage.getItem('gowork_auth_token');
      if (token) {
        console.log('🔑 Atualizando token ao abrir dialog ou mudar usuário');
        setAccessToken(token);
      }
    }
  }, [showChangePassword, currentUser]);

  const getRoleName = (role: string) => {
    switch (role) {
      case 'controller': return 'Controlador';
      case 'admin': return 'Administrador';
      case 'warehouse': return 'Almoxarifado';
      case 'designer': return 'Designer';
      case 'developer': return 'Desenvolvedor';
      case 'requester': return 'Solicitante';
      default: return role;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'controller': return 'CTR';
      case 'admin': return 'ADM';
      case 'warehouse': return 'ALM';
      case 'designer': return 'DSG';
      case 'developer': return 'DEV';
      case 'requester': return 'REQ';
      default: return role.substring(0, 3).toUpperCase();
    }
  };

  if (isMobile) {
    return (
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <GoworkLogo variant="full" />

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser && getRoleName(currentUser.role)}</p>
                  </div>
                </DropdownMenuLabel>
                
                {(currentUnit || ((currentUser?.role === 'designer' || currentUser?.role === 'developer') && availableUnits.length > 0)) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {(currentUser?.role === 'designer' || currentUser?.role === 'developer') ? 'Visualizando' : 'Unidade Atual'}
                    </DropdownMenuLabel>
                    {availableUnits.length > 1 || currentUser?.role === 'designer' || currentUser?.role === 'developer' ? (
                      <div className="px-2 py-1">
                        <Select 
                          value={currentUnit?.id || ''} 
                          onValueChange={setCurrentUnit}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Selecione uma unidade" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map(unit => (
                              <SelectItem key={unit.id} value={unit.id} className="text-xs">
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : currentUnit ? (
                      <DropdownMenuItem disabled>
                        <Building2 className="w-4 h-4 mr-2" />
                        {currentUnit.name}
                      </DropdownMenuItem>
                    ) : null}
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 mr-2" />
                      Modo Claro
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 mr-2" />
                      Modo Escuro
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} accessToken={accessToken} />
      </header>
    );
  }

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <GoworkLogo variant="full" />

          <div className="flex items-center gap-4">
            {/* Designers e Developers veem seletor sempre, outros apenas se tiverem múltiplas unidades */}
            {(availableUnits.length > 1 || currentUser?.role === 'designer' || currentUser?.role === 'developer') && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Select value={currentUnit?.id || ''} onValueChange={setCurrentUnit}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={(currentUser?.role === 'designer' || currentUser?.role === 'developer') ? 'Selecione uma unidade' : 'Selecione'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mostra unidade fixa apenas se não for designer/developer e tiver apenas uma unidade */}
            {availableUnits.length === 1 && currentUser?.role !== 'designer' && currentUser?.role !== 'developer' && currentUnit && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">{currentUnit.name}</span>
              </div>
            )}

            {/* Código Diário do Usuário */}
            <DailyCodeDisplay />

            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-foreground">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser && getRoleName(currentUser.role)}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowChangePassword(true)} title="Alterar Senha">
                <KeyRound className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} title="Sair">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} accessToken={accessToken} />
    </header>
  );
}