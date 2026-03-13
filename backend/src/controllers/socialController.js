import { getBrandMember, getBrandById } from '../models/brandModel.js';
import * as socialModel from '../models/socialModel.js';

const requireMember = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw Object.assign(new Error('Access denied'), { status: 403 });
};

// ── Platform Publishers ───────────────────────────────────────────────────────

const publishToLinkedIn = async (account, post) => {
  if (!account.access_token) return { manual: true };
  const axios = (await import('axios')).default;
  // Build LinkedIn UGC post payload
  const body = {
    author: `urn:li:person:${account.platform_account_id || 'me'}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: post.content },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  };
  const res = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
    headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' }
  });
  return { platform_post_id: res.headers['x-restli-id'] || res.data.id || 'linkedin-ok' };
};

const publishToTwitter = async (account, post) => {
  if (!account.access_token) return { manual: true };
  const axios = (await import('axios')).default;
  const res = await axios.post('https://api.twitter.com/2/tweets',
    { text: post.content.substring(0, 280) },
    { headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' } }
  );
  return { platform_post_id: res.data?.data?.id || 'twitter-ok' };
};

const publishToFacebook = async (account, post) => {
  if (!account.access_token) return { manual: true };
  const axios = (await import('axios')).default;
  const pageId = account.platform_account_id || 'me';
  const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`,
    { message: post.content, access_token: account.access_token }
  );
  return { platform_post_id: res.data?.id || 'facebook-ok' };
};

const publishToInstagram = async (account, post) => {
  if (!account.access_token) return { manual: true };
  // Instagram requires a media container first, then publish
  // For text-only posts Instagram requires a reel/image — fallback to manual
  if (!post.media_urls || !post.media_urls.length) return { manual: true };
  const axios = (await import('axios')).default;
  const igUserId = account.platform_account_id;
  // Step 1: Create container
  const container = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    image_url: post.media_urls[0],
    caption: post.content,
    access_token: account.access_token
  });
  // Step 2: Publish
  const publish = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
    creation_id: container.data.id,
    access_token: account.access_token
  });
  return { platform_post_id: publish.data?.id || 'instagram-ok' };
};

const PUBLISHERS = {
  linkedin: publishToLinkedIn,
  twitter: publishToTwitter,
  facebook: publishToFacebook,
  instagram: publishToInstagram
};

// Called by scheduler and publishNow handler
export const publishPost = async (post) => {
  const publisher = PUBLISHERS[post.platform];
  if (!publisher) throw new Error(`Unknown platform: ${post.platform}`);
  const account = {
    access_token: post.access_token,
    refresh_token: post.refresh_token,
    platform_account_id: post.platform_account_id,
    account_handle: post.account_handle
  };
  const result = await publisher(account, post);
  if (result.manual) {
    // No token — mark as published with a note
    await socialModel.markPublished(post.id, 'manual');
  } else {
    await socialModel.markPublished(post.id, result.platform_post_id);
  }
  return result;
};

// ── Accounts ─────────────────────────────────────────────────────────────────

