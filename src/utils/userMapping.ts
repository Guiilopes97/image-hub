import CryptoJS from 'crypto-js';

/**
 * Gera hash SHA-256 do CPF (determinístico - mesmo CPF = mesmo hash)
 * O CPF é limpo antes do hash (remove formatação)
 */
export const hashCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) {
    throw new Error('CPF deve ter 11 dígitos');
  }
  return CryptoJS.SHA256(cleaned).toString();
};

/**
 * Gera User ID único baseado no hash do CPF (determinístico)
 * Usa os primeiros 16 caracteres do hash para criar um ID curto e único
 */
export const generateUserId = (cpfHash: string): string => {
  return cpfHash.substring(0, 16);
};

/**
 * Função helper para obter identificadores a partir do CPF (sem enviar CPF ao servidor)
 * @param cpf - CPF formatado ou não formatado
 * @returns Objeto com cpfHash e userId
 */
export const getUserIdentifier = (cpf: string): { cpfHash: string; userId: string } => {
  const cpfHash = hashCPF(cpf);
  const userId = generateUserId(cpfHash);
  return { cpfHash, userId };
};

/**
 * Valida se um hash de CPF tem formato válido (64 caracteres hexadecimais)
 */
export const isValidCPFHash = (hash: string): boolean => {
  return /^[a-f0-9]{64}$/i.test(hash);
};

/**
 * Valida se um userId tem formato válido (16 caracteres hexadecimais)
 */
export const isValidUserId = (userId: string): boolean => {
  return /^[a-f0-9]{16}$/i.test(userId);
};

