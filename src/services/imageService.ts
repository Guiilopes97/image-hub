import { supabase } from '../config/supabase';
import imageCompression from 'browser-image-compression';

// Limites por usuário
const MAX_IMAGES_PER_USER = 100;
const MAX_STORAGE_PER_USER_MB = 20;

export interface ImageData {
  id: string;
  cpf: string;
  filename: string;
  url: string;
  created_at: string;
}

export interface ImageLink {
  uniqueId: string;
  cpf: string;
  filename: string;
  createdAt: number;
}

/**
 * Armazena o mapeamento de link único
 */
const saveImageLink = (link: ImageLink): void => {
  try {
    const existingLinks = getImageLinks();
    existingLinks[link.uniqueId] = link;
    localStorage.setItem('imageHubLinks', JSON.stringify(existingLinks));
  } catch (error) {
    // Erro silencioso
  }
};

/**
 * Recupera todos os links armazenados
 */
const getImageLinks = (): Record<string, ImageLink> => {
  try {
    const links = localStorage.getItem('imageHubLinks');
    return links ? JSON.parse(links) : {};
  } catch (error) {
    return {};
  }
};

/**
 * Busca um link pelo ID único
 */
export const getImageLink = (uniqueId: string): ImageLink | null => {
  try {
    // Decodificar do base64
    const decodedStr = atob(uniqueId.replace(/-/g, '/').replace(/_/g, '+'));
    const parts = decodedStr.split('-');
    
    if (parts.length >= 2) {
      const cpf = parts[0];
      const filename = parts.slice(1).join('-');
      
      return {
        uniqueId,
        cpf,
        filename,
        createdAt: Date.now()
      };
    }
  } catch (error) {
    // Se falhar, tentar no localStorage (backup)
    const links = getImageLinks();
    const link = links[uniqueId];
    if (link) {
      return link;
    }
  }
  
  return null;
};

/**
 * Comprime uma imagem mantendo boa qualidade
 * @throws {Error} Se a compressão falhar, lança um erro ao invés de retornar o arquivo original
 */
const compressImage = async (file: File): Promise<File> => {
  try {
    // Regras:
    // - Converter sempre para WebP (mantém qualidade com melhor compressão e suporta transparência)
    // - Nunca manter formato original por ser pequeno (convertSize: 0)
    // - Reduzir dimensões máximas (2048px) para economizar espaço quando necessário
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      initialQuality: 0.9,
      fileType: 'image/webp',
      convertSize: 0, // força conversão mesmo para arquivos pequenos
    };

    // Para JPEGs pequenos e já na resolução alvo, podemos manter original
    // Mas para PNGs e outros formatos, sempre converter para WebP
    if (
      file.type === 'image/jpeg' &&
      file.size <= 800 * 1024 // ~800KB
    ) {
      try {
        const img = await createImageBitmap(file);
        if (img.width <= 2048 && img.height <= 2048) {
          return file;
        }
      } catch (_) {
        // se falhar leitura, segue com compressão
      }
    }

    const compressedFile = await imageCompression(file, options);
    
    // Verificar se a compressão resultou em um arquivo válido
    if (!compressedFile || compressedFile.size === 0) {
      throw new Error(`Falha ao comprimir a imagem "${file.name}". Arquivo inválido após compressão.`);
    }
    
    return compressedFile;
  } catch (error) {
    // Se houver erro na compressão, lança erro ao invés de retornar arquivo original
    const errorMessage = error instanceof Error 
      ? error.message 
      : `Erro ao comprimir a imagem "${file.name}". A imagem não será enviada.`;
    throw new Error(errorMessage);
  }
};

/**
 * Faz upload de uma imagem para o Supabase Storage e retorna informações com link único
 */
