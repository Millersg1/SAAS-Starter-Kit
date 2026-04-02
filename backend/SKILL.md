# SAAS Surface API — OpenClaw Skill

**TRIGGER:** When interacting with the SAAS Surface Agency OS platform API

**Base URL:** `https://api.saassurface.com`

---

## Authentication

| Method | Header/Param | Format |
|--------|-------------|--------|
| JWT Bearer | `Authorization: Bearer <accessToken>` | Login returns accessToken (7d) + refreshToken (30d) |
| API Key | `X-API-Key: sk_...` or `?api_key=sk_...` | Scopes: `*`, `read`, `write`, `resource:action` |
| Portal JWT | `Authorization: Bearer <portalToken>` | Client portal login returns portal-specific token |

---

## Plan Tiers

| Plan | Price | Brands | Clients | Emails/mo |
|------|-------|--------|---------|-----------|
| Free | $0 | 1 | 50 | 500 |
| Starter | $29 | 2 | 500 | 5,000 |
| Professional | $79 | 5 | 2,000 | 25,000 |
| Agency | $199 | 25 | 10,000 | 100,000 |
| Enterprise | $499 | Unlimited | Unlimited | Unlimited |

---

## 1. Auth (`/api/auth`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/register` | public | `name, email, password, role` | Register user |
| POST | `/login` | public | `email, password` | Login, returns `accessToken, refreshToken` |
| POST | `/refresh` | public | `refreshToken` | Refresh access token |
| POST | `/forgot-password` | public | `email` | Request password reset |
| POST | `/reset-password/:token` | public | `password` | Reset password |
| GET | `/verify-email/:token` | public | — | Verify email |
| GET | `/me` | protected | — | Get current user |
| POST | `/logout` | protected | — | Invalidate token |
| PATCH | `/update-password` | protected | `currentPassword, newPassword` | Change password |
| POST | `/2fa/setup` | protected | — | Returns QR code for TOTP |
| POST | `/2fa/enable` | protected | `secret, token` | Enable 2FA |
| POST | `/2fa/disable` | protected | `password` | Disable 2FA |
| POST | `/2fa/verify` | public | `temp_token, code` | Verify 2FA code |

## 2. Users (`/api/users`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/me` | protected | — | Get profile |
| PATCH | `/me` | protected | `name, phone, bio, avatar_url` | Update profile |
| PATCH | `/me/preferences` | protected | `preferences` (object) | Update preferences |
| DELETE | `/me` | protected | — | Soft delete account |

## 3. Brands (`/api/brands`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/` | protected | `name, slug` | Create brand |
| GET | `/` | protected | — | List user's brands |
| GET | `/:brandId` | protected | — | Get brand details |
| PATCH | `/:brandId` | protected | `name, logo_url, primary_color` | Update brand |
| DELETE | `/:brandId` | protected | — | Delete brand |
| GET | `/:brandId/members` | protected | — | List members |
| POST | `/:brandId/members` | protected | `email, role` | Add member |
| PATCH | `/:brandId/members/:memberId` | protected | `role` | Update role |
| DELETE | `/:brandId/members/:memberId` | protected | — | Remove member |
| GET | `/:brandId/voice` | protected | — | Brand voice profile |
| PATCH | `/:brandId/voice` | protected | voice config | Update voice profile |

## 4. Clients (`/api/clients`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/assigned` | protected | — | Assigned clients |
| GET | `/:brandId/stats` | protected | — | Client statistics |
| GET | `/:brandId/tags` | protected | — | List all tags |
| POST | `/:brandId/bulk-tag` | protected | `client_ids[], tag` | Bulk tag clients |
| GET | `/:brandId/portal-activity` | protected | — | Portal usage stats |
| POST | `/:brandId/import` | protected | CSV file | Bulk CSV import |
| POST | `/:brandId` | protected | `name, email, phone, company, status` | Create client |
| GET | `/:brandId` | protected | `?search, status, tags, page, limit` | List clients |
| GET | `/:brandId/:clientId` | protected | — | Get client |
| PATCH | `/:brandId/:clientId` | protected | client fields | Update client |
| DELETE | `/:brandId/:clientId` | protected | — | Delete client |
| POST | `/:brandId/:clientId/portal/enable` | protected | `password` | Enable portal access |
| POST | `/:brandId/:clientId/portal/disable` | protected | — | Disable portal access |

## 5. Contacts (`/api/contacts`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/` | protected | — | List contacts |
| POST | `/` | protected | `name, email, phone` | Create contact |
| GET | `/:id` | protected | — | Get contact |
| PUT | `/:id` | protected | contact fields | Update contact |
| DELETE | `/:id` | protected | — | Delete contact |

## 6. Projects (`/api/projects`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/assigned` | protected | — | User's assigned projects |
| GET | `/client/:clientId` | protected | — | Client's projects |
| POST | `/:brandId` | protected | `name, description, client_id, status, priority, budget` | Create project |
| GET | `/:brandId` | protected | — | List projects |
| GET | `/:brandId/stats` | protected | — | Project statistics |
| GET | `/:brandId/:projectId` | protected | — | Get project |
| PATCH | `/:brandId/:projectId` | protected | project fields | Update project |
| DELETE | `/:brandId/:projectId` | protected | — | Delete project |
| POST | `/:brandId/:projectId/updates` | protected | `title, content, visible_to_client` | Create update |
| GET | `/:brandId/:projectId/updates` | protected | — | List updates |

## 7. Documents (`/api/documents`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/:brandId/upload` | protected | `file` (multipart) | Upload document |
| GET | `/:brandId` | protected | — | List documents |
| GET | `/:brandId/stats` | protected | — | Document statistics |
| GET | `/:brandId/:documentId` | protected | — | Get document |
| PATCH | `/:brandId/:documentId` | protected | metadata fields | Update metadata |
| DELETE | `/:brandId/:documentId` | protected | — | Delete document |
| GET | `/:brandId/:documentId/download` | protected | — | Download file |
| GET | `/project/:projectId` | protected | — | Project documents |
| GET | `/client/:clientId` | protected | — | Client documents |
| POST | `/:brandId/:documentId/share` | protected | share config | Share document |
| POST | `/:brandId/:documentId/versions` | protected | `file` | Create version |

