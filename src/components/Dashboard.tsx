import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ImageUploader from './ImageUploader';
import ImageGallery from './ImageGallery';

const Dashboard: React.FC = () => {
  const { formattedCPF, logout } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteKey, setDeleteKey] = useState(0);

  const handleUploadSuccess = () => {
    // Forçar reload da galeria após upload bem-sucedido
    setReloadKey(prev => prev + 1);
  };

  const handleDeleteSuccess = () => {
    // Forçar atualização das informações de uso no ImageUploader
    // Forçando um re-render do componente para atualizar
    setDeleteKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-900 shadow-md border-b border-gray-700 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 py-3 sm:py-4">
            <div className="flex flex-row items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white whitespace-nowrap">Image Hub</h1>
              <span className="hidden sm:inline text-gray-500">|</span>
              <span className="text-xs sm:text-sm md:text-base text-gray-300 truncate">CPF: {formattedCPF}</span>
            </div>
            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-xs sm:text-sm md:text-base whitespace-nowrap flex-shrink-0"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          <ImageUploader onUploadSuccess={handleUploadSuccess} deleteTrigger={deleteKey} />
          <ImageGallery key={reloadKey} onDeleteSuccess={handleDeleteSuccess} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

