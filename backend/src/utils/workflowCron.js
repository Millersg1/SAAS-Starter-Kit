import cron from 'node-cron';
import { getActiveEnrollments, getWorkflowById, completeEnrollment } from '../models/workflowModel.js';
import { processEnrollment, executeGraphWorkflow } from './workflowEngine.js';
import { logError } from './errorMonitor.js';

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
          logError(err, { context: 'workflowCron.enrollment', enrollmentId: enrollment.id, workflowId: enrollment.workflow_id });
        }
      }
    } catch (err) {
      logError(err, { context: 'workflowCron.main' });
    }
  });
  console.log('Workflow automation cron scheduled (every minute)');
};
