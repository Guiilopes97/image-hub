import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ImageUploader from './ImageUploader';
import ImageGallery from './ImageGallery';

const Dashboard: React.FC = () => {
  const { formattedCPF, logout } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);

  const handleUploadSuccess = () => {
    // Forçar reload da galeria após upload bem-sucedido
    setReloadKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Image Hub</h1>
              <span className="hidden sm:inline text-gray-600">|</span>
              <span className="text-sm sm:text-base text-gray-700">CPF: {formattedCPF}</span>
            </div>
            <button
              onClick={logout}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          <ImageUploader onUploadSuccess={handleUploadSuccess} />
          <ImageGallery key={reloadKey} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