export const uploadImage = async (file: File, cpf: string, checkLimits: boolean = true): Promise<{ url: string; uniqueId: string; filename: string } | null> => {
  try {
    // Comprimir imagem primeiro
    const compressedFile = await compressImage(file);
    
    // Verificar limites após compressão apenas se necessário
    // (a verificação já foi feita no início com todos os arquivos)
    if (checkLimits) {
      const storageUsage = await getUserStorageUsage(cpf);
      const realSizeMB = compressedFile.size / (1024 * 1024);
      
      // Verificação rápida apenas de espaço (quantidade já foi verificada antes)
      if (storageUsage.usedMB + realSizeMB > MAX_STORAGE_PER_USER_MB) {
        const availableMB = MAX_STORAGE_PER_USER_MB - storageUsage.usedMB;
        throw new Error(`Limite de ${MAX_STORAGE_PER_USER_MB}MB atingido após compressão. Espaço disponível: ${availableMB.toFixed(2)}MB`);
      }
    }
    
    // Ajustar a extensão conforme o MIME final (preferência WebP)
    const originalExt = file.name.split('.').pop()?.toLowerCase();
    let finalExt = originalExt || 'webp';
    if (compressedFile.type === 'image/webp') finalExt = 'webp';
    else if (compressedFile.type === 'image/jpeg') finalExt = 'jpg';
    else if (compressedFile.type === 'image/png') finalExt = 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${finalExt}`;
    const filePath = `${cpf}/${fileName}`;
    
    // Gerar ID único codificado (CPF e filename em base64)
    // Isso permite que qualquer pessoa com o link possa acessar
    const encodedData = btoa(`${cpf}-${fileName}`).replace(/\//g, '-').replace(/\+/g, '_').replace(/=/g, '');
    const uniqueId = encodedData;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return null;
    }

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    // Salvar o mapeamento do link único no localStorage (backup)
    saveImageLink({
      uniqueId,
      cpf,
      filename: fileName,
      createdAt: Date.now()
    });

    // Invalidar cache após upload
    invalidateUserImagesCache(cpf);

    return {
      url: data.publicUrl,
      uniqueId,
      filename: fileName
    };
  } catch (error) {
    return null;
  }
};

/**
 * Faz upload de múltiplas imagens
 */
export const uploadMultipleImages = async (files: File[], cpf: string): Promise<Array<{ url: string; uniqueId: string; filename: string }>> => {
  const uploadPromises = files.map(file => uploadImage(file, cpf));
  const results = await Promise.all(uploadPromises);
  return results.filter((result): result is { url: string; uniqueId: string; filename: string } => result !== null);
};

/**
 * Função auxiliar que busca os dados das imagens uma única vez
 * Reutilizada por countUserImages e getUserStorageUsage para evitar requisições duplicadas
 */
let userImagesCache: { cpf: string; data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 5000; // Cache por 5 segundos
let pendingRequests: Map<string, Promise<any[]>> = new Map();

const fetchUserImagesList = async (cpf: string, useCache: boolean = true): Promise<any[]> => {
  // Verificar cache primeiro
  if (useCache && userImagesCache && userImagesCache.cpf === cpf) {
    const age = Date.now() - userImagesCache.timestamp;
    if (age < CACHE_TTL) {
      return userImagesCache.data;
    }
  }

  // Verificar se já existe uma requisição em andamento para este CPF
  const pendingRequest = pendingRequests.get(cpf);
  if (pendingRequest) {
    return pendingRequest;
  }

  // Criar nova requisição e armazenar
  const request = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from('images')
        .list(cpf, {
          limit: 1000, // Limite máximo prático do Supabase
          offset: 0
        });

      if (error || !data) {
        return [];
      }

      // Atualizar cache
      userImagesCache = { cpf, data, timestamp: Date.now() };
      return data;
    } catch (error) {
      return [];
    } finally {
      // Remover da lista de requisições pendentes
      pendingRequests.delete(cpf);
    }
  })();

  // Armazenar a promessa para outras chamadas simultâneas
  pendingRequests.set(cpf, request);
  return request;
};

/**
 * Invalida o cache de imagens do usuário (útil após uploads/deleções)
 */
export const invalidateUserImagesCache = (cpf?: string): void => {
  if (cpf) {
    if (userImagesCache && userImagesCache.cpf === cpf) {
      userImagesCache = null;
    }
    // Limpar requisição pendente se houver
    pendingRequests.delete(cpf);
  } else {
    userImagesCache = null; // Invalidar para todos os usuários
    pendingRequests.clear(); // Limpar todas as requisições pendentes
  }
};

/**
 * Conta o total de imagens de um CPF
 */
export const countUserImages = async (cpf: string): Promise<number> => {
  const data = await fetchUserImagesList(cpf);
  return data.length;
};

/**
 * Calcula o espaço de armazenamento usado por um usuário em MB
 */
export const getUserStorageUsage = async (cpf: string): Promise<{ usedMB: number; usedBytes: number; fileCount: number }> => {
  const data = await fetchUserImagesList(cpf);

  if (data.length === 0) {
    return { usedMB: 0, usedBytes: 0, fileCount: 0 };
  }

  // Calcular tamanho total (os arquivos retornam metadata com size)
  const totalBytes = data.reduce((sum, file) => {
    // Tamanho pode vir em metadata.size ou em bytes direto
    const size = (file.metadata?.size) || (file as any).size || 0;
    return sum + size;
  }, 0);
  
  const usedMB = totalBytes / (1024 * 1024); // Converter para MB

  return { usedMB, usedBytes: totalBytes, fileCount: data.length };
};

/**
 * Função combinada que retorna contagem e uso de armazenamento em uma única requisição
 */
export const getUserImagesInfo = async (cpf: string): Promise<{ count: number; storage: { usedMB: number; usedBytes: number; fileCount: number } }> => {
  const data = await fetchUserImagesList(cpf, false); // Não usar cache para garantir dados frescos

  const fileCount = data.length;
  
  // Calcular tamanho total
  const totalBytes = data.reduce((sum, file) => {
    const size = (file.metadata?.size) || (file as any).size || 0;
    return sum + size;
  }, 0);
  
  const usedMB = totalBytes / (1024 * 1024);

  return {
    count: fileCount,
    storage: {
      usedMB,
      usedBytes: totalBytes,
      fileCount
    }
  };
};

/**
 * Verifica se o usuário pode fazer upload considerando os limites de quantidade e espaço
 * Comprime os arquivos primeiro para calcular o tamanho real após compressão
 * @param newFiles - Arquivos originais a serem verificados
 * @param alreadyCompressed - Se true, assume que os arquivos já estão comprimidos e usa tamanho direto
 */
export const canUploadImages = async (
  cpf: string, 
  newFiles: File[],
  alreadyCompressed: boolean = false
): Promise<{ 
  canUpload: boolean; 
  currentCount: number; 
  maxCount: number;
  currentMB: number;
  maxMB: number;
  message?: string;
  reason?: 'count' | 'storage';
}> => {
  try {
    // Usar função combinada para fazer apenas uma requisição
    const userInfo = await getUserImagesInfo(cpf);
    const currentCount = userInfo.count;
    const currentMB = userInfo.storage.usedMB;
    const maxCount = MAX_IMAGES_PER_USER;
    const maxMB = MAX_STORAGE_PER_USER_MB;
    
    // Verificar limite de quantidade antes de comprimir
    if (currentCount + newFiles.length > maxCount) {
      return {
        canUpload: false,
        currentCount,
        maxCount,
        currentMB,
        maxMB,
        reason: 'count',
        message: `Limite de ${maxCount} imagens atingido. Você tem ${currentCount} imagens. Por favor, exclua algumas antes de fazer novo upload.`
      };
    }
    
    let filesToCheck: File[];
    
    if (alreadyCompressed) {
      // Se já estão comprimidos, usar diretamente
      filesToCheck = newFiles;
    } else {
      // Comprimir todos os arquivos para calcular tamanho real após compressão
      filesToCheck = [];
      const compressionErrors: string[] = [];
      
      for (const file of newFiles) {
        try {
          const compressed = await compressImage(file);
          filesToCheck.push(compressed);
        } catch (error: any) {
          // Se falhar compressão, não usar arquivo original - coletar erro
          const errorMsg = error?.message || `Erro ao comprimir "${file.name}"`;
          compressionErrors.push(errorMsg);
          console.error('Erro ao comprimir arquivo:', errorMsg, error);
        }
      }
      
      // Se houver erros de compressão, retornar erro
      if (compressionErrors.length > 0) {
        const errorMsg = compressionErrors.length === newFiles.length
          ? `Falha ao comprimir ${compressionErrors.length} imagem(ns). ${compressionErrors[0]}`
          : `Falha ao comprimir ${compressionErrors.length} de ${newFiles.length} imagem(ns). ${compressionErrors[0]}`;
        
        return {
          canUpload: false,
          currentCount,
          maxCount,
          currentMB: 0,
          maxMB: MAX_STORAGE_PER_USER_MB,
          message: errorMsg + ' Por favor, tente com outras imagens ou verifique se os arquivos estão corrompidos.',
          reason: 'count' // usar 'count' como motivo genérico
        };
      }
    }
    
    // Calcular tamanho total REAL após compressão (ou já comprimido)
    const totalSizeBytes = filesToCheck.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    
    // Verificar limite de espaço com tamanho real após compressão
    // (currentMB e maxMB já foram obtidos acima)
    if (currentMB + totalSizeMB > maxMB) {
      const availableMB = maxMB - currentMB;
      return {
        canUpload: false,
        currentCount,
        maxCount,
        currentMB,
        maxMB,
        reason: 'storage',
        message: `Limite de ${maxMB}MB de armazenamento atingido. Você está usando ${currentMB.toFixed(2)}MB de ${maxMB}MB (${availableMB.toFixed(2)}MB disponíveis). O tamanho total após compressão seria ${totalSizeMB.toFixed(2)}MB. Por favor, exclua algumas imagens.`
      };
    }
    
    return { 
      canUpload: true, 
      currentCount, 
      maxCount,
      currentMB,
      maxMB
    };
  } catch (error) {
    return { 
      canUpload: false, 
      currentCount: 0, 
      maxCount: MAX_IMAGES_PER_USER,
      currentMB: 0,
      maxMB: MAX_STORAGE_PER_USER_MB,
      message: 'Erro ao verificar limites'
    };
  }
};

/**
 * Lista todas as imagens de um CPF com seus links únicos
 */
export const listUserImages = async (
  cpf: string,
  limit: number = 20,
  offset: number = 0
): Promise<Array<{ url: string; thumbUrl: string; uniqueId: string; filename: string }>> => {
  try {
    const { data, error } = await supabase.storage
      .from('images')
      .list(cpf, {
        limit,
        offset,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Gerar URLs públicas e links únicos (usando base64 para ser determinístico)
    const images = data.map((file) => {
      const filePath = `${cpf}/${file.name}`;
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      // URL transformada para miniatura (menor resolução)
      const { data: thumbUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath, {
          transform: {
            width: 400,
            height: 300,
            resize: 'cover',
            quality: 70
          }
        });
      
      // Gerar uniqueId baseado em base64 (mesmo método do upload)
      const uniqueId = btoa(`${cpf}-${file.name}`).replace(/\//g, '-').replace(/\+/g, '_').replace(/=/g, '');
      
      // Salvar no localStorage como backup
      saveImageLink({
        uniqueId,
        cpf,
        filename: file.name,
        createdAt: Date.now()
      });
      
      return {
        url: publicUrlData.publicUrl,
        thumbUrl: thumbUrlData.publicUrl,
        uniqueId,
        filename: file.name
      };
    });

    return images;
  } catch (error) {
    return [];
  }
};

/**
 * Remove uma imagem do storage e seu link único
 */
export const deleteImage = async (cpf: string, fileName: string): Promise<boolean> => {
  try {
    const filePath = `${cpf}/${fileName}`;
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (error) {
      return false;
    }

    // Remover o link único do localStorage
    const links = getImageLinks();
    const linkToRemove = Object.keys(links).find(id => 
      links[id].cpf === cpf && links[id].filename === fileName
    );
    
    if (linkToRemove) {
      delete links[linkToRemove];
      localStorage.setItem('imageHubLinks', JSON.stringify(links));
    }

    // Invalidar cache após deleção
    invalidateUserImagesCache(cpf);

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Remove múltiplas imagens do storage em uma única requisição
 * @param cpf - CPF do usuário
 * @param fileNames - Array de nomes de arquivos para deletar
 * @returns Número de imagens deletadas com sucesso
 */
export const deleteMultipleImages = async (cpf: string, fileNames: string[]): Promise<number> => {
  try {
    if (fileNames.length === 0) {
      return 0;
    }

    // Preparar todos os caminhos dos arquivos
    const filePaths = fileNames.map(fileName => `${cpf}/${fileName}`);

    // Fazer uma única requisição para deletar todos os arquivos
    const { data, error } = await supabase.storage
      .from('images')
      .remove(filePaths);

    if (error) {
      console.error('Erro ao deletar múltiplas imagens:', error);
      return 0;
    }

    // Remover os links únicos do localStorage
    const links = getImageLinks();
    let removedCount = 0;
    
    for (const fileName of fileNames) {
      const linkToRemove = Object.keys(links).find(id => 
        links[id].cpf === cpf && links[id].filename === fileName
      );
      
      if (linkToRemove) {
        delete links[linkToRemove];
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      localStorage.setItem('imageHubLinks', JSON.stringify(links));
    }

    // Invalidar cache após deleção
    invalidateUserImagesCache(cpf);

    // Retornar o número de arquivos deletados
    // O Supabase retorna um array com os nomes dos arquivos deletados
    return data?.length || fileNames.length;
  } catch (error) {
    console.error('Erro ao deletar múltiplas imagens:', error);
    return 0;
  }
};

