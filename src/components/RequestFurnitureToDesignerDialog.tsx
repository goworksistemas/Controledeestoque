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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, Sofa } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';

interface RequestFurnitureToDesignerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestFurnitureToDesignerDialog({ 
  open, 
  onOpenChange,
}: RequestFurnitureToDesignerDialogProps) {
  const { currentUser, currentUnit, items, addFurnitureRequestToDesigner } = useApp();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  // Get all furniture items
  const furnitureItems = items.filter(item => item.isFurniture && item.active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedItemId) {
      setError('Selecione um móvel');
      return;
    }

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      setError('Quantidade inválida');
      return;
    }

    if (!location.trim()) {
      setError('Informe a localização');
      return;
    }

    if (!justification.trim()) {
      setError('Informe a justificativa');
      return;
    }

    if (!currentUnit || !currentUser) {
      setError('Unidade ou usuário não identificado');
      return;
    }

    addFurnitureRequestToDesigner({
      itemId: selectedItemId,
      requestingUnitId: currentUnit.id,
      requestedByUserId: currentUser.id,
      quantity: qty,
      location: location.trim(),
      justification: justification.trim(),
      status: 'pending_designer',
    });

    toast.success('Solicitação enviada ao designer!', {
      description: `A equipe de design irá avaliar sua solicitação em breve.`
    });

    // Reset and close
    setSelectedItemId('');
    setQuantity('1');
    setLocation('');
    setJustification('');
    setError('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedItemId('');
      setQuantity('1');
      setLocation('');
      setJustification('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  const selectedItem = furnitureItems.find(i => i.id === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sofa className="h-5 w-5" />
            Solicitar Móvel ao Designer
          </DialogTitle>
          <DialogDescription>
            Envie uma solicitação de móvel para aprovação do designer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="furniture">Móvel *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger id="furniture">
                <SelectValue placeholder="Selecione o móvel" />
              </SelectTrigger>
              <SelectContent>
                {furnitureItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                    {item.brand && ` - ${item.brand}`}
                    {item.model && ` (${item.model})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem?.description && (
              <p className="text-xs text-slate-500 mt-1">
                {selectedItem.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Digite a quantidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização na Unidade *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Sala de reunião 1, Recepção, etc."
            />
            <p className="text-xs text-slate-500">
              Onde o móvel será posicionado na unidade
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique o motivo da solicitação do móvel..."
              rows={4}
            />
            <p className="text-xs text-slate-500">
              Por que este móvel é necessário para a unidade?
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Fluxo de aprovação:</strong><br />
              1. Designer avalia e aprova/rejeita<br />
              2. Se aprovado, almoxarifado é acionado para entrega<br />
              3. Motorista realiza a entrega na unidade
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
