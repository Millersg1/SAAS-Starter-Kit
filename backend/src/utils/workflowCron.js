import cron from 'node-cron';
import { getActiveEnrollments, getWorkflowById, completeEnrollment } from '../models/workflowModel.js';
import { processEnrollment, executeGraphWorkflow } from './workflowEngine.js';
import { logError } from './errorMonitor.js';

let workflowRunning = false;
let workflowStartedAt = null;
const MAX_CRON_DURATION_MS = 5 * 60 * 1000; // 5 minutes max

export const startWorkflowCron = () => {
  cron.schedule('* * * * *', async () => {
    // Release stale lock if previous run hung for more than 5 minutes
    if (workflowRunning && workflowStartedAt && (Date.now() - workflowStartedAt > MAX_CRON_DURATION_MS)) {
      logError(new Error('Workflow cron exceeded max duration, releasing lock'), { context: 'workflowCron.timeout' });
      workflowRunning = false;
    }
    if (workflowRunning) return;
    workflowRunning = true;
    workflowStartedAt = Date.now();
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
    } finally {
      workflowRunning = false;
      workflowStartedAt = null;
    }
  });
  console.log('Workflow automation cron scheduled (every minute)');
};
