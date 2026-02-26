import cron from 'node-cron';
import { query } from '../config/database.js';
import { syncForBrand } from './googleCalendarSync.js';

export const startGoogleCalendarCron = () => {
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔄 Running Google Calendar sync...');
    try {
      const connections = (await query(
        `SELECT * FROM google_calendar_connections WHERE is_active = TRUE`,
        []
      )).rows;

      for (const conn of connections) {
        try {
          await syncForBrand(conn);
        } catch (err) {
          console.error(`Google Calendar sync failed for brand ${conn.brand_id}:`, err.message);
        }
      }
      if (connections.length > 0) {
        console.log(`✅ Google Calendar sync complete. Synced: ${connections.length} connections`);
      }
    } catch (err) {
      console.error('Google Calendar cron error:', err.message);
    }
  });
  console.log('✅ Google Calendar sync cron scheduled (every 30 minutes)');
};
