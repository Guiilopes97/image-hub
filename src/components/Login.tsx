import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatCPF, isValidCPF } from '../utils/cpf';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCPF(value);
    setCpf(formatted);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidCPF(cpf)) {
      setError('CPF inválido. Por favor, insira um CPF válido.');
      return;
    }

    login(cpf);
    // Redirecionar para o dashboard após login
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-3 sm:px-4 md:px-6 py-6 sm:py-8">
      <div className="bg-gray-800 dark:bg-gray-900 p-4 sm:p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 dark:border-gray-700">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Image Hub</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-400">Gerencie suas imagens de forma segura</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="cpf" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              CPF
            </label>
            <input
              type="text"
              id="cpf"
              value={cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-700 dark:bg-gray-800 text-white placeholder-gray-400 border rounded-lg focus:outline-none focus:ring-2 ${
                error 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 dark:border-gray-700 focus:ring-blue-500'
              } transition-all`}
              autoComplete="off"
            />
            {error && (
              <p className="mt-2 text-xs sm:text-sm text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={cpf.length !== 14}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base"
          >
            Entrar
          </button>
        </form>

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>Use seu CPF para acessar sua área exclusiva</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

