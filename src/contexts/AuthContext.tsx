import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatCPF, cleanCPF } from '../utils/cpf';

interface AuthContextType {
  cpf: string | null;
  formattedCPF: string | null;
  login: (cpf: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cpf, setCpf] = useState<string | null>(null);

  useEffect(() => {
    // Verifica se há CPF salvo no localStorage ao carregar a aplicação
    const savedCpf = localStorage.getItem('imageHubCpf');
    if (savedCpf) {
      setCpf(savedCpf);
    }
  }, []);

  const login = (cpfInput: string) => {
    const cleanedCPF = cleanCPF(cpfInput);
    setCpf(cleanedCPF);
    localStorage.setItem('imageHubCpf', cleanedCPF);
  };

  const logout = () => {
    setCpf(null);
    localStorage.removeItem('imageHubCpf');
  };

  const formattedCPF = cpf ? formatCPF(cpf) : null;
  const isAuthenticated = cpf !== null;

  return (
    <AuthContext.Provider value={{ cpf, formattedCPF, login, logout, isAuthenticated }}>
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