## 8. Invoices (`/api/invoices`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/:brandId/invoices` | protected | `client_id, items[], due_date, currency, notes` | Create invoice |
| GET | `/:brandId/invoices` | protected | `?status, client_id, search` | List invoices |
| GET | `/:brandId/invoices/:invoiceId` | protected | — | Get invoice with items & payments |
| PATCH | `/:brandId/invoices/:invoiceId` | protected | invoice fields | Update invoice |
| DELETE | `/:brandId/invoices/:invoiceId` | protected | — | Delete invoice |
| POST | `/:brandId/invoices/:invoiceId/items` | protected | `description, quantity, unit_price, tax_rate` | Add line item |
| PATCH | `/:brandId/invoices/:invoiceId/items/:itemId` | protected | item fields | Update item |
| DELETE | `/:brandId/invoices/:invoiceId/items/:itemId` | protected | — | Delete item |
| POST | `/:brandId/invoices/:invoiceId/payments` | protected | `amount, payment_method` | Record payment |
| GET | `/:brandId/invoices/:invoiceId/payments` | protected | — | Payment history |
| GET | `/:brandId/stats` | protected | — | Invoice statistics |
| GET | `/:brandId/overdue` | protected | — | Overdue invoices |
| POST | `/:brandId/invoices/:invoiceId/share-link` | protected | — | Generate public payment link |

## 9. Proposals (`/api/proposals`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List proposals |
| POST | `/` | protected | `brand_id, client_id, title, items[]` | Create proposal |
| GET | `/item/:proposalId` | protected | — | Get proposal |
| PATCH | `/:proposalId` | protected | proposal fields | Update |
| DELETE | `/:proposalId` | protected | — | Delete |
| POST | `/:proposalId/send` | protected | — | Send to client |
| POST | `/:proposalId/convert` | protected | — | Convert to invoice |
| POST | `/:proposalId/items` | protected | `description, quantity, unit_price` | Add item |
| PATCH | `/:proposalId/items/:itemId` | protected | item fields | Update item |
| DELETE | `/:proposalId/items/:itemId` | protected | — | Delete item |

## 10. Contracts (`/api/contracts`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List contracts |
| POST | `/:brandId` | protected | `title, content, client_id` | Create contract |
| GET | `/:brandId/:contractId` | protected | — | Get contract |
| PATCH | `/:brandId/:contractId` | protected | contract fields | Update |
| POST | `/:brandId/:contractId/send` | protected | — | Send for signature |
| DELETE | `/:brandId/:contractId` | protected | — | Delete |

## 11. Pipeline & Deals (`/api/pipeline`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/pipelines` | protected | — | List pipelines |
| POST | `/:brandId/pipelines` | protected | `name, stages[]` | Create pipeline |
| PATCH | `/:brandId/pipelines/:pipelineId` | protected | pipeline fields | Update |
| DELETE | `/:brandId/pipelines/:pipelineId` | protected | — | Delete |
| GET | `/:brandId/summary` | protected | — | Pipeline summary |
| GET | `/:brandId` | protected | — | List deals |
| POST | `/:brandId` | protected | `name, value, stage, client_id` | Create deal |
| GET | `/:brandId/deals/:dealId` | protected | — | Get deal |
| PATCH | `/:brandId/deals/:dealId` | protected | deal fields | Update deal |
| DELETE | `/:brandId/deals/:dealId` | protected | — | Delete deal |

## 12. Tasks (`/api/tasks`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List tasks |
| POST | `/:brandId` | protected | `title, description, due_date, priority, assigned_to` | Create task |
| GET | `/:brandId/:taskId` | protected | — | Get task |
| PATCH | `/:brandId/:taskId` | protected | task fields | Update |
| POST | `/:brandId/:taskId/complete` | protected | — | Mark complete |
| DELETE | `/:brandId/:taskId` | protected | — | Delete |
| GET | `/:brandId/workload/team` | protected | — | Team workload |

## 13. Time Tracking (`/api/time`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List entries |
| GET | `/:brandId/active-timer` | protected | — | Active timer |
| GET | `/project/:projectId` | protected | — | Project entries |
| POST | `/` | protected | `brand_id, project_id, description, hours, date` | Create entry |
| PATCH | `/:entryId` | protected | entry fields | Update |
| DELETE | `/:entryId` | protected | — | Delete |
| POST | `/:entryId/add-to-invoice` | protected | — | Add to invoice |

## 14. Email Threads (`/api/emails`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/threads` | protected | — | List email threads |
| GET | `/:brandId/threads/:threadId` | protected | — | Get thread |
| POST | `/:brandId/threads/:threadId/reply` | protected | `content` | Reply |
| GET | `/:brandId/unread-count` | protected | — | Unread count |

## 15. Email Connections (`/api/email-connections`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List connections |
| POST | `/:brandId` | protected | `host, port, user, password, type` | Create IMAP connection |
| DELETE | `/:brandId/:connectionId` | protected | — | Delete |
| POST | `/:brandId/:connectionId/test` | protected | — | Test connection |
| POST | `/:brandId/:connectionId/sync` | protected | — | Sync now |

## 16. SMS (`/api/sms`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/connection` | protected | — | Get SMS provider |
| POST | `/:brandId/connection` | protected | `account_sid, auth_token, phone_number` | Configure |
| DELETE | `/:brandId/connection` | protected | — | Remove |
| GET | `/:brandId/conversations` | protected | — | List conversations |
| GET | `/:brandId/messages` | protected | — | List messages |
| POST | `/:brandId/send` | protected | `to, body` | Send SMS |
| GET | `/:brandId/broadcasts` | protected | — | List broadcasts |
| POST | `/:brandId/broadcasts` | protected | `name, message, recipients[]` | Create broadcast |
| POST | `/:brandId/broadcasts/:broadcastId/send` | protected | — | Send broadcast |

