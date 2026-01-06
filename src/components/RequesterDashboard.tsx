import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Package, Clock, CheckCircle2, XCircle, AlertCircle, CheckCircle, Scan, Archive, TrendingUp, History, ChevronsUpDown, Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { RequesterConfirmationPanel } from './RequesterConfirmationPanel';
import { QRCodeScanner } from './QRCodeScanner';
import { ReceiptConfirmationWithCode } from './ReceiptConfirmationWithCode';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function RequesterDashboard() {
  const { currentUser, items, requests, addRequest, getItemById, getUnitById, getUserById, units, deliveryBatches, getStockForItem, unitStocks, getWarehouseUnitId } = useApp();
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [observations, setObservations] = useState('');
  const [showConfirmationPanel, setShowConfirmationPanel] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedBatchId, setScannedBatchId] = useState<string | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Debug: Log para verificar os dados de estoque
  useEffect(() => {
    const warehouseId = getWarehouseUnitId();
    console.log('🔍 DEBUG RequesterDashboard:');
    console.log('🏢 Almoxarifado Central ID:', warehouseId);
    console.log('📦 Total de unit_stocks carregados:', unitStocks.length);
  }, [unitStocks, items, getWarehouseUnitId]);

  // Filtrar apenas itens que não são móveis (solicitantes só podem pedir itens do almoxarifado)
  const availableItems = items.filter(item => !item.isFurniture && item.active);

  // Filtrar unidades disponíveis (exceto almoxarifado)
  const warehouseId = getWarehouseUnitId();
  const availableUnits = units.filter(unit => unit.id !== warehouseId && unit.status === 'active');

  // Filtrar solicitações do usuário atual
  const myRequests = requests.filter(req => req.requestedByUserId === currentUser?.id);

  // Contar entregas pendentes de confirmação do solicitante
  const pendingConfirmations = deliveryBatches.filter(batch => {
    if (batch.status !== 'delivery_confirmed') return false;
    
    // Verificar se há itens neste lote que foram solicitados pelo usuário atual
    const userRequests = requests.filter(req => 
      batch.requestIds.includes(req.id) && 
      req.requestedByUserId === currentUser?.id &&
      req.status === 'delivery_confirmed'
    );
    
    return userRequests.length > 0;
  }).length;

  const handleSubmitRequest = () => {
    if (!selectedItemId || !currentUser) return;

    // Se for volante, precisa selecionar unidade. Se tiver primaryUnitId, usa ela
    const targetUnitId = currentUser.primaryUnitId || selectedUnitId;
    if (!targetUnitId) return;

    addRequest({
      itemId: selectedItemId,
      requestingUnitId: targetUnitId,
      requestedByUserId: currentUser.id,
      quantity: parseInt(quantity),
      status: 'pending',
      urgency,
      observations,
    });

    // Reset form
    setSelectedItemId('');
    setSelectedUnitId('');
    setQuantity('1');
    setUrgency('medium');
    setObservations('');
    setIsNewRequestOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle2 },
      processing: { label: 'Separando', variant: 'default' as const, icon: Package },
      awaiting_pickup: { label: 'Pronto', variant: 'default' as const, icon: CheckCircle2 },
      out_for_delivery: { label: 'A Caminho', variant: 'default' as const, icon: Package },
      delivery_confirmed: { label: 'Entregue', variant: 'default' as const, icon: CheckCircle2 },
      completed: { label: 'Concluído', variant: 'outline' as const, icon: CheckCircle2 },
      rejected: { label: 'Rejeitado', variant: 'destructive' as const, icon: XCircle },
      cancelled: { label: 'Cancelado', variant: 'outline' as const, icon: XCircle },
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      low: { label: 'Baixa', className: 'bg-gray-500' },
      medium: { label: 'Média', className: 'bg-[#00C5E9]' },
      high: { label: 'Alta', className: 'bg-[#3F76FF]' },
    };

    const config = urgencyMap[urgency as keyof typeof urgencyMap];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-1">Minhas Solicitações</h1>
          <p className="text-[#606060] dark:text-gray-400">
            Solicite materiais do almoxarifado central
          </p>
        </div>
        
        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3F76FF] hover:bg-[#3F76FF]/90 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Solicitação de Material</DialogTitle>
              <DialogDescription>
                Solicite materiais disponíveis no almoxarifado central
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item">Item *</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedItemId
                        ? getItemById(selectedItemId)?.name
                        : "Buscar e selecionar item..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar item..." />
                      <CommandList>
                        <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                        <CommandGroup>
                          {availableItems.map(item => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                setSelectedItemId(item.id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedItemId === item.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <span>{item.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Digite a quantidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgência *</Label>
                <Select value={urgency} onValueChange={(value: any) => setUrgency(value)}>
                  <SelectTrigger id="urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações (opcional)</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Adicione observações sobre a solicitação"
                  rows={3}
                />
              </div>

              {/* Se for volante, mostrar seleção de unidade */}
              {!currentUser.primaryUnitId && (
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade *</Label>
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Selecione a unidade" />
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
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewRequestOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                onClick={handleSubmitRequest}
                disabled={!selectedItemId || !quantity || parseInt(quantity) < 1}
              >
                Solicitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Painel de Confirmação de Recebimento */}
      <RequesterConfirmationPanel />

      {/* Estoque Disponível e Histórico com Tabs */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Estoque Disponível
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Meus Pedidos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Estoque Disponível */}
        <TabsContent value="stock" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#3F76FF]" />
                Itens Disponíveis para Solicitação
              </CardTitle>
              <CardDescription>
                Visualize os itens disponíveis no almoxarifado central e suas quantidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhum item disponível no momento</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableItems.map(item => {
                    // Obter estoque real do Almoxarifado Central
                    const warehouseId = getWarehouseUnitId();
                    const centralStock = warehouseId ? getStockForItem(item.id, warehouseId) : undefined;
                    const stockQuantity = centralStock?.quantity || 0;
                    
                    // Calcular quantidades solicitadas pendentes
                    const pendingRequests = requests.filter(
                      r => r.itemId === item.id && 
                      ['pending', 'approved', 'processing', 'awaiting_pickup'].includes(r.status)
                    );
                    const totalPending = pendingRequests.reduce((sum, r) => sum + r.quantity, 0);
                    const availableQuantity = stockQuantity - totalPending;
                    const isLowStock = availableQuantity < (item.minQuantity || 0);
                    const isOutOfStock = availableQuantity <= 0;

                    return (
                      <Card 
                        key={item.id} 
                        className={`hover:shadow-lg transition-shadow ${
                          isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base flex-1">{item.name}</CardTitle>
                            {isOutOfStock && (
                              <Badge variant="destructive" className="text-xs">
                                Esgotado
                              </Badge>
                            )}
                            {!isOutOfStock && isLowStock && (
                              <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                                Baixo
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Quantidade Disponível */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Disponível</p>
                              <p className={`text-2xl ${
                                isOutOfStock ? 'text-red-600' : 
                                isLowStock ? 'text-yellow-600' : 
                                'text-green-600'
                              }`}>
                                {availableQuantity}
                              </p>
                            </div>
                            <Package className={`h-8 w-8 ${
                              isOutOfStock ? 'text-red-400' : 
                              isLowStock ? 'text-yellow-400' : 
                              'text-green-400'
                            }`} />
                          </div>

                          {/* Detalhes */}
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Em Estoque:</span>
                              <span className="font-medium">{stockQuantity}</span>
                            </div>
                            {totalPending > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pendente:</span>
                                <span className="font-medium text-orange-600">{totalPending}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Mínimo:</span>
                              <span className="font-medium">{item.minQuantity || 0}</span>
                            </div>
                            {item.category && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Categoria:</span>
                                <span className="font-medium">{item.category}</span>
                              </div>
                            )}
                          </div>

                          {/* Botão de Solicitar */}
                          <Button
                            size="sm"
                            className="w-full bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setIsNewRequestOpen(true);
                            }}
                            disabled={isOutOfStock}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {isOutOfStock ? 'Indisponível' : 'Solicitar'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico de Pedidos */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Solicitações</CardTitle>
              <CardDescription>
                Acompanhe o status de todas as suas solicitações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Você ainda não fez nenhuma solicitação</p>
                  <Button
                    className="bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                    onClick={() => setIsNewRequestOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Fazer Primeira Solicitação
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Urgência</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(request => {
                          const item = getItemById(request.itemId);
                          
                          return (
                            <TableRow key={request.id}>
                              <TableCell>{item?.name || 'Item não encontrado'}</TableCell>
                              <TableCell>{request.quantity}</TableCell>
                              <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>
                                {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {request.observations || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botão Flutuante para Escanear QR Code */}
      <Button
        onClick={() => setShowQRScanner(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl bg-[#3F76FF] hover:bg-[#3F76FF]/90 z-40 flex items-center justify-center p-0"
      >
        <Scan className="h-6 w-6 text-white" />
      </Button>

      {/* Modal de Scanner de QR Code */}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQRScanner(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeScanner
              onScanSuccess={(code) => {
                // Encontrar lote pelo QR Code
                const batch = deliveryBatches.find(b => b.qrCode === code);
                if (batch) {
                  setScannedBatchId(batch.id);
                  setShowQRScanner(false);
                } else {
                  toast.error('Lote não encontrado. Verifique o código.');
                }
              }}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmação com Código */}
      {scannedBatchId && (() => {
        const batch = deliveryBatches.find(b => b.id === scannedBatchId);
        if (!batch) return null;
        
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-2xl">
              <ReceiptConfirmationWithCode
                batch={batch}
                onSuccess={() => {
                  setScannedBatchId(null);
                }}
                onCancel={() => {
                  setScannedBatchId(null);
                }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}