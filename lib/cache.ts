import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 2000; // Safe limit under SecureStore's 2048 byte max

export async function setCache(key: string, value: any): Promise<void> {
  try {
    const stringValue = JSON.stringify(value);
    
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, stringValue);
      }
    } else {
      // Chunk the string to safely bypass SecureStore size limits on native
      const chunks = Math.ceil(stringValue.length / CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_count`, chunks.toString());
      
      for (let i = 0; i < chunks; i++) {
        const chunk = stringValue.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_${i}`, chunk);
      }
    }
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    let stringValue: string | null = null;
    
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        stringValue = window.localStorage.getItem(key);
      }
    } else {
      // Reconstruct the chunks from SecureStore
      const countStr = await SecureStore.getItemAsync(`${key}_count`);
      if (countStr) {
        const chunks = parseInt(countStr, 10);
        let fullString = '';
        for (let i = 0; i < chunks; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
          if (chunk) fullString += chunk;
        }
        stringValue = fullString;
      }
    }
    
    if (stringValue) {
      return JSON.parse(stringValue) as T;
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  return null;
}