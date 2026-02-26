import cron from 'node-cron';
import * as emailConnectionModel from '../models/emailConnectionModel.js';
import { syncEmailConnection } from './imapSync.js';

export const startEmailSyncCron = () => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('📧 Running email sync cron...');
    try {
      const connections = await emailConnectionModel.getActiveConnections();
      for (const conn of connections) {
        await syncEmailConnection(conn).catch(e => console.error(`Sync failed for ${conn.email_address}:`, e.message));
      }
    } catch (err) {
      console.error('Email sync cron error:', err.message);
    }
  });
  console.log('📧 Email sync cron started (every 15 minutes)');
};
