import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatCPF, cleanCPF } from '../utils/cpf';
import { getUserIdentifier } from '../utils/userMapping';
import { supabase } from '../config/supabase';

interface AuthContextType {
  cpf: string | null;
  formattedCPF: string | null;
  userId: string | null;  // User ID (não é CPF)
  login: (cpf: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cpf, setCpf] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verifica se há dados salvos no localStorage ao carregar a aplicação
    const savedCpf = localStorage.getItem('imageHubCpf');
    const savedUserId = localStorage.getItem('imageHubUserId');
    
    if (savedCpf && savedUserId) {
      setCpf(savedCpf);
      setUserId(savedUserId);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (cpfInput: string): Promise<void> => {
    try {
      const cleanedCPF = cleanCPF(cpfInput);
      const { cpfHash } = getUserIdentifier(cleanedCPF);

      // Autenticar via Edge Function (envia apenas hash, nunca CPF)
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
      const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/auth-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ cpf_hash: cpfHash })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao fazer login');
      }

      const { user_id } = await response.json();

      if (!user_id) {
        throw new Error('Resposta inválida do servidor');
      }

      // Armazenar dados localmente
      setCpf(cleanedCPF);
      setUserId(user_id);
      localStorage.setItem('imageHubCpf', cleanedCPF);
      localStorage.setItem('imageHubUserId', user_id);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = () => {
    setCpf(null);
    setUserId(null);
    localStorage.removeItem('imageHubCpf');
    localStorage.removeItem('imageHubUserId');
  };

  const formattedCPF = cpf ? formatCPF(cpf) : null;
  const isAuthenticated = cpf !== null && userId !== null;

  // Não renderizar enquanto estiver carregando dados iniciais
  if (isLoading) {
    return null; // Ou um componente de loading
  }

  return (
    <AuthContext.Provider value={{ cpf, formattedCPF, userId, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

