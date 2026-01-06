import React, { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Armchair,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  Eye,
  Layers,
  PieChart,
  BarChart3
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { AdminAnalytics } from './AdminAnalytics';

interface AdminWarehouseDashboardProps {
  onSwitchToDesigner: () => void;
}

export function AdminWarehouseDashboard({ onSwitchToDesigner }: AdminWarehouseDashboardProps) {
  const {
    units,
    items,
    users,
    unitStocks,
    furnitureRequestsToDesigner,
    furnitureTransfers,
    furnitureRemovalRequests,
    getItemById,
    getUnitById,
    getUserById
  } = useApp();

  // Móveis apenas (isFurniture = true)
  const furnitureItems = items.filter(i => i.isFurniture && i.active);

  // Estatísticas Gerais
  const stats = useMemo(() => {
    const totalFurniture = furnitureItems.length;
    
    const pendingDesignerRequests = furnitureRequestsToDesigner.filter(
      r => r.status === 'pending_designer'
    ).length;
    
    const approvedDesignerRequests = furnitureRequestsToDesigner.filter(
      r => r.status === 'approved_designer' || 
          r.status === 'approved_storage' ||
          r.status === 'in_transit'
    ).length;

    const pendingTransfers = furnitureTransfers.filter(
      t => t.status === 'pending'
    ).length;

    const approvedTransfers = furnitureTransfers.filter(
      t => t.status === 'approved' || t.status === 'in_transit'
    ).length;

    const pendingRemovalRequests = furnitureRemovalRequests.filter(
      r => r.status === 'pending_designer'
    ).length;

    const approvedStorageRequests = furnitureRemovalRequests.filter(
      r => r.status === 'approved_storage'
    ).length;

    // Total de móveis no almoxarifado
    const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
    const furnitureInWarehouse = warehouseUnit
      ? unitStocks.filter(s => {
          const item = items.find(i => i.id === s.itemId);
          return item?.isFurniture && s.unitId === warehouseUnit.id && s.quantity > 0;
        }).length
      : 0;

    return {
      totalFurniture,
      pendingDesignerRequests,
      approvedDesignerRequests,
      pendingTransfers,
      approvedTransfers,
      pendingRemovalRequests,
      approvedStorageRequests,
      furnitureInWarehouse
    };
  }, [furnitureItems, furnitureRequestsToDesigner, furnitureTransfers, furnitureRemovalRequests, unitStocks, items, units]);

  // Solicitações Pendentes de Designer
  const pendingRequests = useMemo(() => {
    return furnitureRequestsToDesigner
      .filter(r => r.status === 'pending_designer')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [furnitureRequestsToDesigner]);

  // Transferências Recentes
  const recentTransfers = useMemo(() => {
    return furnitureTransfers
      .filter(t => t.status !== 'completed' && t.status !== 'rejected')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [furnitureTransfers]);

  // Solicitações de Remoção Pendentes
  const removalRequests = useMemo(() => {
    return furnitureRemovalRequests
      .filter(r => r.status === 'pending_designer' || r.status === 'approved_storage')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [furnitureRemovalRequests]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      pending_designer: { label: 'Aguardando Designer', variant: 'outline' },
      approved_designer: { label: 'Aprovado', variant: 'default' },
      approved: { label: 'Aprovado', variant: 'default' },
      approved_storage: { label: 'Aprovado Armazenagem', variant: 'default' },
      in_transit: { label: 'Em Trânsito', variant: 'secondary' },
      completed: { label: 'Concluído', variant: 'outline' },
      rejected: { label: 'Rejeitado', variant: 'destructive' },
      approved_disposal: { label: 'Aprovado Descarte', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard Administrativo - Design</h1>
          <p className="text-sm text-slate-600 mt-1">Visão geral do sistema de gestão de móveis</p>
        </div>

        <Button
          onClick={onSwitchToDesigner}
          className="gap-2 bg-gradient-to-r from-[#3F76FF] to-[#00C5E9] hover:opacity-90"
        >
          <Eye className="h-4 w-4" />
          Ver como Designer
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Móveis</CardTitle>
            <Armchair className="h-4 w-4 text-[#3F76FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFurniture}</div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.furnitureInWarehouse} no almoxarifado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDesignerRequests}</div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.approvedDesignerRequests} aprovadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferências</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-[#00C5E9]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.approvedTransfers} em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remoções Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRemovalRequests}</div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.approvedStorageRequests} aguardando armazenagem
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Detalhes */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">
            <Clock className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Solicitações</span>
            <span className="sm:hidden">Solic.</span>
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Transferências</span>
            <span className="sm:hidden">Trans.</span>
          </TabsTrigger>
          <TabsTrigger value="removals">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Remoções</span>
            <span className="sm:hidden">Rem.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações Pendentes de Análise</CardTitle>
              <CardDescription>Pedidos de móveis aguardando aprovação do designer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Móvel</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead className="hidden md:table-cell">Unidade</TableHead>
                      <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                          <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                          <p>Nenhuma solicitação pendente</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingRequests.map((request) => {
                        const item = getItemById(request.itemId);
                        const unit = getUnitById(request.requestingUnitId);
                        const requester = getUserById(request.requestedByUserId);

                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {item?.name || 'Item não encontrado'}
                            </TableCell>
                            <TableCell>{request.quantity}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {unit?.name || '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {requester?.name || '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-slate-600">
                              {formatDate(request.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transferências em Andamento</CardTitle>
              <CardDescription>Movimentações de móveis entre unidades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Móvel</TableHead>
                      <TableHead className="hidden md:table-cell">Origem</TableHead>
                      <TableHead className="hidden md:table-cell">Destino</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransfers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                          Nenhuma transferência em andamento
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentTransfers.map((transfer) => {
                        const item = getItemById(transfer.itemId);
                        const fromUnit = getUnitById(transfer.fromUnitId);
                        const toUnit = getUnitById(transfer.toUnitId);

                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">
                              {item?.name || 'Item não encontrado'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {fromUnit?.name || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {toUnit?.name || '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-slate-600">
                              {formatDate(transfer.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="removals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Remoção</CardTitle>
              <CardDescription>Pedidos de armazenagem ou descarte de móveis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Móvel</TableHead>
                      <TableHead className="hidden md:table-cell">Unidade</TableHead>
                      <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {removalRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                          Nenhuma solicitação de remoção
                        </TableCell>
                      </TableRow>
                    ) : (
                      removalRequests.map((request) => {
                        const item = getItemById(request.itemId);
                        const unit = getUnitById(request.unitId);
                        const requester = getUserById(request.requestedByUserId);

                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {item?.name || 'Item não encontrado'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {unit?.name || '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {requester?.name || '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-slate-600">
                              {formatDate(request.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#3F76FF]" />
              Equipe de Design
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users
                .filter(u => u.role === 'designer')
                .map(designer => (
                  <div key={designer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#3F76FF] to-[#00C5E9] flex items-center justify-center text-white font-medium">
                        {designer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{designer.name}</p>
                        <p className="text-xs text-slate-600">{designer.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{designer.role}</Badge>
                  </div>
                ))}
              {users.filter(u => u.role === 'designer').length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhum designer cadastrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#00C5E9]" />
              Resumo do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Móveis Cadastrados</span>
                </div>
                <span className="font-bold text-lg">{stats.totalFurniture}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Móveis no Almoxarifado</span>
                </div>
                <span className="font-bold text-lg">{stats.furnitureInWarehouse}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Solicitações Totais</span>
                </div>
                <span className="font-bold text-lg">{furnitureRequestsToDesigner.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Transferências Totais</span>
                </div>
                <span className="font-bold text-lg">{furnitureTransfers.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Dados */}
      <AdminAnalytics />
    </div>
  );
}