import cron from 'node-cron';
import { getActiveEnrollments, getWorkflowById, completeEnrollment } from '../models/workflowModel.js';
import { processEnrollment, executeGraphWorkflow } from './workflowEngine.js';

export const startWorkflowCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const enrollments = await getActiveEnrollments();
      for (const enrollment of enrollments) {
        try {
          const wf = await getWorkflowById(enrollment.workflow_id);
          if (!wf || !wf.is_active) {
            await completeEnrollment(enrollment.id);
            continue;
          }
          if (wf.workflow_definition && enrollment.current_node_id) {
            await executeGraphWorkflow(enrollment, wf.workflow_definition);
          } else {
            await processEnrollment(enrollment);
          }
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