## 17. Messages (`/api/messages`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/:brandId/threads` | protected | `subject, participants[]` | Create thread |
| GET | `/:brandId/threads` | protected | — | List threads |
| GET | `/:brandId/threads/:threadId` | protected | — | Get thread |
| PATCH | `/:brandId/threads/:threadId` | protected | thread fields | Update |
| DELETE | `/:brandId/threads/:threadId` | protected | — | Archive |
| POST | `/:brandId/threads/:threadId/messages` | protected | `content` | Send message |
| GET | `/:brandId/threads/:threadId/messages` | protected | — | Get messages |
| GET | `/:brandId/unread` | protected | — | Unread count |
| GET | `/:brandId/search` | protected | `?q` | Search messages |

## 18. Chat Widget (`/api/chat-widget`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/widget.js` | public | — | Download widget script |
| GET | `/:brandId/config` | public | — | Widget config |
| POST | `/:brandId/session` | public | `visitor_name, visitor_email` | Start session |
| POST | `/:brandId/session/:sessionId/message` | public | `content` | Send message |
| GET | `/:brandId/settings` | protected | — | Get settings |
| PATCH | `/:brandId/settings` | protected | widget config | Save settings |
| GET | `/:brandId/sessions` | protected | — | List sessions |
| POST | `/:brandId/sessions/:sessionId/reply` | protected | `content` | Reply as agent |
| POST | `/:brandId/sessions/:sessionId/convert` | protected | — | Convert to contact |

## 19. Campaigns (`/api/campaigns`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List campaigns |
| POST | `/:brandId` | protected | `name, subject, html_content` | Create campaign |
| GET | `/:brandId/:campaignId` | protected | — | Get campaign |
| PATCH | `/:brandId/:campaignId` | protected | campaign fields | Update |
| DELETE | `/:brandId/:campaignId` | protected | — | Delete |
| POST | `/:brandId/:campaignId/send` | protected | — | Send campaign |
| POST | `/:brandId/:campaignId/recipients` | protected | `recipients[]` | Add recipients |
| GET | `/:brandId/:campaignId/variants` | protected | — | A/B test variants |

## 20. Drip Sequences (`/api/drip`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List sequences |
| POST | `/:brandId` | protected | `name, trigger_type` | Create sequence |
| GET | `/:brandId/:seqId` | protected | — | Get sequence |
| PATCH | `/:brandId/:seqId` | protected | sequence fields | Update |
| DELETE | `/:brandId/:seqId` | protected | — | Delete |
| GET | `/:brandId/:seqId/stats` | protected | — | Sequence stats |
| POST | `/:brandId/:seqId/steps` | protected | `subject, body, delay_hours` | Create step |
| PATCH | `/:brandId/:seqId/steps/:stepId` | protected | step fields | Update step |
| DELETE | `/:brandId/:seqId/steps/:stepId` | protected | — | Delete step |
| POST | `/:brandId/:seqId/enrollments` | protected | `contact_emails[]` | Enroll contacts |
| DELETE | `/:brandId/:seqId/enrollments/:enrollmentId` | protected | — | Unenroll |

## 21. Funnels (`/api/funnels`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/view/:funnelSlug` | public | — | View funnel |
| GET | `/view/:funnelSlug/:stepSlug` | public | — | View step |
| POST | `/submit/:stepId` | public | form data | Submit form |
| GET | `/:brandId` | protected | — | List funnels |
| POST | `/:brandId` | protected | `name, slug` | Create funnel |
| GET | `/:brandId/:funnelId` | protected | — | Get funnel |
| PATCH | `/:brandId/:funnelId` | protected | funnel fields | Update |
| DELETE | `/:brandId/:funnelId` | protected | — | Delete |
| GET | `/:brandId/:funnelId/stats` | protected | — | Funnel stats |
| POST | `/:brandId/:funnelId/steps` | protected | `name, slug, html_content` | Create step |
| PATCH | `/:brandId/:funnelId/steps/:stepId` | protected | step fields | Update step |
| DELETE | `/:brandId/:funnelId/steps/:stepId` | protected | — | Delete step |

## 22. Lead Forms (`/api/lead-forms`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/submit/:slug` | public | form data | Submit form |
| GET | `/view/:slug` | public | — | View form |
| GET | `/:brandId` | protected | — | List forms |
| POST | `/:brandId` | protected | `name, slug, fields[]` | Create form |
| PATCH | `/:brandId/:formId` | protected | form fields | Update |
| DELETE | `/:brandId/:formId` | protected | — | Delete |
| GET | `/:brandId/submissions/all` | protected | — | All submissions |
| GET | `/:brandId/:formId/submissions` | protected | — | Form submissions |
| POST | `/:brandId/submissions/:submissionId/convert` | protected | — | Convert to client |

## 23. Bookings (`/api/bookings`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/public/:slug` | public | — | Get booking page |
| GET | `/public/:slug/slots` | public | `?date` | Available slots |
| POST | `/public/:slug/book` | public | `name, email, start_time` | Create booking |
| POST | `/public/cancel/:token` | public | — | Cancel booking |
| GET | `/:brandId` | protected | — | List booking pages |
| POST | `/:brandId` | protected | `name, slug, duration, availability` | Create page |
| PATCH | `/:brandId/:pageId` | protected | page fields | Update |
| DELETE | `/:brandId/:pageId` | protected | — | Delete |
| GET | `/:brandId/bookings/list` | protected | — | List bookings |

## 24. Calendar (`/api/calendar`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List events |
| POST | `/:brandId` | protected | `title, start, end, description` | Create event |
| PATCH | `/:brandId/:eventId` | protected | event fields | Update |
| DELETE | `/:brandId/:eventId` | protected | — | Delete |

## 25. Tickets (`/api/tickets`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List tickets |
| POST | `/:brandId` | protected | `subject, description, priority, client_id` | Create ticket |
| GET | `/:brandId/:ticketId` | protected | — | Get ticket |
| PATCH | `/:brandId/:ticketId` | protected | ticket fields | Update |
| POST | `/:brandId/:ticketId/reply` | protected | `content` | Reply |
| DELETE | `/:brandId/:ticketId` | protected | — | Delete |

