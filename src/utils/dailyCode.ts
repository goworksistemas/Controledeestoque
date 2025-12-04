/**
 * Utilitário para gerenciar códigos únicos diários de usuários
 * Códigos expiram a cada 24 horas
 */

/**
 * Gera um código único de 6 dígitos baseado no userId e data atual
 */
export function generateDailyCode(userId: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = `${userId}-${today}`;
  
  // Gera um hash simples baseado no seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Converte para 6 dígitos positivos
  const code = Math.abs(hash).toString().slice(0, 6).padStart(6, '0');
  return code;
}

/**
 * Verifica se um código fornecido é válido para o usuário hoje
 */
export function isDailyCodeValid(userId: string, code: string): boolean {
  const currentCode = generateDailyCode(userId);
  return code === currentCode;
}

/**
 * Formata o código para exibição (XXX-XXX)
 */
export function formatDailyCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Remove formatação do código (XXX-XXX -> XXXXXX)
 */
export function unformatDailyCode(code: string): string {
  return code.replace(/[^0-9]/g, '');
}