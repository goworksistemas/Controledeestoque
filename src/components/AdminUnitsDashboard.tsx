import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart3, TrendingUp, Package, AlertCircle, Download, ArrowUpRight, ArrowDownRight, Users, Layout } from 'lucide-react';

type TimePeriod = '7days' | '30days' | '90days' | 'all';

interface AdminUnitsDashboardProps {
  onSwitchToController?: () => void;
}

export function AdminUnitsDashboard({ onSwitchToController }: AdminUnitsDashboardProps) {
  const { items, unitStocks, requests, units, movements, users, getItemById, getUnitById, getUserById, getWarehouseUnitId } = useApp();
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30days');

  // Filtrar unidades operacionais (excluir almoxarifado)
  const warehouseId = getWarehouseUnitId();
  const operationalUnits = units.filter(u => u.id !== warehouseId);

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
        return new Date(2020, 0, 1); // All time
    }
  };

  const startDate = getStartDate(timePeriod);

  // Filtrar requisições (excluir empréstimos entre unidades - mostrar apenas consumo real)
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesUnit = selectedUnit === 'all' || req.requestingUnitId === selectedUnit;
      const matchesDate = new Date(req.createdAt) >= startDate;
      return matchesUnit && matchesDate;
    });
  }, [requests, selectedUnit, startDate]);

  // Filtrar movimentações de consumo (saída) por executores e controladores
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      const matchesUnit = selectedUnit === 'all' || mov.unitId === selectedUnit;
      const matchesDate = new Date(mov.timestamp) >= startDate;
      const isOperationalUnit = mov.unitId !== warehouseId;
      const isConsumption = mov.type === 'saida';
      return matchesUnit && matchesDate && isOperationalUnit && isConsumption;
    });
  }, [movements, selectedUnit, startDate]);

  // Calcular métricas principais
  const metrics = useMemo(() => {
    const totalRequests = filteredRequests.length;
    const completedRequests = filteredRequests.filter(r => r.status === 'completed').length;
    const pendingRequests = filteredRequests.filter(r => r.status === 'pending').length;
    const totalItemsRequested = filteredRequests.reduce((sum, r) => sum + r.quantity, 0);
    const totalConsumed = filteredMovements.reduce((sum, m) => sum + m.quantity, 0);

    // Executores e Controladores ativos
    const executorsControllers = users.filter(u => 
      (u.role === 'executor' || u.role === 'controller') &&
      (selectedUnit === 'all' || u.primaryUnitId === selectedUnit)
    );

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      totalItemsRequested,
      totalConsumed,
      activeUsers: executorsControllers.length,
      completionRate: totalRequests > 0 ? ((completedRequests / totalRequests) * 100).toFixed(1) : '0',
    };
  }, [filteredRequests, filteredMovements, users, selectedUnit]);

  // Itens mais solicitados
  const topRequestedItems = useMemo(() => {
    const itemCounts: Record<string, { name: string; count: number; quantity: number }> = {};
    
    filteredRequests.forEach(req => {
      const item = getItemById(req.itemId);
      if (item) {
        if (!itemCounts[item.id]) {
          itemCounts[item.id] = { name: item.name, count: 0, quantity: 0 };
        }
        itemCounts[item.id].count += 1;
        itemCounts[item.id].quantity += req.quantity;
      }
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredRequests, getItemById]);

  // Consumo por unidade
  const consumptionByUnit = useMemo(() => {
    const unitData: Record<string, { name: string; consumo: number; requisições: number }> = {};
    
    filteredMovements.forEach(mov => {
      const unit = getUnitById(mov.unitId);
      if (unit && unit.id !== warehouseId) {
        if (!unitData[unit.id]) {
          unitData[unit.id] = { name: unit.name, consumo: 0, requisições: 0 };
        }
        unitData[unit.id].consumo += mov.quantity;
      }
    });

    filteredRequests.forEach(req => {
      const unit = getUnitById(req.requestingUnitId);
      if (unit && unit.id !== warehouseId) {
        if (!unitData[unit.id]) {
          unitData[unit.id] = { name: unit.name, consumo: 0, requisições: 0 };
        }
        unitData[unit.id].requisições += req.quantity;
      }
    });

    return Object.values(unitData).sort((a, b) => b.consumo - a.consumo);
  }, [filteredMovements, filteredRequests, getUnitById]);

  // Dados de tendência (últimos 7 períodos)
  const trendData = useMemo(() => {
    const periods: { name: string; consumo: number; requisições: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() - (i * (timePeriod === '7days' ? 1 : timePeriod === '30days' ? 4 : 12)));
      
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - (timePeriod === '7days' ? 1 : timePeriod === '30days' ? 4 : 12));

      const periodMovements = filteredMovements.filter(m => {
        const date = new Date(m.timestamp);
        return date >= periodStart && date <= periodEnd;
      });

      const periodRequests = filteredRequests.filter(r => {
        const date = new Date(r.createdAt);
        return date >= periodStart && date <= periodEnd;
      });

      const periodName = timePeriod === '7days' 
        ? periodEnd.toLocaleDateString('pt-BR', { weekday: 'short' })
        : periodEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

      periods.push({
        name: periodName,
        consumo: periodMovements.reduce((sum, m) => sum + m.quantity, 0),
        requisições: periodRequests.reduce((sum, r) => sum + r.quantity, 0),
      });
    }

    return periods;
  }, [filteredMovements, filteredRequests, timePeriod]);

  // Produtos críticos (estoque baixo)
  const criticalStock = useMemo(() => {
    const critical = unitStocks
      .filter(stock => {
        if (selectedUnit !== 'all' && stock.unitId !== selectedUnit) return false;
        if (stock.unitId === warehouseId) return false; // Excluir almoxarifado
        return stock.quantity < stock.minimumQuantity;
      })
      .map(stock => {
        const item = getItemById(stock.itemId);
        const unit = getUnitById(stock.unitId);
        return {
          itemName: item?.name || 'Desconhecido',
          unitName: unit?.name || 'Desconhecido',
          quantity: stock.quantity,
          minimum: stock.minimumQuantity,
          deficit: stock.minimumQuantity - stock.quantity,
        };
      })
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, 5);

    return critical;
  }, [unitStocks, selectedUnit, getItemById, getUnitById]);

  // Variação de consumo (comparação com período anterior)
  const consumptionVariation = useMemo(() => {
    const currentTotal = filteredMovements.reduce((sum, m) => sum + m.quantity, 0);
    
    // Período anterior
    const previousStart = new Date(startDate);
    const daysDiff = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    previousStart.setDate(previousStart.getDate() - daysDiff);
    
    const previousMovements = movements.filter(mov => {
      const matchesUnit = selectedUnit === 'all' || mov.unitId === selectedUnit;
      const movDate = new Date(mov.timestamp);
      const matchesDate = movDate >= previousStart && movDate < startDate;
      const isOperationalUnit = mov.unitId !== warehouseId;
      const isConsumption = mov.type === 'saida';
      return matchesUnit && matchesDate && isOperationalUnit && isConsumption;
    });

    const previousTotal = previousMovements.reduce((sum, m) => sum + m.quantity, 0);
    
    const variation = previousTotal > 0 
      ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1)
      : '0';

    return {
      current: currentTotal,
      previous: previousTotal,
      variation: parseFloat(variation),
      isIncrease: parseFloat(variation) > 0,
    };
  }, [filteredMovements, movements, selectedUnit, startDate]);

  // Top executores/controladores por consumo
  const topUsers = useMemo(() => {
    const userCounts: Record<string, { name: string; jobTitle: string; consumption: number; movements: number }> = {};
    
    filteredMovements.forEach(mov => {
      const user = getUserById(mov.executorUserId);
      if (user && (user.role === 'executor' || user.role === 'controller')) {
        if (!userCounts[user.id]) {
          userCounts[user.id] = { 
            name: user.name, 
            jobTitle: user.jobTitle || user.role,
            consumption: 0, 
            movements: 0 
          };
        }
        userCounts[user.id].consumption += mov.quantity;
        userCounts[user.id].movements += 1;
      }
    });

    return Object.values(userCounts)
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, 5);
  }, [filteredMovements, getUserById]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-neutral-900 dark:text-neutral-100">Admin - Unidades Operacionais</h1>
              <p className="text-muted-foreground mt-1">
                Análise de consumo e movimentações por executores e controladores
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Relatório
              </Button>
              {onSwitchToController && (
                <Button 
                  variant="default" 
                  className="gap-2 bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                  onClick={onSwitchToController}
                >
                  <Layout className="h-4 w-4" />
                  Acessar Modo Controlador
                </Button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 sm:max-w-xs">
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {operationalUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          {/* Total Consumido */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Consumido</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.totalConsumed}</p>
                <div className="flex items-center gap-1 mt-2">
                  {consumptionVariation.isIncrease ? (
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-green-500" />
                  )}
                  <span className={`text-sm ${consumptionVariation.isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.abs(consumptionVariation.variation)}%
                  </span>
                  <span className="text-sm text-muted-foreground">vs. período anterior</span>
                </div>
              </div>
              <div className="rounded-full bg-[#3F76FF]/10 p-3">
                <Package className="h-5 w-5 text-[#3F76FF]" />
              </div>
            </div>
          </Card>

          {/* Total de Requisições */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Requisições</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.totalRequests}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metrics.totalItemsRequested} itens solicitados
                </p>
              </div>
              <div className="rounded-full bg-[#00C5E9]/10 p-3">
                <BarChart3 className="h-5 w-5 text-[#00C5E9]" />
              </div>
            </div>
          </Card>

          {/* Taxa de Conclusão */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.completionRate}%</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metrics.completedRequests} de {metrics.totalRequests} requisições
                </p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </Card>

          {/* Usuários Ativos */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                <p className="text-3xl mt-2 text-neutral-900 dark:text-neutral-100">{metrics.activeUsers}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Executores e Controladores
                </p>
              </div>
              <div className="rounded-full bg-orange-500/10 p-3">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          {/* Tendência de Consumo vs Requisições */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Tendência de Consumo vs Requisições</h3>
            <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Gráfico de tendências</p>
                <p className="text-sm">(Dados: {trendData.length} períodos)</p>
              </div>
            </div>
          </Card>

          {/* Consumo por Unidade */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Consumo por Unidade</h3>
            <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Gráfico de consumo</p>
                <p className="text-sm">(Dados: {consumptionByUnit.length} unidades)</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabelas de Dados */}
        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          {/* Itens Mais Solicitados */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Itens Mais Solicitados</h3>
            <div className="space-y-3">
              {topRequestedItems.length > 0 ? (
                topRequestedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3F76FF]/10 text-sm text-[#3F76FF]">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.count} requisições</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">unidades</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              )}
            </div>
          </Card>

          {/* Top Executores/Controladores */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Top Executores/Controladores</h3>
            <div className="space-y-3">
              {topUsers.length > 0 ? (
                topUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00C5E9]/10 text-sm text-[#00C5E9]">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.jobTitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{user.consumption}</p>
                      <p className="text-xs text-muted-foreground">{user.movements} movimentações</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              )}
            </div>
          </Card>
        </div>

        {/* Produtos Críticos */}
        {criticalStock.length > 0 && (
          <Card className="p-6 bg-card border-border mt-6">
            <h3 className="text-lg mb-4 text-neutral-900 dark:text-neutral-100">Produtos Críticos (Estoque Baixo)</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {criticalStock.map((stock, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div>
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">{stock.itemName}</p>
                    <p className="text-xs text-muted-foreground">{stock.unitName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-500">{stock.quantity}/{stock.minimum}</p>
                    <p className="text-xs text-muted-foreground">Faltam {stock.deficit}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}