## 26. Surveys (`/api/surveys`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List surveys |
| POST | `/:brandId` | protected | `name, type, questions[]` | Create survey |
| PATCH | `/:brandId/:id` | protected | survey fields | Update |
| DELETE | `/:brandId/:id` | protected | — | Delete |
| POST | `/:brandId/:id/send` | protected | `client_id` | Send to client |
| GET | `/:brandId/:id/responses` | protected | — | Get responses |
| GET | `/:brandId/:id/stats` | protected | — | Survey stats |

## 27. Workflows (`/api/workflows`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List workflows |
| POST | `/:brandId` | protected | `name, trigger_type, workflow_definition` | Create workflow |
| GET | `/:brandId/:workflowId` | protected | — | Get workflow |
| PATCH | `/:brandId/:workflowId` | protected | workflow fields | Update |
| DELETE | `/:brandId/:workflowId` | protected | — | Delete |
| GET | `/:brandId/:workflowId/enrollments` | protected | — | Get enrollments |
| POST | `/:brandId/:workflowId/enroll` | protected | `entity_id, entity_type` | Manual enroll |
| POST | `/:brandId/:workflowId/test` | protected | `entity_id` | Test/dry-run |

**Trigger types:** `client_created`, `deal_created`, `deal_won`, `deal_lost`, `invoice_paid`, `invoice_overdue`, `proposal_accepted`, `booking_created`, `lead_submitted`, `form_submitted`, `churn_risk`, `project_completed`, `task_completed`

**Node types:** `trigger`, `condition`, `send_email`, `send_sms`, `create_task`, `add_tag`, `remove_tag`, `move_pipeline_stage`, `enroll_in_drip`, `create_note`, `send_webhook`, `wait`

## 28. Analytics (`/api/analytics`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/revenue` | protected | — | Revenue analytics |
| GET | `/:brandId/conversion` | protected | — | Conversion analytics |
| GET | `/:brandId/pipeline` | protected | — | Pipeline analytics |
| GET | `/:brandId/forecast` | protected | — | Revenue forecast |
| GET | `/:brandId/health-scores` | protected | — | All client health scores |
| GET | `/:brandId/health-scores/:clientId` | protected | — | Single client health |
| GET | `/:brandId/deal-scores` | protected | — | Deal AI scores |
| GET | `/:brandId/deal-scores/:dealId` | protected | — | Single deal score |
| GET | `/:brandId/team-performance` | protected | — | Team performance |

## 29. AI Services (`/api/ai`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/:brandId/draft-invoice` | protected | `client_id, context` | AI draft invoice |
| POST | `/:brandId/draft-proposal` | protected | `client_id, context` | AI draft proposal |
| POST | `/:brandId/draft-email` | protected | `to, context, tone` | AI draft email |
| POST | `/:brandId/transcribe-notes` | protected | `audio` (file) | Transcribe audio |
| POST | `/:brandId/pipeline-advice` | protected | `deal_id` | Pipeline insights |
| POST | `/:brandId/cms-content` | protected | `topic, type, tone` | Generate content |
| POST | `/:brandId/social-caption` | protected | `topic, platform` | Generate caption |
| GET | `/:brandId/client-insights/:clientId` | protected | — | Client insights |

## 30. Voice Agents (`/api/voice-agents`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/agents` | protected | — | List agents |
| GET | `/:brandId/agents/:agentId` | protected | — | Get agent |
| POST | `/:brandId/agents` | protected | `name, personality, greeting, voice, model` | Create agent |
| PATCH | `/:brandId/agents/:agentId` | protected | agent fields | Update |
| DELETE | `/:brandId/agents/:agentId` | protected | — | Delete |
| GET | `/:brandId/calls` | protected | `?agent_id, page, limit` | Call history |
| GET | `/:brandId/calls/active` | protected | — | Active calls |
| GET | `/:brandId/calls/:callId` | protected | — | Get call details |
| GET | `/:brandId/stats` | protected | — | Call statistics |
| POST | `/:brandId/agents/:agentId/call` | protected | `to` (phone number) | Initiate outbound call |

## 31. CMS (`/api/cms`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/sites` | protected | — | List sites |
| POST | `/:brandId/sites` | protected | `name, domain` | Create site |
| GET | `/:brandId/sites/:siteId` | protected | — | Get site |
| PATCH | `/:brandId/sites/:siteId` | protected | site fields | Update |
| DELETE | `/:brandId/sites/:siteId` | protected | — | Delete |
| GET | `/:brandId/pages` | protected | — | List pages |
| POST | `/:brandId/pages` | protected | `title, slug, content` | Create page |
| GET | `/:brandId/pages/:pageId` | protected | — | Get page |
| PATCH | `/:brandId/pages/:pageId` | protected | page fields | Update |
| DELETE | `/:brandId/pages/:pageId` | protected | — | Delete |
| POST | `/:brandId/ai-content` | protected | `topic, type` | AI content generation |

## 32. Social Media (`/api/social`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/accounts` | protected | — | List accounts |
| POST | `/:brandId/accounts` | protected | `platform, access_token` | Connect account |
| DELETE | `/:brandId/accounts/:accountId` | protected | — | Disconnect |
| GET | `/:brandId/posts` | protected | — | List posts |
| POST | `/:brandId/posts` | protected | `content, platform, scheduled_at` | Create post |
| PATCH | `/:brandId/posts/:postId` | protected | post fields | Update |
| DELETE | `/:brandId/posts/:postId` | protected | — | Delete |
| POST | `/:brandId/posts/:postId/publish` | protected | — | Publish now |
| GET | `/:brandId/calendar` | protected | — | Social calendar |
| GET | `/:brandId/analytics` | protected | — | Analytics |
| POST | `/:brandId/ai-caption` | protected | `topic, platform` | AI caption |

## 33. Reputation (`/api/reputation`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/settings` | protected | — | Get settings |
| PATCH | `/:brandId/settings` | protected | settings | Save settings |
| GET | `/:brandId/stats` | protected | — | Reputation stats |
| GET | `/:brandId/requests` | protected | — | Review requests |
| POST | `/:brandId/requests` | protected | `client_id` | Send review request |
| GET | `/:brandId/reviews` | protected | — | List reviews |
| POST | `/:brandId/reviews` | protected | `rating, content, source` | Add review |
| PATCH | `/:brandId/reviews/:reviewId` | protected | review fields | Update |
| DELETE | `/:brandId/reviews/:reviewId` | protected | — | Delete |

