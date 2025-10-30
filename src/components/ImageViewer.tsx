import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getImageLink } from '../services/imageService';
import { supabase } from '../config/supabase';

const ImageViewer: React.FC = () => {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasRequestedRef = useRef(false); // evita requests duplicadas em StrictMode

  useEffect(() => {
    let blobUrl: string | null = null;
    let isMounted = true;

    const loadImage = async () => {
      // Guard contra duplo disparo em StrictMode
      if (hasRequestedRef.current) return;
      hasRequestedRef.current = true;

      if (!uniqueId) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Buscar o link único (agora é async porque consulta tabela Supabase primeiro)
        const imageLink = await getImageLink(uniqueId);
        
        if (!imageLink) {
          setError('Imagem não encontrada');
          setLoading(false);
          return;
        }

        setFilename(imageLink.filename);

        // Usar Edge Function como proxy para não expor nenhum path (incluindo userId)
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
        const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
        const functionUrl = `${supabaseUrl}/functions/v1/image-proxy`;
        
        try {
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`
            },
            body: JSON.stringify({ unique_id: uniqueId })
          });

          if (!response.ok) {
            throw new Error('Imagem não encontrada');
          }

          const blob = await response.blob();
          blobUrl = URL.createObjectURL(blob);
          
          if (isMounted) {
            setImageUrl(blobUrl);
          }
        } catch (proxyError) {
          // Fallback: tentar download direto (para compatibilidade com links antigos)
          const pathIdentifier = imageLink.userId || imageLink.cpf;
          if (!pathIdentifier) {
            throw new Error('Imagem não encontrada');
          }
          
          const imagePath = `${pathIdentifier}/${imageLink.filename}`;
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('images')
            .download(imagePath);
          
          if (downloadError || !fileData) {
            throw new Error('Imagem não encontrada');
          }
          
          blobUrl = URL.createObjectURL(fileData);
          
          if (isMounted) {
            setImageUrl(blobUrl);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Erro ao carregar imagem');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    // Cleanup: revogar URL do blob quando componente desmontar ou uniqueId mudar
    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      // Limpar estado de imagem anterior se mudar o uniqueId
      setImageUrl(null);
      // Permitir nova tentativa quando uniqueId mudar
      hasRequestedRef.current = false;
    };
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

