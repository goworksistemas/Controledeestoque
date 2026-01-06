import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Building2, 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  Eye,
  BarChart3,
  Layers
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AdminAnalytics } from './AdminAnalytics';

interface AdminUnitsDashboardProps {
  onSwitchToController: () => void;
}

export function AdminUnitsDashboard({ onSwitchToController }: AdminUnitsDashboardProps) {
  const { 
    units, 
    items, 
    users, 
    unitStocks, 
    requests,
    furnitureTransfers,
    getItemById,
    getUnitById,
    getUserById
  } = useApp();

  // Excluir almoxarifado das estatísticas de unidades
  const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
  const operationalUnits = units.filter(u => u.id !== warehouseUnit?.id);

  // Estatísticas Gerais
  const stats = useMemo(() => {
    const activeUnits = operationalUnits.filter(u => u.status === 'active').length;
    const totalUsers = users.length;
    const totalItems = items.filter(i => i.active).length;
    
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const approvedRequests = requests.filter(r => 
      r.status === 'approved' || 
      r.status === 'processing' ||
      r.status === 'awaiting_pickup'
    ).length;
    
    const lowStockItems = unitStocks.filter(s => s.quantity <= s.minimumQuantity).length;
    
    const pendingTransfers = furnitureTransfers.filter(t => 
      t.status === 'pending' || t.status === 'approved'
    ).length;

    return {
      activeUnits,
      totalUsers,
      totalItems,
      pendingRequests,
      approvedRequests,
      lowStockItems,
      pendingTransfers
    };
  }, [operationalUnits, users, items, requests, unitStocks, furnitureTransfers]);

  // Pedidos Recentes
  const recentRequests = useMemo(() => {
    return requests
      .filter(r => r.status !== 'completed' && r.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [requests]);

  // Itens com Baixo Estoque
  const lowStockItemsData = useMemo(() => {
    return unitStocks
      .filter(s => s.quantity <= s.minimumQuantity)
      .map(stock => ({
        ...stock,
        item: getItemById(stock.itemId),
        unit: getUnitById(stock.unitId)
      }))
      .filter(s => s.item && s.unit)
      .slice(0, 10);
  }, [unitStocks, getItemById, getUnitById]);

  // Transferências Recentes
  const recentTransfers = useMemo(() => {
    return furnitureTransfers
      .filter(t => t.status !== 'completed' && t.status !== 'rejected')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [furnitureTransfers]);

  // Volume de Pedidos por Item (Top 10)
  const requestsByItem = useMemo(() => {
    const itemCounts = new Map<string, { name: string; count: number }>();
    
    requests.forEach(request => {
      const item = getItemById(request.itemId);
      if (item) {
        const current = itemCounts.get(item.id) || { name: item.name, count: 0 };
        itemCounts.set(item.id, {
          name: item.name,
          count: current.count + request.quantity
        });
      }
    });

    return Array.from(itemCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [requests, getItemById]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      approved: { label: 'Aprovado', variant: 'default' },
      processing: { label: 'Processando', variant: 'secondary' },
      awaiting_pickup: { label: 'Aguardando Retirada', variant: 'secondary' },
      out_for_delivery: { label: 'Em Entrega', variant: 'default' },
      completed: { label: 'Concluído', variant: 'outline' },
      rejected: { label: 'Rejeitado', variant: 'destructive' },
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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard Administrativo</h1>
          <p className="text-sm text-slate-600 mt-1">Visão geral do sistema de controle de estoque</p>
        </div>
        
        <Button
          onClick={onSwitchToController}
          className="gap-2 bg-gradient-to-r from-[#3F76FF] to-[#00C5E9] hover:opacity-90"
        >
          <Eye className="h-4 w-4" />
          Ver como Controlador
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-[#3F76FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUnits}</div>
            <p className="text-xs text-slate-600 mt-1">
              {operationalUnits.length} unidades totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.approvedRequests} aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-slate-600 mt-1">
              Itens abaixo do mínimo
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
              Transferências pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Detalhes */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">
            <Clock className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Pedidos</span>
            <span className="sm:hidden">Ped.</span>
          </TabsTrigger>
          <TabsTrigger value="stock">
            <Package className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Estoque</span>
            <span className="sm:hidden">Est.</span>
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Transferências</span>
            <span className="sm:hidden">Trans.</span>
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Anl.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>Últimas solicitações de materiais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead className="hidden md:table-cell">Unidade</TableHead>
                      <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                          Nenhum pedido pendente
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentRequests.map((request) => {
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

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Itens com Estoque Baixo</CardTitle>
              <CardDescription>Itens que atingiram ou estão abaixo do estoque mínimo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Atual</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItemsData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                          <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                          <p>Todos os estoques estão adequados!</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockItemsData.map((stock) => (
                        <TableRow key={stock.id}>
                          <TableCell className="font-medium">
                            {stock.item?.name}
                          </TableCell>
                          <TableCell>{stock.unit?.name}</TableCell>
                          <TableCell>
                            <span className={stock.quantity === 0 ? 'text-red-600 font-bold' : 'text-yellow-600'}>
                              {stock.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{stock.minimumQuantity}</TableCell>
                          <TableCell>
                            {stock.quantity === 0 ? (
                              <Badge variant="destructive">Esgotado</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                Baixo
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
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

        <TabsContent value="analytics" className="mt-6">
          <AdminAnalytics />
        </TabsContent>
      </Tabs>

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#3F76FF]" />
              Volume de Pedidos por Item
            </CardTitle>
            <CardDescription>Top 10 itens mais solicitados</CardDescription>
          </CardHeader>
          <CardContent>
            {requestsByItem.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhum pedido registrado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={requestsByItem} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {requestsByItem.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#colorGradient-${index})`}
                      />
                    ))}
                  </Bar>
                  <defs>
                    {requestsByItem.map((_, index) => (
                      <linearGradient 
                        key={`gradient-${index}`}
                        id={`colorGradient-${index}`} 
                        x1="0" 
                        y1="0" 
                        x2="1" 
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#3F76FF" />
                        <stop offset="100%" stopColor="#00C5E9" />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
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
                  <Package className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Total de Itens</span>
                </div>
                <span className="font-bold text-lg">{stats.totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Total de Usuários</span>
                </div>
                <span className="font-bold text-lg">{stats.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Unidades Operacionais</span>
                </div>
                <span className="font-bold text-lg">{operationalUnits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                  <span className="text-sm">Pedidos Totais</span>
                </div>
                <span className="font-bold text-lg">{requests.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}