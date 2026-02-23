import * as clientActivityModel from '../models/clientActivityModel.js';
import * as clientModel from '../models/clientModel.js';
import * as brandModel from '../models/brandModel.js';

export const getClientActivities = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const client = await clientModel.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ status: 'fail', message: 'Client not found.' });
    }

    const member = await brandModel.getBrandMember(client.brand_id, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const activities = await clientActivityModel.getClientActivities(clientId, parseInt(limit));

    res.status(200).json({ status: 'success', data: { activities } });
  } catch (error) {
    console.error('Error in getClientActivities - clientActivityController.js', error);
    next(error);
  }
};

export const createActivity = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.id;
    const { activity_type, title, body } = req.body;

    const client = await clientModel.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ status: 'fail', message: 'Client not found.' });
    }

    const member = await brandModel.getBrandMember(client.brand_id, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    if (!activity_type) {
      return res.status(400).json({ status: 'fail', message: 'activity_type is required.' });
    }

    const activity = await clientActivityModel.createActivity({
      brand_id: client.brand_id,
      client_id: clientId,
      user_id: userId,
      activity_type,
      title,
      body
    });

    res.status(201).json({ status: 'success', message: 'Activity logged', data: { activity } });
  } catch (error) {
    console.error('Error in createActivity - clientActivityController.js', error);
    next(error);
  }
};

export const deleteActivity = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const userId = req.user.id;

    const result = await clientActivityModel.deleteActivity(activityId);
    if (!result) {
      return res.status(404).json({ status: 'fail', message: 'Activity not found.' });
    }

    res.status(200).json({ status: 'success', message: 'Activity deleted.' });
  } catch (error) {
    console.error('Error in deleteActivity - clientActivityController.js', error);
    next(error);
  }
};
