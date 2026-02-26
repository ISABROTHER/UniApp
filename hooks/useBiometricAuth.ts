import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'studentnest_biometric_credentials';

interface BiometricCredentials {
  phone: string;
  password: string;
}

interface BiometricAuthState {
  isAvailable: boolean;
  biometricType: 'face' | 'fingerprint' | 'iris' | null;
  hasStoredCredentials: boolean;
  isLoading: boolean;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    biometricType: null,
    hasStoredCredentials: false,
    isLoading: true,
  });

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: 'face' | 'fingerprint' | 'iris' | null = null;
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'face';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      const storedCreds = await SecureStore.getItemAsync(CREDENTIALS_KEY);

      setState({
        isAvailable: compatible && enrolled,
        biometricType,
        hasStoredCredentials: !!storedCreds,
        isLoading: false,
      });
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !state.isAvailable) {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: state.biometricType === 'face'
          ? 'Use Face ID to sign in'
          : 'Use biometrics to sign in',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch {
      return false;
    }
  }, [state.isAvailable, state.biometricType]);

  const saveCredentials = useCallback(async (phone: string, password: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const credentials: BiometricCredentials = { phone, password };
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
      setState(prev => ({ ...prev, hasStoredCredentials: true }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const getStoredCredentials = useCallback(async (): Promise<BiometricCredentials | null> => {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      if (stored) {
        return JSON.parse(stored) as BiometricCredentials;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const clearCredentials = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      setState(prev => ({ ...prev, hasStoredCredentials: false }));
    } catch {
    }
  }, []);

  const getBiometricLabel = useCallback((): string => {
    switch (state.biometricType) {
      case 'face':
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case 'iris':
        return 'Iris Scan';
      default:
        return 'Biometrics';
    }
  }, [state.biometricType]);

  return {
    ...state,
    authenticate,
    saveCredentials,
    getStoredCredentials,
    clearCredentials,
    getBiometricLabel,
    refreshState: checkBiometricAvailability,
  };
}
