import cron from 'node-cron';
import { query } from '../config/database.js';
import { syncForBrand } from './outlookCalendarSync.js';

export const startOutlookCalendarCron = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const connections = (await query(
        `SELECT * FROM outlook_calendar_connections WHERE is_active = TRUE`
      )).rows;
      for (const conn of connections) {
        try {
          await syncForBrand(conn);
        } catch (err) {
          console.error(`Outlook Calendar sync failed for brand ${conn.brand_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Outlook Calendar cron error:', err.message);
    }
  });
  console.log('📅 Outlook Calendar sync cron scheduled (every 30 minutes)');
};