## 34. Subscriptions (`/api/subscriptions`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/plans` | public | — | List available plans |
| GET | `/plans/:planId` | public | — | Get plan details |
| POST | `/:brandId` | protected | `plan_id` | Create subscription |
| GET | `/:brandId` | protected | — | Current subscription |
| PATCH | `/:brandId` | protected | `plan_id` | Upgrade/downgrade |
| DELETE | `/:brandId` | protected | — | Cancel |
| POST | `/:brandId/resume` | protected | — | Resume canceled |
| POST | `/:brandId/payment-methods` | protected | `token` | Add payment method |
| GET | `/:brandId/payment-methods` | protected | — | List methods |
| GET | `/:brandId/billing-history` | protected | — | Billing history |
| GET | `/:brandId/upcoming-invoice` | protected | — | Upcoming invoice |

## 35. Super Admin (`/api/superadmin`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/stats` | superadmin | — | Platform statistics |
| GET | `/users` | superadmin | — | All users |
| PATCH | `/users/:id` | superadmin | `is_active, role, is_superadmin` | Edit user |
| DELETE | `/users/:id` | superadmin | — | Delete user |
| GET | `/brands` | superadmin | — | All brands |
| DELETE | `/brands/:id` | superadmin | — | Delete brand |
| GET | `/subscriptions` | superadmin | — | All subscriptions |
| PATCH | `/subscriptions/:id` | superadmin | `status, trial_end` | Update |
| GET | `/audit` | superadmin | — | Audit logs |
| POST | `/fix` | superadmin | `operation` | Run admin fixes |

## 36. Export (`/api/export`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/clients/:brandId` | protected | — | Export clients CSV |
| GET | `/projects/:brandId` | protected | — | Export projects CSV |
| GET | `/invoices/:brandId` | protected | — | Export invoices CSV |
| GET | `/tasks/:brandId` | protected | — | Export tasks CSV |
| GET | `/messages/:brandId` | protected | — | Export messages CSV |
| POST | `/:brandId/custom` | protected | `entity_type, fields[], filters` | Custom export |

## 37. Bulk Operations (`/api/bulk`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/:brandId/invoices/send` | protected | `invoice_ids[]` | Bulk send invoices |
| POST | `/:brandId/invoices/delete` | protected | `invoice_ids[]` | Bulk delete invoices |
| POST | `/:brandId/clients/delete` | protected | `client_ids[]` | Bulk delete clients |
| POST | `/:brandId/deals/update` | protected | `deal_ids[], updates` | Bulk update deals |
| POST | `/:brandId/tasks/complete` | protected | `task_ids[]` | Bulk complete tasks |
| POST | `/:brandId/tasks/delete` | protected | `task_ids[]` | Bulk delete tasks |
| POST | `/:brandId/email` | protected | `client_ids[], subject, body` | Bulk email |

## 38. Custom Fields (`/api/custom-fields`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List fields |
| POST | `/:brandId` | protected | `name, field_type, entity_type` | Create field |
| PATCH | `/:brandId/:fieldId` | protected | field config | Update |
| DELETE | `/:brandId/:fieldId` | protected | — | Delete |
| POST | `/:brandId/reorder` | protected | `field_ids[]` | Reorder |

## 39. Segments (`/api/segments`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List segments |
| POST | `/:brandId` | protected | `name, conditions[]` | Create segment |
| POST | `/:brandId/preview` | protected | `conditions[]` | Preview segment |
| PATCH | `/:brandId/:segmentId` | protected | segment fields | Update |
| DELETE | `/:brandId/:segmentId` | protected | — | Delete |
| GET | `/:brandId/:segmentId/clients` | protected | — | Get matching clients |

## 40. Service Packages (`/api/packages`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/packages` | protected | — | List packages |
| POST | `/:brandId/packages` | protected | `name, description, price, billing_interval` | Create |
| GET | `/:brandId/packages/:packageId` | protected | — | Get package |
| PATCH | `/:brandId/packages/:packageId` | protected | package fields | Update |
| DELETE | `/:brandId/packages/:packageId` | protected | — | Delete |
| POST | `/:brandId/packages/:packageId/usage` | protected | `amount, description` | Log usage |
| GET | `/:brandId/packages/:packageId/usage` | protected | — | Usage history |

## 41. Client Reports (`/api/client-reports`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/reports` | protected | — | List reports |
| POST | `/:brandId/reports/generate` | protected | `client_id, template_id, date_range` | Generate report |
| GET | `/:brandId/reports/:reportId` | protected | — | Get report |
| DELETE | `/:brandId/reports/:reportId` | protected | — | Delete |
| GET | `/:brandId/templates` | protected | — | List templates |
| POST | `/:brandId/templates` | protected | `name, sections[]` | Create template |
| DELETE | `/:brandId/templates/:templateId` | protected | — | Delete template |

## 42. Churn Prediction (`/api/churn`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/churn` | protected | — | All predictions |
| GET | `/:brandId/churn/:clientId` | protected | — | Single client prediction |
| POST | `/:brandId/churn/recalculate` | protected | — | Recalculate all |

## 43. White Label (`/api/white-label`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | Get settings |
| PATCH | `/:brandId` | protected | `custom_domain, logo_url, colors` | Update |
| POST | `/:brandId/verify-domain` | protected | `domain` | Verify custom domain |

## 44. API Keys (`/api/api-keys`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List keys |
| POST | `/:brandId` | protected | `name, scopes[]` | Create key (returns full key once) |
| PATCH | `/:brandId/:keyId` | protected | `name, scopes, status` | Update |
| DELETE | `/:brandId/:keyId` | protected | — | Revoke |

## 45. Webhook Endpoints (`/api/webhooks/endpoints`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List endpoints |
| POST | `/:brandId` | protected | `url, events[]` | Create endpoint |
| PATCH | `/:brandId/:endpointId` | protected | endpoint fields | Update |
| DELETE | `/:brandId/:endpointId` | protected | — | Delete |
| GET | `/:brandId/:endpointId/deliveries` | protected | — | Delivery log |

