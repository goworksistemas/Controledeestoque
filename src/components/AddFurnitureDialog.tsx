import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Camera, X, Armchair, MapPin, Loader2, Building, Package } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useApp } from '../contexts/AppContext';

interface AddFurnitureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFurnitureDialog({ open, onOpenChange }: AddFurnitureDialogProps) {
  const { currentUnit, currentUser, addItemWithStock, units, categories, getWarehouseUnitId } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  
  const warehouseId = getWarehouseUnitId();
  
  // Verificar se é Almoxarifado Central - MÚLTIPLAS VERIFICAÇÕES
  const isWarehouse = 
    (currentUser?.role === 'warehouse' && currentUser?.warehouseType === 'storage') ||
    (currentUser?.role === 'warehouse') || // Verificar apenas role
    (currentUnit?.id === warehouseId) ||
    (currentUnit?.name?.toLowerCase().includes('almoxarifado')) || // Verificar nome
    (currentUnit?.type === 'warehouse'); // Verificar tipo da unidade
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    floor: '',
    room: '',
    description: '',
    quantity: 1,
  });

  // Cleanup camera when dialog closes
  useEffect(() => {
    if (!open) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCapturing(false);
      setPhoto(null);
      setFormData({
        name: '',
        floor: '',
        room: '',
        description: '',
        quantity: 1,
      });
    }
  }, [open]);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error: any) {
      setIsCapturing(false);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Permissão da câmera negada. Use o botão "Fazer Upload" para enviar uma foto.', {
          duration: 5000,
        });
      } else if (error.name === 'NotFoundError') {
        toast.error('Câmera não encontrada. Use o botão "Fazer Upload" para enviar uma foto.', {
          duration: 5000,
        });
      } else {
        toast.error('Não foi possível acessar a câmera. Use o botão "Fazer Upload" como alternativa.', {
          duration: 5000,
        });
      }
      
      console.error('Camera error:', error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
        
        toast.success('Foto capturada!');
      }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };
  
  const handleCancel = () => {
    if (typeof onOpenChange === 'function') {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Para usuário almoxarifado, usar unidade padrão se não houver
    let targetUnit = currentUnit;
    
    // Se for almoxarifado e não tem unidade, criar/usar unidade padrão
    if (isWarehouse && !targetUnit) {
      targetUnit = {
        id: warehouseId || 'unit-warehouse',
        name: 'Almoxarifado Central',
        type: 'warehouse',
        floors: [] // Almoxarifado não usa andares
      };
    }
    
    if (!targetUnit) {
      toast.error('Nenhuma unidade selecionada');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Digite o nome do móvel');
      return;
    }

    // Apenas validar andar se NÃO for almoxarifado
    if (!isWarehouse && !formData.floor.trim()) {
      toast.error('Selecione o andar');
      return;
    }

    if (!photo) {
      toast.error('Tire uma foto do móvel');
      return;
    }

    setIsLoading(true);
    try {
      // Buscar uma categoria válida - usar a primeira disponível ou criar uma genérica
      let validCategoryId = categories && categories.length > 0 ? categories[0].id : 'default-category';
      
      // Se for almoxarifado, usar localização padrão "Estoque Central"
      // Se não, usar andar + sala
      const locationString = isWarehouse 
        ? 'Estoque Central'
        : `${formData.floor}${formData.room ? ` - ${formData.room}` : ''}`;
      
      const newItem = {
        name: formData.name,
        categoryId: validCategoryId, // Usar categoria válida
        description: formData.description || 'Móvel cadastrado',
        unitOfMeasure: 'UN',
        isConsumable: false,
        requiresResponsibilityTerm: false,
        defaultLoanDays: 0,
        active: true,
        imageUrl: photo,
        isFurniture: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // ⚠️ IMPORTANTE: addItemWithStock() cria o item E o stock simultaneamente
      // Retorna o itemId gerado pelo backend
      console.log('📦 Criando item e stock no backend...');
      const itemId = addItemWithStock(
        newItem, 
        targetUnit.id, 
        formData.quantity, 
        locationString
      );
      
      console.log('✅ Móvel cadastrado com sucesso! ItemID:', itemId);
      
      toast.success(`Móvel "${formData.name}" cadastrado no ${isWarehouse ? 'Almoxarifado Central' : targetUnit.name}!`);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding furniture:', error);
      toast.error(error.message || 'Erro ao cadastrar móvel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Verificar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setPhoto(imageData);
      toast.success('Foto carregada!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="w-5 h-5 text-[#3F76FF]" />
            Cadastrar Móvel
          </DialogTitle>
          <DialogDescription>
            Adicione um novo móvel em {currentUnit?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Móvel */}
          <div className="space-y-2">
            <Label htmlFor="furniture-name" className="flex items-center gap-2">
              <Armchair className="w-4 h-4" />
              Nome do Móvel *
            </Label>
            <Input
              id="furniture-name"
              placeholder="Ex: Mesa de Reunião, Cadeira Executiva..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Andar - Destaque especial - OCULTAR se for Almoxarifado */}
          {!isWarehouse && (
            <div className="space-y-2 p-4 bg-[#3F76FF]/5 border-2 border-[#3F76FF]/20 rounded-lg">
              <Label htmlFor="furniture-floor" className="flex items-center gap-2 text-[#3F76FF]">
                <Building className="w-4 h-4" />
                Andar *
              </Label>
              <Select
                value={formData.floor}
                onValueChange={(value) => setFormData({ ...formData, floor: value })}
                disabled={isLoading}
              >
                <SelectTrigger id="furniture-floor" className="bg-white">
                  <SelectValue placeholder="Selecione o andar" />
                </SelectTrigger>
                <SelectContent>
                  {currentUnit?.floors && Array.isArray(currentUnit.floors) && currentUnit.floors.length > 0 ? (
                    currentUnit.floors.map((floor) => (
                      <SelectItem key={floor} value={floor}>
                        {floor}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="3º Subsolo">3º Subsolo</SelectItem>
                      <SelectItem value="2º Subsolo">2º Subsolo</SelectItem>
                      <SelectItem value="1º Subsolo">1º Subsolo</SelectItem>
                      <SelectItem value="Térreo">Térreo</SelectItem>
                      <SelectItem value="1º Andar">1º Andar</SelectItem>
                      <SelectItem value="2º Andar">2º Andar</SelectItem>
                      <SelectItem value="3º Andar">3º Andar</SelectItem>
                      <SelectItem value="4º Andar">4º Andar</SelectItem>
                      <SelectItem value="5º Andar">5º Andar</SelectItem>
                      <SelectItem value="6º Andar">6º Andar</SelectItem>
                      <SelectItem value="7º Andar">7º Andar</SelectItem>
                      <SelectItem value="8º Andar">8º Andar</SelectItem>
                      <SelectItem value="9º Andar">9º Andar</SelectItem>
                      <SelectItem value="10º Andar">10º Andar</SelectItem>
                      <SelectItem value="11º Andar">11º Andar</SelectItem>
                      <SelectItem value="12º Andar">12º Andar</SelectItem>
                      <SelectItem value="13º Andar">13º Andar</SelectItem>
                      <SelectItem value="14º Andar">14º Andar</SelectItem>
                      <SelectItem value="15º Andar">15º Andar</SelectItem>
                      <SelectItem value="16º Andar">16º Andar</SelectItem>
                      <SelectItem value="17º Andar">17º Andar</SelectItem>
                      <SelectItem value="18º Andar">18º Andar</SelectItem>
                      <SelectItem value="19º Andar">19º Andar</SelectItem>
                      <SelectItem value="20º Andar">20º Andar</SelectItem>
                      <SelectItem value="21º Andar">21º Andar</SelectItem>
                      <SelectItem value="22º Andar">22º Andar</SelectItem>
                      <SelectItem value="23º Andar">23º Andar</SelectItem>
                      <SelectItem value="24º Andar">24º Andar</SelectItem>
                      <SelectItem value="25º Andar">25º Andar</SelectItem>
                      <SelectItem value="26º Andar">26º Andar</SelectItem>
                      <SelectItem value="27º Andar">27º Andar</SelectItem>
                      <SelectItem value="28º Andar">28º Andar</SelectItem>
                      <SelectItem value="29º Andar">29º Andar</SelectItem>
                      <SelectItem value="Cobertura">Cobertura</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {currentUnit?.floors && (!Array.isArray(currentUnit.floors) || currentUnit.floors.length === 0) && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Configure os andares desta unidade no painel de Developer
                </p>
              )}
            </div>
          )}

          {/* Sala/Localização - OCULTAR se for Almoxarifado */}
          {!isWarehouse && (
            <div className="space-y-2">
              <Label htmlFor="furniture-room" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Sala/Localização
              </Label>
              <Input
                id="furniture-room"
                placeholder="Ex: Sala 301, Recepção, Área Comum..."
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Mensagem informativa para Almoxarifado */}
          {isWarehouse && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 text-sm">Estoque Central</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Móveis cadastrados aqui ficam no estoque central e podem ser distribuídos para outras unidades.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="furniture-description">Descrição</Label>
            <Textarea
              id="furniture-description"
              placeholder="Detalhes adicionais sobre o móvel (cor, material, estado...)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="furniture-quantity">Quantidade</Label>
            <Input
              id="furniture-quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              disabled={isLoading}
            />
          </div>

          {/* Foto do Móvel */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Foto do Móvel *
            </Label>
            
            {!photo && !isCapturing && (
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  type="button"
                  onClick={startCamera}
                  variant="outline" 
                  className="h-32 border-2 border-dashed"
                  disabled={isLoading}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-sm text-slate-600">Tirar Foto</span>
                  </div>
                </Button>
                
                <label className="cursor-pointer">
                  <div className="h-32 border-2 border-dashed rounded-md hover:bg-slate-50 transition-colors flex flex-col items-center justify-center gap-2">
                    <Package className="w-8 h-8 text-slate-400" />
                    <span className="text-sm text-slate-600">Fazer Upload</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={isLoading}
                  />
                </label>
              </div>
            )}
            
            {isCapturing && (
              <div className="relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  className="w-full rounded-lg border-2 border-[#3F76FF]"
                />
                <div className="mt-3 flex gap-2">
                  <Button 
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-[#3F76FF] hover:bg-[#3F76FF]/90"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar Foto
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => {
                      if (videoRef.current?.srcObject) {
                        const stream = videoRef.current.srcObject as MediaStream;
                        stream.getTracks().forEach(track => track.stop());
                      }
                      setIsCapturing(false);
                    }}
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {photo && (
              <div className="relative">
                <img 
                  src={photo} 
                  alt="Foto do móvel" 
                  className="w-full rounded-lg border-2 border-green-500"
                />
                <Button
                  type="button"
                  onClick={retakePhoto}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Tirar Nova Foto
                </Button>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#3F76FF] hover:bg-[#3F76FF]/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Armchair className="w-4 h-4 mr-2" />
                  Cadastrar Móvel
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}