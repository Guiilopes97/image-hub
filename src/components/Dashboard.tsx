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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">Image Hub</h1>
              <span className="text-gray-600">|</span>
              <span className="text-gray-700">CPF: {formattedCPF}</span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <ImageUploader onUploadSuccess={handleUploadSuccess} />
          <ImageGallery key={reloadKey} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

