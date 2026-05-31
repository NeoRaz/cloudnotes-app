import CryptoJS from 'crypto-js';

const secretKey = import.meta.env.REACT_APP_SECRET_KEY || 'default-secret-key';

export const aesEncrypt = (str: string): string => {
  return CryptoJS.AES.encrypt(str, secretKey).toString();
};

export const aesDecrypt = (encryptedStr: string): string => {
  try {
    return CryptoJS.AES.decrypt(encryptedStr, secretKey).toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

