import cron from 'node-cron';
import { getDueTodayTasks, markReminderSent } from '../models/taskModel.js';
import { sendTaskReminderEmail } from './emailUtils.js';

export const startTaskRemindersCron = () => {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('✅ Running task reminders cron...');
    try {
      const tasks = await getDueTodayTasks();

      for (const task of tasks) {
        try {
          await sendTaskReminderEmail(
            task.assigned_email,
            task.assigned_name,
            task.title,
            task.client_name,
            task.due_date
          );

          await markReminderSent(task.id);

          console.log(`✅ Task reminder sent to ${task.assigned_email} for: "${task.title}"`);
        } catch (err) {
          console.error(`❌ Failed to send reminder for task ${task.id}:`, err.message);
        }
      }

      console.log(`✅ Task reminders cron complete. Processed: ${tasks.length}`);
    } catch (err) {
      console.error('❌ Task reminders cron error:', err.message);
    }
  });

  console.log('✅ Task reminders cron scheduled (daily at 08:00)');
};
