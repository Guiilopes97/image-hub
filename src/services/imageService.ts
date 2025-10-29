import { supabase } from '../config/supabase';

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
    console.error('Erro ao salvar link:', error);
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
    console.error('Erro ao recuperar links:', error);
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
    console.error('Erro ao decodificar link único:', error);
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
 * Faz upload de uma imagem para o Supabase Storage e retorna informações com link único
 */
export const uploadImage = async (file: File, cpf: string): Promise<{ url: string; uniqueId: string; filename: string } | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${cpf}/${fileName}`;
    
    // Gerar ID único codificado (CPF e filename em base64)
    // Isso permite que qualquer pessoa com o link possa acessar
    const encodedData = btoa(`${cpf}-${fileName}`).replace(/\//g, '-').replace(/\+/g, '_').replace(/=/g, '');
    const uniqueId = encodedData;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
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
    console.error('Erro ao processar upload:', error);
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
 * Lista todas as imagens de um CPF com seus links únicos
 */
export const listUserImages = async (cpf: string): Promise<Array<{ url: string; uniqueId: string; filename: string }>> => {
  try {
    const { data, error } = await supabase.storage
      .from('images')
      .list(cpf, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Erro ao listar imagens:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    console.log('Arquivos encontrados:', data);

    // Gerar URLs públicas e links únicos (usando base64 para ser determinístico)
    const images = data.map((file) => {
      const filePath = `${cpf}/${file.name}`;
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
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
        uniqueId,
        filename: file.name
      };
    });

    console.log('Total de imagens listadas:', images.length);
    return images;
  } catch (error) {
    console.error('Erro ao processar listagem:', error);
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
      console.error('Erro ao deletar imagem:', error);
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
    console.error('Erro ao processar exclusão:', error);
    return false;
  }
};