**Webhook events:** `client.created`, `client.updated`, `client.deleted`, `invoice.created`, `invoice.paid`, `invoice.overdue`, `deal.created`, `deal.moved`, `deal.won`, `deal.lost`, `project.created`, `project.completed`, `task.created`, `task.completed`, `lead.submitted`, `booking.created`, `proposal.accepted`, `proposal.rejected`, `contract.signed`, `ticket.created`, `chat.message`, `form.submitted`

## 46. GDPR (`/api/gdpr`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/export` | protected | — | Request data export |
| POST | `/delete` | protected | `confirmation: "DELETE MY ACCOUNT"` | Request deletion (30-day grace) |
| GET | `/requests` | protected | — | Get GDPR requests |
| DELETE | `/delete` | protected | — | Cancel deletion |
| GET | `/retention/:brandId` | protected | — | Retention policies |
| PUT | `/retention/:brandId` | protected | `entity_type, retention_days, auto_delete` | Update policy |

## 47. Zapier Integration (`/api/zapier`)

All endpoints use API key auth via `X-API-Key` header.

| Method | Path | Body/Params | Description |
|--------|------|-------------|-------------|
| GET | `/me` | — | Auth test |
| POST | `/hooks/subscribe` | `hookUrl, event` | Subscribe to webhook |
| DELETE | `/hooks/subscribe/:hookId` | — | Unsubscribe |
| GET | `/triggers/new-clients` | — | Poll new clients |
| GET | `/triggers/new-invoices` | — | Poll new invoices |
| GET | `/triggers/new-deals` | — | Poll new deals |
| GET | `/triggers/new-leads` | — | Poll new leads |
| GET | `/triggers/new-bookings` | — | Poll new bookings |
| POST | `/actions/create-client` | `name, email, phone, company` | Create client |
| POST | `/actions/create-task` | `title, description, due_date, priority` | Create task |
| POST | `/actions/create-note` | `client_id, content, activity_type` | Create note |

## 48. Client Portal (`/api/portal`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/login` | public | `email, password, brandId` | Portal login |
| GET | `/me` | portal | — | Current client |
| GET | `/projects` | portal | — | Client projects |
| GET | `/documents` | portal | — | Client documents |
| GET | `/invoices` | portal | — | Client invoices |
| POST | `/invoices/:invoiceId/pay` | portal | — | Pay invoice (Stripe checkout) |
| POST | `/invoices/:invoiceId/sign` | portal | `signature, signer_name` | E-sign invoice |
| GET | `/messages` | portal | — | Message threads |
| GET | `/messages/:threadId` | portal | — | Get thread |
| POST | `/messages/:threadId` | portal | `content` | Send message |
| GET | `/proposals` | portal | — | Client proposals |
| GET | `/proposals/:proposalId` | portal | — | View proposal |
| POST | `/proposals/:proposalId/accept` | portal | `signature, signer_name` | Accept proposal |
| POST | `/proposals/:proposalId/reject` | portal | `reason` | Reject proposal |
| GET | `/contracts` | portal | — | Client contracts |
| POST | `/contracts/:contractId/sign` | portal | `signature, signer_name` | Sign contract |
| GET | `/tickets` | portal | — | Client tickets |
| POST | `/tickets` | portal | `subject, description` | Create ticket |
| POST | `/tickets/:ticketId/reply` | portal | `content` | Reply |
| GET | `/voice-agents` | portal | — | Available voice agents |
| POST | `/voice-agents/:agentId/request-call` | portal | `phone` | Request callback |
| GET | `/voice-agent-calls` | portal | — | Client's call history |

## 49. Public Endpoints (`/api/public`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/invoice/:token` | public | — | View invoice by public token |
| POST | `/invoice/:token/pay` | public | — | Create payment checkout |
| POST | `/contact` | public | `name, email, message, brandId` | Contact form |
| GET | `/survey/:token` | public | — | View survey |
| POST | `/survey/:token` | public | `responses` | Submit survey |

## 50. Utility Endpoints

### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:brandId` | protected | Get notifications |
| GET | `/:brandId/count` | protected | Unread count |

### Search (`/api/search`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:brandId` | protected | Global search (`?q=term`) |
| GET | `/:brandId/suggestions` | protected | Search suggestions |

### Activity Feed (`/api/activity-feed`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:brandId` | protected | Activity feed |
| GET | `/:brandId/summary` | protected | Activity summary |

### Audit (`/api/audit`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:brandId` | protected | Audit logs |
| GET | `/:brandId/stats` | protected | Audit statistics |
| GET | `/:brandId/search` | protected | Search logs |

### Enrichment (`/api/enrichment`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:brandId/enrich/:clientId` | protected | Enrich client data |

### Email Health (`/api/email-health`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:brandId/check/:domain` | protected | Check SPF/DKIM/DMARC |
| GET | `/:brandId/bounces` | protected | Bounce statistics |

### Upload (`/api/upload`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/image` | protected | Upload & optimize image (multipart) |

### Stripe Connect (`/api/connect`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:brandId/status` | protected | Connect status |
| POST | `/:brandId/onboard` | protected | Create onboarding link |
| GET | `/:brandId/return` | protected | Handle onboarding return |

### Google Calendar (`/api/google-calendar`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/callback` | public | OAuth callback |
| GET | `/:brandId/connection` | protected | Get connection |
| POST | `/:brandId/auth` | protected | Initiate OAuth |
| DELETE | `/:brandId/connection` | protected | Disconnect |
| POST | `/:brandId/sync` | protected | Sync now |

### Outlook Calendar (`/api/outlook-calendar`)
Same pattern as Google Calendar above.

### Email Tracking (`/api/track`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/open/:recipientId` | public | Track open (pixel) |
| GET | `/click/:recipientId` | public | Track click |
| GET | `/drip/open/:trackingId` | public | Drip open tracking |
| GET | `/drip/click/:trackingId` | public | Drip click tracking |

