import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getImageLink } from '../services/imageService';

const ImageViewer: React.FC = () => {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (!uniqueId) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Buscar o link único
        const imageLink = getImageLink(uniqueId);
        
        if (!imageLink) {
          setError('Imagem não encontrada');
          setLoading(false);
          return;
        }

        setFilename(imageLink.filename);

        // Construir URL da imagem no Supabase
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
        const bucket = 'images';
        const imagePath = `${imageLink.cpf}/${imageLink.filename}`;
        const fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${imagePath}`;
        
        setImageUrl(fullUrl);
        
        // Verificar se a imagem existe
        const response = await fetch(fullUrl, { method: 'HEAD' });
        if (!response.ok) {
          setError('Imagem não encontrada');
        }
      } catch (err) {
        setError('Erro ao carregar imagem');
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [uniqueId]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
        </div>
      ) : error ? (
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-2">{error}</h2>
          <p className="text-gray-300 mb-6">A imagem solicitada não foi encontrada.</p>
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Voltar para Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Ir para Login
            </button>
          )}
        </div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={filename}
          className="max-w-full max-h-screen object-contain"
        />
      ) : null}
    </div>
  );
};

export default ImageViewer;

