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
import { Search } from 'lucide-react';

interface AddFurnitureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFurnitureDialog({ open, onOpenChange }: AddFurnitureDialogProps) {
  const { currentUnit, currentUser, addItemWithStock, units, categories, getWarehouseUnitId, items } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedExistingItem, setSelectedExistingItem] = useState<string>('');
  const [useExistingItem, setUseExistingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Filtrar apenas itens de móveis ativos
  const furnitureItems = items.filter(item => item.isFurniture && item.active);

  // Filtrar itens com base na pesquisa
  const filteredFurnitureItems = furnitureItems.filter(item => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search)
    );
  });

  // Auto-preencher quando seleciona item existente
  useEffect(() => {
    if (selectedExistingItem && useExistingItem) {
      const selectedItem = items.find(item => item.id === selectedExistingItem);
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          name: selectedItem.name,
          description: selectedItem.description || '',
        }));
        if (selectedItem.imageUrl) {
          setPhoto(selectedItem.imageUrl);
        }
      }
    }
  }, [selectedExistingItem, useExistingItem, items]);

  // Cleanup camera when dialog closes
  useEffect(() => {
    if (!open) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCapturing(false);
      setPhoto(null);
      setSelectedExistingItem('');
      setUseExistingItem(false);
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
      const itemId = await addItemWithStock(
        newItem, 
        targetUnit.id, 
        formData.quantity, 
        locationString
      );
      
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
          {/* Seletor de Item Existente */}
          {furnitureItems.length > 0 && (
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-blue-900">
                  <Package className="w-4 h-4" />
                  Usar Item Já Cadastrado
                </Label>
                <Button
                  type="button"
                  variant={useExistingItem ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUseExistingItem(!useExistingItem);
                    if (!useExistingItem) {
                      setSelectedExistingItem('');
                      setFormData(prev => ({
                        ...prev,
                        name: '',
                        description: '',
                      }));
                      setPhoto(null);
                    }
                  }}
                  className="h-8"
                >
                  {useExistingItem ? 'Criar Novo' : 'Usar Existente'}
                </Button>
              </div>
              
              {useExistingItem && (
                <div className="space-y-2">
                  {/* Campo de Busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por nome ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-white"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <Select
                    value={selectedExistingItem}
                    onValueChange={setSelectedExistingItem}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={filteredFurnitureItems.length === 0 ? "Nenhum móvel encontrado" : "Selecione um móvel cadastrado"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {filteredFurnitureItems.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhum móvel encontrado</p>
                          {searchTerm && (
                            <p className="text-xs mt-1">Tente buscar por outro termo</p>
                          )}
                        </div>
                      ) : (
                        filteredFurnitureItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center gap-2">
                              <Armchair className="w-4 h-4 text-muted-foreground" />
                              <span>{item.name}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground">- {item.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {searchTerm && filteredFurnitureItems.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {filteredFurnitureItems.length} móvel(is) encontrado(s)
                    </p>
                  )}
                  
                  {selectedExistingItem && (
                    <p className="text-xs text-blue-700">
                      ✓ Nome e descrição serão preenchidos automaticamente. Você pode editá-los se necessário.
                    </p>
                  )}
                </div>
              )}
              
              {!useExistingItem && (
                <p className="text-xs text-blue-700">
                  💡 Evite duplicatas: Verifique se o móvel já está cadastrado antes de criar um novo.
                </p>
              )}
            </div>
          )}

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
              disabled={isLoading || (useExistingItem && !!selectedExistingItem)}
              autoFocus={!useExistingItem}
            />
            {useExistingItem && selectedExistingItem && (
              <p className="text-xs text-muted-foreground">
                Nome herdado do item selecionado. Desative "Usar Existente" para editar.
              </p>
            )}
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
                    <SelectItem value="no-floors-configured" disabled>
                      Nenhum andar configurado
                    </SelectItem>
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