### Health Check
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | public | System health (DB, Stripe, Email, Memory) |

---

## Background Cron Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| Recurring Invoices | Daily | Auto-generate recurring invoices |
| Overdue Reminders | Daily | Send overdue invoice reminders |
| Email Sequences | Every 5 min | Process proposal follow-up sequences |
| Task Reminders | Daily | Send task due date reminders |
| Weekly Reports | Monday 8am | Generate weekly summary reports |
| Email Sync | Every 15 min | IMAP email synchronization |
| Workflow Engine | Every 1 min | Process automation enrollments |
| Google Calendar Sync | Every 15 min | Sync Google Calendar events |
| Outlook Calendar Sync | Every 15 min | Sync Outlook Calendar events |
| Drip Sequences | Every 5 min | Process email drip sequence steps |
| Churn Prediction | Every 24 hrs | ML-based churn probability scoring |
| Dunning | Every 6 hrs | Retry failed payments |

---

## Response Format

All endpoints return JSON in this format:

```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "status": "fail",
  "message": "Error description"
}
```

---

## 51. Expenses (`/api/expenses`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | `?project_id, client_id, category, date_from, date_to, billable` | List expenses |
| POST | `/:brandId` | protected | `description, amount, currency, category, date, project_id, client_id, receipt_url, billable` | Create expense |
| GET | `/:brandId/:expenseId` | protected | — | Get expense |
| PATCH | `/:brandId/:expenseId` | protected | expense fields | Update expense |
| DELETE | `/:brandId/:expenseId` | protected | — | Delete expense |
| GET | `/:brandId/stats` | protected | — | Expense stats (total, by category, billable breakdown) |
| GET | `/:brandId/project/:projectId/profitability` | protected | — | Project profitability (revenue vs expenses, margin) |

**Categories:** `advertising`, `software`, `travel`, `office`, `contractor`, `other`

## 52. Retainers (`/api/retainers`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | `?client_id, status` | List retainers |
| POST | `/:brandId` | protected | `client_id, name, hours_allocated, amount, billing_cycle` | Create retainer |
| GET | `/:brandId/:retainerId` | protected | — | Get retainer with usage summary |
| PATCH | `/:brandId/:retainerId` | protected | retainer fields | Update retainer |
| DELETE | `/:brandId/:retainerId` | protected | — | Delete retainer |
| POST | `/:brandId/:retainerId/usage` | protected | `hours, description, date` | Log usage hours |
| GET | `/:brandId/:retainerId/usage` | protected | — | Get usage history |
| GET | `/:brandId/dashboard` | protected | — | Dashboard (all retainers with utilization %) |

**Billing cycles:** `monthly`, `quarterly`

## 53. Project Templates (`/api/project-templates`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | List templates |
| POST | `/:brandId` | protected | `name, description, default_status, default_budget, task_templates[]` | Create template |
| GET | `/:brandId/:templateId` | protected | — | Get template |
| PATCH | `/:brandId/:templateId` | protected | template fields | Update template |
| DELETE | `/:brandId/:templateId` | protected | — | Delete template |
| POST | `/:brandId/:templateId/create-project` | protected | `client_id` | Create project from template (auto-creates tasks) |

**task_templates format:** `[{ title, description, priority, due_days }]`

## 54. Onboarding (`/api/onboarding`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/checklists` | protected | — | List onboarding checklists |
| POST | `/:brandId/checklists` | protected | `name, trigger_event, steps[]` | Create checklist |
| PATCH | `/:brandId/checklists/:checklistId` | protected | checklist fields | Update checklist |
| DELETE | `/:brandId/checklists/:checklistId` | protected | — | Delete checklist |
| GET | `/:brandId/progress/:clientId` | protected | — | Get client's onboarding progress |
| POST | `/:brandId/progress/:clientId/complete-step` | protected | `step_index` | Mark step complete |
| POST | `/:brandId/start/:clientId` | protected | `checklist_id` | Start onboarding for client |

**Trigger events:** `proposal_accepted`, `client_created`, `contract_signed`

## 55. Knowledge Base (`/api/kb`)

### Public (no auth)
| Method | Path | Body/Params | Description |
|--------|------|-------------|-------------|
| GET | `/public/:brandId/categories` | — | List published categories |
| GET | `/public/:brandId/articles` | `?category_id, search` | List published articles |
| GET | `/public/:brandId/articles/:slug` | — | Get article by slug (increments views) |
| POST | `/public/:brandId/articles/:articleId/feedback` | `type: "helpful" or "not_helpful"` | Submit feedback |

### Protected
| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/categories` | protected | — | List all categories |
| POST | `/:brandId/categories` | protected | `name, slug, description` | Create category |
| PATCH | `/:brandId/categories/:categoryId` | protected | category fields | Update category |
| DELETE | `/:brandId/categories/:categoryId` | protected | — | Delete category |
| GET | `/:brandId/articles` | protected | — | List all articles (incl. drafts) |
| POST | `/:brandId/articles` | protected | `title, slug, content, category_id, status, is_public` | Create article |
| GET | `/:brandId/articles/:articleId` | protected | — | Get article |
| PATCH | `/:brandId/articles/:articleId` | protected | article fields | Update article |
| DELETE | `/:brandId/articles/:articleId` | protected | — | Delete article |
| GET | `/:brandId/stats` | protected | — | KB stats (articles, views, helpful ratio) |

## 56. Slack Integration (`/api/slack`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId` | protected | — | Get Slack config |
| POST | `/:brandId` | protected | `webhook_url, channel, events[]` | Configure Slack |
| PATCH | `/:brandId` | protected | config fields | Update config |
| DELETE | `/:brandId` | protected | — | Disconnect Slack |
| POST | `/:brandId/test` | protected | — | Send test notification |

**Supported events:** `client.created`, `invoice.paid`, `deal.won`, `lead.submitted`, `booking.created`, `proposal.accepted`, `task.completed`

