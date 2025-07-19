// lib/nfc/security-features.ts - Digital Signatures & Behavioral Analysis

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface SecurityConfig {
  privateKey: string;
  publicKey: string;
  signatureExpiration: number; // milliseconds
  maxAccessesPerMinute: number;
  maxLocationsPerHour: number;
}

export interface AccessPattern {
  times: number[];
  locations: string[];
  devices: string[];
  intervals: number[];
}

export interface SecurityEvent {
  type: 'SIGNATURE_INVALID' | 'EXPIRED_SIGNATURE' | 'RAPID_ACCESS' | 'LOCATION_ANOMALY' | 'DEVICE_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  tagId: string;
  timestamp: number;
  blocked: boolean;
}

export class NFCSecurityManager {
  private config: SecurityConfig;
  private accessPatterns: Map<string, AccessPattern> = new Map();
  private securityEvents: SecurityEvent[] = [];

  constructor(config: SecurityConfig) {
    this.config = config;
    this.loadStoredPatterns();
  }

  // ===========================================
  // 1. DIGITAL SIGNATURES WITH CHALLENGE-RESPONSE
  // ===========================================

  /**
   * Create a digitally signed payload for NFC tag
   */
  async createSignedPayload(data: string, location?: string): Promise<string> {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const deviceId = await this.getDeviceFingerprint();
    
    // Create the payload
    let payload = `${data}|TIME:${timestamp}|NONCE:${nonce}|DEVICE:${deviceId}`;
    if (location) {
      payload = `${payload}|LOCATION:${location}`;
    }
    
    // Sign the payload
    const signature = await this.signData(payload);
    
    return `${payload}|SIG:${signature}`;
  }

  /**
   * Verify a digitally signed NFC tag
   */
  async verifySignedTag(tagPayload: string, tagId: string, currentLocation?: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
    securityEvents: SecurityEvent[];
    shouldBlock: boolean;
  }> {
    const events: SecurityEvent[] = [];
    let isValid = false;
    let isExpired = false;
    let shouldBlock = false;

    try {
      // Parse the payload
      const parts = tagPayload.split('|');
      const signatureIndex = parts.findIndex(part => part.startsWith('SIG:'));
      
      if (signatureIndex === -1) {
        events.push({
          type: 'SIGNATURE_INVALID',
          severity: 'HIGH',
          description: 'No signature found in tag data',
          tagId,
          timestamp: Date.now(),
          blocked: true
        });
        return { isValid: false, isExpired: false, securityEvents: events, shouldBlock: true };
      }

      const signature = parts[signatureIndex].substring(4);
      const payloadWithoutSig = parts.slice(0, signatureIndex).join('|');
      
      // Verify signature
      const expectedSignature = await this.signData(payloadWithoutSig);
      isValid = signature === expectedSignature;
      
      if (!isValid) {
        events.push({
          type: 'SIGNATURE_INVALID',
          severity: 'HIGH',
          description: 'Invalid cryptographic signature detected',
          tagId,
          timestamp: Date.now(),
          blocked: true
        });
        shouldBlock = true;
      }

      // Check timestamp expiration
      const timeMatch = payloadWithoutSig.match(/TIME:(\d+)/);
      if (timeMatch) {
        const tagTimestamp = parseInt(timeMatch[1]);
        const age = Date.now() - tagTimestamp;
        isExpired = age > this.config.signatureExpiration;
        
        if (isExpired) {
          events.push({
            type: 'EXPIRED_SIGNATURE',
            severity: 'MEDIUM',
            description: `Signature expired ${Math.floor(age / 1000)} seconds ago`,
            tagId,
            timestamp: Date.now(),
            blocked: true
          });
          shouldBlock = true;
        }
      }

      // Record this access for behavioral analysis
      await this.recordAccess(tagId, currentLocation);
      
      // Perform behavioral analysis
      const behavioralEvents = await this.analyzeBehavior(tagId, payloadWithoutSig);
      events.push(...behavioralEvents);
      
      // Check if behavioral analysis suggests blocking
      const highSeverityEvents = behavioralEvents.filter(e => e.severity === 'HIGH');
      if (highSeverityEvents.length > 0) {
        shouldBlock = true;
      }

    } catch (error : any) {
      events.push({
        type: 'SIGNATURE_INVALID',
        severity: 'HIGH',
        description: `Signature verification failed: ${error.message}`,
        tagId,
        timestamp: Date.now(),
        blocked: true
      });
      shouldBlock = true;
    }

    // Store security events
    this.securityEvents.push(...events);
    await this.storeSecurityEvents();

    return { isValid, isExpired, securityEvents: events, shouldBlock };
  }

