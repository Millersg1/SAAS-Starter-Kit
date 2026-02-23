import * as taskModel from '../models/taskModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientActivityModel from '../models/clientActivityModel.js';

const verifyBrandAccess = async (brandId, userId) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  return !!member;
};

export const getBrandTasks = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const tasks = await taskModel.getBrandTasks(brandId, req.query);

    res.status(200).json({ status: 'success', data: { tasks } });
  } catch (error) {
    console.error('Error in getBrandTasks - taskController.js', error);
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ status: 'fail', message: 'title is required.' });
    }

    const task = await taskModel.createTask({
      ...req.body,
      brand_id: brandId,
      created_by: userId
    });

    if (task.client_id && req.body.log_activity !== false) {
      await clientActivityModel.createActivity({
        brand_id: brandId,
        client_id: task.client_id,
        user_id: userId,
        activity_type: 'system',
        title: 'Task created',
        body: `New task: "${task.title}"${task.due_date ? ` — Due ${task.due_date}` : ''}`
      });
    }

    res.status(201).json({ status: 'success', message: 'Task created', data: { task } });
  } catch (error) {
    console.error('Error in createTask - taskController.js', error);
    next(error);
  }
};

export const getTask = async (req, res, next) => {
  try {
    const { brandId, taskId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const task = await taskModel.getTaskById(taskId);
    if (!task || task.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Task not found.' });
    }

    res.status(200).json({ status: 'success', data: { task } });
  } catch (error) {
    console.error('Error in getTask - taskController.js', error);
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { brandId, taskId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const existing = await taskModel.getTaskById(taskId);
    if (!existing || existing.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Task not found.' });
    }

    const task = await taskModel.updateTask(taskId, req.body);

    res.status(200).json({ status: 'success', message: 'Task updated', data: { task } });
  } catch (error) {
    console.error('Error in updateTask - taskController.js', error);
    next(error);
  }
};

export const completeTask = async (req, res, next) => {
  try {
    const { brandId, taskId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const existing = await taskModel.getTaskById(taskId);
    if (!existing || existing.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Task not found.' });
    }

    const task = await taskModel.completeTask(taskId);

    if (task.client_id) {
      await clientActivityModel.createActivity({
        brand_id: brandId,
        client_id: task.client_id,
        user_id: userId,
        activity_type: 'task_completed',
        title: 'Task completed',
        body: `Completed: "${task.title}"`
      });
    }

    res.status(200).json({ status: 'success', message: 'Task completed', data: { task } });
  } catch (error) {
    console.error('Error in completeTask - taskController.js', error);
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { brandId, taskId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const existing = await taskModel.getTaskById(taskId);
    if (!existing || existing.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Task not found.' });
    }

    await taskModel.deleteTask(taskId);

    res.status(200).json({ status: 'success', message: 'Task deleted.' });
  } catch (error) {
    console.error('Error in deleteTask - taskController.js', error);
    next(error);
  }
};
