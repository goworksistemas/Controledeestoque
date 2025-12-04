import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Truck, CheckCircle, Package, Armchair, MapPin, Building2, Clock, QrCode } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
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
import { DeliveryConfirmationDialog } from './DeliveryConfirmationDialog';
import { DeliveryTimeline } from './DeliveryTimeline';
import { MarkDeliveryPendingDialog } from './MarkDeliveryPendingDialog';

export function DriverDashboard() {
  const { 
    currentUser, 
    requests, 
    getItemById, 
    getUnitById, 
    updateRequest,
    furnitureRemovalRequests,
    updateFurnitureRemovalRequest,
    furnitureRequestsToDesigner,
    updateFurnitureRequestToDesigner,
    deliveryBatches,
    deliveryConfirmations,
    getConfirmationsForBatch,
  } = useApp();

  const [selectedRequest, setSelectedRequest] = useState<{ id: string; type: 'material' | 'furniture_removal' | 'furniture_delivery' } | null>(null);
  const [actionType, setActionType] = useState<'pickup' | 'deliver' | null>(null);
  const [selectedBatchForConfirmation, setSelectedBatchForConfirmation] = useState<string | null>(null);
  const [selectedBatchForTimeline, setSelectedBatchForTimeline] = useState<string | null>(null);
  const [selectedBatchForPending, setSelectedBatchForPending] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    const hasSeenTutorial = localStorage.getItem('driver-tutorial-seen');
    return !hasSeenTutorial;
  });

  // IDs de todos os itens que já estão em lotes
  const itemsInBatches = new Set<string>();
  deliveryBatches.forEach(batch => {
    batch.requestIds.forEach(id => itemsInBatches.add(id));
    batch.furnitureRequestIds?.forEach(id => itemsInBatches.add(id));
  });

  // MOTORISTAS NÃO VEEM MATERIAIS INDIVIDUAIS - APENAS LOTES
  // Materiais regulares sempre vão em lotes, então motorista não precisa ver individuais
  const materialsToPickup: any[] = [];
  const materialsInTransit: any[] = [];

  // Coletas de móveis (para armazenamento/descarte) - APENAS os que NÃO estão em lotes
  // Estes são individuais porque vão direto para o almoxarifado
  const furnitureToCollect = furnitureRemovalRequests.filter(
    r => (r.status === 'approved_storage' || r.status === 'approved_disposal') && 
        !itemsInBatches.has(r.id)
  );
  const furnitureInTransit = furnitureRemovalRequests.filter(
    r => r.status === 'in_transit' && !itemsInBatches.has(r.id)
  );

  // Entregas de móveis aprovadas por designers - NÃO MOSTRAR INDIVIDUAIS
  // Devem ir em lotes pelo almoxarifado
  const furnitureToDeliver: any[] = [];
  const furnitureDeliveryInTransit: any[] = [];

  const totalToPickup = furnitureToCollect.length;
  const totalInTransit = furnitureInTransit.length;

  // Notificar quando houver novos itens para retirar
  useEffect(() => {
    const previousCount = parseInt(localStorage.getItem('driver-pickup-count') || '0');
    if (totalToPickup > previousCount && previousCount > 0) {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      toast.info('Nova entrega disponível!', {
        description: `Você tem ${totalToPickup} ${totalToPickup === 1 ? 'item' : 'itens'} para retirar`,
      });
    }
    localStorage.setItem('driver-pickup-count', totalToPickup.toString());
  }, [totalToPickup]);

  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleCollectFurniture = (requestId: string) => {
    vibrate();
    setSelectedRequest({ id: requestId, type: 'furniture_removal' });
    setActionType('pickup');
  };

  const confirmAction = () => {
    if (!selectedRequest || !currentUser) return;

    // Vibração de confirmação (mais longa)
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // Apenas coletas de móveis são individuais (vão para almoxarifado)
    if (selectedRequest.type === 'furniture_removal') {
      updateFurnitureRemovalRequest(selectedRequest.id, {
        status: 'in_transit',
        pickedUpByUserId: currentUser.id,
        pickedUpAt: new Date(),
      });
      toast.success('✓ Móvel coletado!', { description: 'Em trânsito para o almoxarifado' });
    }

    setSelectedRequest(null);
    setActionType(null);
  };

  // Função removida - materiais não são mais entregues individualmente por motoristas

  const renderFurnitureCollectionCard = (request: typeof furnitureRemovalRequests[0]) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.unitId);
    const isStorage = request.status === 'approved_storage';

    return (
      <Card key={request.id} className="border-2">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className={`p-3 rounded-lg ${isStorage ? 'bg-blue-50' : 'bg-red-50'}`}>
              <Armchair className={`h-8 w-8 ${isStorage ? 'text-[#3F76FF]' : 'text-red-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1 truncate">{item?.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{unit?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${isStorage ? 'bg-[#3F76FF]' : 'bg-red-600'} text-lg px-3 py-1`}>
                  {isStorage ? 'Armazenar' : 'Descartar'}
                </Badge>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  Qtd: {request.quantity}
                </Badge>
              </div>
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg"
            onClick={() => handleCollectFurniture(request.id)}
          >
            <Truck className="h-6 w-6 mr-2" />
            Coletar Móvel
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Função removida - entregas de móveis vão em lotes pelo almoxarifado

  // Função removida - materiais vão em lotes

  const renderInTransitFurniture = (request: typeof furnitureRemovalRequests[0]) => {
    const item = getItemById(request.itemId);
    const elapsed = request.pickedUpAt 
      ? Math.floor((new Date().getTime() - new Date(request.pickedUpAt).getTime()) / 60000)
      : 0;

    return (
      <Card key={request.id} className="border-2 border-purple-200 bg-purple-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-3 rounded-lg bg-purple-100">
              <Armchair className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1 truncate">{item?.name}</h3>
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <Clock className="h-4 w-4" />
                <span>Coletado há {elapsed} min</span>
              </div>
              <Badge variant="secondary" className="mt-2">Para Almoxarifado</Badge>
            </div>
          </div>

          <div className="text-sm text-gray-600 text-center p-3 bg-purple-100 rounded-lg">
            Entregue este móvel no almoxarifado central
          </div>
        </CardContent>
      </Card>
    );
  };

  // Função removida - entregas de móveis vão em lotes

  const closeTutorial = () => {
    localStorage.setItem('driver-tutorial-seen', 'true');
    setShowTutorial(false);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Tutorial Rápido */}
      {showTutorial && (
        <Card className="border-2 border-[#3F76FF] bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-3 text-[#3F76FF]">
              👋 Bem-vindo, Motorista!
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <p>📦 <strong>Lotes de Entrega:</strong> Itens separados pelo almoxarifado</p>
              <p>✓ <strong>Confirmar com QR Code:</strong> Escaneie o código do recebedor</p>
              <p>⏰ <strong>Confirmar Depois:</strong> Marque como entregue para confirmar mais tarde</p>
              <p>🚛 <strong>Coletas:</strong> Móveis para levar ao almoxarifado</p>
            </div>
            <Button onClick={closeTutorial} className="w-full">
              Entendi!
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl">Motorista</h2>
        <p className="text-gray-600">Entregas e coletas</p>
      </div>

      {/* KPIs Grandes */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-2 border-[#3F76FF]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-8 w-8 text-[#3F76FF]" />
              <div className="text-4xl font-bold text-[#3F76FF]">{totalToPickup}</div>
            </div>
            <p className="text-sm font-medium">Para Retirar</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Truck className="h-8 w-8 text-purple-600" />
              <div className="text-4xl font-bold text-purple-600">{totalInTransit}</div>
            </div>
            <p className="text-sm font-medium">Em Trânsito</p>
          </CardContent>
        </Card>
      </div>

      {/* Lotes de Entrega - Sistema Novo */}
      {currentUser && deliveryBatches.filter(b => 
        b.driverUserId === currentUser.id && 
        (b.status === 'in_transit' || b.status === 'delivery_confirmed')
      ).length > 0 && (
        <div>
          <h3 className="text-xl mb-3 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-[#3F76FF]" />
            Lotes de Entrega
          </h3>
          <div className="space-y-3">
            {deliveryBatches
              .filter(b => b.driverUserId === currentUser.id && (b.status === 'in_transit' || b.status === 'delivery_confirmed'))
              .map(batch => {
                const unit = getUnitById(batch.targetUnitId);
                const totalItems = batch.requestIds.length + (batch.furnitureRequestIds?.length || 0);
                const hasDeliveryConfirmation = deliveryConfirmations.some(
                  c => c.batchId === batch.id && c.type === 'delivery'
                );

                return (
                  <Card key={batch.id} className="border-2 border-[#3F76FF]">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-blue-50">
                          <Package className="h-8 w-8 text-[#3F76FF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1">Lote {batch.qrCode}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <Building2 className="h-4 w-4" />
                            <span className="truncate">{unit?.name}</span>
                          </div>
                          <Badge className="bg-[#3F76FF] text-lg px-3 py-1">
                            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                          </Badge>
                          {batch.status === 'delivery_confirmed' && (
                            <Badge className="ml-2 bg-green-600">
                              ✓ Entrega Confirmada
                            </Badge>
                          )}
                        </div>
                      </div>

                      {batch.status === 'in_transit' && !hasDeliveryConfirmation && (
                        <div className="space-y-2">
                          <Button 
                            className="w-full h-14 text-lg bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                            onClick={() => setSelectedBatchForConfirmation(batch.id)}
                          >
                            <QrCode className="h-6 w-6 mr-2" />
                            Confirmar Entrega c/ QR Code
                          </Button>
                          <Button 
                            variant="outline"
                            className="w-full h-12 text-sm border-2"
                            onClick={() => setSelectedBatchForPending(batch.id)}
                          >
                            Marcar como Entregue (Confirmar Depois)
                          </Button>
                        </div>
                      )}

                      {(batch.status === 'delivery_confirmed' || hasDeliveryConfirmation) && (
                        <div className="space-y-2">
                          <div className="text-sm text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            ✓ Aguardando confirmação do recebedor
                          </div>
                          <Button 
                            variant="outline"
                            className="w-full"
                            onClick={() => setSelectedBatchForTimeline(batch.id)}
                          >
                            Ver Timeline
                          </Button>
                        </div>
                      )}

                      {batch.status === 'pending_confirmation' && (
                        <div className="space-y-2">
                          <div className="text-sm text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
                            ✓ Entregue no local - Aguardando confirmação do controlador
                          </div>
                          <Button 
                            variant="outline"
                            className="w-full"
                            onClick={() => setSelectedBatchForTimeline(batch.id)}
                          >
                            Ver Timeline
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Em Trânsito - PRIORIDADE MÁXIMA */}
      {furnitureInTransit.length > 0 && (
        <div>
          <h3 className="text-xl mb-3 flex items-center gap-2">
            <Truck className="h-6 w-6 text-purple-600" />
            Em Trânsito - Coletas para Almoxarifado
          </h3>
          <div className="space-y-3">
            {furnitureInTransit.map(renderInTransitFurniture)}
          </div>
        </div>
      )}

      {/* Para Retirar - APENAS COLETAS DE MÓVEIS (vão direto pro almoxarifado) */}
      {totalToPickup > 0 && (
        <div>
          <h3 className="text-xl mb-3 flex items-center gap-2">
            <Armchair className="h-6 w-6 text-[#3F76FF]" />
            Coletas de Móveis
          </h3>
          <div className="space-y-3">
            {/* Apenas coletas de móveis (para almoxarifado) */}
            {furnitureToCollect.map(renderFurnitureCollectionCard)}
          </div>
        </div>
      )}

      {/* Estado Vazio */}
      {totalToPickup === 0 && totalInTransit === 0 && currentUser && deliveryBatches.filter(b => 
        b.driverUserId === currentUser.id && 
        (b.status === 'in_transit' || b.status === 'delivery_confirmed' || b.status === 'pending_confirmation')
      ).length === 0 && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">Sem entregas no momento</h3>
              <p className="text-gray-600">Os lotes de entrega aparecerão aqui automaticamente</p>
              <p className="text-sm text-gray-500 mt-2">Você receberá notificação quando houver novos lotes</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Confirmação */}
      <AlertDialog open={!!selectedRequest} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
      }}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              {actionType === 'pickup' ? 'Confirmar Retirada' : 'Confirmar Entrega'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {actionType === 'pickup' 
                ? 'Você está retirando este item para entrega?' 
                : 'Você confirma que entregou este item no destino?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel className="w-full h-12 text-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} className="w-full h-12 text-lg">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Entrega em Lote com Foto */}
      {selectedBatchForConfirmation && (
        <DeliveryConfirmationDialog
          batch={deliveryBatches.find(b => b.id === selectedBatchForConfirmation)!}
          open={true}
          onClose={() => setSelectedBatchForConfirmation(null)}
        />
      )}

      {/* Dialog removido - entregas individuais não são mais suportadas */}

      {/* Dialog de Timeline */}
      {selectedBatchForTimeline && (
        <AlertDialog open={true} onOpenChange={() => setSelectedBatchForTimeline(null)}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Timeline da Entrega</AlertDialogTitle>
            </AlertDialogHeader>
            <DeliveryTimeline
              batch={deliveryBatches.find(b => b.id === selectedBatchForTimeline)!}
              confirmations={getConfirmationsForBatch(selectedBatchForTimeline)}
            />
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setSelectedBatchForTimeline(null)}>
                Fechar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog para Marcar como Pendente */}
      {selectedBatchForPending && (
        <MarkDeliveryPendingDialog
          batch={deliveryBatches.find(b => b.id === selectedBatchForPending)!}
          open={true}
          onClose={() => setSelectedBatchForPending(null)}
        />
      )}
    </div>
  );
}