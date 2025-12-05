import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Package, CheckCircle, XCircle, Clock, AlertCircle, PackageCheck, Truck, Armchair, Scan } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AddFurnitureDialog } from './AddFurnitureDialog';
import { SelectItemForStockDialog } from './SelectItemForStockDialog';
import { WarehouseStockPanel } from './WarehouseStockPanel';
import { FurnitureStockPanel } from './FurnitureStockPanel';
import { CreateBatchDeliveryDialog } from './CreateBatchDeliveryDialog';
import { QRCodeScanner } from './QRCodeScanner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

export function WarehouseDashboard() {
  const { 
    currentUser, 
    requests, 
    items, 
    categories,
    getItemById, 
    getUnitById, 
    getUserById,
    updateRequest,
    unitStocks,
    getStockForItem,
    furnitureRemovalRequests,
    updateFurnitureRemovalRequest,
    furnitureRequestsToDesigner,
    updateStock,
    users,
    createDeliveryBatch,
    deliveryBatches,
    separateItemInBatch,
    units,
    getWarehouseUnitId,
  } = useApp();

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'ready_pickup' | 'picked_up' | 'delivered' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showAddFurniture, setShowAddFurniture] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedBatchToFinalize, setSelectedBatchToFinalize] = useState<string | null>(null);

  // Verifica se o usuário atual é motorista ou almoxarifado direto
  const isDeliveryDriver = currentUser?.warehouseType === 'delivery';
  const isStorageWorker = currentUser?.warehouseType === 'storage';

  // BUSCAR O ID CORRETO DO ALMOXARIFADO CENTRAL
  const centralWarehouse = units.find(u => u.name === 'Almoxarifado Central');
  const warehouseUnitId = centralWarehouse?.id;

  console.log('🏢 WarehouseDashboard - Total de solicitações no sistema:', requests.length);
  console.log('🏢 WarehouseDashboard - Solicitações:', requests.map(r => ({
    id: r.id,
    item: r.itemId,
    status: r.status,
    requesting: r.requestingUnitId,
  })));

  const warehouseRequests = requests.filter(r => r.status !== 'cancelled');
  console.log('🏢 WarehouseDashboard - Solicitações não canceladas:', warehouseRequests.length);

  const pendingRequests = warehouseRequests.filter(r => r.status === 'pending');
  const approvedRequests = warehouseRequests.filter(r => r.status === 'approved' || r.status === 'processing');
  const awaitingPickupRequests = warehouseRequests.filter(r => r.status === 'awaiting_pickup');
  const outForDeliveryRequests = warehouseRequests.filter(r => r.status === 'out_for_delivery');
  const completedRequests = warehouseRequests.filter(r => r.status === 'completed');

  // Lotes pendentes de separação
  const pendingBatches = deliveryBatches.filter(b => b.status === 'pending');
  const inTransitBatches = deliveryBatches.filter(b => b.status === 'in_transit');
  
  // Lotes confirmados pelo controlador aguardando registro final
  const deliveryConfirmedBatches = deliveryBatches.filter(b => b.status === 'delivery_confirmed');

  // 🔧 FILTRAR LOTES TRAVADOS: remover lotes pending com todos itens separados
  const validPendingBatches = pendingBatches.filter(batch => {
    const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
    const allSeparated = batchRequests.every(r => r.status === 'awaiting_pickup');
    return !allSeparated; // Mostrar apenas lotes que ainda têm itens para separar
  });

  // Solicitações ativas (precisam de ação imediata)
  const activeRequests = [...pendingRequests, ...approvedRequests, ...outForDeliveryRequests];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'outline', label: 'Pendente' },
      approved: { variant: 'default', label: 'Aprovado' },
      processing: { variant: 'secondary', label: 'Em Processamento' },
      awaiting_pickup: { variant: 'secondary', label: 'Aguardando Retirada' },
      out_for_delivery: { variant: 'default', label: 'Saiu para Entrega' },
      completed: { variant: 'default', label: 'Entregue' },
      rejected: { variant: 'destructive', label: 'Rejeitado' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig: Record<string, { className: string; label: string }> = {
      low: { className: 'bg-green-100 text-green-800 border-green-300', label: 'Baixa' },
      medium: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Média' },
      high: { className: 'bg-red-100 text-red-800 border-red-300', label: 'Alta' },
    };
    
    const config = urgencyConfig[urgency] || urgencyConfig.medium;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleApprove = (requestId: string) => {
    setSelectedRequest(requestId);
    setActionType('approve');
  };

  const handleReject = (requestId: string) => {
    setSelectedRequest(requestId);
    setActionType('reject');
  };

  const handleReadyForPickup = (requestId: string) => {
    setSelectedRequest(requestId);
    setActionType('ready_pickup');
  };

  const handlePickedUp = (requestId: string) => {
    setSelectedRequest(requestId);
    setActionType('picked_up');
  };

  const handleDelivered = (requestId: string) => {
    setSelectedRequest(requestId);
    setActionType('delivered');
  };

  const handleFinalizeBatch = (batchId: string) => {
    setSelectedBatchToFinalize(batchId);
  };

  const confirmFinalizeBatch = () => {
    if (!selectedBatchToFinalize || !currentUser) return;

    // O lote já tem o recebimento confirmado pelo controlador
    // Aqui apenas registramos que o almoxarifado tomou ciência
    toast.success('✅ Entrega registrada com sucesso!', {
      description: 'O lote foi finalizado no sistema'
    });

    setSelectedBatchToFinalize(null);
  };

  const confirmAction = () => {
    if (!selectedRequest || !currentUser) return;

    if (actionType === 'approve') {
      const request = requests.find(r => r.id === selectedRequest);
      const warehouseStock = request && warehouseUnitId ? getStockForItem(request.itemId, warehouseUnitId) : null;
      const hasStock = warehouseStock && warehouseStock.quantity >= (request?.quantity || 0);
      
      updateRequest(selectedRequest, {
        status: 'approved',
        approvedByUserId: currentUser.id,
        approvedAt: new Date(),
      });
      
      if (!hasStock) {
        toast.warning('⚠️ Solicitação aprovada, mas estoque insuficiente! Providencie reposição.');
      } else {
        toast.success('✅ Solicitação aprovada com sucesso!');
      }
    } else if (actionType === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Por favor, informe o motivo da rejeição');
        return;
      }
      updateRequest(selectedRequest, {
        status: 'rejected',
        rejectedReason: rejectionReason,
      });
      toast.success('Solicitação rejeitada');
    } else if (actionType === 'ready_pickup') {
      updateRequest(selectedRequest, {
        status: 'awaiting_pickup',
        pickupReadyByUserId: currentUser.id,
        pickupReadyAt: new Date(),
      });
      toast.success('✓ Pedido separado! Agora crie o lote para envio.');
    } else if (actionType === 'picked_up') {
      updateRequest(selectedRequest, {
        status: 'out_for_delivery',
        pickedUpByUserId: currentUser.id,
        pickedUpAt: new Date(),
      });
      toast.success('Pedido retirado e saiu para entrega!');
    } else if (actionType === 'delivered') {
      updateRequest(selectedRequest, {
        status: 'completed',
        completedByUserId: currentUser.id,
        completedAt: new Date(),
      });
      toast.success('Entrega confirmada com sucesso!');
    }

    setSelectedRequest(null);
    setActionType(null);
    setRejectionReason('');
  };

  // Funções para coletas de móveis
  const handlePickupFurniture = (requestId: string) => {
    if (!currentUser) return;
    updateFurnitureRemovalRequest(requestId, {
      status: 'in_transit',
      pickedUpByUserId: currentUser.id,
      pickedUpAt: new Date(),
    });
    toast.success('Móvel coletado! Em trânsito para o almoxarifado');
  };

  const handleReceiveFurniture = (requestId: string) => {
    if (!currentUser) return;
    const request = furnitureRemovalRequests.find(r => r.id === requestId);
    if (!request) return;

    // Reduzir estoque da unidade de origem
    const stock = unitStocks.find(s => s.itemId === request.itemId && s.unitId === request.unitId);
    if (stock) {
      const newQuantity = Math.max(0, stock.quantity - request.quantity);
      updateStock(stock.id, newQuantity);
    }

    updateFurnitureRemovalRequest(requestId, {
      status: 'completed',
      receivedByUserId: currentUser.id,
      receivedAt: new Date(),
      completedAt: new Date(),
    });

    const action = request.status.includes('storage') ? 'armazenado' : 'descartado';
    toast.success(`Móvel recebido e ${action} com sucesso!`);
  };

  // Filtrar coletas de móveis
  const furniturePickups = furnitureRemovalRequests.filter(
    r => r.status === 'approved_storage' || r.status === 'approved_disposal'
  );
  const furnitureInTransit = furnitureRemovalRequests.filter(r => r.status === 'in_transit');

  const renderRequestRow = (request: typeof requests[0]) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.requestingUnitId);
    const user = getUserById(request.requestedByUserId);
    
    // USAR O ID CORRETO DO ALMOXARIFADO
    const warehouseStock = warehouseUnitId ? getStockForItem(request.itemId, warehouseUnitId) : undefined;
    const hasStock = warehouseStock && warehouseStock.quantity >= request.quantity;
    const stockQuantity = warehouseStock?.quantity || 0;

    return (
      <div key={request.id} className={`border rounded-lg p-3 sm:p-4 space-y-3 ${
        !hasStock && request.status === 'pending' ? 'bg-red-50 border-red-200' : 'bg-white'
      }`}>
        {/* Header Mobile */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{item?.name || 'Item não encontrado'}</h4>
            <p className="text-sm text-gray-600 truncate">{unit?.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(request.status)}
            {getUrgencyBadge(request.urgency)}
          </div>
        </div>

        {/* Alerta de Estoque Insuficiente */}
        {!hasStock && request.status === 'pending' && (
          <div className="flex items-start gap-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Estoque Insuficiente</p>
              <p>Solicitado: {request.quantity} | Disponível: {stockQuantity}</p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Qtd:</span>
            <span className="ml-1 font-semibold">{request.quantity}</span>
            <span className={`ml-1 text-xs font-semibold ${hasStock ? 'text-green-600' : 'text-red-600'}`}>
              (Est: {stockQuantity})
            </span>
          </div>
          <div>
            <span className="text-gray-500">Solicitante:</span>
            <span className="ml-1 truncate block">{user?.name}</span>
          </div>
        </div>

        {/* Data */}
        <div className="text-xs text-gray-500">
          {new Date(request.createdAt).toLocaleDateString('pt-BR')} às{' '}
          {new Date(request.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          {/* Ações para Almoxarifado Direto */}
          {isStorageWorker && request.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant={hasStock ? "default" : "secondary"}
                onClick={() => handleApprove(request.id)}
                className="flex-1 sm:flex-none"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {hasStock ? 'Aprovar' : 'Aprovar (Sem Estoque)'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request.id)}
                className="flex-1 sm:flex-none"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </>
          )}
          
          {/* Ações para Motorista */}
          {isDeliveryDriver && request.status === 'out_for_delivery' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleDelivered(request.id)}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Entregue
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderFurnitureRow = (request: typeof furnitureRemovalRequests[0]) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.unitId);
    const reviewer = getUserById(request.reviewedByUserId || '');
    const driver = getUserById(request.pickedUpByUserId || '');

    return (
      <div key={request.id} className="bg-white border rounded-lg p-3 sm:p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Armchair className="h-5 w-5 text-[#3F76FF] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{item?.name}</h4>
              <p className="text-sm text-gray-600 truncate">{unit?.name}</p>
            </div>
          </div>
          <Badge variant={request.status === 'approved_storage' ? 'default' : 'destructive'}>
            {request.status === 'approved_storage' || request.status === 'in_transit' ? 'Armazenagem' : 'Descarte'}
          </Badge>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Qtd:</span>
            <span className="ml-1 font-semibold">{request.quantity}</span>
          </div>
          {request.status === 'in_transit' && driver && (
            <div>
              <span className="text-gray-500">Motorista:</span>
              <span className="ml-1 truncate block">{driver.name}</span>
            </div>
          )}
        </div>

        {/* Data */}
        {request.pickedUpAt ? (
          <div className="text-xs text-gray-500">
            Coletado: {new Date(request.pickedUpAt).toLocaleString('pt-BR')}
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            Aprovado: {request.reviewedAt && new Date(request.reviewedAt).toLocaleDateString('pt-BR')}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          {isDeliveryDriver && request.status !== 'in_transit' && (
            <Button
              size="sm"
              onClick={() => handlePickupFurniture(request.id)}
              className="flex-1"
            >
              <Truck className="h-4 w-4 mr-1" />
              Coletado
            </Button>
          )}
          {isStorageWorker && request.status === 'in_transit' && (
            <Button
              size="sm"
              onClick={() => handleReceiveFurniture(request.id)}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Recebido
            </Button>
          )}
        </div>
      </div>
    );
  };

  const warehouseId = getWarehouseUnitId();
  const warehouseStock = unitStocks.filter(s => s.unitId === warehouseId);
  
  // Filtrar apenas materiais (sem móveis) para os alertas de estoque baixo
  const lowStockItems = warehouseStock.filter(s => {
    const item = items.find(i => i.id === s.itemId);
    return s.quantity < s.minimumQuantity && !item?.isFurniture;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      <div>
        <h2 className="text-xl sm:text-2xl">Almoxarifado Central</h2>
        <p className="text-sm sm:text-base text-gray-600">
          {isDeliveryDriver && 'Entregas e coletas de materiais'}
          {isStorageWorker && 'Gestão de solicitações e distribuição de materiais'}
          {!isDeliveryDriver && !isStorageWorker && 'Gestão de solicitações e distribuição de materiais'}
        </p>
      </div>

      {/* KPIs - Responsivos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{pendingRequests.length}</div>
            <p className="text-xs text-gray-600">Aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Para Separar</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{approvedRequests.length}</div>
            <p className="text-xs text-gray-600">Aprovados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Aguardando</CardTitle>
            <PackageCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{awaitingPickupRequests.length}</div>
            <p className="text-xs text-gray-600">Retirada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Em Rota</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{outForDeliveryRequests.length}</div>
            <p className="text-xs text-gray-600">Entrega</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Estoque Baixo</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{lowStockItems.length}</div>
            <p className="text-xs text-gray-600">Materiais</p>
          </CardContent>
        </Card>
      </div>

      {/* ENTREGAS CONFIRMADAS - AGUARDANDO REGISTRO FINAL */}
      {isStorageWorker && deliveryConfirmedBatches.length > 0 && (
        <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base sm:text-lg">
                  Entregas Confirmadas pelo Controlador
                </CardTitle>
              </div>
              <Badge className="bg-green-600 text-white">
                {deliveryConfirmedBatches.length}
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Controlador confirmou recebimento - registre para finalizar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryConfirmedBatches.map(batch => {
              const driver = getUserById(batch.driverUserId);
              const targetUnit = getUnitById(batch.targetUnitId);
              const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
              const totalItems = batchRequests.length + (batch.furnitureRequestIds?.length || 0);

              return (
                <div key={batch.id} className="bg-white rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">Lote {batch.qrCode}</p>
                      <p className="text-xs text-gray-600">
                        Destino: {targetUnit?.name} • {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Motorista: {driver?.name}
                      </p>
                    </div>
                    <Badge className="bg-green-600">Confirmado</Badge>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {batchRequests.map(req => {
                      const item = getItemById(req.itemId);
                      return (
                        <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                          <span className="truncate flex-1">{item?.name}</span>
                          <Badge variant="outline" className="ml-2">Qtd: {req.quantity}</Badge>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleFinalizeBatch(batch.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Registrar Conclusão
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Coletas de Móveis - Para Armazenagem ou Descarte */}
      {(furniturePickups.length > 0 || furnitureInTransit.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Armchair className="h-5 w-5 text-[#3F76FF]" />
              Coletas de Móveis
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isDeliveryDriver ? 'Móveis para coleta e transporte ao almoxarifado' : 'Móveis aguardando armazenagem ou descarte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={isDeliveryDriver ? "pickups" : "transit"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pickups" className="relative">
                  <span className="hidden sm:inline">Aguardando Coleta</span>
                  <span className="sm:hidden">Coleta</span>
                  <span className="ml-1">({furniturePickups.length})</span>
                  {furniturePickups.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="transit" className="relative">
                  <span className="hidden sm:inline">Em Trânsito</span>
                  <span className="sm:hidden">Trânsito</span>
                  <span className="ml-1">({furnitureInTransit.length})</span>
                  {furnitureInTransit.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pickups" className="space-y-3 mt-4">
                {furniturePickups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma coleta pendente
                  </div>
                ) : (
                  <div className="space-y-3">
                    {furniturePickups.map(renderFurnitureRow)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transit" className="space-y-3 mt-4">
                {furnitureInTransit.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum móvel em trânsito
                  </div>
                ) : (
                  <div className="space-y-3">
                    {furnitureInTransit.map(renderFurnitureRow)}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Seção de Criação de Lotes - COM ITENS APROVADOS */}
      {isStorageWorker && approvedRequests.length > 0 && (
        <Card className="border-2 border-[#3F76FF] bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#3F76FF]" />
                  Itens Aprovados - Criar Lote
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {approvedRequests.filter(r => r.status === 'approved').length} item(ns) aprovado(s) prontos para criar lote
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowCreateBatch(true)}
                className="bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                size="lg"
              >
                <Truck className="h-5 w-5 mr-2" />
                Criar Lote
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Agrupar por unidade */}
            {(() => {
              const approvedOnly = approvedRequests.filter(r => r.status === 'approved');
              const itemsByUnit = approvedOnly.reduce((acc, req) => {
                const unitId = req.requestingUnitId;
                if (!acc[unitId]) acc[unitId] = [];
                acc[unitId].push(req);
                return acc;
              }, {} as Record<string, typeof approvedRequests>);

              return (
                <div className="space-y-3">
                  {Object.entries(itemsByUnit).map(([unitId, unitRequests]) => {
                    const unit = getUnitById(unitId);
                    return (
                      <div key={unitId} className="bg-white rounded-lg p-4 border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-sm">{unit?.name}</h4>
                            <p className="text-xs text-gray-600">
                              {unitRequests.length} {unitRequests.length === 1 ? 'item' : 'itens'}
                            </p>
                          </div>
                          <Badge className="bg-green-600">Aprovado</Badge>
                        </div>
                        <div className="space-y-2">
                          {unitRequests.map(req => {
                            const item = getItemById(req.itemId);
                            return (
                              <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                <span className="truncate flex-1">{item?.name}</span>
                                <Badge variant="outline" className="ml-2">Qtd: {req.quantity}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Lotes Pendentes de Separação */}
      {isStorageWorker && validPendingBatches.length > 0 && (
        <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-orange-600" />
              Lotes Aguardando Separação ({validPendingBatches.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Separe cada item do lote. Quando todos separados, vai automaticamente para o motorista
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validPendingBatches.map(batch => {
              const driver = getUserById(batch.driverUserId);
              const unit = getUnitById(batch.targetUnitId);
              const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
              
              return (
                <div key={batch.id} className="bg-white rounded-lg p-4 border-2 border-orange-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">Lote #{batch.qrCode}</h4>
                      <p className="text-xs text-gray-600">Destino: {unit?.name}</p>
                      <p className="text-xs text-gray-600">Motorista: {driver?.name}</p>
                    </div>
                    <Badge className="bg-orange-500">Separando</Badge>
                  </div>

                  <div className="space-y-2">
                    {batchRequests.map(req => {
                      const item = getItemById(req.itemId);
                      const isSeparated = req.status === 'awaiting_pickup';
                      
                      return (
                        <div 
                          key={req.id} 
                          className={`flex items-center justify-between p-3 rounded border-2 ${
                            isSeparated ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item?.name}</p>
                            <p className="text-xs text-gray-600">Qtd: {req.quantity}</p>
                          </div>
                          
                          {isSeparated ? (
                            <Badge className="bg-green-600">�� Separado</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (separateItemInBatch) {
                                  try {
                                    await separateItemInBatch(req.id, batch.id);
                                    toast.success(`Item separado! ${batchRequests.filter(r => r.status === 'awaiting_pickup').length + 1}/${batchRequests.length}`);
                                  } catch (error) {
                                    console.error('Erro ao separar item:', error);
                                    toast.error('Erro ao separar item. Tente novamente.');
                                  }
                                }
                              }}
                              className="bg-orange-500 hover:bg-orange-600"
                            >
                              <PackageCheck className="h-4 w-4 mr-1" />
                              Separar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Solicitações de Materiais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Solicitações de Materiais</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isDeliveryDriver ? 'Pedidos para retirada e entrega' : 'Aprovar e separar pedidos das unidades'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={isDeliveryDriver ? "delivery" : "active"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
              <TabsTrigger value="active" className="relative">
                <span className="hidden sm:inline">Ativas</span>
                <span className="sm:hidden">Ativas</span>
                <span className="ml-1">({activeRequests.length})</span>
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="delivery" className="sm:hidden relative">
                <Truck className="h-4 w-4 mr-1" />
                ({outForDeliveryRequests.length})
                {outForDeliveryRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="relative">
                <span className="hidden sm:inline">Concluídas</span>
                <span className="sm:hidden">OK</span>
                <span className="ml-1">({completedRequests.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3 mt-4">
              {activeRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma solicitação ativa
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRequests.map(renderRequestRow)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivery" className="space-y-3 mt-4 sm:hidden">
              {outForDeliveryRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma entrega em rota
                </div>
              ) : (
                <div className="space-y-3">
                  {outForDeliveryRequests.map(renderRequestRow)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {completedRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma solicitação concluída
                </div>
              ) : (
                <div className="space-y-3">
                  {completedRequests.slice(0, 10).map(renderRequestRow)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Estoque de Materiais - Menos Prioritário */}
      <WarehouseStockPanel 
        onAddFurniture={() => setShowAddFurniture(true)}
        onAddStock={() => setShowAddStock(true)}
      />

      {/* Gestão Detalhada de Móveis */}
      <FurnitureStockPanel 
        onAddFurniture={() => setShowAddFurniture(true)}
      />

      {/* Alertas de Estoque Baixo - Apenas Materiais */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5" />
              Alertas de Estoque Baixo - Materiais
            </CardTitle>
            <CardDescription>Materiais que precisam de reposição urgente (móveis em painel separado)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(stock => {
                const item = getItemById(stock.itemId);
                return (
                  <div key={stock.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div>
                      <div className="font-medium text-sm sm:text-base">{item?.name}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{stock.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-700 font-semibold text-sm sm:text-base">
                        {stock.quantity} / {stock.minimumQuantity}
                      </div>
                      <div className="text-xs text-gray-600">atual / mínimo</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Confirmação */}
      <AlertDialog open={!!selectedRequest} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setRejectionReason('');
      }}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              {actionType === 'approve' && 'Aprovar Solicitação'}
              {actionType === 'reject' && 'Rejeitar Solicitação'}
              {actionType === 'ready_pickup' && 'Marcar como Pronto'}
              {actionType === 'picked_up' && 'Confirmar Retirada'}
              {actionType === 'delivered' && 'Confirmar Entrega'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {actionType === 'approve' && 'Confirma a aprovação desta solicitação? O item será liberado para separação.'}
              {actionType === 'reject' && (
                <div className="space-y-4 pt-4">
                  <p>Informe o motivo da rejeição:</p>
                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">Motivo</Label>
                    <Textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ex: Item fora de estoque, substituir por outro produto..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              )}
              {actionType === 'ready_pickup' && 'Confirma que o pedido foi separado e está pronto para retirada pelo motorista?'}
              {actionType === 'picked_up' && 'Confirma que você retirou este pedido e está saindo para entrega?'}
              {actionType === 'delivered' && 'Confirma que este pedido foi entregue com sucesso na unidade de destino?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} className="w-full sm:w-auto">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Finalização de Lote Confirmado */}
      <AlertDialog open={!!selectedBatchToFinalize} onOpenChange={() => setSelectedBatchToFinalize(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Registrar Conclusão de Entrega
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              O controlador já confirmou o recebimento deste lote. Deseja registrar a conclusão no sistema do almoxarifado?
              <br /><br />
              Esta ação marcará o lote como finalizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmFinalizeBatch}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              Registrar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs de Cadastro */}
      {showAddFurniture && (
        <AddFurnitureDialog
          open={showAddFurniture}
          onOpenChange={(open) => setShowAddFurniture(open)}
        />
      )}

      {showAddStock && (
        <SelectItemForStockDialog
          open={showAddStock}
          onOpenChange={(open) => setShowAddStock(open)}
        />
      )}

      {/* Dialog de Criar Lote de Entrega */}
      {showCreateBatch && (
        <CreateBatchDeliveryDialog
          open={showCreateBatch}
          onClose={() => setShowCreateBatch(false)}
          requests={approvedRequests.filter(r => r.status === 'approved')}
          furnitureRequests={furnitureRequestsToDesigner.filter(
            r => r.status === 'awaiting_delivery'
          )}
        />
      )}

      {/* Dialog de Scanner QR */}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQRScanner(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeScanner
              onScanSuccess={(code) => {
                toast.success(`QR Code escaneado: ${code}`);
                setShowQRScanner(false);
              }}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </div>
      )}

      {/* Botão Flutuante para Escanear QR Code */}
      <Button
        onClick={() => setShowQRScanner(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl bg-[#3F76FF] hover:bg-[#3F76FF]/90 z-40 flex items-center justify-center p-0"
      >
        <Scan className="h-6 w-6 text-white" />
      </Button>
    </div>
  );
}