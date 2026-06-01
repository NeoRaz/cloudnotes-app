import CryptoJS from 'crypto-js';
import { runtimeConfig } from '../config/runtime';

const secretKey = runtimeConfig.secretKey;

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

