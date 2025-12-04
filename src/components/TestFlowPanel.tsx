import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  TestTube2, 
  Package, 
  CheckCircle, 
  Clock,
  Users,
  Database,
  FileText,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDailyCode } from '../utils/dailyCode';

export function TestFlowPanel() {
  const { 
    currentUser,
    currentUnit,
    deliveryBatches,
    deliveryConfirmations,
    requests,
    furnitureRequestsToDesigner,
    getUserDailyCode,
    getItemById,
    getUserById,
  } = useApp();

  const [showDetails, setShowDetails] = useState(false);

  if (!currentUser) return null;

  // Estatísticas do sistema
  const stats = {
    totalBatches: deliveryBatches.length,
    pendingBatches: deliveryBatches.filter(b => b.status === 'pending_confirmation').length,
    completedBatches: deliveryBatches.filter(b => b.status === 'completed').length,
    totalConfirmations: deliveryConfirmations.length,
    myRequests: requests.filter(r => r.requestedByUserId === currentUser.id).length,
    myFurnitureRequests: furnitureRequestsToDesigner.filter(r => r.requestedByUserId === currentUser.id).length,
  };

  // Meu código do dia
  const myCode = currentUser ? getUserDailyCode(currentUser.id) : '';
  const formattedCode = formatDailyCode(myCode);

  // Lotes pendentes da minha unidade
  const myPendingBatches = deliveryBatches.filter(b => 
    b.status === 'pending_confirmation' && 
    b.targetUnitId === currentUnit?.id
  );

  // Verificar se há lotes que preciso confirmar
  const batchesINeedToConfirm = myPendingBatches.filter(batch => {
    const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
    const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
      batch.furnitureRequestIds?.includes(r.id)
    );
    
    // Verificar se algum pedido é meu
    const hasMyRequests = batchRequests.some(r => r.requestedByUserId === currentUser.id) ||
                          batchFurnitureRequests.some(r => r.requestedByUserId === currentUser.id);
    
    // Verificar se já confirmei
    const myConfirmation = deliveryConfirmations.find(c => 
      c.batchId === batch.id && c.userId === currentUser.id
    );
    
    return hasMyRequests && !myConfirmation;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-2 border-[#3F76FF]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-[#3F76FF]" />
              <CardTitle>Painel de Teste - Fluxo "Confirmar Depois"</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Ocultar Detalhes' : 'Ver Detalhes'}
            </Button>
          </div>
          <CardDescription>
            Use este painel para testar o fluxo completo de confirmação de entregas
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status do Usuário */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Informações do Usuário Atual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{currentUser.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Perfil</p>
                <Badge variant="outline">{currentUser.role}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Unidade</p>
                <p className="font-medium">{currentUnit?.name || 'N/A'}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-muted-foreground mb-1">Código Único de Hoje</p>
                <p className="text-2xl font-mono font-bold text-[#3F76FF] tracking-wider">
                  {formattedCode}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use este código para confirmar recebimentos
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Estatísticas do Sistema */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Estatísticas do Sistema
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#3F76FF]">{stats.totalBatches}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total de Lotes</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600">{stats.pendingBatches}</p>
                    <p className="text-sm text-muted-foreground mt-1">Lotes Pendentes</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{stats.completedBatches}</p>
                    <p className="text-sm text-muted-foreground mt-1">Lotes Concluídos</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#00C5E9]">{stats.totalConfirmations}</p>
                    <p className="text-sm text-muted-foreground mt-1">Confirmações</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{stats.myRequests}</p>
                    <p className="text-sm text-muted-foreground mt-1">Minhas Solicitações</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">{stats.myFurnitureRequests}</p>
                    <p className="text-sm text-muted-foreground mt-1">Meus Móveis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Minhas Ações Pendentes */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ações Pendentes para Mim
            </h3>
            
            {batchesINeedToConfirm.length > 0 ? (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                      Você tem {batchesINeedToConfirm.length} lote(s) aguardando sua confirmação!
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      Vá para o painel principal e procure pelo card amarelo "Entregas Aguardando Confirmação"
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <p className="text-green-700 dark:text-green-400">
                    ✅ Você não tem confirmações pendentes
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Detalhes Técnicos */}
          {showDetails && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detalhes Técnicos
                </h3>
                
                <div className="space-y-4">
                  {/* Todos os lotes pendentes */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Lotes Pendentes de Confirmação:</h4>
                    {myPendingBatches.length > 0 ? (
                      <div className="space-y-2">
                        {myPendingBatches.map(batch => {
                          const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
                          const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
                            batch.furnitureRequestIds?.includes(r.id)
                          );
                          
                          // Solicitantes únicos
                          const requesterIds = new Set<string>();
                          batchRequests.forEach(r => requesterIds.add(r.requestedByUserId));
                          batchFurnitureRequests.forEach(r => requesterIds.add(r.requestedByUserId));
                          
                          // Confirmações já feitas
                          const confirmations = deliveryConfirmations.filter(c => c.batchId === batch.id);
                          
                          return (
                            <Card key={batch.id} className="bg-muted/30">
                              <CardContent className="pt-4">
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-semibold">{batch.qrCode}</span>
                                    <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">
                                      {batch.status}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Total de Itens:</span>
                                      <span className="ml-1 font-medium">
                                        {batchRequests.length + batchFurnitureRequests.length}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Solicitantes:</span>
                                      <span className="ml-1 font-medium">{requesterIds.size}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Confirmações:</span>
                                      <span className="ml-1 font-medium">
                                        {confirmations.length} / {requesterIds.size}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">ID:</span>
                                      <span className="ml-1 font-mono text-xs">{batch.id.slice(0, 8)}...</span>
                                    </div>
                                  </div>
                                  
                                  {confirmations.length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className="text-xs font-medium mb-1">Confirmado por:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {confirmations.map(conf => (
                                          <Badge key={conf.id} variant="secondary" className="text-xs">
                                            {conf.userName}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum lote pendente nesta unidade</p>
                    )}
                  </div>

                  {/* Minhas confirmações */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Minhas Confirmações Realizadas:</h4>
                    {deliveryConfirmations.filter(c => c.userId === currentUser.id).length > 0 ? (
                      <div className="space-y-2">
                        {deliveryConfirmations
                          .filter(c => c.userId === currentUser.id)
                          .slice(0, 5)
                          .map(conf => {
                            const batch = deliveryBatches.find(b => b.id === conf.batchId);
                            return (
                              <div key={conf.id} className="bg-muted/30 rounded p-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono">{batch?.qrCode || 'Lote não encontrado'}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(conf.confirmedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                {conf.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">"{conf.notes}"</p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Você ainda não confirmou nenhuma entrega</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Guia de Teste */}
          <Separator />
          <Alert className="border-[#3F76FF]">
            <FileText className="h-4 w-4 text-[#3F76FF]" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-[#3F76FF]">📖 Guia de Teste Completo</p>
                <p className="text-sm">
                  Consulte o arquivo <code className="bg-muted px-1 py-0.5 rounded">/TESTE_CONFIRMAR_DEPOIS.md</code> para 
                  instruções detalhadas de como testar todo o fluxo.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
