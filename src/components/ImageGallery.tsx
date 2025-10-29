import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listUserImages, deleteImage } from '../services/imageService';

interface ImageInfo {
  url: string;
  filename: string;
  uniqueId: string;
  projectUrl: string;
}

const ImageGallery: React.FC = () => {
  const { cpf } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const loadImages = async () => {
    if (!cpf) return;
    
    setLoading(true);
    setFailedImages(new Set()); // Resetar imagens com falha
    try {
      const imageUrls = await listUserImages(cpf);
      console.log('URLs carregadas:', imageUrls);
      
      const imageData: ImageInfo[] = imageUrls.map(img => {
        const projectUrl = `${window.location.origin}/image/${img.uniqueId}`;
        return { 
          url: img.url, 
          filename: img.filename, 
          uniqueId: img.uniqueId,
          projectUrl 
        };
      });
      
      setImages(imageData);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [cpf]);

  const handleDelete = async (index: number, filename: string) => {
    if (!cpf || !window.confirm('Tem certeza que deseja excluir esta imagem?')) {
      return;
    }
    
    setDeletingId(index);
    try {
      const success = await deleteImage(cpf, filename);
      if (success) {
        setImages(images.filter((_, i) => i !== index));
      } else {
        alert('Erro ao excluir imagem');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir imagem');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (projectUrl: string, index: number) => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      alert('Erro ao copiar link');
    }
  };

  const handleOpenInNewTab = (projectUrl: string) => {
    window.open(projectUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Galeria de Imagens</h2>
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Galeria de Imagens</h2>
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg font-medium">Nenhuma imagem enviada</p>
            <p className="text-gray-500 text-sm mt-2">Faça upload de suas imagens para começar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Galeria de Imagens</h2>
        <button onClick={loadImages} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
          Atualizar
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((imageData, index) => (
          <div key={index} className="relative group">
            {failedImages.has(index) ? (
              <div className="w-full h-48 bg-gray-200 rounded-lg shadow-md flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs">Erro ao carregar</p>
                </div>
              </div>
            ) : (
              <img
                src={imageData.url}
                alt={imageData.filename}
                className="w-full h-48 object-cover rounded-lg shadow-md cursor-pointer transition-transform duration-200 group-hover:scale-105"
                onClick={() => handleOpenInNewTab(imageData.projectUrl)}
                onError={(e) => {
                  console.error('Erro ao carregar imagem:', imageData.url);
                  console.error('Filename:', imageData.filename);
                  setFailedImages(prev => new Set(prev).add(index));
                }}
                onLoad={() => {
                  console.log('Imagem carregada com sucesso:', imageData.filename);
                }}
                loading="lazy"
              />
            )}
            
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink(imageData.projectUrl, index);
                }}
                className={`p-2 rounded-full transition-colors ${copiedIndex === index ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                title="Copiar link"
              >
                {copiedIndex === index ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenInNewTab(imageData.projectUrl);
                }}
                className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                title="Abrir em nova guia"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(index, imageData.filename);
                }}
                disabled={deletingId === index}
                className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                title="Excluir"
              >
                {deletingId === index ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>

            {copiedIndex === index && (
              <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                Link copiado!
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;

