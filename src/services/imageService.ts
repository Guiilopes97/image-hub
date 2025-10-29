import { supabase } from '../config/supabase';
import imageCompression from 'browser-image-compression';

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
    return compressedFile;
  } catch (error) {
    // Se houver erro na compressão, retorna o arquivo original
    return file;
  }
};

/**
 * Faz upload de uma imagem para o Supabase Storage e retorna informações com link único
 */
export const uploadImage = async (file: File, cpf: string): Promise<{ url: string; uniqueId: string; filename: string } | null> => {
  try {
    // Comprimir imagem antes do upload
    const compressedFile = await compressImage(file);
    
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
 * Conta o total de imagens de um CPF
 */
export const countUserImages = async (cpf: string): Promise<number> => {
  try {
    const { data, error } = await supabase.storage
      .from('images')
      .list(cpf, {
        limit: 1000, // Limite máximo prático do Supabase
        offset: 0
      });

    if (error || !data) {
      return 0;
    }

    return data.length;
  } catch (error) {
    return 0;
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

    return true;
  } catch (error) {
    return false;
  }
};

