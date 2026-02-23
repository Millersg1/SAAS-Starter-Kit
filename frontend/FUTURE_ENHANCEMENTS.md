# ClientHub Frontend - Future Enhancements

This document tracks features and improvements that should be implemented in future phases.

## 🔐 Security & Account Management

### Email Change Functionality
**Priority:** Medium  
**Status:** Not Implemented  
**Requested:** Phase 3 Development

**Description:**
Users currently cannot change their email address. The email field is read-only because it serves as the unique login identifier.

**Requirements:**

**Backend Changes:**
1. Create new API endpoint: `POST /api/users/me/change-email`
2. Implement email verification system:
   - Send verification email to new email address
   - Send notification to old email address
   - Require verification of both emails before change
3. Add database migration for email change tracking:
   - `pending_email` field (nullable)
   - `email_change_token` field (nullable)
   - `email_change_expires` field (nullable)
4. Update authentication logic to handle email changes
5. Prevent duplicate emails during pending changes

**Frontend Changes:**
1. Add "Change Email" button in Profile tab
2. Create modal/form for email change request:
   - Input for new email
   - Confirmation dialog
3. Implement verification flow UI:
   - Show pending email change status
   - Resend verification email option
   - Cancel pending change option
4. Add success/error notifications
5. Update AuthContext to handle email changes

**Security Considerations:**
- Require current password confirmation
- Rate limit email change requests
- Expire verification tokens after 24 hours
- Log all email change attempts
- Send security alerts to old email
- Prevent email changes if account has recent suspicious activity

**Estimated Effort:** 4-6 hours
- Backend: 2-3 hours
- Frontend: 1.5-2 hours
- Testing: 0.5-1 hour

---

## 📝 Other Potential Enhancements

### Password Change in Profile
**Priority:** High  
**Status:** Placeholder exists in Security tab  
**Description:** Allow users to change their password from the profile settings page.

### Two-Factor Authentication (2FA)
**Priority:** Medium  
**Status:** Not Implemented  
**Description:** Add 2FA support for enhanced account security.

### Profile Picture Upload
**Priority:** Medium  
**Status:** Currently uses avatar URL  
**Requested:** Phase 3 Development

**Description:**
Users currently must provide a URL to an external image for their avatar. This should be replaced with a direct file upload feature for better user experience.

**Requirements:**

**Backend Changes:**
1. Create file upload endpoint: `POST /api/users/me/avatar`
2. Implement file storage solution:
   - Option A: Local filesystem storage in `/uploads/avatars/`
   - Option B: Cloud storage (AWS S3, Cloudinary, etc.)
3. Add image processing:
   - Validate file types (JPEG, PNG, GIF, WebP)
   - Resize images to standard sizes (e.g., 200x200, 400x400)
   - Optimize file size
   - Generate thumbnails
4. Security measures:
   - File size limit (e.g., 5MB max)
   - File type validation
   - Malware scanning
   - Rate limiting on uploads
5. Database updates:
   - Store file path/URL in `avatar_url` field
   - Track upload metadata (size, type, upload date)

**Frontend Changes:**
1. Replace URL input with file upload component
2. Add features:
   - Drag-and-drop file upload
   - Click to browse files
   - Image preview before upload
   - Upload progress indicator
   - Image cropping tool (optional)
3. Validation:
   - Client-side file type checking
   - File size validation
   - Preview validation
4. Error handling:
   - File too large
   - Invalid file type
   - Upload failed
   - Network errors
5. UI improvements:
   - Show current avatar
   - "Change Avatar" button
   - "Remove Avatar" option
   - Loading states

**Technical Considerations:**
- Use `multer` middleware for file uploads (backend)
- Use `sharp` or `jimp` for image processing (backend)
- Consider CDN for serving images
- Implement image caching
- Handle avatar deletion when user deletes account
- Provide default avatars for users without uploads

**Estimated Effort:** 6-8 hours
- Backend: 3-4 hours
- Frontend: 2-3 hours
- Testing: 1 hour

**Alternative (Quick Solution):**
- Integrate with Gravatar API (uses email hash)
- Integrate with third-party avatar services

### Account Activity Log
**Priority:** Low  
**Status:** Not Implemented  
**Description:** Show users their recent account activity (logins, changes, etc.).

---

**Last Updated:** Phase 3 Completion  
**Next Review:** Phase 4 Planning
