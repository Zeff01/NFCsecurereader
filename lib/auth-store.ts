import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export interface AuthLog {
  id: string;
  method: 'biometric' | 'pin' | 'firebase';
  success: boolean;
  error?: string;
  timestamp: string;
  deviceInfo?: string;
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  firebaseEnabled: boolean;
  autoLockTime: number; // milliseconds
  requireAuthForNFC: boolean;
  allowExploitFeatures: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  biometricAvailable: boolean;
  authTimeout: NodeJS.Timeout | null;
  securitySettings: SecuritySettings;
  authLogs: AuthLog[];
  
  // Actions
  initialize: () => Promise<void>;
  checkBiometricAvailability: () => Promise<void>;
  authenticateWithBiometric: (reason?: string) => Promise<boolean>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  authenticateWithFirebase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithFirebase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setPin: (pin: string) => Promise<boolean>;
  hasPin: () => Promise<boolean>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  getSecuritySettings: () => Promise<SecuritySettings>;
  extendAuthSession: () => void;
  logout: () => void;
  logAuthAttempt: (method: AuthLog['method'], success: boolean, error?: string) => Promise<void>;
  getAuthLogs: () => AuthLog[];
  clearAuthLogs: () => Promise<void>;
}

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  biometricEnabled: false,
  pinEnabled: false,
  firebaseEnabled: false,
  autoLockTime: 300000, // 5 minutes
  requireAuthForNFC: true,
  allowExploitFeatures: false,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  biometricAvailable: false,
  authTimeout: null,
  securitySettings: DEFAULT_SECURITY_SETTINGS,
  authLogs: [],

  initialize: async () => {
    const { checkBiometricAvailability, getSecuritySettings } = get();
    await checkBiometricAvailability();
    await getSecuritySettings();
    
    // Load auth logs
    try {
      const logsJson = await SecureStore.getItemAsync('auth_logs');
      const logs = logsJson ? JSON.parse(logsJson) : [];
      set({ authLogs: logs });
    } catch (error) {
      console.warn('Failed to load auth logs:', error);
    }
  },

  checkBiometricAvailability: async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      const biometricAvailable = hasHardware && isEnrolled && supportedTypes.length > 0;
      set({ biometricAvailable });
    } catch (error) {
      console.warn('Error checking biometric availability:', error);
      set({ biometricAvailable: false });
    }
  },

  authenticateWithBiometric: async (reason = 'Authenticate to access NFC features') => {
    const { logAuthAttempt, extendAuthSession } = get();
    
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        set({ isAuthenticated: true });
        extendAuthSession();
        await logAuthAttempt('biometric', true);
        return true;
      } else {
        await logAuthAttempt('biometric', false, result.error);
        return false;
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      await logAuthAttempt('biometric', false, errorMessage);
      return false;
    }
  },

  authenticateWithPin: async (pin: string) => {
    const { logAuthAttempt, extendAuthSession } = get();
    
    try {
      const storedPinHash = await SecureStore.getItemAsync('pin_hash');
      if (!storedPinHash) {
        await logAuthAttempt('pin', false, 'No PIN set');
        return false;
      }

      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );

      if (pinHash === storedPinHash) {
        set({ isAuthenticated: true });
        extendAuthSession();
        await logAuthAttempt('pin', true);
        return true;
      } else {
        await logAuthAttempt('pin', false, 'Invalid PIN');
        return false;
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      await logAuthAttempt('pin', false, errorMessage);
      return false;
    }
  },

  authenticateWithFirebase: async (email: string, password: string) => {
    const { logAuthAttempt, extendAuthSession } = get();
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        set({ 
          isAuthenticated: true, 
          user: userCredential.user 
        });
        extendAuthSession();
        await logAuthAttempt('firebase', true);
        return { success: true };
      }
      
      await logAuthAttempt('firebase', false, 'Authentication failed');
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      const errorMessage = (error as Error).message;
      await logAuthAttempt('firebase', false, errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  registerWithFirebase: async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      const errorMessage = (error as Error).message;
      return { success: false, error: errorMessage };
    }
  },

  setPin: async (pin: string) => {
    try {
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );
      await SecureStore.setItemAsync('pin_hash', pinHash);
      
      // Update security settings
      const currentSettings = get().securitySettings;
      set({ 
        securitySettings: { 
          ...currentSettings, 
          pinEnabled: true 
        } 
      });
      await SecureStore.setItemAsync('security_settings', JSON.stringify({
        ...currentSettings,
        pinEnabled: true
      }));
      
      return true;
    } catch (error) {
      console.warn('Failed to set PIN:', error);
      return false;
    }
  },

  hasPin: async () => {
    try {
      const pinHash = await SecureStore.getItemAsync('pin_hash');
      return !!pinHash;
    } catch (error) {
      return false;
    }
  },

  updateSecuritySettings: async (newSettings: Partial<SecuritySettings>) => {
    const currentSettings = get().securitySettings;
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    try {
      await SecureStore.setItemAsync('security_settings', JSON.stringify(updatedSettings));
      set({ securitySettings: updatedSettings });
    } catch (error) {
      console.warn('Failed to update security settings:', error);
    }
  },

  getSecuritySettings: async () => {
    try {
      const settingsJson = await SecureStore.getItemAsync('security_settings');
      const settings = settingsJson 
        ? { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(settingsJson) }
        : DEFAULT_SECURITY_SETTINGS;
      
      set({ securitySettings: settings });
      return settings;
    } catch (error) {
      console.warn('Failed to get security settings:', error);
      set({ securitySettings: DEFAULT_SECURITY_SETTINGS });
      return DEFAULT_SECURITY_SETTINGS;
    }
  },

  extendAuthSession: () => {
    const { authTimeout, securitySettings } = get();
    
    // Clear existing timeout
    if (authTimeout) {
      clearTimeout(authTimeout);
    }

    // Set new timeout
    const newTimeout = setTimeout(() => {
      get().logout();
    }, securitySettings.autoLockTime);

    set({ authTimeout: newTimeout });
  },

  logout: () => {
    const { authTimeout } = get();
    
    // Clear timeout
    if (authTimeout) {
      clearTimeout(authTimeout);
    }

    // Sign out from Firebase
    signOut(auth).catch(() => {});

    set({ 
      isAuthenticated: false, 
      user: null, 
      authTimeout: null 
    });
  },

  logAuthAttempt: async (method: AuthLog['method'], success: boolean, error?: string) => {
    try {
      const log: AuthLog = {
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${method}_${Date.now()}_${Math.random()}`
        ),
        method,
        success,
        error,
        timestamp: new Date().toISOString(),
        deviceInfo: `Expo SDK 53`, // You could expand this with device info
      };

      const { authLogs } = get();
      const newLogs = [log, ...authLogs].slice(0, 50); // Keep last 50 logs
      
      set({ authLogs: newLogs });
      await SecureStore.setItemAsync('auth_logs', JSON.stringify(newLogs));
    } catch (error) {
      console.warn('Failed to log auth attempt:', error);
    }
  },

  getAuthLogs: () => {
    return get().authLogs;
  },

  clearAuthLogs: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_logs');
      set({ authLogs: [] });
    } catch (error) {
      console.warn('Failed to clear auth logs:', error);
    }
  },
}));