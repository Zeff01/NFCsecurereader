// lib/sql/vulnerable-backend.ts

export interface VulnerableAuthResult {
    success: boolean;
    exploited: boolean;
    executedQuery: string;
    data?: any[];
    message: string;
    error?: string;
  }
  
  export class SQLVulnerableBackend {
    private database: Map<string, any> = new Map();
    
    constructor() {
      this.initializeDatabase();
    }
  
    private initializeDatabase() {
      // Simulate a vulnerable database with tables
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
  
      console.log('vulnerable database initialised with demo data');
    }
  
    // VULNERABLE AUTHENTICATION - Uses string concatenation
    async authenticateUser(userInput: string): Promise<VulnerableAuthResult> {
      try {
        console.log(' user input:', userInput);
  
        const vulnerableQuery = `SELECT * FROM users WHERE username = '${userInput}' AND active = 1`;
        console.log('executing vulnerable query:', vulnerableQuery);
        const result = this.executeVulnerableQuery(vulnerableQuery, userInput);
        
        return {
          success: result.accessGranted,
          exploited: result.injectionDetected,
          executedQuery: vulnerableQuery,
          data: result.extractedData,
          message: result.message
        };
  
      } catch (error: any) {
        console.error('vulnerable backend error:', error);
        return {
          success: false,
          exploited: false,
          executedQuery: '',
          message: `database error: ${error.message}`,
          error: error.message
        };
      }
    }
  
    private executeVulnerableQuery(query: string, userInput: string): {
      accessGranted: boolean;
      injectionDetected: boolean;
      extractedData: any[];
      message: string;
    } {
      const lowercaseInput = userInput.toLowerCase();
      let accessGranted = false;
      let injectionDetected = false;
      let extractedData: any[] = [];
      let message = '';
  
      const injectionPatterns = [
        "' or '1'='1",
        "' or 1=1",
        "' union select",
        "'; select",
        "' drop table",
        "' insert into",
        "' update ",
        "' delete from",
        "--",
        "/*",
        "admin'--"
      ];
  
      injectionDetected = injectionPatterns.some(pattern => 
        lowercaseInput.includes(pattern.toLowerCase())
      );
  
      if (injectionDetected) {
        console.log('SQL Injection detected in input!');
  
        if (lowercaseInput.includes("' or '1'='1") || lowercaseInput.includes("' or 1=1")) {

            accessGranted = true;
          extractedData = this.database.get('users') || [];
          message = 'authentication bypassed!';
          
        } else if (lowercaseInput.includes("union select")) {
          accessGranted = false;
          
          if (lowercaseInput.includes('admin_users')) {
            extractedData = this.database.get('admin_users') || [];
            message = 'union injection successful!';
          } else if (lowercaseInput.includes('sensitive_data')) {
            extractedData = this.database.get('sensitive_data') || [];
            message = 'union injection successful!';
          } else {
            extractedData = [
              ...this.database.get('users') || [],
              ...this.database.get('admin_users') || []
            ];
            message = 'union injection successful! multiple tables accessed.';
          }
          
        } else if (lowercaseInput.includes('; select')) {

            accessGranted = false;
          extractedData = this.database.get('sensitive_data') || [];
          message = '💀 Stacked query injection! Sensitive data dumped.';
          
        } else if (lowercaseInput.includes('drop table')) {

            accessGranted = false;
          message = 'drop table injection detected! DB would be destroyed!';
          
        } else if (lowercaseInput.includes("admin'--")) {

        accessGranted = true;
          extractedData = this.database.get('users')?.filter((u: { username: string; }) => u.username === 'admin') || [];
          message = 'comment injection successful';
          
        } else {
          // Generic injection
          accessGranted = true;
          extractedData = this.database.get('users') || [];
          message = '💀 SQL injection successful! System compromised.';
        }
        
      } else {
        const users = this.database.get('users') || [];
        const user = users.find((u: { username: string; }) => u.username === userInput);
        
        if (user) {
          accessGranted = true;
          extractedData = [user];
          message = 'legitimate user authenticated.';
        } else {
          accessGranted = false;
          message = 'user not found or invalid credentials.';
        }
      }
  
      console.log(`query result: Access=${accessGranted}, Injection=${injectionDetected}, Data=${extractedData.length} records`);
  
      return {
        accessGranted,
        injectionDetected,
        extractedData,
        message
      };
    }
  
    getTableSchema(tableName: string): any[] {
      switch (tableName.toLowerCase()) {
        case 'users':
          return [
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'username', data_type: 'varchar' },
            { column_name: 'password', data_type: 'varchar' },
            { column_name: 'role', data_type: 'varchar' }
          ];
        case 'admin_users':
          return [
            { column_name: 'username', data_type: 'varchar' },
            { column_name: 'password', data_type: 'varchar' }
          ];
        case 'sensitive_data':
          return [
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'customer_name', data_type: 'varchar' },
            { column_name: 'ssn', data_type: 'varchar' },
            { column_name: 'credit_card', data_type: 'varchar' }
          ];
        default:
          return [];
      }
    }
  
    getAllTableNames(): string[] {
      return Array.from(this.database.keys());
    }
  
    async resetDatabase(): Promise<void> {
      this.database.clear();
      this.initializeDatabase();
      console.log('🔄 Vulnerable database reset');
    }
  
  
    getDatabaseStats(): any {
      const stats: any = {};
      this.database.forEach((data, tableName) => {
        stats[tableName] = {
          records: Array.isArray(data) ? data.length : 0,
          schema: this.getTableSchema(tableName)
        };
      });
      return stats;
    }
  
    getVulnerableQueryExamples(): string[] {
      return [
        `SELECT * FROM users WHERE username = 'USER_INPUT' AND active = 1`,
        `SELECT id, name FROM products WHERE category = 'USER_INPUT'`,
        `UPDATE users SET last_login = NOW() WHERE id = USER_INPUT`,
        `INSERT INTO logs (user_id, action) VALUES (USER_INPUT, 'login')`
      ];
    }
  }