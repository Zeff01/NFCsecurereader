// lib/nfc/simple-secure-manager.ts - Works with your existing security-manager

import * as Crypto from 'expo-crypto';
import { nfcManager } from './index';
import { SecurityManager } from './security-manager';
import type { NFCTagData } from './types';

export class SimpleSecureNFCManager {
  private securityManager: SecurityManager;
  private privateKey = 'demo_secure_key_12345';

  constructor() {
    this.securityManager = new SecurityManager();
  }

  /**
   * Write a secure NFC tag with digital signature
   */
  async writeSecureTag(data: string, location?: string): Promise<void> {
    try {
      console.log('🔒 Creating secure NFC tag...');
      
      // Create much smaller payload
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 8); // Shorter nonce
      
      // Truncate data if too long
      const truncatedData = data.length > 50 ? data.substring(0, 50) + '...' : data;
      
      // Create compact payload
      const payload = `${truncatedData}|T:${timestamp}|N:${nonce}`;
      
      console.log('📏 Payload length:', payload.length, 'characters');
      
      // Sign the payload (creates 64-character hash)
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        payload + this.privateKey
      );
      
      // Create final secure data - keep it under 200 characters total
      const secureData = `${payload}|S:${signature.substring(0, 16)}`; // Use only first 16 chars of signature
      
      console.log('📝 Final payload length:', secureData.length, 'characters');
      console.log('📝 Secure payload:', secureData);
      
      if (secureData.length > 200) {
        throw new Error('Payload too large for NFC tag. Please use shorter data.');
      }
      
      // Write to NFC tag using existing manager
      await nfcManager.writeNFCTag([secureData]);
      
      console.log('✅ Secure tag written successfully');
    } catch (error) {
      console.error('❌ Failed to write secure tag:', error);
      throw error;
    }
  }

  /**
   * Read and verify a secure NFC tag
   */
  async readSecureTag(location?: string): Promise<{
    tagData: NFCTagData;
    securityResult: {
      isValid: boolean;
      isExpired: boolean;
      shouldBlock: boolean;
      events: any[];
    };
    accessGranted: boolean;
  }> {
    try {
      console.log('🔍 Reading secure NFC tag...');
      
      // Read the tag using existing manager
      const tagData = await nfcManager.readNFCTag();
      
      console.log('📖 Tag data read:', tagData);
      
      // Check for threats using your existing security manager
      const threatReport = await this.securityManager.performThreatDetection(tagData);
      const securityLevel = this.securityManager.assessSecurityLevel(tagData);
      
      // Verify signatures for each record
      let isValid = false;
      let isExpired = false;
      let shouldBlock = false;
      const events: any[] = [];
      
      for (const record of tagData.ndefRecords) {
        if (record.payload && record.payload.includes('S:')) {
          console.log('🔐 Verifying signature...');
          
          const verification = await this.verifySignature(record.payload);
          isValid = verification.isValid;
          isExpired = verification.isExpired;
          
          if (!isValid) {
            events.push({
              type: 'SIGNATURE_INVALID',
              severity: 'HIGH',
              description: 'Invalid cryptographic signature detected',
              tagId: tagData.id,
              timestamp: Date.now(),
              blocked: true
            });
            shouldBlock = true;
          }
          
          if (isExpired) {
            events.push({
              type: 'EXPIRED_SIGNATURE',
              severity: 'MEDIUM',
              description: 'Signature has expired',
              tagId: tagData.id,
              timestamp: Date.now(),
              blocked: true
            });
            shouldBlock = true;
          }
        }
      }
      
      // Add threat report if exists
      if (threatReport) {
        events.push({
          type: threatReport.threatType,
          severity: threatReport.severity,
          description: threatReport.description,
          tagId: threatReport.tagId,
          timestamp: Date.now(),
          blocked: threatReport.blocked
        });
        
        if (threatReport.blocked) {
          shouldBlock = true;
        }
      }
      
      const accessGranted = isValid && !isExpired && !shouldBlock;
      
      console.log(`🎯 Access decision: ${accessGranted ? 'GRANTED' : 'DENIED'}`);
      console.log(`🛡️ Security level: ${securityLevel}`);
      
      return {
        tagData,
        securityResult: {
          isValid,
          isExpired,
          shouldBlock,
          events
        },
        accessGranted
      };
      
    } catch (error) {
      console.error('❌ Failed to read secure tag:', error);
      throw error;
    }
  }

  /**
   * Verify digital signature
   */
  private async verifySignature(payload: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
  }> {
    try {
      const parts = payload.split('|');
      const signatureIndex = parts.findIndex(part => part.startsWith('S:'));
      
      if (signatureIndex === -1) {
        return { isValid: false, isExpired: false };
      }

      const shortSignature = parts[signatureIndex].substring(2); // Remove 'S:'
      const payloadWithoutSig = parts.slice(0, signatureIndex).join('|');
      
      // Verify signature (compare first 16 characters)
      const expectedSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        payloadWithoutSig + this.privateKey
      );
      
      const isValid = shortSignature === expectedSignature.substring(0, 16);
      
      // Check timestamp expiration (5 minutes)
      const timeMatch = payloadWithoutSig.match(/T:(\d+)/);
      let isExpired = false;
      
      if (timeMatch) {
        const tagTimestamp = parseInt(timeMatch[1]);
        const age = Date.now() - tagTimestamp;
        isExpired = age > (5 * 60 * 1000); // 5 minutes
      }
      
      return { isValid, isExpired };
      
    } catch (error) {
      console.error('Signature verification failed:', error);
      return { isValid: false, isExpired: false };
    }
  }

  /**
   * Demonstrate security - simplified version
   */
  async demonstrateSecurity(): Promise<{
    vulnerableClone: boolean;
    secureClone: boolean;
    behavioralDetection: boolean;
  }> {
    try {
      console.log('🧪 Starting security demonstration...');
      
      // Test 1: Vulnerable tag
      await nfcManager.writeNFCTag(['ACCESS:ADMIN|USER:VulnerableUser']);
      const vulnerableTag = await nfcManager.readNFCTag();
      const vulnerableClone = vulnerableTag.ndefRecords.length > 0;
      
      // Test 2: Secure tag  
      await this.writeSecureTag('ACCESS:ADMIN|USER:SecureUser');
      const secureRead = await this.readSecureTag();
      const secureClone = secureRead.accessGranted;
      
      // Test 3: Behavioral detection (simulate rapid access)
      let behavioralDetection = false;
      for (let i = 0; i < 6; i++) {
        const testRead = await this.readSecureTag();
        if (testRead.securityResult.shouldBlock) {
          behavioralDetection = true;
          break;
        }
      }
      
      return {
        vulnerableClone,
        secureClone,
        behavioralDetection
      };
      
    } catch (error) {
      console.error('Security demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Get your existing security manager
   */
  getSecurityManager(): SecurityManager {
    return this.securityManager;
  }
}

// Export singleton instance
export const simpleSecureNFCManager = new SimpleSecureNFCManager();