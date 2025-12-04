import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Armchair, MapPin, ArrowRightLeft, Building2, CheckCircle, Clock, XCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AddFurnitureDialog } from './AddFurnitureDialog';
import { FurnitureRequestsPanel } from './FurnitureRequestsPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

export function DesignerDashboard() {
  const {
    currentUser,
    currentUnit,
    items,
    categories,
    unitStocks,
    units,
    furnitureTransfers,
    furnitureRemovalRequests,
    getItemById,
    getUnitById,
    getUserById,
    addFurnitureTransfer,
    updateFurnitureTransfer,
    updateFurnitureRemovalRequest,
    updateStock,
    getWarehouseUnitId,
  } = useApp();

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [addFurnitureDialogOpen, setAddFurnitureDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [transferObservations, setTransferObservations] = useState('');
  // Designers não têm unidade fixa, então inicializa vazio
  const [viewingUnit, setViewingUnit] = useState<string>('');
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [selectedRemovalRequest, setSelectedRemovalRequest] = useState<string | null>(null);
  const [disposalJustification, setDisposalJustification] = useState('');

  // Sincronizar viewingUnit quando a unidade é selecionada no header
  useEffect(() => {
    if (currentUnit) {
      setViewingUnit(currentUnit.id);
    }
  }, [currentUnit]);

  // Filtrar móveis
  const furnitureItems = items.filter(item => item.isFurniture && item.active);

  // Filtrar estoque de móveis da unidade selecionada
  const furnitureStock = unitStocks.filter(
    stock => viewingUnit && stock.unitId === viewingUnit && furnitureItems.some(item => item.id === stock.itemId)
  );

  // Filtrar transferências do usuário
  const myTransfers = furnitureTransfers.filter(
    transfer => transfer.requestedByUserId === currentUser?.id
  );

  const pendingTransfers = myTransfers.filter(t => t.status === 'pending');
  const approvedTransfers = myTransfers.filter(t => t.status === 'approved');
  const completedTransfers = myTransfers.filter(t => t.status === 'completed');

  const handleRequestTransfer = (itemId: string, fromUnitId: string) => {
    setSelectedItem(itemId);
    setTransferDialogOpen(true);
    setSelectedUnit('');
    setTransferObservations('');
  };

  const confirmTransfer = () => {
    if (!selectedItem || !selectedUnit || !currentUser || !viewingUnit) {
      toast.error('Por favor, selecione uma unidade de destino');
      return;
    }

    addFurnitureTransfer({
      itemId: selectedItem,
      fromUnitId: viewingUnit,
      toUnitId: selectedUnit,
      requestedByUserId: currentUser.id,
      status: 'pending',
      observations: transferObservations,
    });

    toast.success('Solicitação de transferência criada!', {
      description: 'Aguardando aprovação da administração',
    });

    setTransferDialogOpen(false);
    setSelectedItem(null);
    setSelectedUnit('');
    setTransferObservations('');
  };

  const handleApproveRemoval = (requestId: string, decision: 'storage' | 'disposal') => {
    setSelectedRemovalRequest(requestId);
    setRemovalDialogOpen(true);
    setDisposalJustification('');
  };

  const confirmRemovalDecision = (decision: 'storage' | 'disposal') => {
    if (!selectedRemovalRequest || !currentUser) return;

    const request = furnitureRemovalRequests.find(r => r.id === selectedRemovalRequest);
    if (!request) return;

    if (decision === 'disposal' && !disposalJustification.trim()) {
      toast.error('Justificativa é obrigatória para descarte');
      return;
    }

    // Para descarte: vai para esteira de coleta do motorista
    // Para armazenagem: também vai para coleta, mas será armazenado
    const status = decision === 'storage' ? 'approved_storage' : 'approved_disposal';
    
    updateFurnitureRemovalRequest(selectedRemovalRequest, {
      status,
      reviewedByUserId: currentUser.id,
      reviewedAt: new Date(),
      disposalJustification: decision === 'disposal' ? disposalJustification : undefined,
    });

    const item = getItemById(request.itemId);
    const actionText = decision === 'storage' ? 'armazenagem' : 'descarte';

    toast.success(`Solicitação aprovada para ${actionText}!`, {
      description: `${item?.name} - Aguardando coleta do motorista`,
    });

    setRemovalDialogOpen(false);
    setSelectedRemovalRequest(null);
    setDisposalJustification('');
  };

  const handleRejectRemoval = (requestId: string) => {
    if (!currentUser) return;

    updateFurnitureRemovalRequest(requestId, {
      status: 'rejected',
      reviewedByUserId: currentUser.id,
      reviewedAt: new Date(),
    });

    toast.success('Solicitação rejeitada');
  };

  // Filtrar solicitações de retirada pendentes
  const pendingRemovalRequests = furnitureRemovalRequests.filter(r => r.status === 'pending');
  const approvedRemovalRequests = furnitureRemovalRequests.filter(
    r => r.status === 'approved_storage' || r.status === 'approved_disposal' || 
        r.status === 'awaiting_pickup' || r.status === 'in_transit'
  );

  const getTransferStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'outline', label: 'Pendente', icon: Clock },
      approved: { variant: 'default', label: 'Aprovado', icon: CheckCircle },
      completed: { variant: 'default', label: 'Concluído', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rejeitado', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const renderTransfersTable = (transfersList: typeof furnitureTransfers) => {
    if (transfersList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma transferência nesta categoria
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>De</TableHead>
            <TableHead>Para</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfersList.map((transfer) => {
            const item = getItemById(transfer.itemId);
            const fromUnit = getUnitById(transfer.fromUnitId);
            const toUnit = getUnitById(transfer.toUnitId);

            return (
              <TableRow key={transfer.id}>
                <TableCell>
                  <div>
                    <div>{item?.name}</div>
                    <div className="text-xs text-muted-foreground">{item?.description}</div>
                  </div>
                </TableCell>
                <TableCell>{fromUnit?.name}</TableCell>
                <TableCell>{toUnit?.name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(transfer.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </TableCell>
                <TableCell>{getTransferStatusBadge(transfer.status)}</TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground max-w-xs truncate">
                    {transfer.observations || '-'}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  // Unidades disponíveis (excluindo almoxarifado e unidade atual)
  const warehouseId = getWarehouseUnitId();
  const availableUnits = units.filter(
    u => u.id !== warehouseId && u.id !== viewingUnit && u.status === 'active'
  );

  const viewableUnits = units.filter(u => u.id !== warehouseId && u.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h2>Gestão de Móveis</h2>
        <p className="text-muted-foreground">Visualize e gerencie móveis de todas as unidades Gowork</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Transferências Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{pendingTransfers.length}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{approvedTransfers.length}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Concluídas</CardTitle>
            <Armchair className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{completedTransfers.length}</div>
            <p className="text-xs text-muted-foreground">Total de transferências</p>
          </CardContent>
        </Card>
      </div>

      {/* Solicitações de Móveis */}
      <FurnitureRequestsPanel />

      {/* Seletor de Unidade */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Móveis Disponíveis</CardTitle>
              <CardDescription>Visualize e gerencie o inventário de móveis por unidade</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button onClick={() => setAddFurnitureDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Móvel
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="unit-selector" className="whitespace-nowrap">Unidade:</Label>
                <Select value={viewingUnit} onValueChange={setViewingUnit}>
                  <SelectTrigger id="unit-selector" className="w-[200px]">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewableUnits.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewingUnit ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {furnitureStock.map(stock => {
                const item = getItemById(stock.itemId);
                if (!item) return null;

                return (
                  <Card key={stock.id} className="overflow-hidden">
                    {item.imageUrl && (
                      <div className="h-48 overflow-hidden bg-muted">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="mb-1">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{stock.location}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">Quantidade</div>
                            <div className="text-2xl">{stock.quantity}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestTransfer(item.id, stock.unitId)}
                            disabled={stock.quantity === 0 || availableUnits.length === 0}
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                            Transferir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {furnitureStock.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Nenhum móvel cadastrado nesta unidade
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Selecione uma unidade para visualizar os móveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aprovações de Retirada */}
      {(pendingRemovalRequests.length > 0 || approvedRemovalRequests.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Aprovações de Retirada de Móveis</CardTitle>
            <CardDescription>Avalie solicitações e decida entre armazenagem ou descarte</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">
                  Pendentes ({pendingRemovalRequests.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Aprovadas ({approvedRemovalRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingRemovalRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma solicitação pendente
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRemovalRequests.map((request) => {
                        const item = getItemById(request.itemId);
                        const unit = getUnitById(request.unitId);
                        const requester = getUserById(request.requestedByUserId);

                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <div>{item?.name}</div>
                                <div className="text-xs text-gray-500">{item?.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>{unit?.name}</TableCell>
                            <TableCell>{request.quantity}</TableCell>
                            <TableCell>{requester?.name}</TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600 max-w-xs">{request.reason}</div>
                            </TableCell>
                            <TableCell>
                              {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveRemoval(request.id, 'storage')}
                                >
                                  Armazenar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveRemoval(request.id, 'disposal')}
                                >
                                  Descartar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRejectRemoval(request.id)}
                                >
                                  Rejeitar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                {approvedRemovalRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma solicitação aprovada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Decisão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Justificativa</TableHead>
                        <TableHead>Data Aprovação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedRemovalRequests.map((request) => {
                        const item = getItemById(request.itemId);
                        const unit = getUnitById(request.unitId);
                        
                        const getStatusBadge = (status: string) => {
                          const statusConfig: Record<string, { label: string; variant: any }> = {
                            approved_storage: { label: 'Aguardando Coleta', variant: 'outline' },
                            approved_disposal: { label: 'Aguardando Coleta', variant: 'outline' },
                            awaiting_pickup: { label: 'Aguardando Coleta', variant: 'outline' },
                            in_transit: { label: 'Em Trânsito', variant: 'default' },
                            completed: { label: 'Concluído', variant: 'secondary' },
                          };
                          const config = statusConfig[status] || statusConfig.approved_storage;
                          return <Badge variant={config.variant}>{config.label}</Badge>;
                        };

                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <div>{item?.name}</div>
                                <div className="text-xs text-gray-500">{item?.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>{unit?.name}</TableCell>
                            <TableCell>{request.quantity}</TableCell>
                            <TableCell>
                              <Badge variant={request.status === 'approved_storage' ? 'default' : 'destructive'}>
                                {request.status === 'approved_storage' ? 'Armazenagem' : 'Descarte'}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600 max-w-xs">
                                {request.disposalJustification || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.reviewedAt && new Date(request.reviewedAt).toLocaleDateString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Transferências */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Solicitações de Transferência</CardTitle>
          <CardDescription>Acompanhe suas solicitações de movimentação de móveis</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pendentes ({pendingTransfers.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Aprovadas ({approvedTransfers.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Concluídas ({completedTransfers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {renderTransfersTable(pendingTransfers)}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {renderTransfersTable(approvedTransfers)}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {renderTransfersTable(completedTransfers)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Transferência */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Transferência de Móvel</DialogTitle>
            <DialogDescription>
              Selecione a unidade de destino para este item
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedItem && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Item selecionado</div>
                <div>{getItemById(selectedItem)?.name}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="from-unit">De (Unidade Origem)</Label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  {getUnitById(viewingUnit)?.name}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-unit">Para (Unidade Destino)</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger id="to-unit">
                  <SelectValue placeholder="Selecione a unidade de destino" />
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

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={transferObservations}
                onChange={(e) => setTransferObservations(e.target.value)}
                placeholder="Ex: Necessário para novo espaço de trabalho..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmTransfer} disabled={!selectedUnit}>
              Solicitar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cadastro de Móvel */}
      <AddFurnitureDialog 
        open={addFurnitureDialogOpen} 
        onClose={() => setAddFurnitureDialogOpen(false)} 
      />

      {/* Dialog de Aprovação de Retirada */}
      <Dialog open={removalDialogOpen} onOpenChange={setRemovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Decisão</DialogTitle>
            <DialogDescription>
              {selectedRemovalRequest && 
                furnitureRemovalRequests.find(r => r.id === selectedRemovalRequest)?.status === 'pending'
                  ? 'Você está prestes a aprovar esta solicitação. Escolha se o móvel será armazenado ou descartado.'
                  : 'Confirme a ação desejada'}
            </DialogDescription>
          </DialogHeader>

          {selectedRemovalRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Item</div>
                <div>
                  {getItemById(
                    furnitureRemovalRequests.find(r => r.id === selectedRemovalRequest)?.itemId || ''
                  )?.name}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disposal-justification">
                  Justificativa para Descarte {' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="disposal-justification"
                  value={disposalJustification}
                  onChange={(e) => setDisposalJustification(e.target.value)}
                  placeholder="Ex: Móvel danificado irreparavelmente, fora dos padrões da empresa..."
                  className="min-h-[100px]"
                />
                <p className="text-xs text-gray-500">
                  Obrigatório apenas para descarte. Deixe em branco para armazenagem.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRemovalDialogOpen(false);
                setDisposalJustification('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={() => confirmRemovalDecision('storage')}
            >
              Aprovar para Armazenagem
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRemovalDecision('disposal')}
              disabled={!disposalJustification.trim()}
            >
              Aprovar para Descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