## 57. Accounting Integration (`/api/accounting`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/connection` | protected | — | Get connected accounting service |
| POST | `/:brandId/connect/quickbooks` | protected | — | Start QuickBooks OAuth (returns auth URL) |
| POST | `/:brandId/connect/xero` | protected | — | Start Xero OAuth (returns auth URL) |
| GET | `/callback/quickbooks` | protected | — | QuickBooks OAuth callback |
| GET | `/callback/xero` | protected | — | Xero OAuth callback |
| DELETE | `/:brandId/disconnect` | protected | — | Disconnect accounting |
| POST | `/:brandId/sync` | protected | — | Manual sync (push invoices + payments) |
| GET | `/:brandId/sync-status` | protected | — | Get last sync status and error log |

**Env vars:** `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`

## 58. Website Rendering (`/site`)

CMS pages are served as fully rendered HTML websites with SEO, navigation, and responsive design.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/site/:siteId` | public | Render site homepage (finds `index`/`home` slug or first published page) |
| GET | `/site/:siteId/:slug` | public | Render specific page by slug |
| GET | `/site/:siteId/blog` | public | Render blog index (all published blog posts) |

**Custom domain support:** When a CMS site has a `domain` field set (e.g., `clientsite.com`), requests to that domain are automatically routed to the site renderer. The custom domain middleware rewrites the URL to `/site/:siteId/:slug`.

**Rendered HTML includes:**
- Full SEO meta tags (title, description, OG, Twitter Cards, canonical URL)
- Google Analytics injection (if `google_analytics_id` set on site)
- Auto-generated navigation from published pages
- Blog listing page with post cards
- Responsive design with brand colors from the site/brand settings
- "Powered by SAAS Surface" footer link

## 59. Surf AI Assistant (`/api/surf`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/recommendations` | protected | — | Actionable recommendations (overdue invoices, stale leads, stuck deals, etc.) |
| POST | `/:brandId/ask` | protected | `question` | Ask Surf about your business data (OpenAI if configured, rule-based fallback) |
| GET | `/:brandId/summary` | protected | — | Quick stats (revenue, clients, tasks, pipeline) |

## 60. Surf Voice (`/api/surf`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/voice/settings` | protected | — | Get Surf Voice settings |
| PATCH | `/:brandId/voice/settings` | protected | `voice_enabled, voice_style, inbound_enabled, lead_followup_enabled, invoice_reminder_enabled, appointment_confirmation_enabled, business_hours, after_hours_behavior, transfer_phone` | Update settings (owner/admin) |
| POST | `/:brandId/voice/test-call` | protected | `phone_number` | Surf calls your phone as a test |
| GET | `/:brandId/voice/calls` | protected | `?call_type, page, limit` | Voice call history |
| POST | `/:brandId/voice/trigger` | protected | `type, target_id` | Trigger outbound call |

**Call types:** `lead_followup`, `invoice_reminder`, `appointment_confirmation`, `missed_callback`

**Voice styles:** `professional`, `friendly`, `casual`, `formal`

## 61. Surf Autopilot (`/api/surf-autopilot`)

Surf Autopilot takes action automatically — follow-ups, invoice reminders, deal moves, task creation, and lead nurturing. Each feature has an independent toggle.

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/settings` | protected | — | Get autopilot settings (all toggles) |
| PATCH | `/:brandId/settings` | protected | `autopilot_enabled, auto_followup_emails, auto_invoice_reminders, auto_deal_moves, auto_task_creation, auto_lead_nurture` | Update toggles (owner/admin) |
| GET | `/:brandId/activity` | protected | `?action_type, page, limit` | Autopilot activity log |
| POST | `/:brandId/pause` | protected | `hours` (default 24) | Pause autopilot |
| POST | `/:brandId/resume` | protected | — | Resume autopilot |

**Auto actions (runs every 5 minutes when enabled):**
- `auto_followup_emails` — Creates follow-up tasks for leads not contacted in 3+ days
- `auto_invoice_reminders` — Creates reminder tasks for overdue invoices
- `auto_deal_moves` — Moves deals to "Won" when linked proposal is accepted
- `auto_task_creation` — Creates welcome tasks for new clients
- `auto_lead_nurture` — Auto-enrolls new leads in drip sequences

## 62. AI Proposal Generator (`/api/proposal-generator`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/:brandId/generate` | protected | `client_id, brief, budget, timeline` | Generate proposal via AI (returns JSON) |
| POST | `/:brandId/generate-and-save` | protected | `client_id, brief, budget, timeline` | Generate and auto-save as draft proposal |

## 63. Reseller / Revenue Share (`/api/reseller`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/reseller` | protected | — | Get reseller settings |
| PATCH | `/:brandId/reseller` | protected | `is_reseller, markup_percent, commission_rate, white_label_name, custom_domain` | Update settings |
| GET | `/:brandId/reseller/clients` | protected | — | List sub-accounts |
| POST | `/:brandId/reseller/clients` | protected | `name, email, plan` | Create sub-account |
| GET | `/:brandId/reseller/earnings` | protected | — | Commission earnings |
| GET | `/:brandId/reseller/dashboard` | protected | — | Full reseller dashboard |

## 64. Smart Unified Inbox (`/api/unified-inbox`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/:brandId/inbox` | protected | `?type, unread_only, page, limit` | All messages across email, SMS, chat, portal, voice |
| GET | `/:brandId/inbox/stats` | protected | — | Inbox stats by type |
| PATCH | `/:brandId/inbox/:itemId/read` | protected | `type` | Mark item as read |
| POST | `/:brandId/inbox/:itemId/reply` | protected | `type, content` | Reply to any item |

**Types:** `email`, `sms`, `chat`, `portal`, `voice`

## 65. Portal Surf Chat (`/api/portal`)

| Method | Path | Auth | Body/Params | Description |
|--------|------|------|-------------|-------------|
| POST | `/surf/ask` | portal | `question` | Client asks Surf about their projects, invoices, tickets |

## 66. API Documentation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/docs` | public | Interactive Swagger UI |
| GET | `/api/docs.json` | public | Raw OpenAPI JSON spec |

---

## Rate Limits

| Tier | Window | Max Requests |
|------|--------|-------------|
| General API | 15 min | 100 |
| Auth endpoints | 15 min | 20 |
| Public endpoints | 15 min | 30 |
