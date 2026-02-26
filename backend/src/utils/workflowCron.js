import cron from 'node-cron';
import { getActiveEnrollments } from '../models/workflowModel.js';
import { processEnrollment } from './workflowEngine.js';

export const startWorkflowCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const enrollments = await getActiveEnrollments();
      for (const enrollment of enrollments) {
        try {
          await processEnrollment(enrollment);
        } catch (err) {
          console.error(`Workflow cron error for enrollment ${enrollment.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Workflow cron error:', err.message);
    }
  });
  console.log('✅ Workflow automation cron scheduled (every minute)');
};
