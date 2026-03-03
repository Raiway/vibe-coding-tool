/**
 * 安全工具函数
 * 用于密码哈希和敏感数据加密
 */

/**
 * 生成随机盐值
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 哈希（单向加密）
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成密码哈希（带盐值）
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return await sha256(password + salt);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}

/**
 * 简单加密（基于密码的 XOR 加密）
 * 用于加密 API Key 等敏感数据
 */
export function encryptData(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  // Base64 编码
  return btoa(unescape(encodeURIComponent(result)));
}

/**
 * 简单解密
 */
export function decryptData(encryptedData: string, key: string): string {
  try {
    // Base64 解码
    const decoded = decodeURIComponent(escape(atob(encryptedData)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