  /**
   * Sign data using the private key
   */
  private async signData(data: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + this.config.privateKey
    );
  }

  // ===========================================
  // 4. BEHAVIORAL ANALYSIS
  // ===========================================

  /**
   * Record an access attempt for behavioral analysis
   */
  async recordAccess(tagId: string, location?: string): Promise<void> {
    const pattern = this.accessPatterns.get(tagId) || {
      times: [],
      locations: [],
      devices: [],
      intervals: []
    };

    const now = Date.now();
    const deviceId = await this.getDeviceFingerprint();

    // Add current access
    pattern.times.push(now);
    pattern.devices.push(deviceId);
    if (location) {
      pattern.locations.push(location);
    }

    // Calculate interval from last access
    if (pattern.times.length > 1) {
      const lastTime = pattern.times[pattern.times.length - 2];
      pattern.intervals.push(now - lastTime);
    }

    // Keep only recent data (last 20 accesses)
    const maxEntries = 20;
    if (pattern.times.length > maxEntries) {
      pattern.times = pattern.times.slice(-maxEntries);
      pattern.locations = pattern.locations.slice(-maxEntries);
      pattern.devices = pattern.devices.slice(-maxEntries);
      pattern.intervals = pattern.intervals.slice(-maxEntries);
    }

    this.accessPatterns.set(tagId, pattern);
    await this.storeAccessPatterns();
  }

  /**
   * Analyze behavioral patterns and detect anomalies
   */
  async analyzeBehavior(tagId: string, payload: string): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = [];
    const pattern = this.accessPatterns.get(tagId);
    
    if (!pattern) return events;

    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;

    // 1. Check for rapid access attempts
    const recentAccesses = pattern.times.filter(time => now - time < oneMinute);
    if (recentAccesses.length > this.config.maxAccessesPerMinute) {
      events.push({
        type: 'RAPID_ACCESS',
        severity: 'HIGH',
        description: `${recentAccesses.length} accesses in last minute (max: ${this.config.maxAccessesPerMinute})`,
        tagId,
        timestamp: now,
        blocked: true
      });
    }

    // 2. Check for location anomalies
    const recentLocations = pattern.locations
      .slice(-10) // Last 10 locations
      .filter(loc => loc); // Remove empty locations
    
    const uniqueRecentLocations = new Set(recentLocations);
    if (uniqueRecentLocations.size > this.config.maxLocationsPerHour) {
      events.push({
        type: 'LOCATION_ANOMALY',
        severity: 'MEDIUM',
        description: `Tag accessed from ${uniqueRecentLocations.size} different locations recently`,
        tagId,
        timestamp: now,
        blocked: false
      });
    }

    // 3. Check for device switching
    const recentDevices = pattern.devices.slice(-5); // Last 5 devices
    const uniqueRecentDevices = new Set(recentDevices);
    if (uniqueRecentDevices.size > 2) {
      events.push({
        type: 'DEVICE_ANOMALY',
        severity: 'HIGH',
        description: `Tag accessed from ${uniqueRecentDevices.size} different devices recently`,
        tagId,
        timestamp: now,
        blocked: true
      });
    }

    // 4. Check for impossible time intervals
    const veryShortIntervals = pattern.intervals.filter(interval => interval < 5000); // Less than 5 seconds
    if (veryShortIntervals.length > 2) {
      events.push({
        type: 'RAPID_ACCESS',
        severity: 'HIGH',
        description: `Multiple access attempts within 5 seconds detected`,
        tagId,
        timestamp: now,
        blocked: true
      });
    }

    // 5. Check for unusual time patterns
    const currentHour = new Date().getHours();
    const isUnusualTime = currentHour < 6 || currentHour > 22; // Before 6 AM or after 10 PM
    
    if (isUnusualTime) {
      // Check if this user normally accesses at this time
      const historicalHours = pattern.times.map(time => new Date(time).getHours());
      const usuallyAccessesAtThisTime = historicalHours.filter(hour => 
        Math.abs(hour - currentHour) < 2
      ).length > 0;

      if (!usuallyAccessesAtThisTime) {
        events.push({
          type: 'LOCATION_ANOMALY', // Using location anomaly for time-based issues
          severity: 'LOW',
          description: `Unusual access time: ${currentHour}:00 (user's normal pattern differs)`,
          tagId,
          timestamp: now,
          blocked: false
        });
      }
    }

    return events;
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get device fingerprint for device tracking
   */
  private async getDeviceFingerprint(): Promise<string> {
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 24)) // Changes daily
    };
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(deviceInfo)
    );
  }

  /**
   * Generate a challenge for challenge-response authentication
   */
  async generateChallenge(): Promise<string> {
    const challenge = Math.random().toString(36).substring(2, 15);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      challenge + Date.now()
    );
  }

  /**
   * Respond to a challenge
   */
  async respondToChallenge(challenge: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      challenge + this.config.privateKey
    );
  }

  // ===========================================
  // STORAGE METHODS
  // ===========================================

  private async storeAccessPatterns(): Promise<void> {
    try {
      const patternsObj = Object.fromEntries(this.accessPatterns);
      await SecureStore.setItemAsync('nfc_access_patterns', JSON.stringify(patternsObj));
    } catch (error) {
      console.warn('Failed to store access patterns:', error);
    }
  }

  private async loadStoredPatterns(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync('nfc_access_patterns');
      if (stored) {
        const patternsObj = JSON.parse(stored);
        this.accessPatterns = new Map(Object.entries(patternsObj));
      }
    } catch (error) {
      console.warn('Failed to load access patterns:', error);
    }
  }

  private async storeSecurityEvents(): Promise<void> {
    try {
      // Keep only recent events (last 100)
      const recentEvents = this.securityEvents.slice(-100);
      await SecureStore.setItemAsync('nfc_security_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to store security events:', error);
    }
  }

  // ===========================================
  // PUBLIC GETTERS
  // ===========================================

  getAccessPattern(tagId: string): AccessPattern | undefined {
    return this.accessPatterns.get(tagId);
  }

  getRecentSecurityEvents(limit: number = 10): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  getSecurityEventsByTag(tagId: string): SecurityEvent[] {
    return this.securityEvents.filter(event => event.tagId === tagId);
  }

  async clearSecurityData(): Promise<void> {
    this.accessPatterns.clear();
    this.securityEvents = [];
    await SecureStore.deleteItemAsync('nfc_access_patterns');
    await SecureStore.deleteItemAsync('nfc_security_events');
  }

  // ===========================================
  // CONFIGURATION
  // ===========================================

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}