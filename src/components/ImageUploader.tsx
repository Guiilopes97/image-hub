import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage, canUploadImages, getUserImagesInfo } from '../services/imageService';

interface ImageUploaderProps {
  onUploadSuccess?: () => void;
  deleteTrigger?: number; // Quando muda, indica que houve exclusão
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUploadSuccess, deleteTrigger }) => {
  const { cpf } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);
  const [usageInfo, setUsageInfo] = useState<{ images: number; storageMB: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para recarregar informações de uso
  const refreshUsageInfo = useCallback(async () => {
    if (!cpf) return;
    
    try {
      // Usar função combinada para fazer apenas uma requisição
      const info = await getUserImagesInfo(cpf);
      setUsageInfo({
        images: info.count,
        storageMB: info.storage.usedMB
      });
    } catch (error) {
      // Erro silencioso
    }
  }, [cpf]);

  // Carregar informações de uso quando o componente monta ou quando CPF muda
  useEffect(() => {
    refreshUsageInfo();
  }, [refreshUsageInfo]);

  // Recarregar informações quando há exclusão (detectado via deleteTrigger)
  useEffect(() => {
    if (deleteTrigger !== undefined && deleteTrigger > 0) {
      refreshUsageInfo();
    }
  }, [deleteTrigger, refreshUsageInfo]);

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

    // Mostrar progresso desde o início (verificação de limites)
    setIsProcessing(true);
    setUploadProgress(`Comprimindo e verificando ${imageFiles.length} imagem(ns)...`);
    setUploadPercentage(5);

    // Verificar limites ANTES de começar o upload
    let limitCheck;
    try {
      limitCheck = await canUploadImages(cpf, imageFiles);
      if (!limitCheck.canUpload) {
        setIsProcessing(false);
        setUploadProgress('');
        setUploadPercentage(0);
        alert(limitCheck.message || 'Limite atingido. Por favor, exclua algumas imagens antes de fazer novo upload.');
        return;
      }
    } catch (error: any) {
      setIsProcessing(false);
      setUploadProgress('');
      setUploadPercentage(0);
      console.error('Erro ao verificar limites:', error);
      alert(error.message || 'Erro ao verificar limites. Por favor, tente novamente.');
      return;
    }

    // Atualizar progresso após verificação bem-sucedida
    setUploadProgress(`Enviando ${imageFiles.length} imagem(ns) em paralelo...`);
    setUploadPercentage(10);

    try {
      const results: Array<{ url: string; uniqueId: string; filename: string }> = [];
      let failedCount = 0;
      let failedMessages: string[] = [];
      
      // Criar todas as promessas de upload em paralelo
      // (uploadImage já faz compressão internamente)
      const uploadPromises = imageFiles.map(async (file, index) => {
        try {
          // Verificar limites desabilitado pois já foi verificado antes
          const result = await uploadImage(file, cpf, false);
          if (result) {
            return { success: true, result, index, fileName: file.name };
          } else {
            return { success: false, error: 'Falha no upload', index, fileName: file.name };
          }
        } catch (error: any) {
          return { success: false, error: error.message || 'Erro desconhecido', index, fileName: file.name };
        }
      });

      // Aguardar todos os uploads com atualização de progresso em tempo real
      let completedCount = 0;
      const updateProgress = () => {
        completedCount++;
        // Atualizar progresso conforme cada upload completa (10% a 95%)
        const progress = 10 + Math.round((completedCount / imageFiles.length) * 85);
        setUploadPercentage(progress);
        setUploadProgress(`Enviando... ${completedCount}/${imageFiles.length} completado(s)`);
      };
      
      const uploadResults = await Promise.all(
        uploadPromises.map(promise => 
          promise.then(result => {
            updateProgress();
            return result;
          })
        )
      );

      // Processar resultados
      for (const uploadResult of uploadResults) {
        if (uploadResult.success && uploadResult.result) {
          results.push(uploadResult.result);
        } else {
          failedCount++;
          const fileName = uploadResult.fileName || `Imagem ${uploadResult.index + 1}`;
          failedMessages.push(`${fileName}: ${uploadResult.error || 'Erro desconhecido'}`);
        }
      }
      
      if (results.length > 0) {
        setUploadPercentage(100);
        let successMessage = `Sucesso! ${results.length} imagem(ns) enviada(s).`;
        if (failedCount > 0) {
          successMessage += ` ${failedCount} imagem(ns) não foi(foram) enviada(s) devido a limites ou erros.`;
          if (failedMessages.length > 0) {
            successMessage += `\n\nDetalhes: ${failedMessages[0]}`;
          }
        }
        setUploadProgress(successMessage);
        
        // Atualizar informações de uso
        await refreshUsageInfo();
        
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
        if (failedMessages.length > 0) {
          alert(`Erro ao fazer upload:\n${failedMessages.join('\n')}`);
        } else {
          alert('Erro ao fazer upload das imagens. Verifique sua conexão com o Supabase.');
        }
      }
    } catch (error: any) {
      setIsProcessing(false);
      setUploadProgress('');
      setUploadPercentage(0);
      alert(error.message || 'Erro ao fazer upload. Por favor, tente novamente.');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-gray-800 dark:bg-gray-900 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-700 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Upload de Imagens</h2>
        {usageInfo && (
          <div className="text-xs sm:text-sm text-gray-400 space-y-1">
            <div>Imagens: <span className="font-medium text-gray-300">{usageInfo.images}/100</span></div>
            <div>Espaço: <span className="font-medium text-gray-300">{usageInfo.storageMB.toFixed(2)}MB/20MB</span></div>
          </div>
        )}
      </div>
      
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 sm:p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-900/30 dark:bg-blue-950/30 scale-105' 
            : 'border-gray-600 dark:border-gray-700 hover:border-blue-500 hover:bg-gray-700/50 dark:hover:bg-gray-800/50'
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
          <div className="mx-auto w-16 h-16 bg-gray-700 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
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
                  <span className="text-sm font-medium text-gray-300">{uploadProgress}</span>
                  <span className="text-sm font-semibold text-blue-400">{uploadPercentage}%</span>
                </div>
                <div className="w-full bg-gray-700 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-gray-200 font-semibold text-base sm:text-lg mb-1">
                  Arraste e solte suas imagens aqui
                </p>
                <p className="text-gray-400 text-sm mb-1">ou clique para selecionar</p>
                <p className="text-gray-500 text-xs mt-2">Máximo de 10 imagens por upload</p>
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

