import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage } from '../services/imageService';

interface ImageUploaderProps {
  onUploadSuccess?: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUploadSuccess }) => {
  const { cpf } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    if (imageFiles.length > 10) {
      alert('Por favor, selecione no máximo 10 imagens por vez.');
      return;
    }

    if (!cpf) {
      alert('Erro: CPF não identificado');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(`Preparando upload de ${imageFiles.length} imagem(ns)...`);
    setUploadPercentage(0);

    try {
      const results: Array<{ url: string; uniqueId: string; filename: string }> = [];
      
      // Fazer upload sequencial para rastrear progresso
      for (let i = 0; i < imageFiles.length; i++) {
        const percentage = Math.round(((i + 1) / imageFiles.length) * 100);
        setUploadPercentage(percentage);
        setUploadProgress(`Enviando imagem ${i + 1} de ${imageFiles.length}...`);
        
        const result = await uploadImage(imageFiles[i], cpf);
        if (result) {
          results.push(result);
        }
      }
      
      if (results.length > 0) {
        setUploadPercentage(100);
        setUploadProgress(`Sucesso! ${results.length} imagem(ns) enviada(s).`);
        // Limpar o input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Chamar callback de sucesso
        setTimeout(() => {
          setIsProcessing(false);
          setUploadProgress('');
          setUploadPercentage(0);
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        }, 1500);
      } else {
        setIsProcessing(false);
        setUploadProgress('');
        setUploadPercentage(0);
        alert('Erro ao fazer upload das imagens. Verifique sua conexão com o Supabase.');
      }
    } catch (error) {
      setIsProcessing(false);
      setUploadProgress('');
      setUploadPercentage(0);
      alert('Erro ao fazer upload. Por favor, tente novamente.');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upload de Imagens</h2>
      
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          
          {isProcessing ? (
            <div className="w-full">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{uploadProgress}</span>
                  <span className="text-sm font-semibold text-blue-600">{uploadPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-gray-700 font-semibold text-lg mb-1">
                  Arraste e solte suas imagens aqui
                </p>
                <p className="text-gray-500 text-sm mb-1">ou clique para selecionar</p>
                <p className="text-gray-400 text-xs mt-2">Máximo de 10 imagens por upload</p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Selecionar Arquivos
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;

