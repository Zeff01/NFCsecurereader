// lib/sql/secure-backend.ts - SECURE SQL Backend with Protection

export interface SecureAuthResult {
    success: boolean;
    blocked: boolean;
    sanitizedInput: string;
    executedQuery: string;
    message: string;
    securityEvents?: SecurityEvent[];
  }
  
  export interface SecurityEvent {
    id: string;
    timestamp: string;
    type: 'SQL_INJECTION_ATTEMPT' | 'INPUT_SANITISED' | 'PARAMETERISED_QUERY' | 'ACCESS_DENIED';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    originalInput: string;
    sanitizedInput: string;
    blocked: boolean;
  }
  
  export class SQLSecureBackend {
    private database: Map<string, any> = new Map();
    private securityEvents: SecurityEvent[] = [];
    
    constructor() {
      this.initializeDatabase();
    }
  
    private initializeDatabase() {
      // Same database structure as vulnerable backend
      this.database.set('users', [
        { id: 1, username: 'admin', password: 'admin123', role: 'administrator' },
        { id: 2, username: 'user1', password: 'password1', role: 'user' },
        { id: 3, username: 'manager', password: 'manager456', role: 'manager' },
        { id: 4, username: 'guest', password: 'guest789', role: 'guest' }
      ]);
  
      this.database.set('admin_users', [
        { username: 'superadmin', password: 'secret_admin_pass' },
        { username: 'dbadmin', password: 'database_master_key' },
        { username: 'sysadmin', password: 'system_root_access' }
      ]);
  
      this.database.set('sensitive_data', [
        { id: 1, customer_name: 'John Doe', ssn: '123-45-6789', credit_card: '4532-1234-5678-9012' },
        { id: 2, customer_name: 'Jane Smith', ssn: '987-65-4321', credit_card: '5555-4444-3333-2222' },
        { id: 3, customer_name: 'Bob Johnson', ssn: '456-78-9123', credit_card: '4111-1111-1111-1111' }
      ]);
  
      console.log('🔒 Secure database initialized with demo data');
    }
  
    /**
     * SECURE AUTHENTICATION - Uses parameterized queries and input validation
     */
    async authenticateUser(userInput: string): Promise<SecureAuthResult> {
      try {
        console.log('received user input for secure processing:', userInput);
  
        // Step 1: Detect SQL injection attempts
        const injectionDetected = this.detectSQLInjection(userInput);
        
        // Step 2: Sanitize input
        const sanitizedInput = this.sanitizeInput(userInput);
        
        // Step 3: Log security event
        if (injectionDetected.detected) {
          this.logSecurityEvent({
            type: 'SQL_INJECTION_ATTEMPT',
            severity: 'CRITICAL',
            description: `SQL injection attempt blocked: ${injectionDetected.patterns.join(', ')}`,
            originalInput: userInput,
            sanitizedInput: sanitizedInput,
            blocked: true
          });
        } else {
          this.logSecurityEvent({
            type: 'INPUT_SANITISED',
            severity: 'LOW',
            description: 'Input successfully sanitized and validated',
            originalInput: userInput,
            sanitizedInput: sanitizedInput,
            blocked: false
          });
        }
  
        const secureQuery = `SELECT * FROM users WHERE username = ? AND active = 1`;
        console.log('executing secure parameterized query:', secureQuery);
        console.log('parameter value:', sanitizedInput);
  
        const result = this.executeSecureQuery(sanitizedInput, injectionDetected.detected);
  
        this.logSecurityEvent({
          type: 'PARAMETERISED_QUERY',
          severity: 'LOW',
          description: 'Parameterised query executed safely',
          originalInput: userInput,
          sanitizedInput: sanitizedInput,
          blocked: false
        });
  
        return {
          success: result.accessGranted,
          blocked: injectionDetected.detected,
          sanitizedInput: sanitizedInput,
          executedQuery: secureQuery,
          message: result.message,
          securityEvents: this.getRecentSecurityEvents()
        };
  
      } catch (error: any) {
        console.error('secure backend error:', error);
        
        this.logSecurityEvent({
          type: 'ACCESS_DENIED',
          severity: 'HIGH',
          description: `database error: ${error.message}`,
          originalInput: userInput,
          sanitizedInput: '',
          blocked: true
        });
  
        return {
          success: false,
          blocked: true,
          sanitizedInput: '',
          executedQuery: '',
          message: `security error: access denied`,
          securityEvents: this.getRecentSecurityEvents()
        };
      }
    }
  
    /**
     * Detect SQL injection patterns
     */
    private detectSQLInjection(input: string): { detected: boolean; patterns: string[] } {
      const maliciousPatterns = [
        // Basic injection patterns
        /'.*or.*'.*=.*'/i,
        /'.*or.*\d.*=.*\d/i,
        /union.*select/i,
        /;\s*select/i,
        /;\s*insert/i,
        /;\s*update/i,
        /;\s*delete/i,
        /;\s*drop/i,
        /;\s*create/i,
        /;\s*alter/i,
        
        // Comment patterns
        /--/,
        /\/\*/,
        /\*\//,
        
        // Advanced patterns
        /information_schema/i,
        /sys\./i,
        /master\./i,
        /pg_/i,
        /mysql\./i,
        
        // Function-based injections
        /sleep\s*\(/i,
        /benchmark\s*\(/i,
        /waitfor\s+delay/i,
        /convert\s*\(/i,
        /cast\s*\(/i,
        /exec\s*\(/i,
        /execute\s*\(/i,
        
        // Hex and char injections
        /0x[0-9a-f]+/i,
        /char\s*\(/i,
        /ascii\s*\(/i,
        
        // Boolean-based patterns
        /and\s+\d+=\d+/i,
        /or\s+\d+=\d+/i,
        /and\s+.*\s*=\s*.*/i,
        /or\s+.*\s*=\s*.*/i
      ];
  
      const detectedPatterns: string[] = [];
      
      for (const pattern of maliciousPatterns) {
        if (pattern.test(input)) {
          detectedPatterns.push(pattern.toString());
        }
      }
  
      return {
        detected: detectedPatterns.length > 0,
        patterns: detectedPatterns
      };
    }
  
    /**
     * Sanitize user input
     */
    private sanitizeInput(input: string): string {
      if (!input || typeof input !== 'string') {
        return '';
      }
  
      let sanitized = input;
  

      sanitized = sanitized
        .replace(/'/g, "''")  // escape single quotes
        .replace(/--/g, '')   // remove SQL comments
        .replace(/\/\*/g, '') // remove block comment start
        .replace(/\*\//g, '') // remove block comment end
        .replace(/;/g, '')    // remove semicolons
        .replace(/\\/g, '\\\\') // escape backslashes
        .replace(/\x00/g, '') // remove null bytes
        .trim();
  

        if (sanitized.length > 50) {
        sanitized = sanitized.substring(0, 50);
      }
  
      sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
  
      return sanitized;
    }
  
    private executeSecureQuery(sanitizedUsername: string, injectionAttempted: boolean): {
      accessGranted: boolean;
      message: string;
    } {

        if (injectionAttempted) {
        return {
          accessGranted: false,
          message: 'access denied: SQL injection attempt detected and blocked'
        };
      }
  
      const users = this.database.get('users') || [];
      const user = users.find((u: { username: string; }) => u.username === sanitizedUsername);
  
      if (user) {
        return {
          accessGranted: true,
          message: 'user authenticated successfully via secure parameterised query'
        };
      } else {
        return {
          accessGranted: false,
          message: 'invalid credentials: user not found'
        };
      }
    }
  
    private logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>) {
      const securityEvent: SecurityEvent = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ...event
      };
  
      this.securityEvents.push(securityEvent);
      
      if (this.securityEvents.length > 50) {
        this.securityEvents = this.securityEvents.slice(-50);
      }
  
      console.log(`security event: ${event.type} - ${event.description}`);
    }
  
  
    private getRecentSecurityEvents(): SecurityEvent[] {
      return this.securityEvents.slice(-10); 
    }
  
    getAllSecurityEvents(): SecurityEvent[] {
      return [...this.securityEvents];
    }
  
  
    async resetDatabase(): Promise<void> {
      this.database.clear();
      this.securityEvents = [];
      this.initializeDatabase();
      console.log('secure database and security logs reset');
    }
  
 
    getSecurityStats(): {
      totalEvents: number;
      injectionAttempts: number;
      blockedAttempts: number;
      successfulQueries: number;
    } {
      const totalEvents = this.securityEvents.length;
      const injectionAttempts = this.securityEvents.filter(e => e.type === 'SQL_INJECTION_ATTEMPT').length;
      const blockedAttempts = this.securityEvents.filter(e => e.blocked).length;
      const successfulQueries = this.securityEvents.filter(e => e.type === 'PARAMETERISED_QUERY').length;
  
      return {
        totalEvents,
        injectionAttempts,
        blockedAttempts,
        successfulQueries
      };
    }
  
    private validateAgainstWhitelist(input: string): boolean {
      // Only allow specific patterns for usernames
      const allowedPattern = /^[a-zA-Z0-9_-]{1,30}$/;
      return allowedPattern.test(input);
    }
  
    
    getSecureQueryExamples(): string[] {
      return [
        `SELECT * FROM users WHERE username = ? AND active = 1`,
        `SELECT id, name FROM products WHERE category = ? AND visible = 1`,
        `UPDATE users SET last_login = NOW() WHERE id = ? AND active = 1`,
        `INSERT INTO logs (user_id, action, timestamp) VALUES (?, ?, NOW())`
      ];
    }
  
  }