import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listUserImages, deleteImage, deleteMultipleImages, countUserImages } from '../services/imageService';

interface ImageInfo {
  url: string;
  thumbUrl: string;
  filename: string;
  uniqueId: string;
  projectUrl: string;
}

interface ImageGalleryProps {
  onDeleteSuccess?: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ onDeleteSuccess }) => {
  const { cpf } = useAuth();
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [totalImages, setTotalImages] = useState<number | null>(null);
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({}); // uniqueId -> filename
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadImages = useCallback(async () => {
    if (!cpf) return;
    
    setLoading(true);
    setFailedImages(new Set<string>()); // Resetar imagens com falha
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      
      // Carregar total na primeira página (o totalImages será atualizado após o await)
      let shouldLoadTotal = currentPage === 1;
      
      // Fazer ambas as chamadas em paralelo se precisar carregar total
      const [totalResult, imageUrls] = await Promise.all([
        shouldLoadTotal ? countUserImages(cpf) : Promise.resolve(null),
        listUserImages(cpf, itemsPerPage, offset)
      ]);
      
      if (shouldLoadTotal && totalResult !== null) {
        setTotalImages(totalResult);
      }
      
      const imageData: ImageInfo[] = imageUrls.map(img => {
        const projectUrl = `${window.location.origin}/image/${img.uniqueId}`;
        return { 
          url: img.url,
          thumbUrl: img.thumbUrl,
          filename: img.filename, 
          uniqueId: img.uniqueId,
          projectUrl 
        };
      });
      
      setImages(imageData);
      setHasMore(imageData.length === itemsPerPage);
      // Remover seleções que não estão mais presentes na página carregada
      setSelectedMap((prev) => {
        const next: Record<string, string> = {};
        for (const img of imageData) {
          if (prev[img.uniqueId]) next[img.uniqueId] = img.filename;
        }
        return next;
      });
    } catch (error) {
      // Erro silencioso
      setHasMore(false);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpf, currentPage, itemsPerPage]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleDelete = async (displayIndex: number, filename: string) => {
    if (!cpf || !window.confirm('Tem certeza que deseja excluir esta imagem?')) {
      return;
    }
    
    setDeletingId(displayIndex);
    try {
      const success = await deleteImage(cpf, filename);
      if (success) {
        // Atualizar total e remover imagem da lista atual
        if (totalImages !== null && totalImages > 0) {
          setTotalImages(totalImages - 1);
        }
        setImages(images.filter((_, i) => i !== displayIndex));
        
        // Ajustar página se necessário
        if (totalImages !== null) {
          const newTotal = totalImages - 1;
          const totalPages = Math.ceil(newTotal / itemsPerPage);
          if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
          } else if (images.length === 1 && currentPage > 1) {
            // Se era a última imagem da página e ainda há páginas anteriores, voltar
            setCurrentPage(currentPage - 1);
          }
        }
        
        // Notificar exclusão bem-sucedida
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
      } else {
        alert('Erro ao excluir imagem');
      }
    } catch (error) {
      alert('Erro ao excluir imagem');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (projectUrl: string, uniqueId: string) => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopiedId(uniqueId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      alert('Erro ao copiar link');
    }
  };

  const handleOpenInNewTab = (projectUrl: string) => {
    window.open(projectUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleSelect = (uniqueId: string, filename: string) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[uniqueId]) delete next[uniqueId];
      else next[uniqueId] = filename;
      return next;
    });
  };

  const selectAllCurrentPage = () => {
    const next: Record<string, string> = { ...selectedMap };
    for (const img of images) {
      next[img.uniqueId] = img.filename;
    }
    setSelectedMap(next);
  };

  const clearSelection = () => setSelectedMap({});

  const selectedCount = Object.keys(selectedMap).length;

  const handleBulkDelete = async () => {
    if (!cpf || selectedCount === 0) return;
    if (!window.confirm(`Excluir ${selectedCount} imagem(ns)?`)) return;

    setIsBulkDeleting(true);
    try {
      // Extrair todos os nomes de arquivo do mapa de seleção
      const fileNames = Object.values(selectedMap); // [filename, filename, ...]
      
      // Deletar todas as imagens em uma única requisição
      const successCount = await deleteMultipleImages(cpf, fileNames);

      if (successCount > 0) {
        // Limpar seleção primeiro
        setSelectedMap({});
        
        // Atualizar total
        if (totalImages !== null) {
          const newTotal = Math.max(0, totalImages - successCount);
          setTotalImages(newTotal);
          
          // Verificar se precisa ajustar a página
          const newTotalPages = Math.ceil(newTotal / itemsPerPage);
          if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
          } else {
            // Recarregar imagens da página atual
            await loadImages();
          }
        } else {
          // Se não temos total, apenas recarregar
          await loadImages();
        }
        
        // Notificar exclusão bem-sucedida
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
        
        // Mostrar mensagem de sucesso
        if (successCount < fileNames.length) {
          alert(`${successCount} de ${fileNames.length} imagem(ns) excluída(s) com sucesso.`);
        }
      } else {
        alert('Erro ao excluir imagens. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao excluir imagens:', error);
      alert('Erro ao excluir imagens. Por favor, tente novamente.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Calcular informações de paginação
  const totalPages = totalImages !== null ? Math.ceil(totalImages / itemsPerPage) : null;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const startItem = images.length > 0 ? startIndex + 1 : 0;
  const endItem = startIndex + images.length;

  // Ao mudar itemsPerPage, volta para a primeira página
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Resetar para primeira página ao mudar itens por página
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const handleNext = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageChange = (page: number) => {
    if (totalPages !== null && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-700 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-4">Galeria de Imagens</h2>
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-700 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-4">Galeria de Imagens</h2>
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gray-700 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-300 text-lg font-medium">Nenhuma imagem enviada</p>
            <p className="text-gray-400 text-sm mt-2">Faça upload de suas imagens para começar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 dark:bg-gray-900 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-700 dark:border-gray-700">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">Galeria de Imagens</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <label htmlFor="itemsPerPage" className="text-xs sm:text-sm text-gray-300 font-medium">
                Itens por página:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 sm:px-3 py-1 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-gray-800 [&>option]:text-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button onClick={selectAllCurrentPage} className="px-2 sm:px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg transition-colors text-xs sm:text-sm whitespace-nowrap border border-purple-700">
              Selecionar página
            </button>
            <button onClick={loadImages} className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm whitespace-nowrap">
              Atualizar
            </button>
          </div>
        </div>
        
        {/* Barra de seleção em massa - responsiva */}
        {selectedCount > 0 && (
          <div className="bg-blue-900/30 dark:bg-blue-950/30 border border-blue-700 dark:border-blue-800 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <span className="text-sm sm:text-base font-medium text-blue-300">
                {selectedCount} imagem(ns) selecionada(s)
              </span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={clearSelection}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap border border-gray-600"
                >
                  Limpar seleção
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  {isBulkDeleting ? 'Excluindo...' : 'Excluir selecionadas'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Informação de paginação */}
      {images.length > 0 && (
        <div className="mb-4 text-sm text-gray-400">
          {totalImages !== null ? (
            <>Mostrando {startItem} - {endItem} de {totalImages} imagens</>
          ) : (
            <>Mostrando {startItem} - {endItem}</>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        {images.map((imageData, index) => (
          <div key={imageData.uniqueId} className="relative group">
            {/* Checkbox seleção (minimalista) */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={Boolean(selectedMap[imageData.uniqueId])}
                onChange={() => toggleSelect(imageData.uniqueId, imageData.filename)}
                className="h-4 w-4 accent-blue-600 cursor-pointer"
              />
            </div>
            {failedImages.has(imageData.uniqueId) ? (
              <div className="w-full h-48 bg-gray-700 dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs">Erro ao carregar</p>
                </div>
              </div>
            ) : (
              <img
                src={imageData.thumbUrl || imageData.url}
                alt={imageData.filename}
                className="w-full h-48 object-cover rounded-lg shadow-md cursor-pointer transition-transform duration-200 group-hover:scale-105"
              onClick={() => handleOpenInNewTab(imageData.projectUrl)}
              onError={() => {
                // Se falhar a miniatura, tentar o original; se falhar novamente, marcar como falha
                const imgEl = document.querySelector(`img[data-id='${imageData.uniqueId}']`) as HTMLImageElement | null;
                if (imgEl && imgEl.src !== imageData.url) {
                  imgEl.src = imageData.url;
                } else {
                  setFailedImages(prev => new Set(prev).add(imageData.uniqueId));
                }
              }}
              data-id={imageData.uniqueId}
              loading="lazy"
              />
            )}
            
            <div className="absolute top-2 right-2 flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink(imageData.projectUrl, imageData.uniqueId);
                }}
                className={`p-2 rounded-full transition-colors ${copiedId === imageData.uniqueId ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                title="Copiar link"
              >
                {copiedId === imageData.uniqueId ? (
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

            {copiedId === imageData.uniqueId && (
              <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                Link copiado!
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controles de paginação */}
      {totalPages !== null && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-700 dark:border-gray-700">
          <div className="text-sm text-gray-400">
            Página {currentPage} de {totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-lg transition-colors text-sm font-medium border border-gray-600"
            >
              Anterior
            </button>
            
            {/* Números de página */}
            <div className="flex items-center gap-1">
              {/* Primeira página */}
              {currentPage > 3 && totalPages > 5 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm border border-gray-600"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="px-2 text-gray-500">...</span>}
                </>
              )}
              
              {/* Páginas ao redor da atual */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium border ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-gray-200 border-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {/* Última página */}
              {currentPage < totalPages - 2 && totalPages > 5 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm border border-gray-600"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={handleNext}
              disabled={!hasMore || (totalPages !== null && currentPage >= totalPages)}
              className="px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-lg transition-colors text-sm font-medium border border-gray-600"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
      
      {/* Controles simplificados se não houver total ainda ou só uma página */}
      {totalPages === null && (currentPage > 1 || hasMore) && (
        <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-700 dark:border-gray-700">
          <div className="text-sm text-gray-400">
            Página {currentPage}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-lg transition-colors text-sm font-medium border border-gray-600"
            >
              Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={!hasMore}
              className="px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-lg transition-colors text-sm font-medium border border-gray-600"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;

