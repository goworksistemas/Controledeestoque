import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { Calendar } from 'lucide-react';

interface SimpleLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleLoanDialog({ open, onOpenChange }: SimpleLoanDialogProps) {
  const { currentUnit, currentUser, items, addLoan } = useApp();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUnit || !currentUser) return null;

  // Todos os itens disponíveis (móveis e produtos)
  const availableItems = items.filter(item => item.active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItemId || !responsibleName || !expectedReturnDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Registrar empréstimo sem mexer no estoque
      addLoan({
        itemId: selectedItemId,
        unitId: currentUnit.id,
        responsibleUserId: currentUser.id, // Por enquanto usa o ID do controlador
        responsibleName: responsibleName, // Nome da pessoa que pegou emprestado
        serialNumber: serialNumber || undefined,
        withdrawalDate: new Date(),
        expectedReturnDate: new Date(expectedReturnDate),
        status: 'active',
        observations: observations || undefined,
      });

      const item = items.find(i => i.id === selectedItemId);
      toast.success(`Empréstimo de "${item?.name}" registrado com sucesso!`);

      // Resetar formulário
      setSelectedItemId('');
      setResponsibleName('');
      setSerialNumber('');
      setExpectedReturnDate('');
      setObservations('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar empréstimo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Empréstimo</DialogTitle>
          <DialogDescription>
            Controle de itens emprestados (sem alterar estoque)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item">Item *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o item" />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible">Responsável *</Label>
            <Input
              id="responsible"
              placeholder="Nome da pessoa que pegou emprestado"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial">Número de Série / Patrimônio</Label>
            <Input
              id="serial"
              placeholder="Ex: PAT-12345 (opcional)"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnDate">Data de Devolução Prevista *</Label>
            <div className="relative">
              <Input
                id="returnDate"
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              placeholder="Motivo do empréstimo, condições, etc. (opcional)"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Empréstimo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}