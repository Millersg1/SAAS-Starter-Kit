import app from './src/app.js';
import { testConnection, closePool, query } from './src/config/database.js';
import { startRecurringInvoiceCron } from './src/utils/recurringInvoices.js';
import { startOverdueReminderCron } from './src/utils/overdueReminders.js';
import { startEmailSequencesCron } from './src/utils/emailSequencesCron.js';
import { startTaskRemindersCron } from './src/utils/taskRemindersCron.js';
import { startWeeklyReportCron } from './src/utils/weeklyReportCron.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔍 Testing database connection... - server.js:13');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting... - server.js:17');
      process.exit(1);
    }

    // Run pending schema migrations (idempotent — uses IF NOT EXISTS)
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS webhook_endpoints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          secret VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
          events TEXT[] NOT NULL DEFAULT '{}',
          description VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_brand ON webhook_endpoints(brand_id);
        CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
          event_type VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          response_status INTEGER,
          response_body TEXT,
          attempts INTEGER DEFAULT 0,
          delivered_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
        CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1001;
        CREATE TABLE IF NOT EXISTS contracts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          contract_number VARCHAR(50) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','declined','expired')),
          issue_date DATE,
          expiry_date DATE,
          client_signature TEXT,
          signed_by_name VARCHAR(255),
          signed_by_email VARCHAR(255),
          signed_at TIMESTAMPTZ,
          notes TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_contracts_brand  ON contracts(brand_id);
        CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
      `);
      console.log('✅ Schema migrations applied (webhooks + contracts)');
    } catch (migErr) {
      console.error('⚠️ Schema migration warning:', migErr.message);
    }

    // Start recurring invoice cron job
    startRecurringInvoiceCron();

    // Start overdue invoice reminder cron job
    startOverdueReminderCron();

    // Start email sequences cron (proposal follow-ups)
    startEmailSequencesCron();

    // Start task reminders cron
    startTaskRemindersCron();

    // Start weekly report cron (Mondays 08:00)
    startWeeklyReportCron();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('🚀 ClientHub API Server Started - server.js:23');
      console.log(`📡 Server running on port ${PORT} - server.js:24`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'} - server.js:25`);
      console.log(`🔗 API URL: http://localhost:${PORT} - server.js:26`);
      console.log(`💚 Health check: http://localhost:${PORT}/health - server.js:27`);
      console.log('');
      console.log('Press CTRL+C to stop the server - server.js:29');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown... - server.js:34`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed - server.js:37');
        
        await closePool();
        console.log('✅ Database connections closed - server.js:40');
        
        console.log('👋 Server shutdown complete - server.js:42');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout - server.js:48');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('💥 UNCAUGHT EXCEPTION! Shutting down... - server.js:59');
      console.error(err.name, err.message);
      console.error(err.stack);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('💥 UNHANDLED REJECTION! Shutting down... - server.js:67');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server: - server.js:75', error);
    process.exit(1);
  }
};

// Start the server
startServer();
