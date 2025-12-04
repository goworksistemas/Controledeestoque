import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { AlertCircle, PackagePlus, Search } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';

interface SelectItemForStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelectItemForStockDialog({ 
  open, 
  onOpenChange 
}: SelectItemForStockDialogProps) {
  const { items, unitStocks, currentUser, addMovement, units } = useApp();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Buscar a unidade do almoxarifado pelo nome
  const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
  
  if (!warehouseUnit) {
    console.error('❌ Unidade Almoxarifado Central não encontrada!');
  }

  // Filtrar apenas itens que NÃO são móveis
  const availableItems = items.filter(item => !item?.isFurniture);

  // Filtrar por busca
  const filteredItems = availableItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === selectedItemId);
  const warehouseStock = unitStocks.find(
    s => s.itemId === selectedItemId && s.unitId === warehouseUnit?.id
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('🔍 Debug - handleSubmit iniciado');
    console.log('📦 selectedItemId:', selectedItemId);
    console.log('👤 currentUser:', currentUser);

    if (!selectedItemId) {
      setError('Selecione um item');
      return;
    }

    const qty = parseInt(quantity);
    console.log('🔢 Quantidade:', qty);
    
    if (!qty || qty <= 0) {
      setError('Quantidade inválida');
      return;
    }

    if (!currentUser) {
      setError('Usuário não encontrado');
      return;
    }

    if (!warehouseUnit) {
      setError('Unidade do almoxarifado não encontrada');
      console.error('❌ warehouseUnit não encontrado. Units disponíveis:', units);
      return;
    }

    console.log('✅ Todas as validações passaram');
    console.log('🏢 warehouseUnit ID:', warehouseUnit.id);
    console.log('📝 Chamando addMovement com:', {
      type: 'entry',
      itemId: selectedItemId,
      unitId: warehouseUnit.id,
      userId: currentUser.id,
      quantity: qty,
      notes: notes.trim() || undefined,
    });

    // Adicionar movimento de entrada
    try {
      addMovement({
        type: 'entry',
        itemId: selectedItemId,
        unitId: warehouseUnit?.id,
        userId: currentUser.id,
        quantity: qty,
        notes: notes.trim() || undefined,
      });

      console.log('✅ addMovement executado com sucesso');

      // Mostrar mensagem de sucesso
      const item = items.find(i => i.id === selectedItemId);
      toast.success(`✓ Entrada registrada: ${qty}x ${item?.name || 'item'}`);

      // Reset and close
      setSelectedItemId(null);
      setQuantity('1');
      setNotes('');
      setSearchQuery('');
      setError('');
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Erro ao adicionar movimento:', error);
      setError('Erro ao registrar entrada. Verifique o console.');
      toast.error('Erro ao registrar entrada de estoque');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedItemId(null);
      setQuantity('1');
      setNotes('');
      setSearchQuery('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Entrada de Estoque
          </DialogTitle>
          <DialogDescription>
            Selecione um item e informe a quantidade recebida
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buscar Item */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar Item *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do item..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de Itens */}
          <div className="space-y-2">
            <Label>Itens Disponíveis</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
              {filteredItems.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {searchQuery ? 'Nenhum item encontrado' : 'Nenhum item disponível'}
                </div>
              ) : (
                filteredItems.map(item => {
                  const stock = unitStocks.find(
                    s => s.itemId === item.id && s.unitId === warehouseUnit?.id
                  );
                  const isSelected = selectedItemId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? 'border-[#3F76FF] bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {item.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {stock && (
                              <span className="text-xs text-gray-600">
                                Estoque atual: {stock.quantity}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full bg-[#3F76FF] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Item Selecionado */}
          {selectedItem && (
            <div className="space-y-2">
              <Label>Item Selecionado</Label>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-[#3F76FF]">
                <div className="flex-1">
                  <span className="text-sm font-medium">{selectedItem.name}</span>
                  <div className="text-xs text-gray-600">{selectedItem.description}</div>
                </div>
                {warehouseStock && (
                  <Badge variant="outline">Atual: {warehouseStock.quantity}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Quantidade */}
          {selectedItem && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade a Adicionar *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Digite a quantidade"
              />
              {warehouseStock && (
                <p className="text-xs text-slate-500">
                  Novo total: {warehouseStock.quantity + parseInt(quantity || '0')}
                </p>
              )}
            </div>
          )}

          {/* Observações */}
          {selectedItem && (
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fornecedor, nota fiscal, motivo da entrada, etc."
                rows={3}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedItem}>
              Registrar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}