export const listAccounts = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const accounts = await socialModel.getAccounts(brandId);
    // Strip access tokens from response for security
    const safe = accounts.map(({ access_token, refresh_token, ...a }) => ({
      ...a, has_token: !!access_token, token_expires_at: a.token_expires_at
    }));
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const connectAccount = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const account = await socialModel.createAccount({ ...req.body, brand_id: brandId });
    const { access_token, refresh_token, ...safe } = account;
    res.status(201).json({ success: true, data: { ...safe, has_token: !!access_token } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { brandId, accountId } = req.params;
    await requireMember(brandId, req.user.id);
    const account = await socialModel.updateAccount(accountId, req.body);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    const { access_token, refresh_token, ...safe } = account;
    res.json({ success: true, data: { ...safe, has_token: !!access_token } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const disconnectAccount = async (req, res) => {
  try {
    const { brandId, accountId } = req.params;
    await requireMember(brandId, req.user.id);
    await socialModel.deleteAccount(accountId, brandId);
    res.json({ success: true, message: 'Account disconnected' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── OAuth ─────────────────────────────────────────────────────────────────────

const OAUTH_CONFIGS = {
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'w_member_social r_basicprofile'
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scope: 'tweet.read tweet.write users.read'
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    scope: 'pages_manage_posts,pages_read_engagement'
  },
  instagram: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    scope: 'instagram_basic,instagram_content_publish'
  }
};

export const oauthRedirect = async (req, res) => {
  try {
    const { brandId, platform } = req.params;
    await requireMember(brandId, req.user.id);
    const brand = await getBrandById(brandId);
    const keys = brand?.social_api_keys?.[platform];
    if (!keys?.clientId) {
      return res.status(400).json({ success: false, message: `No OAuth app configured for ${platform}. Add app credentials in Brand Settings.` });
    }
    const config = OAUTH_CONFIGS[platform];
    if (!config) return res.status(400).json({ success: false, message: `Unknown platform: ${platform}` });
    const redirectUri = `${process.env.API_URL || 'https://api.saassurface.com'}/api/social/${brandId}/oauth/${platform}/callback`;
    const state = Buffer.from(JSON.stringify({ brandId, userId: req.user.id })).toString('base64');
    const params = new URLSearchParams({
      response_type: 'code', client_id: keys.clientId,
      redirect_uri: redirectUri, scope: config.scope, state
    });
    res.redirect(`${config.authUrl}?${params}`);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const oauthCallback = async (req, res) => {
  try {
    const { brandId, platform } = req.params;
    const { code, state } = req.query;
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const brand = await getBrandById(brandId);
    const keys = brand?.social_api_keys?.[platform];
    const redirectUri = `${process.env.API_URL || 'https://api.saassurface.com'}/api/social/${brandId}/oauth/${platform}/callback`;

    const axios = (await import('axios')).default;
    const TOKEN_URLS = {
      linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
      twitter: 'https://api.twitter.com/2/oauth2/token',
      facebook: 'https://graph.facebook.com/v19.0/oauth/access_token',
      instagram: 'https://graph.facebook.com/v19.0/oauth/access_token'
    };
    const tokenRes = await axios.post(TOKEN_URLS[platform], new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: redirectUri,
      client_id: keys.clientId, client_secret: keys.clientSecret
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    await socialModel.createAccount({
      brand_id: brandId, platform, access_token, refresh_token,
      token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000) : null
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://saassurface.com';
    res.redirect(`${frontendUrl}/social?connected=${platform}`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Posts ─────────────────────────────────────────────────────────────────────

export const listPosts = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const posts = await socialModel.getPosts(brandId, req.query);
    const stats = await socialModel.getPostStats(brandId);
    res.json({ success: true, data: posts, stats });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const createPost = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    // Support creating posts for multiple accounts in one call
    const { account_ids, ...postData } = req.body;
    if (Array.isArray(account_ids) && account_ids.length > 1) {
      const posts = await Promise.all(account_ids.map(id =>
        socialModel.createPost({ ...postData, brand_id: brandId, social_account_id: id, created_by: req.user.id })
      ));
      return res.status(201).json({ success: true, data: posts });
    }
    const post = await socialModel.createPost({
      ...postData,
      brand_id: brandId,
      social_account_id: account_ids?.[0] || postData.social_account_id || null,
      created_by: req.user.id
    });
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const getPost = async (req, res) => {
  try {
    const { brandId, postId } = req.params;
    await requireMember(brandId, req.user.id);
    const post = await socialModel.getPostById(postId, brandId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const { access_token, ...safe } = post;
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { brandId, postId } = req.params;
    await requireMember(brandId, req.user.id);
    const post = await socialModel.updatePost(postId, req.body);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { brandId, postId } = req.params;
    await requireMember(brandId, req.user.id);
    await socialModel.deletePost(postId, brandId);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const publishNow = async (req, res) => {
  try {
    const { brandId, postId } = req.params;
    await requireMember(brandId, req.user.id);
    const post = await socialModel.getPostById(postId, brandId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const result = await publishPost(post);
    if (result.manual) {
      return res.json({ success: true, manual: true, message: 'No API token configured — post content ready to copy', content: post.content });
    }
    res.json({ success: true, data: { platform_post_id: result.platform_post_id }, message: 'Published successfully' });
  } catch (err) {
    await socialModel.markFailed(req.params.postId, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCalendar = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const { from, to } = req.query;
    const grouped = await socialModel.getCalendarPosts(brandId, from || new Date(), to || new Date(Date.now() + 30 * 86400000));
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const generateCaption = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const { topic, platform = 'linkedin', tone = 'professional', brandName } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(503).json({ success: false, message: 'AI service not configured' });

    const charLimits = { twitter: 280, linkedin: 3000, facebook: 2200, instagram: 2200 };
    const styleTips = {
      twitter: 'Punchy, under 280 chars, 1-2 relevant hashtags only',
      linkedin: 'Professional, 150-300 chars, 3-5 hashtags, start with a hook',
      facebook: 'Conversational, engaging, can be longer, 2-3 hashtags',
      instagram: 'Engaging, include 5-10 hashtags at the end, use emojis'
    };

    const prompt = `Write a ${tone} social media post${brandName ? ` for ${brandName}` : ''} about: "${topic}".
Platform: ${platform} (${styleTips[platform] || ''}, max ${charLimits[platform] || 2000} chars).
Return ONLY valid JSON: { "caption": "the post text with hashtags at end", "hashtags": ["#tag1","#tag2"] }`;

    const axios = (await import('axios')).default;
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: 'json_object' }
    }, { headers: { Authorization: `Bearer ${openaiKey}` } });

    const result = JSON.parse(response.data.choices[0].message.content);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};


// ── Content Review (social posts) ────────────────────────────────────────────

export const sendPostForReview = async (req, res) => {
  try {
    const { brandId, postId } = req.params;
    const member = await getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ success: false, message: 'Access denied' });
    const tokenRow = await socialModel.resetPostReviewToken(postId, brandId);
    if (!tokenRow) return res.status(404).json({ success: false, message: 'Post not found' });
    const reviewUrl = `${process.env.FRONTEND_URL || ''}/review/social/${tokenRow.review_token}`;
    res.json({ success: true, data: { review_token: tokenRow.review_token, review_url: reviewUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Public — no auth required
export const publicGetPostForReview = async (req, res) => {
  try {
    const { token } = req.params;
    const post = await socialModel.getPostByReviewToken(token);
    if (!post) return res.status(404).json({ success: false, message: 'Review link not found or expired' });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Public — no auth required
export const publicSubmitPostReview = async (req, res) => {
  try {
    const { token } = req.params;
    const { review_status, review_notes, reviewer_name } = req.body;
    if (!['approved', 'changes_requested'].includes(review_status)) {
      return res.status(400).json({ success: false, message: 'Invalid review_status' });
    }
    const post = await socialModel.updatePostReview(token, { review_status, review_notes, reviewer_name });
    if (!post) return res.status(404).json({ success: false, message: 'Review link not found' });
    res.json({ success: true, data: { review_status: post.review_status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getAnalytics = async (req, res) => {
  try {
    const { brandId } = req.params;
    const member = await getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ success: false, message: 'Access denied' });
    const days = parseInt(req.query.days) || 30;
    const [byPlatform, overTime, topPosts] = await Promise.all([
      socialModel.getPostsByPlatform(brandId),
      socialModel.getEngagementOverTime(brandId, days),
      socialModel.getTopPosts(brandId, 10),
    ]);
    res.json({ success: true, data: { byPlatform, overTime, topPosts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
