import { getBrandMember } from '../models/brandModel.js';
import * as model from '../models/dripSequenceModel.js';

// ── Auth helper ──────────────────────────────────────────────────────────────

const checkAccess = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw { status: 403, message: 'Access denied' };
  return member;
};

// ── Sequences ────────────────────────────────────────────────────────────────

export const listSequences = async (req, res) => {
  try {
    const { brandId } = req.params;
    await checkAccess(brandId, req.user.id);
    const sequences = await model.getSequences(brandId);
    res.json({ sequences });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const createSequence = async (req, res) => {
  try {
    const { brandId } = req.params;
    await checkAccess(brandId, req.user.id);
    const { name, description, steps } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

    const sequence = await model.createSequence({
      brand_id: brandId,
      name: name.trim(),
      description: description || null,
      created_by: req.user.id,
    });

    // Optionally create initial steps
    if (Array.isArray(steps) && steps.length > 0) {
      for (const step of steps) {
        await model.createStep(sequence.id, step);
      }
    }

    const full = await model.getSequenceById(sequence.id, brandId);
    res.status(201).json({ sequence: full });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const getSequence = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    const sequence = await model.getSequenceById(seqId, brandId);
    if (!sequence) return res.status(404).json({ message: 'Sequence not found' });
    const stats = await model.getSequenceStats(seqId);
    res.json({ sequence, stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const updateSequence = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    const sequence = await model.updateSequence(seqId, brandId, req.body);
    if (!sequence) return res.status(404).json({ message: 'Sequence not found' });
    res.json({ sequence });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const deleteSequence = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    await model.deleteSequence(seqId, brandId);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    const stats = await model.getSequenceStats(seqId);
    res.json({ stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ── Steps ────────────────────────────────────────────────────────────────────

export const createStep = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    const { subject, html_content, delay_days, delay_hours, from_name, from_email } = req.body;
    if (!subject?.trim()) return res.status(400).json({ message: 'Subject is required' });
    const step = await model.createStep(seqId, {
      subject: subject.trim(),
      html_content: html_content || '',
      delay_days: delay_days || 0,
      delay_hours: delay_hours || 0,
      from_name,
      from_email,
    });
    res.status(201).json({ step });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const updateStep = async (req, res) => {
  try {
    const { brandId, seqId, stepId } = req.params;
    await checkAccess(brandId, req.user.id);
    const step = await model.updateStep(stepId, seqId, req.body);
    if (!step) return res.status(404).json({ message: 'Step not found' });
    res.json({ step });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const deleteStep = async (req, res) => {
  try {
    const { brandId, seqId, stepId } = req.params;
    await checkAccess(brandId, req.user.id);
    await model.deleteStep(stepId, seqId);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const reorderSteps = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids must be an array' });
    await model.reorderSteps(seqId, ids);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ── Enrollments ──────────────────────────────────────────────────────────────

export const getEnrollments = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    const enrollments = await model.getEnrollments(seqId, brandId, req.query);
    res.json({ enrollments });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const enrollContacts = async (req, res) => {
  try {
    const { brandId, seqId } = req.params;
    await checkAccess(brandId, req.user.id);
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || !contacts.length) {
      return res.status(400).json({ message: 'contacts array required' });
    }

    // Validate sequence belongs to brand
    const sequence = await model.getSequenceById(seqId, brandId);
    if (!sequence) return res.status(404).json({ message: 'Sequence not found' });

    const results = { enrolled: 0, skipped: 0 };
    for (const contact of contacts) {
      if (!contact.email) continue;
      const enrollment = await model.enroll({
        sequence_id: seqId,
        brand_id: brandId,
        contact_email: contact.email.toLowerCase().trim(),
        contact_name: contact.name || null,
        client_id: contact.client_id || null,
      });
      if (enrollment) results.enrolled++;
      else results.skipped++;
    }
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const unenroll = async (req, res) => {
  try {
    const { brandId, seqId, enrollmentId } = req.params;
    await checkAccess(brandId, req.user.id);
    await model.unenroll(enrollmentId, brandId);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ── Public: unsubscribe ───────────────────────────────────────────────────────

export const unsubscribe = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h2>Invalid unsubscribe link.</h2>');

    let enrollmentId, sequenceId;
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      [enrollmentId, sequenceId] = decoded.split(':');
    } catch {
      return res.status(400).send('<h2>Invalid unsubscribe link.</h2>');
    }

    if (!enrollmentId || !sequenceId) {
      return res.status(400).send('<h2>Invalid unsubscribe link.</h2>');
    }

    await model.unenroll(enrollmentId, null); // null brandId — skip brand check for public endpoint

    res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;}
.card{background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,0.08);max-width:400px;}
h1{color:#1e293b;margin-bottom:8px;}p{color:#64748b;}</style></head>
<body><div class="card">
<div style="font-size:48px;margin-bottom:16px">✅</div>
<h1>You've been unsubscribed</h1>
<p>You'll no longer receive emails from this sequence. No further action is needed.</p>
</div></body></html>`);
  } catch (err) {
    res.status(500).send('<h2>An error occurred. Please try again.</h2>');
  }
};
