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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface LoanItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockId: string;
  itemName: string;
  availableQuantity: number;
}

export function LoanItemDialog({ 
  open, 
  onOpenChange, 
  stockId, 
  itemName,
  availableQuantity 
}: LoanItemDialogProps) {
  const { currentUser, currentUnit, units, addLoan, addMovement, unitStocks, getWarehouseUnitId } = useApp();
  const [quantity, setQuantity] = useState('1');
  const [destinationUnitId, setDestinationUnitId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const warehouseId = getWarehouseUnitId();
  const otherUnits = units.filter(u => 
    u.id !== currentUnit?.id && 
    u.id !== warehouseId && 
    u.status === 'active'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(quantity);
    
    if (!qty || qty <= 0) {
      setError('Quantidade inválida');
      return;
    }

    if (qty > availableQuantity) {
      setError(`Quantidade disponível: ${availableQuantity}`);
      return;
    }

    if (!destinationUnitId) {
      setError('Selecione a unidade de destino');
      return;
    }

    if (!expectedReturnDate) {
      setError('Data de devolução é obrigatória');
      return;
    }

    const returnDate = new Date(expectedReturnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (returnDate < today) {
      setError('Data de devolução não pode ser no passado');
      return;
    }

    const stock = unitStocks.find(s => s.id === stockId);
    if (!stock || !currentUnit) {
      setError('Estoque não encontrado');
      return;
    }

    if (!currentUser) return;

    // Add loan movement
    addMovement({
      type: 'loan',
      itemId: stock.itemId,
      unitId: currentUnit.id,
      userId: currentUser.id,
      quantity: qty,
      borrowerUnitId: destinationUnitId,
      notes: notes.trim() || undefined,
    });

    // Also create a loan record
    addLoan({
      itemId: stock.itemId,
      unitId: currentUnit.id,
      responsibleUserId: currentUser.id,
      expectedReturnDate: expectedReturnDate,
      status: 'active',
      observations: notes.trim() || undefined,
    });

    // Reset and close
    setQuantity('1');
    setDestinationUnitId('');
    setExpectedReturnDate('');
    setNotes('');
    setError('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuantity('1');
      setDestinationUnitId('');
      setExpectedReturnDate('');
      setNotes('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  // Set default date to 7 days from now
  React.useEffect(() => {
    if (open && !expectedReturnDate) {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      setExpectedReturnDate(date.toISOString().split('T')[0]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Emprestar Item
          </DialogTitle>
          <DialogDescription>
            Registrar empréstimo de {itemName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium">{itemName}</span>
              <Badge variant="outline">Disponível: {availableQuantity}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={availableQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Digite a quantidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Unidade de Destino *</Label>
            <Select value={destinationUnitId} onValueChange={setDestinationUnitId}>
              <SelectTrigger id="destination">
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {otherUnits.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Empréstimos são feitos apenas entre unidades operacionais
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnDate">Data de Devolução *</Label>
            <Input
              id="returnDate"
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo do empréstimo, condições especiais, etc."
              rows={3}
            />
          </div>

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
            <Button type="submit">
              Registrar Empréstimo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
