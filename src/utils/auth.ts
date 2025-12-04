import { projectId, publicAnonKey } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-46b247d8`;

interface SignInParams {
  email: string;
  password: string;
}

interface SignUpParams extends SignInParams {
  name: string;
  role: string;
  primaryUnitId?: string;
  warehouseType?: string;
}

export const authService = {
  async signIn({ email, password }: SignInParams) {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro de autenticação:', error);
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const data = await response.json();
    
    console.log('🔑 authService.signIn - Response data:', data);
    console.log('🔑 authService.signIn - Session:', data.session);
    console.log('🔑 authService.signIn - Access Token:', data.session?.access_token);
    
    // Store token and user in localStorage
    if (data.session?.access_token) {
      localStorage.setItem('gowork_auth_token', data.session.access_token);
      console.log('✅ Token salvo no localStorage:', data.session.access_token.substring(0, 20) + '...');
    } else {
      console.error('❌ Token NÃO encontrado na resposta do servidor!');
    }
    
    if (data.user) {
      localStorage.setItem('gowork_current_user', JSON.stringify(data.user));
      console.log('✅ Usuário salvo no localStorage:', data.user.name);
    } else {
      console.error('❌ Dados de usuário NÃO encontrados na resposta!');
    }

    return data;
  },

  async signUp(params: SignUpParams) {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sign up');
    }

    const data = await response.json();
    return data;
  },

  async signOut() {
    const token = localStorage.getItem('gowork_auth_token');
    
    if (token) {
      try {
        await fetch(`${API_URL}/auth/signout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }

    // Clear local storage
    localStorage.removeItem('gowork_auth_token');
    localStorage.removeItem('gowork_current_user');
  },

  async getSession() {
    const token = localStorage.getItem('gowork_auth_token');
    
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token invalid, clear it
        this.signOut();
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting session:', error);
      this.signOut();
      return null;
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('gowork_current_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  async updatePassword(userId: string, newPassword: string) {
    const response = await fetch(`${API_URL}/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ userId, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar senha');
    }

    const data = await response.json();
    return data;
  },
};