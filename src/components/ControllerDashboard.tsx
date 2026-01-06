import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, Package, Clock, TrendingDown, Calendar, Armchair, Trash2, MapPin, ShoppingCart, PackagePlus, ArrowRightLeft, Plus, QrCode, CheckCircle, Scan, AlertCircle } from 'lucide-react';
import { UnitLoansPanel } from './UnitLoansPanel';
import { RequestItemsPanel } from './RequestItemsPanel';
import { FurnitureRemovalDialog } from './FurnitureRemovalDialog';
import { ConsumeItemDialog } from './ConsumeItemDialog';
import { LoanItemDialog } from './LoanItemDialog';
import { AddStockDialog } from './AddStockDialog';
import { AddFurnitureDialog } from './AddFurnitureDialog';
import { RequestFurnitureToDesignerDialog } from './RequestFurnitureToDesignerDialog';
import { StockMovementsTimeline } from './StockMovementsTimeline';
import { ReceiptConfirmationDialog } from './ReceiptConfirmationDialog';
import { DeliveryTimeline } from './DeliveryTimeline';
import { QRCodeScanner } from './QRCodeScanner';
import { ReceiptConfirmationWithCode } from './ReceiptConfirmationWithCode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';

export function ControllerDashboard() {
  const { 
    currentUnit, 
    unitStocks, 
    loans, 
    items, 
    getItemById,
    getUserById,
    requests,
    furnitureRemovalRequests,
    furnitureRequestsToDesigner,
    deliveryBatches,
    deliveryConfirmations,
    getConfirmationsForBatch,
  } = useApp();
  
  // Debug: verificar floors da unidade atual
  React.useEffect(() => {
    if (currentUnit) {
      console.log('🏢 ControllerDashboard - currentUnit:', currentUnit);
      console.log('📊 ControllerDashboard - floors:', currentUnit.floors);
      console.log('📊 ControllerDashboard - floors type:', typeof currentUnit.floors, Array.isArray(currentUnit.floors));
    }
  }, [currentUnit]);
  const [addFurnitureDialogOpen, setAddFurnitureDialogOpen] = useState(false);
  const [requestFurnitureDialogOpen, setRequestFurnitureDialogOpen] = useState(false);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [itemsToShow, setItemsToShow] = useState('10');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedBatchForReceipt, setSelectedBatchForReceipt] = useState<string | null>(null);
  const [selectedBatchForTimeline, setSelectedBatchForTimeline] = useState<string | null>(null);
  
  // Dialog states for stock actions
  const [consumeDialog, setConsumeDialog] = useState<{ open: boolean; stockId: string; itemName: string; quantity: number }>({
    open: false,
    stockId: '',
    itemName: '',
    quantity: 0,
  });
  
  const [loanDialog, setLoanDialog] = useState<{ open: boolean; stockId: string; itemName: string; quantity: number }>({
    open: false,
    stockId: '',
    itemName: '',
    quantity: 0,
  });
  
  const [addStockDialog, setAddStockDialog] = useState<{ open: boolean; stockId: string; itemName: string; quantity: number }>({
    open: false,
    stockId: '',
    itemName: '',
    quantity: 0,
  });

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedBatchId, setScannedBatchId] = useState<string | null>(null);

  const unitKPIs = useMemo(() => {
    if (!currentUnit) return null;

    // Items below minimum in this unit (excluding furniture)
    const stocksInUnit = unitStocks.filter(s => {
      const item = getItemById(s.itemId);
      return s.unitId === currentUnit.id && item && !item.isFurniture;
    });
    const belowMinimum = stocksInUnit.filter(s => s.quantity < s.minimumQuantity);

    // Furniture stocks
    const furnitureStocks = unitStocks.filter(s => {
      const item = getItemById(s.itemId);
      return s.unitId === currentUnit.id && item && item.isFurniture && s.quantity > 0;
    });

    // Active loans in this unit
    const activeLoans = loans.filter(
      l => l.unitId === currentUnit.id && (l.status === 'active' || l.status === 'overdue')
    );

    // Overdue loans
    const now = new Date();
    const overdueLoans = activeLoans.filter(l => {
      const expectedReturn = new Date(l.expectedReturnDate);
      return expectedReturn < now || l.status === 'overdue';
    });

    // Loans expiring today or tomorrow
    const soonLoans = activeLoans.filter(l => {
      const expectedReturn = new Date(l.expectedReturnDate);
      const diffDays = Math.ceil((expectedReturn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 1;
    });

    return {
      totalItems: stocksInUnit.length,
      totalFurniture: furnitureStocks.length,
      belowMinimum: belowMinimum.length,
      activeLoans: activeLoans.length,
      overdueLoans: overdueLoans.length,
      soonLoans: soonLoans.length,
      belowMinimumItems: belowMinimum,
      overdueLoansData: overdueLoans,
    };
  }, [currentUnit, unitStocks, loans, getItemById]);

  if (!currentUnit) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">Selecione uma unidade para visualizar</p>
      </div>
    );
  }

  if (!unitKPIs) return null;

  return (
    <div className="space-y-4 md:space-y-6 pb-4">
      <div>
        <h2 className="text-slate-900 dark:text-slate-100 mb-1">Painel do Controlador</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Gestão de {currentUnit.name}</p>
      </div>

      {/* KPIs - Mobile optimized grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Móveis</p>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Armchair className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl text-slate-900 dark:text-slate-100">{unitKPIs.totalFurniture}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Empréstimos</p>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl text-slate-900 dark:text-slate-100">{unitKPIs.activeLoans}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Atrasados</p>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl text-red-600 dark:text-red-400">{unitKPIs.overdueLoans}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entregas Aguardando Confirmação */}
      {currentUnit && deliveryBatches.filter(b => 
        b.targetUnitId === currentUnit.id && 
        b.status === 'delivery_confirmed'
      ).length > 0 && (
        <Card className="border-2 border-[#00C5E9] bg-cyan-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#00C5E9]" />
                <CardTitle className="text-base md:text-lg">Entregas para Confirmar</CardTitle>
              </div>
              <Badge className="bg-[#00C5E9]">
                {deliveryBatches.filter(b => b.targetUnitId === currentUnit.id && b.status === 'delivery_confirmed').length}
              </Badge>
            </div>
            <CardDescription className="text-xs md:text-sm">
              Lotes entregues aguardando sua confirmação de recebimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryBatches
              .filter(b => b.targetUnitId === currentUnit.id && b.status === 'delivery_confirmed')
              .map(batch => {
                const totalItems = batch.requestIds.length + (batch.furnitureRequestIds?.length || 0);
                
                return (
                  <div key={batch.id} className="bg-white rounded-lg p-3 border border-cyan-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">Lote {batch.qrCode}</p>
                        <p className="text-xs text-gray-600">
                          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                      <Badge className="bg-green-600">Entregue</Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#00C5E9] hover:bg-[#00C5E9]/90"
                        onClick={() => {
                          setScannedBatchId(batch.id);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Recebimento
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBatchForTimeline(batch.id)}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="furniture" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="furniture" className="gap-2">
            <Armchair className="h-4 w-4" />
            <span className="hidden sm:inline">Móveis</span>
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Empréstimos</span>
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-2 relative">
            {deliveryBatches.filter(b => b.targetUnitId === currentUnit.id && b.status === 'pending_confirmation').length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
            )}
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Recebimentos</span>
          </TabsTrigger>
          <TabsTrigger value="almoxarifado" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Almoxarifado</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Móveis */}
        <TabsContent value="furniture" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Armchair className="h-5 w-5" />
                    Móveis da Unidade
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Móveis em {currentUnit.name}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por andar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os andares</SelectItem>
                      {currentUnit?.floors && Array.isArray(currentUnit.floors) && currentUnit.floors.length > 0 ? (
                        currentUnit.floors.map((floor) => (
                          <SelectItem key={floor} value={floor}>
                            {floor}
                          </SelectItem>
                        ))
                      ) : null}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={() => setAddFurnitureDialogOpen(true)} 
                      size="sm" 
                      className="bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Móvel
                    </Button>
                    <Button onClick={() => setRequestFurnitureDialogOpen(true)} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Solicitar ao Designer
                    </Button>
                    <Button onClick={() => setRemovalDialogOpen(true)} size="sm" variant="outline">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Solicitar Retirada
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const furnitureItems = items.filter(item => item.isFurniture && item.active);
                  let furnitureStock = unitStocks.filter(
                    stock => stock.unitId === currentUnit.id && 
                    furnitureItems.some(item => item.id === stock.itemId) &&
                    stock.quantity > 0
                  );
                  
                  // Apply floor filter
                  if (selectedFloor !== 'all') {
                    furnitureStock = furnitureStock.filter(stock => 
                      stock.location?.startsWith(selectedFloor)
                    );
                  }

                  if (furnitureStock.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500">
                        <Armchair className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>Nenhum móvel cadastrado nesta unidade</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {furnitureStock.map(stock => {
                        const item = getItemById(stock.itemId);
                        if (!item) return null;

                        return (
                          <Card key={stock.id}>
                            {item.imageUrl && (
                              <div className="h-40 overflow-hidden bg-gray-100">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <CardTitle className="text-base flex-1">{item.name}</CardTitle>
                                {stock.location && (
                                  <Badge className="bg-[#3F76FF] shrink-0">
                                    {stock.location.split(' - ')[0]}
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="text-xs line-clamp-2">
                                {item.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Quantidade:</span>
                                <Badge variant="outline">{stock.quantity}</Badge>
                              </div>
                              {stock.location && stock.location.includes(' - ') && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-xs truncate">{stock.location.split(' - ')[1]}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()}

                {(() => {
                  const pendingRemovals = furnitureRemovalRequests.filter(
                    req => req.originUnitId === currentUnit.id && req.status === 'pending'
                  );

                  if (pendingRemovals.length > 0) {
                    return (
                      <div className="mt-6">
                        <h4 className="font-medium text-sm mb-3">Solicitações Pendentes</h4>
                        <div className="space-y-2">
                          {pendingRemovals.map(req => {
                            const item = getItemById(req.itemId);
                            if (!item) return null;
                            return (
                              <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                  <p className="text-xs text-slate-600">Qtd: {req.quantity}</p>
                                </div>
                                <Badge variant="outline">Aguardando aprovação</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Empréstimos */}
        <TabsContent value="loans" className="space-y-4">
          <UnitLoansPanel />
        </TabsContent>

        {/* TAB: Recebimentos */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Meus Recebimentos
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Entregas recebidas em {currentUnit.name}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowQRScanner(true)}
                  className="bg-[#3F76FF] hover:bg-[#3F76FF]/90 relative"
                  size="sm"
                >
                  {deliveryBatches.filter(b => b.targetUnitId === currentUnit.id && b.status === 'delivery_confirmed').length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  <Scan className="h-4 w-4 mr-2" />
                  Escanear QR Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Lotes marcados como "Confirmar Depois" pelo motorista
                  const pendingDriverConfirmation = deliveryBatches.filter(
                    batch => batch.targetUnitId === currentUnit.id && batch.status === 'pending_confirmation'
                  );
                  
                  // Lotes entregues e confirmados pelo motorista com QR Code
                  const pendingControllerConfirmation = deliveryBatches.filter(
                    batch => batch.targetUnitId === currentUnit.id && batch.status === 'delivery_confirmed'
                  );
                  
                  // Móveis individuais pendentes de confirmação
                  const pendingFurnitureDeliveries = furnitureRequestsToDesigner.filter(
                    req => req.requestingUnitId === currentUnit.id && req.status === 'pending_confirmation'
                  );
                  
                  // Todos os lotes pendentes de confirmação
                  const allPendingConfirmation = [...pendingDriverConfirmation, ...pendingControllerConfirmation];
                  
                  // Lotes completamente confirmados
                  const completedBatches = deliveryBatches.filter(
                    batch => batch.targetUnitId === currentUnit.id && batch.status === 'completed'
                  );
                  
                  // Móveis individuais completados
                  const completedFurniture = furnitureRequestsToDesigner.filter(
                    req => req.requestingUnitId === currentUnit.id && req.status === 'completed'
                  );

                  if (allPendingConfirmation.length === 0 && pendingFurnitureDeliveries.length === 0 && completedBatches.length === 0 && completedFurniture.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500">
                        <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>Nenhum lote recebido nesta unidade</p>
                      </div>
                    );
                  }

                  return (
                    <Tabs defaultValue="pending" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">
                          Aguardando Confirmação ({allPendingConfirmation.length + pendingFurnitureDeliveries.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                          Confirmados ({completedBatches.length + completedFurniture.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="pending" className="space-y-3 mt-4">
                        {allPendingConfirmation.length === 0 && pendingFurnitureDeliveries.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <CheckCircle className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">Todas as entregas confirmadas!</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {allPendingConfirmation.map(batch => {
                              const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
                              const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
                                batch.furnitureRequestIds?.includes(r.id)
                              );
                              const driver = getUserById(batch.driverUserId);
                              const isPendingConfirmation = batch.status === 'pending_confirmation';
                              
                              return (
                                <Card key={batch.id} className={`border-2 ${isPendingConfirmation ? 'border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/20' : 'border-[#00C5E9]'}`}>
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="text-base">Lote {batch.qrCode}</CardTitle>
                                        <CardDescription className="text-xs">
                                          Motorista: {driver?.name}
                                        </CardDescription>
                                      </div>
                                      <Badge className={isPendingConfirmation ? 'bg-yellow-600' : 'bg-[#00C5E9]'}>
                                        {isPendingConfirmation ? 'Aguardando Motorista' : 'Entregue'}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {isPendingConfirmation && (
                                      <Alert className="bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600">
                                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                        <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                                          O motorista marcou como "Confirmar Depois". Confirme o recebimento com seu código único.
                                        </AlertDescription>
                                      </Alert>
                                    )}
                                    
                                    {/* Itens do lote */}
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Itens:</p>
                                      {batchRequests.map(req => {
                                        const item = getItemById(req.itemId);
                                        const requester = getUserById(req.requestedByUserId);
                                        return (
                                          <div key={req.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                                            <Package className="h-3 w-3 text-slate-400" />
                                            <div className="flex-1">
                                              <p className="font-medium">{item?.name}</p>
                                              <p className="text-slate-600 dark:text-slate-400">
                                                Qtd: {req.quantity} • Solicitante: {requester?.name}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {batchFurnitureRequests.map(req => {
                                        const item = getItemById(req.itemId);
                                        const requester = getUserById(req.requestedByUserId);
                                        return (
                                          <div key={req.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                                            <Armchair className="h-3 w-3 text-slate-400" />
                                            <div className="flex-1">
                                              <p className="font-medium">{item?.name}</p>
                                              <p className="text-slate-600 dark:text-slate-400">
                                                Qtd: {req.quantity} • Solicitante: {requester?.name}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    <Button
                                      size="sm"
                                      className={`w-full ${isPendingConfirmation ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-[#00C5E9] hover:bg-[#00C5E9]/90'}`}
                                      onClick={() => setSelectedBatchForReceipt(batch.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Confirmar Recebimento com Código
                                    </Button>
                                  </CardContent>
                                </Card>
                              );
                            })}
                            
                            {/* Móveis individuais pendentes de confirmação */}
                            {pendingFurnitureDeliveries.map(furnitureReq => {
                              const item = getItemById(furnitureReq.itemId);
                              const driver = furnitureReq.deliveredByUserId ? getUserById(furnitureReq.deliveredByUserId) : null;
                              
                              return (
                                <Card key={furnitureReq.id} className="border-2 border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/20">
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                          <Armchair className="h-4 w-4" />
                                          {item?.name}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                          Motorista: {driver?.name || 'Não informado'}
                                        </CardDescription>
                                      </div>
                                      <Badge className="bg-yellow-600">
                                        Entrega Individual
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <Alert className="bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600">
                                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                      <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                                        O motorista marcou como "Confirmar Depois". Confirme o recebimento com seu código único.
                                      </AlertDescription>
                                    </Alert>
                                    
                                    {/* Detalhes do móvel */}
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Detalhes:</p>
                                      <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                                        <Armchair className="h-3 w-3 text-slate-400" />
                                        <div className="flex-1">
                                          <p className="font-medium">{item?.name}</p>
                                          <p className="text-slate-600 dark:text-slate-400">
                                            Qtd: {furnitureReq.quantity} • Local: {furnitureReq.location}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <Button
                                      size="sm"
                                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                                      onClick={() => {
                                        // TODO: Implementar confirmação de móvel individual
                                        toast.info('Funcionalidade de confirmação de móvel individual será implementada');
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Confirmar Recebimento com Código
                                    </Button>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="completed" className="space-y-3 mt-4">
                        {completedBatches.length === 0 && completedFurniture.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">Nenhum lote confirmado ainda</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {completedBatches.slice(0, 10).map(batch => {
                              const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
                              const confirmations = getConfirmationsForBatch(batch.id);
                              
                              // Buscar confirmação do controlador (receipt)
                              const controllerConfirmation = confirmations.find(c => c.type === 'receipt');
                              const controllerUser = controllerConfirmation ? getUserById(controllerConfirmation.confirmedByUserId) : null;
                              
                              // Buscar confirmações dos solicitantes (requester)
                              const requesterConfirmations = confirmations.filter(c => c.type === 'requester');
                              
                              return (
                                <Card key={batch.id}>
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="text-base">Lote {batch.qrCode}</CardTitle>
                                        <CardDescription className="text-xs">
                                          {batchRequests.length} {batchRequests.length === 1 ? 'item' : 'itens'}
                                        </CardDescription>
                                      </div>
                                      <Badge variant="outline" className="bg-green-50 text-green-700">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Confirmado
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      {/* Itens do lote */}
                                      <div className="space-y-2">
                                        {batchRequests.slice(0, 3).map(req => {
                                          const item = getItemById(req.itemId);
                                          return (
                                            <div key={req.id} className="flex items-center gap-2 text-xs text-slate-600">
                                              <Package className="h-3 w-3" />
                                              <span>{item?.name} - Qtd: {req.quantity}</span>
                                            </div>
                                          );
                                        })}
                                        {batchRequests.length > 3 && (
                                          <p className="text-xs text-slate-500">
                                            +{batchRequests.length - 3} mais...
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Confirmação do Controlador */}
                                      {controllerConfirmation && (
                                        <div className="pt-3 border-t">
                                          <p className="text-xs font-medium text-slate-700 mb-2">Confirmação do Controlador:</p>
                                          <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                                            <div className="flex items-center gap-2 text-xs">
                                              <CheckCircle className="h-3 w-3 text-green-600" />
                                              <span className="font-medium">{controllerUser?.name}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 pl-5">
                                              {new Date(controllerConfirmation.timestamp).toLocaleDateString('pt-BR')} às{' '}
                                              {new Date(controllerConfirmation.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="text-xs text-slate-600 pl-5">
                                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                                QR Code Presencial
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Confirmações dos Solicitantes */}
                                      {requesterConfirmations.length > 0 && (
                                        <div className="pt-3 border-t">
                                          <p className="text-xs font-medium text-slate-700 mb-2">
                                            Confirmações dos Solicitantes ({requesterConfirmations.length}):
                                          </p>
                                          <div className="space-y-2">
                                            {requesterConfirmations.map(confirmation => {
                                              const requester = getUserById(confirmation.confirmedByUserId);
                                              // Verificar se tem dailyCode nas notas para determinar o método
                                              const isCodeMethod = confirmation.notes?.includes('dailyCode:');
                                              
                                              return (
                                                <div key={confirmation.id} className="bg-slate-50 rounded-lg p-2 space-y-1">
                                                  <div className="flex items-center gap-2 text-xs">
                                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                                    <span className="font-medium">{requester?.name}</span>
                                                  </div>
                                                  <div className="text-xs text-slate-600 pl-5">
                                                    {new Date(confirmation.timestamp).toLocaleDateString('pt-BR')} às{' '}
                                                    {new Date(confirmation.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                  </div>
                                                  <div className="text-xs text-slate-600 pl-5">
                                                    <Badge variant="outline" className={`text-xs ${isCodeMethod ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                                      {isCodeMethod ? 'Código Posterior' : 'QR Code Presencial'}
                                                    </Badge>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Almoxarifado (antigo Catálogo) */}
        <TabsContent value="almoxarifado" className="space-y-4">
          <RequestItemsPanel />
        </TabsContent>
      </Tabs>

      {/* Alerts - Moved below main function tabs */}
      {(unitKPIs.overdueLoans > 0 || unitKPIs.soonLoans > 0) && (
        <div className="space-y-3">
          {unitKPIs.overdueLoans > 0 && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
                  <CardTitle className="text-red-900 dark:text-red-100 text-base md:text-lg">Empréstimos Atrasados</CardTitle>
                </div>
                <CardDescription className="text-red-700 dark:text-red-300 text-xs md:text-sm">
                  {unitKPIs.overdueLoans} empréstimo(s) atrasados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {unitKPIs.overdueLoansData.slice(0, 3).map(loan => {
                    const item = getItemById(loan.itemId);
                    if (!item) return null;
                    const daysDiff = Math.ceil(
                      (new Date().getTime() - new Date(loan.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div key={loan.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded text-xs md:text-sm">
                        <span className="text-slate-900 dark:text-slate-100 truncate flex-1 pr-2">{item.name}</span>
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                          {daysDiff}d atraso
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {unitKPIs.soonLoans > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 dark:text-yellow-400" />
                  <CardTitle className="text-yellow-900 dark:text-yellow-100 text-base md:text-lg">Devoluções Próximas</CardTitle>
                </div>
                <CardDescription className="text-yellow-700 dark:text-yellow-300 text-xs md:text-sm">
                  {unitKPIs.soonLoans} empréstimo(s) vencendo hoje/amanhã
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <FurnitureRemovalDialog 
        open={removalDialogOpen}
        onOpenChange={setRemovalDialogOpen}
      />
      
      <ConsumeItemDialog
        open={consumeDialog.open}
        onOpenChange={(open) => setConsumeDialog({ ...consumeDialog, open })}
        stockId={consumeDialog.stockId}
        itemName={consumeDialog.itemName}
        availableQuantity={consumeDialog.quantity}
      />
      
      <LoanItemDialog
        open={loanDialog.open}
        onOpenChange={(open) => setLoanDialog({ ...loanDialog, open })}
        stockId={loanDialog.stockId}
        itemName={loanDialog.itemName}
        availableQuantity={loanDialog.quantity}
      />
      
      <AddStockDialog
        open={addStockDialog.open}
        onOpenChange={(open) => setAddStockDialog({ ...addStockDialog, open })}
        stockId={addStockDialog.stockId}
        itemName={addStockDialog.itemName}
        currentQuantity={addStockDialog.quantity}
      />

      <RequestFurnitureToDesignerDialog
        open={requestFurnitureDialogOpen}
        onOpenChange={setRequestFurnitureDialogOpen}
      />

      <AddFurnitureDialog
        open={addFurnitureDialogOpen}
        onOpenChange={setAddFurnitureDialogOpen}
      />

      {/* Dialog de Confirmação de Recebimento com Código Único */}
      {selectedBatchForReceipt && (() => {
        const batch = deliveryBatches.find(b => b.id === selectedBatchForReceipt);
        if (!batch) return null;
        
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <ReceiptConfirmationWithCode
                  batch={batch}
                  onSuccess={() => {
                    setSelectedBatchForReceipt(null);
                  }}
                  onCancel={() => setSelectedBatchForReceipt(null)}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dialog de Timeline */}
      {selectedBatchForTimeline && (
        <dialog className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" open onClick={() => setSelectedBatchForTimeline(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg">Timeline da Entrega</h3>
                <Button variant="outline" size="sm" onClick={() => setSelectedBatchForTimeline(null)}>
                  Fechar
                </Button>
              </div>
              <DeliveryTimeline
                batch={deliveryBatches.find(b => b.id === selectedBatchForTimeline)!}
                confirmations={getConfirmationsForBatch(selectedBatchForTimeline)}
              />
            </div>
          </div>
        </dialog>
      )}

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
                  toast.error('Lote não encontrado. Verifique o cdigo.');
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