import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Package2, TrendingUp, Truck, AlertCircle, Download, ArrowUpRight, ArrowDownRight, Sofa, Users, Palette } from 'lucide-react';

type TimePeriod = '7days' | '30days' | '90days' | 'all';

const COLORS = ['#3F76FF', '#00C5E9', '#606060', '#10b981', '#f59e0b'];

interface AdminWarehouseDashboardProps {
  onSwitchToDesigner?: () => void;
}

export function AdminWarehouseDashboard({ onSwitchToDesigner }: AdminWarehouseDashboardProps) {
  const { items, unitStocks, requests, movements, furnitureTransfers, users, getItemById, getUnitById, getUserById, getWarehouseUnitId } = useApp();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30days');
  const warehouseId = getWarehouseUnitId();

  // Calcular data de início baseado no período
  const getStartDate = (period: TimePeriod): Date => {
    const now = new Date();
    switch (period) {
      case '7days':
        return new Date(now.setDate(now.getDate() - 7));
      case '30days':
        return new Date(now.setDate(now.getDate() - 30));
      case '90days':
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date(2020, 0, 1);
    }
  };

  const startDate = getStartDate(timePeriod);

  // Filtrar movimentações do almoxarifado
  const warehouseMovements = useMemo(() => {
    return movements.filter(mov => {
      const matchesDate = new Date(mov.timestamp) >= startDate;
      const isWarehouse = mov.unitId === warehouseId;
      return matchesDate && isWarehouse;
    });
  }, [movements, startDate, warehouseId]);

  // Filtrar requisições aprovadas
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesDate = new Date(req.createdAt) >= startDate;
      return matchesDate;
    });
  }, [requests, startDate]);

  // Transferências de móveis
  const filteredFurnitureTransfers = useMemo(() => {
    return furnitureTransfers.filter(ft => {
      const matchesDate = new Date(ft.createdAt) >= startDate;
      return matchesDate;
    });
  }, [furnitureTransfers, startDate]);

  // Métricas principais
  const metrics = useMemo(() => {
    const totalWarehouseStock = unitStocks
      .filter(s => s.unitId === warehouseId)
      .reduce((sum, s) => sum + s.quantity, 0);

    const totalEntries = warehouseMovements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + m.quantity, 0);
    const totalExits = warehouseMovements.filter(m => m.type === 'saida').reduce((sum, m) => sum + m.quantity, 0);
    
    const pendingRequests = filteredRequests.filter(r => r.status === 'pending' || r.status === 'approved').length;
    const completedRequests = filteredRequests.filter(r => r.status === 'completed').length;
    
    const furnitureInTransit = filteredFurnitureTransfers.filter(f => f.status === 'approved').length;
    const furnitureCompleted = filteredFurnitureTransfers.filter(f => f.status === 'completed').length;

    // Designers ativos
    const designers = users.filter(u => u.role === 'designer');
    const warehouseStaff = users.filter(u => u.role === 'warehouse');

    return {
      totalWarehouseStock,
      totalEntries,
      totalExits,
      pendingRequests,
      completedRequests,
      furnitureInTransit,
      furnitureCompleted,
      designers: designers.length,
      warehouseStaff: warehouseStaff.length,
      stockTurnover: totalEntries > 0 ? ((totalExits / totalEntries) * 100).toFixed(1) : '0',
    };
  }, [unitStocks, warehouseMovements, filteredRequests, filteredFurnitureTransfers, users]);

  // Itens mais movimentados no almoxarifado
  const topMovedItems = useMemo(() => {
    const itemCounts: Record<string, { name: string; entries: number; exits: number; total: number }> = {};
    
    warehouseMovements.forEach(mov => {
      const item = getItemById(mov.itemId);
      if (item) {
        if (!itemCounts[item.id]) {
          itemCounts[item.id] = { name: item.name, entries: 0, exits: 0, total: 0 };
        }
        if (mov.type === 'entrada') {
          itemCounts[item.id].entries += mov.quantity;
        } else if (mov.type === 'saida') {
          itemCounts[item.id].exits += mov.quantity;
        }
        itemCounts[item.id].total += mov.quantity;
      }
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [warehouseMovements, getItemById]);

  // Distribuição de requisições por status
  const requestsDistribution = useMemo(() => {
    const statusCount: Record<string, number> = {};
    
    filteredRequests.forEach(req => {
      const status = req.status;
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const statusLabels: Record<string, string> = {
      pending: 'Pendentes',
      approved: 'Aprovadas',
      processing: 'Em Processamento',
      completed: 'Concluídas',
      rejected: 'Rejeitadas',
    };

    return Object.entries(statusCount).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
    }));
  }, [filteredRequests]);

  // Tendência de entradas vs saídas no almoxarifado
  const trendData = useMemo(() => {
    const periods: { name: string; entradas: number; saídas: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() - (i * (timePeriod === '7days' ? 1 : timePeriod === '30days' ? 4 : 12)));
      
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - (timePeriod === '7days' ? 1 : timePeriod === '30days' ? 4 : 12));

      const periodMovements = warehouseMovements.filter(m => {
        const date = new Date(m.timestamp);
        return date >= periodStart && date <= periodEnd;
      });

      const periodName = timePeriod === '7days' 
        ? periodEnd.toLocaleDateString('pt-BR', { weekday: 'short' })
        : periodEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

      periods.push({
        name: periodName,
        entradas: periodMovements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + m.quantity, 0),
        saídas: periodMovements.filter(m => m.type === 'saida').reduce((sum, m) => sum + m.quantity, 0),
      });
    }

    return periods;
  }, [warehouseMovements, timePeriod]);

  // Móveis mais transferidos
  const topFurnitureTransfers = useMemo(() => {
    const furnitureCounts: Record<string, { name: string; count: number }> = {};
    
    filteredFurnitureTransfers.forEach(ft => {
      const item = getItemById(ft.itemId);
      if (item) {
        if (!furnitureCounts[item.id]) {
          furnitureCounts[item.id] = { name: item.name, count: 0 };
        }
        furnitureCounts[item.id].count += 1;
      }
    });

    return Object.values(furnitureCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredFurnitureTransfers, getItemById]);

  // Estoque crítico no almoxarifado
  const criticalWarehouseStock = useMemo(() => {
    const critical = unitStocks
      .filter(stock => {
        if (stock.unitId !== warehouseId) return false;
        return stock.quantity < stock.minimumQuantity;
      })
      .map(stock => {
        const item = getItemById(stock.itemId);
        return {
          itemName: item?.name || 'Desconhecido',
          quantity: stock.quantity,
          minimum: stock.minimumQuantity,
          deficit: stock.minimumQuantity - stock.quantity,
        };
      })
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, 5);

    return critical;
  }, [unitStocks, getItemById]);

  // Variação de estoque
  const stockVariation = useMemo(() => {
    const currentEntries = metrics.totalEntries;
    const currentExits = metrics.totalExits;
    
    const variation = currentEntries > 0 
      ? (((currentEntries - currentExits) / currentEntries) * 100).toFixed(1)
      : '0';

    return {
      variation: parseFloat(variation),
      isPositive: parseFloat(variation) > 0,
    };
  }, [metrics]);

  // Designers com mais aprovações (simulado - na prática viria de furnitureRequestsToDesigner)
  const topDesigners = useMemo(() => {
    const designers = users.filter(u => u.role === 'designer');
    return designers.map(d => ({
      name: d.name,
      jobTitle: d.jobTitle || 'Designer',
      approvals: Math.floor(Math.random() * 15) + 1, // Simulado
    })).sort((a, b) => b.approvals - a.approvals);
  }, [users]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-neutral-900 dark:text-neutral-100">Admin - Almoxarifado & Design</h1>
              <p className="text-muted-foreground mt-1">
                Análise de estoque central, distribuições e aprovações de designers
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Relatório
              </Button>
              {onSwitchToDesigner && (
                <Button 
                  variant="default" 
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                  onClick={onSwitchToDesigner}
                >
                  <Palette className="h-4 w-4" />
                  Acessar Modo Designer
                </Button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 sm:max-w-xs">
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Estoque Total */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estoque Total</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.totalWarehouseStock}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stockVariation.isPositive ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${stockVariation.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(stockVariation.variation)}%
                  </span>
                  <span className="text-sm text-muted-foreground">vs. entradas</span>
                </div>
              </div>
              <div className="rounded-full bg-[#3F76FF]/10 p-3">
                <Package2 className="h-5 w-5 text-[#3F76FF]" />
              </div>
            </div>
          </Card>

          {/* Giro de Estoque */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giro de Estoque</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.stockTurnover}%</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metrics.totalExits} saídas / {metrics.totalEntries} entradas
                </p>
              </div>
              <div className="rounded-full bg-[#00C5E9]/10 p-3">
                <TrendingUp className="h-5 w-5 text-[#00C5E9]" />
              </div>
            </div>
          </Card>

          {/* Requisições Pendentes */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requisições Pendentes</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.pendingRequests}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metrics.completedRequests} concluídas
                </p>
              </div>
              <div className="rounded-full bg-orange-500/10 p-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </Card>

          {/* Transferências de Móveis */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transferências de Móveis</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.furnitureInTransit}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metrics.furnitureCompleted} concluídas
                </p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <Sofa className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          {/* Tendência de Entradas vs Saídas */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Entradas vs Saídas - Almoxarifado</h3>
            <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Gráfico de entradas e saídas</p>
                <p className="text-sm">(Dados: {trendData.length} períodos)</p>
              </div>
            </div>
          </Card>

          {/* Distribuição de Status de Requisições */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Status das Requisições</h3>
            <div className="h-[300px] flex flex-col items-center justify-center border border-dashed border-border rounded-lg">
              <div className="text-center text-muted-foreground mb-4">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Gráfico de distribuição de status</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {requestsDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span>{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Tabelas de Dados */}
        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          {/* Itens Mais Movimentados */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Itens Mais Movimentados</h3>
            <div className="space-y-3">
              {topMovedItems.length > 0 ? (
                topMovedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3F76FF]/10 text-sm text-[#3F76FF]">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-green-600">+{item.entries}</span> / 
                          <span className="text-red-600"> -{item.exits}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{item.total}</p>
                      <p className="text-xs text-muted-foreground">movimentos</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              )}
            </div>
          </Card>

          {/* Móveis Mais Transferidos */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Móveis Mais Transferidos</h3>
            <div className="space-y-3">
              {topFurnitureTransfers.length > 0 ? (
                topFurnitureTransfers.map((furniture, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00C5E9]/10 text-sm text-[#00C5E9]">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{furniture.name}</p>
                        <p className="text-xs text-muted-foreground">Transferências entre unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{furniture.count}</p>
                      <p className="text-xs text-muted-foreground">transferências</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              )}
            </div>
          </Card>
        </div>

        {/* Designers e Estoque Crítico */}
        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          {/* Top Designers */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Designers - Aprovações</h3>
            <div className="space-y-3">
              {topDesigners.length > 0 ? (
                topDesigners.map((designer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-sm text-green-500">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{designer.name}</p>
                        <p className="text-xs text-muted-foreground">{designer.jobTitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{designer.approvals}</p>
                      <p className="text-xs text-muted-foreground">aprovações</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum designer cadastrado</p>
              )}
            </div>
          </Card>

          {/* Estoque Crítico */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Estoque Crítico - Almoxarifado</h3>
            <div className="space-y-3">
              {criticalWarehouseStock.length > 0 ? (
                criticalWarehouseStock.map((stock, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div>
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{stock.itemName}</p>
                      <p className="text-xs text-muted-foreground">Almoxarifado Central</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-500">{stock.quantity}/{stock.minimum}</p>
                      <p className="text-xs text-muted-foreground">Faltam {stock.deficit}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="rounded-full bg-green-500/10 p-3 w-12 h-12 mx-auto mb-2">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Estoque adequado</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Equipe */}
        <div className="grid gap-6 mt-6 lg:grid-cols-3">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[#3F76FF]/10 p-4">
                <Users className="h-6 w-6 text-[#3F76FF]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Equipe de Designers</p>
                <p className="text-2xl mt-1 text-neutral-900 dark:text-neutral-100">{metrics.designers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[#00C5E9]/10 p-4">
                <Truck className="h-6 w-6 text-[#00C5E9]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Equipe de Almoxarifado</p>
                <p className="text-2xl mt-1 text-neutral-900 dark:text-neutral-100">{metrics.warehouseStaff}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/10 p-4">
                <Package2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Atendimento</p>
                <p className="text-2xl mt-1 text-neutral-900 dark:text-neutral-100">
                  {((metrics.completedRequests / (metrics.completedRequests + metrics.pendingRequests || 1)) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}