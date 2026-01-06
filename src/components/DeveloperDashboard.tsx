import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { User, UserRole, Unit } from '../types';
import { PlusCircle, Users, Building2, Package, Shield, Trash2, Edit, Upload, X, Image as ImageIcon, List, KeyRound, ShieldAlert, TestTube2 } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { ProductsListPanel } from './ProductsListPanel';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { CreateUserDialog } from './CreateUserDialog';
import { AdminResetPasswordDialog } from './AdminResetPasswordDialog';
import { DeveloperModeSelector } from './DeveloperModeSelector';
import { ControllerDashboard } from './ControllerDashboard';
import { AdminDashboard } from './AdminDashboard';
import { WarehouseDashboard } from './WarehouseDashboard';
import { DriverDashboard } from './DriverDashboard';
import { DesignerDashboard } from './DesignerDashboard';
import { RequesterDashboard } from './RequesterDashboard';
import { TestFlowPanel } from './TestFlowPanel';

export function DeveloperDashboard() {
  const { users, units, categories, items, addUser, updateUser, deleteUser, addItem, updateItem, addUnit, updateUnit, deleteUnit, getCategoryById, currentUser, logout, getWarehouseUnitId } = useApp();
  const [viewAsRole, setViewAsRole] = useState<UserRole | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false);
  const [isEditUnitDialogOpen, setIsEditUnitDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // User form state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'controller' as UserRole,
    primaryUnitId: '',
    additionalUnitIds: [] as string[],
    warehouseType: undefined as 'storage' | 'delivery' | undefined,
    adminType: undefined as 'units' | 'warehouse' | undefined,
    jobTitle: '',
  });

  // Item form state
  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    unitOfMeasure: 'unidade',
    isConsumable: true,
    requiresResponsibilityTerm: false,
    defaultLoanDays: 0,
    defaultMinimumQuantity: 5,
    serialNumber: '',
    imageUrl: '',
    isUniqueProduct: false,
  });

  // Unit form state
  const [unitForm, setUnitForm] = useState({
    name: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
    floors: [] as string[],
  });

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'controller',
      primaryUnitId: '',
      additionalUnitIds: [],
      warehouseType: undefined,
      adminType: undefined,
      jobTitle: '',
    });
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      categoryId: '',
      description: '',
      unitOfMeasure: 'unidade',
      isConsumable: true,
      requiresResponsibilityTerm: false,
      defaultLoanDays: 0,
      defaultMinimumQuantity: 5,
      serialNumber: '',
      imageUrl: '',
      isUniqueProduct: false,
    });
  };

  const resetUnitForm = () => {
    setUnitForm({
      name: '',
      address: '',
      status: 'active',
      floors: [],
    });
  };

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.role || !userForm.password) {
      toast.error('Preencha os campos obrigatórios (nome, email, senha e perfil)');
      return;
    }

    // Designers, Admin e Developer não precisam de primaryUnitId
    if (userForm.role !== 'designer' && userForm.role !== 'admin' && userForm.role !== 'developer' && !userForm.primaryUnitId) {
      toast.error('Selecione a unidade primária');
      return;
    }

    // Admin precisa de adminType
    if (userForm.role === 'admin' && !userForm.adminType) {
      toast.error('Selecione o tipo de administrador');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: userForm.email,
            password: userForm.password,
            name: userForm.name,
            role: userForm.role,
            primaryUnitId: userForm.role === 'designer' || userForm.role === 'admin' || userForm.role === 'developer' ? undefined : userForm.primaryUnitId,
            additionalUnitIds: userForm.role === 'controller' ? userForm.additionalUnitIds : undefined,
            warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : undefined,
            adminType: userForm.role === 'admin' ? userForm.adminType : undefined,
            jobTitle: userForm.jobTitle || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar usuário');
      }

      const data = await response.json();
      
      toast.success(`Usuário ${userForm.name} criado com sucesso!`);
      setIsAddUserDialogOpen(false);
      resetUserForm();
      
      // Recarregar a página para atualizar a lista
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      primaryUnitId: user.primaryUnitId || '',
      additionalUnitIds: user.additionalUnitIds || [],
      warehouseType: user.warehouseType,
      adminType: user.adminType,
      jobTitle: user.jobTitle || '',
    });
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    if (!userForm.name || !userForm.email || !userForm.role) {
      toast.error('Preencha os campos obrigatórios (nome, email e perfil)');
      return;
    }

    // Admin precisa de adminType
    if (userForm.role === 'admin' && !userForm.adminType) {
      toast.error('Selecione o tipo de administrador');
      return;
    }

    // Verificar se está alterando o próprio perfil
    const isEditingSelf = currentUser?.id === selectedUser.id;
    const originalRole = selectedUser.role;
    const newRole = userForm.role;
    const roleChanged = originalRole !== newRole;

    try {
      // Chamar API do backend para atualizar
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            name: userForm.name,
            email: userForm.email,
            role: userForm.role,
            primaryUnitId: userForm.role === 'designer' || userForm.role === 'admin' || userForm.role === 'developer' ? null : userForm.primaryUnitId,
            additionalUnitIds: userForm.role === 'controller' ? userForm.additionalUnitIds : null,
            warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : null,
            adminType: userForm.role === 'admin' ? userForm.adminType : null,
            jobTitle: userForm.jobTitle || null,
            password: userForm.password || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar usuário');
      }

      const updatedUser = await response.json();

      // Atualizar o estado local
      updateUser(selectedUser.id, {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        primaryUnitId: userForm.role === 'designer' || userForm.role === 'admin' || userForm.role === 'developer' ? undefined : userForm.primaryUnitId,
        additionalUnitIds: userForm.role === 'controller' ? userForm.additionalUnitIds : undefined,
        warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : undefined,
        adminType: userForm.role === 'admin' ? userForm.adminType : undefined,
        jobTitle: userForm.jobTitle,
      });

      toast.success('Usuário atualizado com sucesso');
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
      resetUserForm();

      // Se alterou o próprio perfil, fazer logout automático
      if (isEditingSelf && roleChanged) {
        toast.info('Seu perfil foi alterado. Faça login novamente.', { duration: 3000 });
        setTimeout(() => {
          logout();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error(error.message || 'Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      deleteUser(userId);
      toast.success('Usuário excluído com sucesso');
    }
  };

  const handleRequestPasswordChange = (user: User) => {
    if (window.confirm(`Solicitar que ${user.name} altere a senha no próximo login?`)) {
      updateUser(user.id, { requirePasswordChange: true });
      toast.success('Solicitação enviada! O usuário deverá alterar a senha no próximo acesso.');
    }
  };

  const handleAddItem = () => {
    if (!itemForm.name || !itemForm.categoryId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    addItem({
      name: itemForm.name,
      categoryId: itemForm.categoryId,
      description: itemForm.description,
      unitOfMeasure: itemForm.unitOfMeasure,
      isConsumable: itemForm.isConsumable,
      requiresResponsibilityTerm: itemForm.requiresResponsibilityTerm,
      defaultLoanDays: itemForm.defaultLoanDays,
      defaultMinimumQuantity: itemForm.defaultMinimumQuantity,
      serialNumber: itemForm.serialNumber || undefined,
      imageUrl: itemForm.imageUrl || undefined,
      active: true,
    });

    toast.success('Item criado com sucesso');
    setIsAddItemDialogOpen(false);
    resetItemForm();
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      description: item.description,
      unitOfMeasure: item.unitOfMeasure,
      isConsumable: item.isConsumable,
      requiresResponsibilityTerm: item.requiresResponsibilityTerm,
      defaultLoanDays: item.defaultLoanDays,
      defaultMinimumQuantity: item.defaultMinimumQuantity,
      serialNumber: item.serialNumber || '',
      imageUrl: item.imageUrl || '',
      isUniqueProduct: item.isUniqueProduct || false,
    });
    setIsEditItemDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem) return;

    updateItem(selectedItem.id, {
      name: itemForm.name,
      categoryId: itemForm.categoryId,
      description: itemForm.description,
      unitOfMeasure: itemForm.unitOfMeasure,
      isConsumable: itemForm.isConsumable,
      requiresResponsibilityTerm: itemForm.requiresResponsibilityTerm,
      defaultLoanDays: itemForm.defaultLoanDays,
      defaultMinimumQuantity: itemForm.defaultMinimumQuantity,
      serialNumber: itemForm.serialNumber || undefined,
      imageUrl: itemForm.imageUrl || undefined,
      active: true,
    });

    toast.success('Item atualizado com sucesso');
    setIsEditItemDialogOpen(false);
    setSelectedItem(null);
    resetItemForm();
  };

  const handleAddUnit = async () => {
    if (!unitForm.name || !unitForm.address) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      await addUnit({
        name: unitForm.name,
        address: unitForm.address,
        status: unitForm.status,
        floors: unitForm.floors,
      });
      toast.success('Unidade criada com sucesso');
      setIsAddUnitDialogOpen(false);
      resetUnitForm();
    } catch (error) {
      toast.error('Erro ao criar unidade. Verifique o console.');
      console.error('Error creating unit:', error);
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    const floorsArray = Array.isArray(unit.floors) ? unit.floors : [];
    
    setUnitForm({
      name: unit.name,
      address: unit.address,
      status: unit.status,
      floors: floorsArray,
    });
    setIsEditUnitDialogOpen(true);
  };

  const handleUpdateUnit = async () => {
    if (!selectedUnit) return;

    const updates = {
      name: unitForm.name,
      address: unitForm.address,
      status: unitForm.status,
      floors: unitForm.floors,
    };

    try {
      await updateUnit(selectedUnit.id, updates);
      toast.success('Unidade atualizada com sucesso');
      setIsEditUnitDialogOpen(false);
      setSelectedUnit(null);
      resetUnitForm();
    } catch (error) {
      toast.error('Erro ao atualizar unidade. Verifique o console.');
      console.error('Error updating unit:', error);
    }
  };

  const handleDeleteUnit = (unitId: string) => {
    const warehouseId = getWarehouseUnitId();
    if (unitId === warehouseId) {
      toast.error('Não é possível excluir o Almoxarifado Central');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta unidade? Todos os estoques serão removidos.')) {
      deleteUnit(unitId);
      toast.success('Unidade excluída com sucesso');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha no upload da imagem');
      }

      const data = await response.json();
      setItemForm({ ...itemForm, imageUrl: data.url });
      toast.success('Imagem enviada com sucesso');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleInitSchema = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/init-schema`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      toast.success('Schema inicializado! Verifique o console para detalhes.');
      console.log('Schema initialization:', data);
    } catch (error) {
      console.error('Error initializing schema:', error);
      toast.error('Erro ao inicializar schema. Verifique o console.');
    }
  };

  const getRoleName = (role: UserRole) => {
    switch (role) {
      case 'controller': return 'Controlador';
      case 'admin': return 'Administrador';
      case 'warehouse': return 'Almoxarifado';
      case 'designer': return 'Designer';
      case 'developer': return 'Desenvolvedor';
      case 'requester': return 'Solicitante';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: UserRole): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'developer': return 'destructive';
      case 'controller': return 'default';
      case 'warehouse': return 'secondary';
      default: return 'outline';
    }
  };

  // Se está visualizando como outro perfil, renderiza o dashboard correspondente
  if (viewAsRole) {
    switch (viewAsRole) {
      case 'controller':
        return (
          <div className="space-y-4">
            <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
            <ControllerDashboard />
          </div>
        );
      case 'admin':
        return (
          <div className="space-y-4">
            <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
            <AdminDashboard />
          </div>
        );
      case 'warehouse':
        return (
          <div className="space-y-4">
            <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
            <WarehouseDashboard />
          </div>
        );
      case 'driver':
        return (
          <div className="space-y-4">
            <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
            <DriverDashboard />
          </div>
        );
      case 'designer':
        return (
          <div className="space-y-4">
            <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
            <DesignerDashboard />
          </div>
        );
      case 'requester':
        return (
          <div className="space-y-4">
            <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
            <RequesterDashboard />
          </div>
        );
      default:
        break;
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground">Painel do Desenvolvedor</h1>
          <p className="text-muted-foreground text-sm">Gestão de usuários, unidades e produtos do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="grid w-full min-w-[650px] sm:min-w-0 max-w-4xl grid-cols-6">
            <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Usuários</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Unidades</span>
              <span className="sm:hidden">Units</span>
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Criar Produto</span>
              <span className="md:hidden">Criar</span>
            </TabsTrigger>
            <TabsTrigger value="products-list" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <List className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Ver Produtos</span>
              <span className="md:hidden">Ver</span>
            </TabsTrigger>
            <TabsTrigger value="test-flow" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <TestTube2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Testar Fluxo</span>
              <span className="md:hidden">Test</span>
            </TabsTrigger>
            <TabsTrigger value="migration" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <ShieldAlert className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Migração</span>
              <span className="sm:hidden">Migr</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB: Gestão de Usuários */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Gestão de Usuários</CardTitle>
                  <CardDescription>Crie, edite ou remova usuários do sistema</CardDescription>
                </div>
                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 w-full sm:w-auto">
                      <PlusCircle className="w-4 h-4" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Usuário</DialogTitle>
                      <DialogDescription>Preencha os dados do novo usuário. A senha será enviada por email.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome *</Label>
                          <Input
                            id="name"
                            value={userForm.name}
                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jobTitle">Cargo</Label>
                          <Input
                            id="jobTitle"
                            value={userForm.jobTitle}
                            onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
                            placeholder="Ex: Gerente de Operações"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            placeholder="email@gowork.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Senha *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder="Mínimo 6 caracteres"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="role">Perfil *</Label>
                          <Select
                            value={userForm.role}
                            onValueChange={(value) => setUserForm({ ...userForm, role: value as UserRole })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="controller">Controlador</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="warehouse">Almoxarifado</SelectItem>
                              <SelectItem value="designer">Designer</SelectItem>
                              <SelectItem value="developer">Desenvolvedor</SelectItem>
                              <SelectItem value="requester">Solicitante</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {userForm.role !== 'designer' && userForm.role !== 'admin' && userForm.role !== 'developer' && (
                          <div className="space-y-2">
                            <Label htmlFor="primaryUnit">Unidade Primária *</Label>
                            <Select
                              value={userForm.primaryUnitId}
                              onValueChange={(value) => setUserForm({ ...userForm, primaryUnitId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {/* Unidades Adicionais para Controladores */}
                      {userForm.role === 'controller' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Unidades Adicionais ({userForm.additionalUnitIds.length} selecionadas)</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const allUnitIds = units.filter(u => u.id !== userForm.primaryUnitId).map(u => u.id);
                                  setUserForm({ ...userForm, additionalUnitIds: allUnitIds });
                                }}
                              >
                                Selecionar Todas
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setUserForm({ ...userForm, additionalUnitIds: [] });
                                }}
                              >
                                Limpar
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-slate-50 max-h-[200px] overflow-y-auto">
                            {units.filter(u => u.id !== userForm.primaryUnitId).map((unit) => (
                              <div key={unit.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`add-unit-${unit.id}`}
                                  checked={userForm.additionalUnitIds.includes(unit.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setUserForm({
                                        ...userForm,
                                        additionalUnitIds: [...userForm.additionalUnitIds, unit.id]
                                      });
                                    } else {
                                      setUserForm({
                                        ...userForm,
                                        additionalUnitIds: userForm.additionalUnitIds.filter(id => id !== unit.id)
                                      });
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`add-unit-${unit.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {unit.name}
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500">
                            💡 O controlador poderá alternar entre a unidade primária e as unidades adicionais
                          </p>
                        </div>
                      )}
                      
                      {userForm.role === 'warehouse' && (
                        <div className="space-y-2">
                          <Label htmlFor="warehouseType">Tipo de Almoxarifado</Label>
                          <Select
                            value={userForm.warehouseType}
                            onValueChange={(value) => setUserForm({ ...userForm, warehouseType: value as 'storage' | 'delivery' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="storage">Estoque</SelectItem>
                              <SelectItem value="delivery">Motorista/Entrega</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {userForm.role === 'admin' && (
                        <div className="space-y-2">
                          <Label htmlFor="adminType">Tipo de Administrador *</Label>
                          <Select
                            value={userForm.adminType}
                            onValueChange={(value) => setUserForm({ ...userForm, adminType: value as 'units' | 'warehouse' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de admin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="units">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">Admin Controlador</span>
                                  <span className="text-xs text-slate-500">Gestão de estoque e materiais</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="warehouse">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">Admin Designer</span>
                                  <span className="text-xs text-slate-500">Gestão de móveis e design</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-slate-500">
                            💡 Admin Controlador pode visualizar como Controlador. Admin Designer pode visualizar como Designer.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddUser}>Criar Usuário</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleName(user.role)}
                          </Badge>
                          {user.role === 'admin' && user.adminType && (
                            <span className="text-xs text-slate-500">
                              {user.adminType === 'units' ? '📊 Controlador' : '🎨 Designer'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.primaryUnitId ? (
                          <div className="flex flex-col gap-1">
                            <span>{units.find(u => u.id === user.primaryUnitId)?.name}</span>
                            {user.additionalUnitIds && user.additionalUnitIds.length > 0 && (
                              <span className="text-xs text-slate-500">
                                +{user.additionalUnitIds.length} adicional{user.additionalUnitIds.length > 1 ? 'is' : ''}
                              </span>
                            )}
                          </div>
                        ) : 'Volante'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            title="Editar usuário"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsResetPasswordDialogOpen(true);
                            }}
                            title="Redefinir senha"
                          >
                            <KeyRound className="w-4 h-4 text-[#3F76FF]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRequestPasswordChange(user)}
                            title="Solicitar troca de senha no próximo login"
                          >
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Gestão de Produtos */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Gestão de Produtos</CardTitle>
                  <CardDescription>Adicione novos itens ao sistema</CardDescription>
                </div>
                <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 w-full sm:w-auto">
                      <PlusCircle className="w-4 h-4" />
                      Novo Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Produto</DialogTitle>
                      <DialogDescription>O produto será criado em todas as unidades com estoque zerado</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="itemName">Nome do Produto *</Label>
                          <Input
                            id="itemName"
                            value={itemForm.name}
                            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                            placeholder="Ex: Cabo HDMI 2m"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Categoria *</Label>
                          <Select
                            value={itemForm.categoryId}
                            onValueChange={(value) => setItemForm({ ...itemForm, categoryId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                          id="description"
                          value={itemForm.description}
                          onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                          placeholder="Descrição detalhada do produto"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="unitOfMeasure">Unidade de Medida</Label>
                          <Input
                            id="unitOfMeasure"
                            value={itemForm.unitOfMeasure}
                            onChange={(e) => setItemForm({ ...itemForm, unitOfMeasure: e.target.value })}
                            placeholder="Ex: unidade, par, caixa"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="serialNumber">Número de Série</Label>
                          <Input
                            id="serialNumber"
                            value={itemForm.serialNumber}
                            onChange={(e) => setItemForm({ ...itemForm, serialNumber: e.target.value })}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="defaultMinQuantity">Estoque Mínimo</Label>
                          <Input
                            id="defaultMinQuantity"
                            type="number"
                            value={itemForm.defaultMinimumQuantity}
                            onChange={(e) => setItemForm({ ...itemForm, defaultMinimumQuantity: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="defaultLoanDays">Dias de Empréstimo Padrão</Label>
                          <Input
                            id="defaultLoanDays"
                            type="number"
                            value={itemForm.defaultLoanDays}
                            onChange={(e) => setItemForm({ ...itemForm, defaultLoanDays: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="imageUpload">Imagem do Produto</Label>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              id="imageUpload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={isUploadingImage}
                              className="cursor-pointer"
                            />
                            {isUploadingImage && (
                              <span className="text-sm text-muted-foreground">Enviando...</span>
                            )}
                          </div>
                          {itemForm.imageUrl && (
                            <div className="flex items-center gap-2 p-2 border rounded bg-slate-50">
                              <ImageWithFallback 
                                src={itemForm.imageUrl} 
                                alt="Preview" 
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1 text-sm text-muted-foreground truncate">
                                {itemForm.imageUrl}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemForm({ ...itemForm, imageUrl: '' })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isConsumable"
                            checked={itemForm.isConsumable}
                            onChange={(e) => setItemForm({ ...itemForm, isConsumable: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="isConsumable" className="cursor-pointer">É consumível?</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="requiresResponsibilityTerm"
                            checked={itemForm.requiresResponsibilityTerm}
                            onChange={(e) => setItemForm({ ...itemForm, requiresResponsibilityTerm: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="requiresResponsibilityTerm" className="cursor-pointer">Requer termo de responsabilidade?</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isUniqueProduct"
                            checked={itemForm.isUniqueProduct || false}
                            onChange={(e) => setItemForm({ ...itemForm, isUniqueProduct: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="isUniqueProduct" className="cursor-pointer">Produto Único (requer ID individual)?</Label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddItem}>Criar Produto</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estoque Mín.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum produto cadastrado. Use o botão acima para adicionar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.id.replace('item-', '')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.imageUrl && (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span>{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {categories.find(c => c.id === item.categoryId)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.isFurniture && (
                              <Badge variant="outline" className="text-xs">Móvel</Badge>
                            )}
                            {item.isConsumable && (
                              <Badge variant="secondary" className="text-xs">Consumível</Badge>
                            )}
                            {!item.isFurniture && !item.isConsumable && (
                              <Badge variant="default" className="text-xs">Material</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.defaultMinimumQuantity || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Gestão de Unidades */}
        <TabsContent value="units" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Gestão de Unidades</CardTitle>
                  <CardDescription>Crie, edite ou remova unidades do sistema</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleInitSchema}
                    className="gap-2 w-full sm:w-auto"
                  >
                    🔧 Atualizar Schema DB
                  </Button>
                  <Dialog open={isAddUnitDialogOpen} onOpenChange={setIsAddUnitDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 w-full sm:w-auto">
                        <PlusCircle className="w-4 h-4" />
                        Nova Unidade
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Criar Nova Unidade</DialogTitle>
                      <DialogDescription>Preencha os dados da nova unidade</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="unitName">Nome da Unidade *</Label>
                        <Input
                          id="unitName"
                          value={unitForm.name}
                          onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                          placeholder="Ex: Paulista 500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitAddress">Endereço *</Label>
                        <Input
                          id="unitAddress"
                          value={unitForm.address}
                          onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })}
                          placeholder="Ex: Av. Paulista, 500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitStatus">Status</Label>
                        <Select
                          value={unitForm.status}
                          onValueChange={(value) => setUnitForm({ ...unitForm, status: value as 'active' | 'inactive' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativa</SelectItem>
                            <SelectItem value="inactive">Inativa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Gestão de Andares */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Andares Disponíveis ({unitForm.floors.length} selecionados)</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const allFloors = ['3º Subsolo', '2º Subsolo', '1º Subsolo', 'Térreo', '1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar', '14º Andar', '15º Andar', '16º Andar', '17º Andar', '18º Andar', '19º Andar', '20º Andar', '21º Andar', '22º Andar', '23º Andar', '24º Andar', '25º Andar', '26º Andar', '27º Andar', '28º Andar', '29º Andar', 'Cobertura'];
                                setUnitForm({ ...unitForm, floors: allFloors });
                              }}
                            >
                              Selecionar Todos
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUnitForm({ ...unitForm, floors: [] });
                              }}
                            >
                              Limpar
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-lg bg-slate-50 max-h-[300px] overflow-y-auto">
                          {['3º Subsolo', '2º Subsolo', '1º Subsolo', 'Térreo', '1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar', '14º Andar', '15º Andar', '16º Andar', '17º Andar', '18º Andar', '19º Andar', '20º Andar', '21º Andar', '22º Andar', '23º Andar', '24º Andar', '25º Andar', '26º Andar', '27º Andar', '28º Andar', '29º Andar', 'Cobertura'].map((floor) => {
                            const isChecked = Array.isArray(unitForm.floors) && unitForm.floors.includes(floor);
                            return (
                            <div key={floor} className="flex items-center space-x-2">
                              <Checkbox
                                id={`add-floor-${floor}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const order = ['3º Subsolo', '2º Subsolo', '1º Subsolo', 'Térreo', '1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar', '14º Andar', '15º Andar', '16º Andar', '17º Andar', '18º Andar', '19º Andar', '20º Andar', '21º Andar', '22º Andar', '23º Andar', '24º Andar', '25º Andar', '26º Andar', '27º Andar', '28º Andar', '29º Andar', 'Cobertura'];
                                    setUnitForm({
                                      ...unitForm,
                                      floors: [...unitForm.floors, floor].sort((a, b) => order.indexOf(a) - order.indexOf(b))
                                    });
                                  } else {
                                    setUnitForm({
                                      ...unitForm,
                                      floors: unitForm.floors.filter((f) => f !== floor)
                                    });
                                  }
                                }}
                              />
                              <label
                                htmlFor={`add-floor-${floor}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {floor}
                              </label>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddUnitDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddUnit}>Criar Unidade</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>{unit.name}</TableCell>
                      <TableCell className="text-muted-foreground">{unit.address}</TableCell>
                      <TableCell>
                        <Badge variant={unit.status === 'active' ? 'default' : 'secondary'}>
                          {unit.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUnit(unit)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {unit.id !== getWarehouseUnitId() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUnit(unit.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Ver Produtos */}
        <TabsContent value="products-list" className="space-y-4">
          <ProductsListPanel />
        </TabsContent>

        {/* TAB: Ver Produtos */}
        <TabsContent value="products-list" className="space-y-4">
          <ProductsListPanel />
        </TabsContent>

        {/* TAB: Testar Fluxo */}
        <TabsContent value="test-flow" className="space-y-4">
          <TestFlowPanel />
        </TabsContent>

        {/* TAB: Migração de Dados */}
        <TabsContent value="migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Migração de Unit Stocks
              </CardTitle>
              <CardDescription>
                Corrige registros de unit_stocks que usam ID hardcoded 'unit-warehouse' para o UUID correto do banco
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-sm">
                  <strong>⚠️ Atenção:</strong> Esta operação irá atualizar todos os registros de unit_stocks que possuem unit_id = 'unit-warehouse' para o UUID real da unidade "Almoxarifado Central" no banco de dados.
                </p>
              </div>
              
              <Button
                onClick={async () => {
                  try {
                    toast.loading('Executando migração...');
                    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/migrate-unit-stocks`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    const result = await response.json();
                    
                    if (!response.ok) {
                      throw new Error(result.error || 'Erro na migração');
                    }
                    
                    toast.dismiss();
                    toast.success(`Migração concluída! ${result.updated} registros atualizados`);
                    console.log('✅ Resultado da migração:', result);
                  } catch (error) {
                    toast.dismiss();
                    toast.error('Erro ao executar migração');
                    console.error('❌ Erro na migração:', error);
                  }
                }}
                className="w-full"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Executar Migração de Unit Stocks
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Migração de TEXT para UUID
              </CardTitle>
              <CardDescription>
                Converte as colunas id das tabelas units e floors de TEXT para UUID (tipo correto)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm">
                  <strong>⚠️ ATENÇÃO:</strong> Esta migração valida se todos os IDs são UUIDs válidos e fornece o SQL para converter as colunas. Execute o SQL manualmente no Supabase SQL Editor após a validação.
                </p>
              </div>
              
              <Button
                onClick={async () => {
                  try {
                    toast.loading('Validando IDs...');
                    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/migrate-text-to-uuid`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    const result = await response.json();
                    
                    if (!response.ok) {
                      toast.dismiss();
                      if (result.invalidUnits || result.invalidFloors) {
                        toast.error('Existem IDs inválidos! Verifique o console para detalhes.');
                        console.error('❌ IDs inválidos encontrados:');
                        if (result.invalidUnits) console.error('Units:', result.invalidUnits);
                        if (result.invalidFloors) console.error('Floors:', result.invalidFloors);
                      } else {
                        toast.error(result.error || 'Erro na validação');
                      }
                      return;
                    }
                    
                    toast.dismiss();
                    toast.success('Validação concluída! Verifique o console para o SQL de migração.');
                    console.log('✅ Validação concluída!');
                    console.log('📋 Execute o seguinte SQL no Supabase SQL Editor:');
                    console.log(result.sql);
                    console.log('');
                    console.log(`✅ ${result.unitsChecked} units verificadas`);
                    console.log(`✅ ${result.floorsChecked} floors verificadas`);
                  } catch (error) {
                    toast.dismiss();
                    toast.error('Erro ao validar IDs');
                    console.error('❌ Erro na validação:', error);
                  }
                }}
                className="w-full"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Validar IDs e Gerar SQL de Migração
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Adicionar Coluna admin_type
              </CardTitle>
              <CardDescription>
                Adiciona a coluna admin_type à tabela users para diferenciar Admin Controlador e Admin Designer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm">
                  <strong>ℹ️ Informação:</strong> Esta operação adiciona a coluna admin_type (TEXT) à tabela users. Se a coluna já existir, não fará nada.
                </p>
              </div>
              
              <Button
                onClick={async () => {
                  try {
                    toast.loading('Adicionando coluna admin_type...');
                    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/add-admin-type-column`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    const result = await response.json();
                    
                    toast.dismiss();
                    
                    if (result.sql) {
                      toast.info('Execute o SQL manualmente no Supabase SQL Editor');
                      console.log('📋 Execute o seguinte SQL no Supabase SQL Editor:');
                      console.log(result.sql);
                    } else {
                      toast.success('Coluna admin_type adicionada com sucesso!');
                    }
                    
                    console.log('✅ Resultado:', result);
                  } catch (error) {
                    toast.dismiss();
                    toast.error('Erro ao adicionar coluna');
                    console.error('❌ Erro:', error);
                  }
                }}
                className="w-full"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Adicionar Coluna admin_type
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Corrigir Tabelas de Delivery
              </CardTitle>
              <CardDescription>
                Adiciona DEFAULT gen_random_uuid() nas tabelas delivery_batches e delivery_confirmations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm">
                  <strong>⚠️ ERRO IDENTIFICADO:</strong> As colunas <code>id</code> nas tabelas <code>delivery_batches</code> e <code>delivery_confirmations</code> não têm DEFAULT gen_random_uuid(), causando erro "null value in column id violates not-null constraint".
                </p>
              </div>
              
              <Button
                onClick={async () => {
                  try {
                    toast.loading('Gerando SQL de correção...');
                    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/fix-delivery-tables`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    const result = await response.json();
                    
                    toast.dismiss();
                    if (!response.ok) {
                      toast.error(result.error || 'Erro ao gerar SQL');
                      console.error('❌ Erro:', result);
                      return;
                    }
                    
                    toast.success('SQL gerado! Copie do console e execute no Supabase SQL Editor.');
                    console.log('🔧 ========== CORREÇÃO DE TABELAS DE DELIVERY ==========');
                    console.log('');
                    console.log('📋 INSTRUÇÕES:');
                    result.instructions?.forEach((instruction: string, i: number) => {
                      console.log(`   ${i + 1}. ${instruction}`);
                    });
                    console.log('');
                    console.log('📝 SQL PARA EXECUTAR:');
                    console.log('');
                    console.log(result.sqlToExecute);
                    console.log('');
                    console.log('🔧 ========================================');
                  } catch (error) {
                    toast.dismiss();
                    toast.error('Erro ao gerar SQL de correção');
                    console.error('❌ Erro:', error);
                  }
                }}
                className="w-full"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Gerar SQL de Correção para Tabelas de Delivery
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição de Usuário */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize os dados do usuário</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nome *</Label>
                <Input
                  id="editName"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editRole">Perfil *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value) => setUserForm({ ...userForm, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="controller">Controlador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="warehouse">Almoxarifado</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="developer">Desenvolvedor</SelectItem>
                    <SelectItem value="requester">Solicitante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {userForm.role !== 'designer' && userForm.role !== 'admin' && userForm.role !== 'developer' && (
                <div className="space-y-2">
                  <Label htmlFor="editPrimaryUnit">Unidade Primária *</Label>
                  <Select
                    value={userForm.primaryUnitId}
                    onValueChange={(value) => setUserForm({ ...userForm, primaryUnitId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {/* Unidades Adicionais para Controladores */}
            {userForm.role === 'controller' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Unidades Adicionais ({userForm.additionalUnitIds.length} selecionadas)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allUnitIds = units.filter(u => u.id !== userForm.primaryUnitId).map(u => u.id);
                        setUserForm({ ...userForm, additionalUnitIds: allUnitIds });
                      }}
                    >
                      Selecionar Todas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserForm({ ...userForm, additionalUnitIds: [] });
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-slate-50 max-h-[200px] overflow-y-auto">
                  {units.filter(u => u.id !== userForm.primaryUnitId).map((unit) => (
                    <div key={unit.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-unit-${unit.id}`}
                        checked={userForm.additionalUnitIds.includes(unit.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setUserForm({
                              ...userForm,
                              additionalUnitIds: [...userForm.additionalUnitIds, unit.id]
                            });
                          } else {
                            setUserForm({
                              ...userForm,
                              additionalUnitIds: userForm.additionalUnitIds.filter(id => id !== unit.id)
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`edit-unit-${unit.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {unit.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  💡 O controlador poderá alternar entre a unidade primária e as unidades adicionais
                </p>
              </div>
            )}
            
            {userForm.role === 'warehouse' && (
              <div className="space-y-2">
                <Label htmlFor="editWarehouseType">Tipo de Almoxarifado</Label>
                <Select
                  value={userForm.warehouseType}
                  onValueChange={(value) => setUserForm({ ...userForm, warehouseType: value as 'storage' | 'delivery' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="storage">Estoque</SelectItem>
                    <SelectItem value="delivery">Motorista/Entrega</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {userForm.role === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="editAdminType">Tipo de Administrador *</Label>
                <Select
                  value={userForm.adminType}
                  onValueChange={(value) => setUserForm({ ...userForm, adminType: value as 'units' | 'warehouse' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de admin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="units">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Admin Controlador</span>
                        <span className="text-xs text-slate-500">Gestão de estoque e materiais</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="warehouse">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Admin Designer</span>
                        <span className="text-xs text-slate-500">Gestão de móveis e design</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  💡 Admin Controlador pode visualizar como Controlador. Admin Designer pode visualizar como Designer.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Item */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
            <DialogDescription>Atualize os dados do item</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editItemName">Nome do Item *</Label>
                <Input
                  id="editItemName"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategory">Categoria *</Label>
                <Select
                  value={itemForm.categoryId}
                  onValueChange={(value) => setItemForm({ ...itemForm, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Descrição</Label>
              <Input
                id="editDescription"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Descrição detalhada do produto"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editUnitOfMeasure">Unidade de Medida</Label>
                <Input
                  id="editUnitOfMeasure"
                  value={itemForm.unitOfMeasure}
                  onChange={(e) => setItemForm({ ...itemForm, unitOfMeasure: e.target.value })}
                  placeholder="Ex: unidade, par, caixa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSerialNumber">Número de Série</Label>
                <Input
                  id="editSerialNumber"
                  value={itemForm.serialNumber}
                  onChange={(e) => setItemForm({ ...itemForm, serialNumber: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDefaultMinQuantity">Estoque Mínimo</Label>
                <Input
                  id="editDefaultMinQuantity"
                  type="number"
                  value={itemForm.defaultMinimumQuantity}
                  onChange={(e) => setItemForm({ ...itemForm, defaultMinimumQuantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDefaultLoanDays">Dias de Empréstimo Padrão</Label>
                <Input
                  id="editDefaultLoanDays"
                  type="number"
                  value={itemForm.defaultLoanDays}
                  onChange={(e) => setItemForm({ ...itemForm, defaultLoanDays: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editImageUpload">Imagem do Produto</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="editImageUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="cursor-pointer"
                  />
                  {isUploadingImage && (
                    <span className="text-sm text-muted-foreground">Enviando...</span>
                  )}
                </div>
                {itemForm.imageUrl && (
                  <div className="flex items-center gap-2 p-2 border rounded bg-slate-50">
                    <ImageWithFallback 
                      src={itemForm.imageUrl} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 text-sm text-muted-foreground truncate">
                      {itemForm.imageUrl}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setItemForm({ ...itemForm, imageUrl: '' })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsConsumable"
                  checked={itemForm.isConsumable}
                  onChange={(e) => setItemForm({ ...itemForm, isConsumable: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="editIsConsumable" className="cursor-pointer">É consumível?</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editRequiresResponsibilityTerm"
                  checked={itemForm.requiresResponsibilityTerm}
                  onChange={(e) => setItemForm({ ...itemForm, requiresResponsibilityTerm: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="editRequiresResponsibilityTerm" className="cursor-pointer">Requer termo de responsabilidade?</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsUniqueProduct"
                  checked={itemForm.isUniqueProduct || false}
                  onChange={(e) => setItemForm({ ...itemForm, isUniqueProduct: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="editIsUniqueProduct" className="cursor-pointer">Produto Único (requer ID individual)?</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateItem}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Unidade */}
      <Dialog open={isEditUnitDialogOpen} onOpenChange={setIsEditUnitDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
            <DialogDescription>Atualize os dados da unidade</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editUnitName">Nome da Unidade *</Label>
              <Input
                id="editUnitName"
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUnitAddress">Endereço *</Label>
              <Input
                id="editUnitAddress"
                value={unitForm.address}
                onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUnitStatus">Status</Label>
              <Select
                value={unitForm.status}
                onValueChange={(value) => setUnitForm({ ...unitForm, status: value as 'active' | 'inactive' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Gestão de Andares */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Andares Disponíveis ({unitForm.floors.length} selecionados)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allFloors = ['3º Subsolo', '2º Subsolo', '1º Subsolo', 'Térreo', '1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar', '14º Andar', '15º Andar', '16º Andar', '17º Andar', '18º Andar', '19º Andar', '20º Andar', '21º Andar', '22º Andar', '23º Andar', '24º Andar', '25º Andar', '26º Andar', '27º Andar', '28º Andar', '29º Andar', 'Cobertura'];
                      setUnitForm({ ...unitForm, floors: allFloors });
                    }}
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUnitForm({ ...unitForm, floors: [] });
                    }}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg bg-slate-50 max-h-[300px] overflow-y-auto">
                {['3º Subsolo', '2º Subsolo', '1º Subsolo', 'Térreo', '1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar', '14º Andar', '15º Andar', '16º Andar', '17º Andar', '18º Andar', '19º Andar', '20º Andar', '21º Andar', '22º Andar', '23º Andar', '24º Andar', '25º Andar', '26º Andar', '27º Andar', '28º Andar', '29º Andar', 'Cobertura'].map((floor) => {
                  const isChecked = Array.isArray(unitForm.floors) && unitForm.floors.includes(floor);
                  return (
                  <div key={floor} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-floor-${floor}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const order = ['3º Subsolo', '2º Subsolo', '1º Subsolo', 'Térreo', '1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar', '14º Andar', '15º Andar', '16º Andar', '17º Andar', '18º Andar', '19º Andar', '20º Andar', '21º Andar', '22º Andar', '23º Andar', '24º Andar', '25º Andar', '26º Andar', '27º Andar', '28º Andar', '29º Andar', 'Cobertura'];
                          setUnitForm({
                            ...unitForm,
                            floors: [...unitForm.floors, floor].sort((a, b) => order.indexOf(a) - order.indexOf(b))
                          });
                        } else {
                          setUnitForm({
                            ...unitForm,
                            floors: unitForm.floors.filter((f) => f !== floor)
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`edit-floor-${floor}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {floor}
                    </label>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditUnitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUnit}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Redefinir Senha */}
      {selectedUser && (
        <AdminResetPasswordDialog
          open={isResetPasswordDialogOpen}
          onOpenChange={setIsResetPasswordDialogOpen}
          userId={selectedUser.id}
          userName={selectedUser.name}
        />
      )}
    </div>
  );
}