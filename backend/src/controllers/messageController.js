import * as messageModel from '../models/messageModel.js';
import * as brandModel from '../models/brandModel.js';
import { getFileInfo, deleteFile } from '../middleware/uploadMiddleware.js';

// ============================================
// MESSAGE THREADS
// ============================================

/**
 * Create a new message thread
 */
export const createThread = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const threadData = {
      brand_id: brandId,
      project_id: req.body.project_id || null,
      client_id: req.body.client_id || null,
      subject: req.body.subject,
      created_by: userId
    };

    const thread = await messageModel.createThread(threadData);

    // Add creator as participant
    await messageModel.addParticipant({
      thread_id: thread.id,
      user_id: userId,
      client_id: null,
      role: 'sender'
    });

    // Add client as participant if specified
    if (req.body.client_id) {
      await messageModel.addParticipant({
        thread_id: thread.id,
        user_id: null,
        client_id: req.body.client_id,
        role: 'recipient'
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Thread created successfully',
      data: { thread }
    });
  } catch (error) {
    console.error('Error creating thread: - messageController.js:60', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create thread',
      error: error.message
    });
  }
};

/**
 * Get all threads for a brand
 */
export const getBrandThreads = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const filters = {
      project_id: req.query.project_id,
      client_id: req.query.client_id,
      status: req.query.status,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const threads = await messageModel.getBrandThreads(brandId, filters);

    res.status(200).json({
      status: 'success',
      results: threads.length,
      data: { threads }
    });
  } catch (error) {
    console.error('Error getting brand threads: - messageController.js:103', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve threads',
      error: error.message
    });
  }
};

/**
 * Get single thread by ID
 */
export const getThread = async (req, res) => {
  try {
    const { brandId, threadId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const thread = await messageModel.getThreadById(threadId);

    if (!thread) {
      return res.status(404).json({
        status: 'fail',
        message: 'Thread not found'
      });
    }

    // Verify thread belongs to brand
    if (thread.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Thread does not belong to this brand'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { thread }
    });
  } catch (error) {
    console.error('Error getting thread: - messageController.js:151', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve thread',
      error: error.message
    });
  }
};

/**
 * Update thread
 */
export const updateThread = async (req, res) => {
  try {
    const { brandId, threadId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if thread exists and belongs to brand
    const existingThread = await messageModel.getThreadById(threadId);
    if (!existingThread) {
      return res.status(404).json({
        status: 'fail',
        message: 'Thread not found'
      });
    }

    if (existingThread.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Thread does not belong to this brand'
      });
    }

    const thread = await messageModel.updateThread(threadId, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Thread updated successfully',
      data: { thread }
    });
  } catch (error) {
    console.error('Error updating thread: - messageController.js:201', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update thread',
      error: error.message
    });
  }
};

/**
 * Archive thread
 */
export const archiveThread = async (req, res) => {
  try {
    const { brandId, threadId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if thread exists and belongs to brand
    const existingThread = await messageModel.getThreadById(threadId);
    if (!existingThread) {
      return res.status(404).json({
        status: 'fail',
        message: 'Thread not found'
      });
    }

    if (existingThread.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Thread does not belong to this brand'
      });
    }

    await messageModel.archiveThread(threadId);

    res.status(200).json({
      status: 'success',
      message: 'Thread archived successfully'
    });
  } catch (error) {
    console.error('Error archiving thread: - messageController.js:250', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to archive thread',
      error: error.message
    });
  }
};

// ============================================
// MESSAGES
// ============================================

/**
 * Send a message in a thread
 */
export const sendMessage = async (req, res) => {
  try {
    const { brandId, threadId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if thread exists and belongs to brand
    const thread = await messageModel.getThreadById(threadId);
    if (!thread) {
      return res.status(404).json({
        status: 'fail',
        message: 'Thread not found'
      });
    }

    if (thread.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Thread does not belong to this brand'
      });
    }

    const messageData = {
      thread_id: threadId,
      sender_id: userId,
      sender_type: 'user',
      content: req.body.content
    };

    const message = await messageModel.createMessage(messageData);

    // Handle attachments if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileInfo = getFileInfo(file);
        await messageModel.createAttachment({
          message_id: message.id,
          ...fileInfo
        });
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: { message }
    });
  } catch (error) {
    console.error('Error sending message: - messageController.js:322', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * Get messages for a thread
 */
export const getThreadMessages = async (req, res) => {
  try {
    const { brandId, threadId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if thread exists and belongs to brand
    const thread = await messageModel.getThreadById(threadId);
    if (!thread) {
      return res.status(404).json({
        status: 'fail',
        message: 'Thread not found'
      });
    }

    if (thread.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Thread does not belong to this brand'
      });
    }

    const filters = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const messages = await messageModel.getThreadMessages(threadId, filters);

    // Get attachments for each message
    for (const message of messages) {
      message.attachments = await messageModel.getMessageAttachments(message.id);
    }

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: { messages }
    });
  } catch (error) {
    console.error('Error getting thread messages: - messageController.js:382', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve messages',
      error: error.message
    });
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (req, res) => {
  try {
    const { brandId, messageId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const message = await messageModel.markMessageAsRead(messageId, userId);

    if (!message) {
      return res.status(404).json({
        status: 'fail',
        message: 'Message not found or already read'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Message marked as read',
      data: { message }
    });
  } catch (error) {
    console.error('Error marking message as read: - messageController.js:423', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
};

/**
 * Mark all thread messages as read
 */
export const markThreadAsRead = async (req, res) => {
  try {
    const { brandId, threadId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const messages = await messageModel.markThreadMessagesAsRead(threadId, userId);

    res.status(200).json({
      status: 'success',
      message: `${messages.length} messages marked as read`,
      data: { count: messages.length }
    });
  } catch (error) {
    console.error('Error marking thread as read: - messageController.js:457', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark thread as read',
      error: error.message
    });
  }
};

/**
 * Delete message
 */
export const deleteMessage = async (req, res) => {
  try {
    const { brandId, messageId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    await messageModel.deleteMessage(messageId);

    res.status(200).json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message: - messageController.js:490', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

/**
 * Search messages
 */
export const searchMessages = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { q: searchTerm } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        status: 'fail',
        message: 'Search term is required'
      });
    }

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const filters = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const messages = await messageModel.searchMessages(brandId, searchTerm, filters);

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: { messages }
    });
  } catch (error) {
    console.error('Error searching messages: - messageController.js:537', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search messages',
      error: error.message
    });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const unreadCount = await messageModel.getUnreadCount(brandId, userId);

    res.status(200).json({
      status: 'success',
      data: { unread_count: unreadCount }
    });
  } catch (error) {
    console.error('Error getting unread count: - messageController.js:570', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// ============================================
// THREAD PARTICIPANTS
// ============================================

/**
 * Get thread participants
 */
export const getThreadParticipants = async (req, res) => {
  try {
    const { brandId, threadId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const participants = await messageModel.getThreadParticipants(threadId);

    res.status(200).json({
      status: 'success',
      results: participants.length,
      data: { participants }
    });
  } catch (error) {
    console.error('Error getting thread participants: - messageController.js:608', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve participants',
      error: error.message
    });
  }
};
