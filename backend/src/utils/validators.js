import Joi from 'joi';

/**
 * Validation schema for user registration
 */
export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  role: Joi.string()
    .valid('admin', 'agency', 'client')
    .default('client')
    .messages({
      'any.only': 'Role must be one of: admin, agency, client'
    })
});

/**
 * Validation schema for user login
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

/**
 * Validation schema for forgot password
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

/**
 * Validation schema for reset password
 */
export const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Validation schema for refresh token
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required'
    })
});

/**
 * Validation schema for updating user profile
 */
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number in E.164 format (e.g., +1234567890)'
    }),
  
  bio: Joi.string()
    .max(500)
    .allow(null, '')
    .messages({
      'string.max': 'Bio must not exceed 500 characters'
    }),
  
  avatar_url: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Please provide a valid URL for avatar'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for updating user preferences
 */
export const updatePreferencesSchema = Joi.object({
  theme: Joi.string()
    .valid('light', 'dark', 'auto')
    .messages({
      'any.only': 'Theme must be one of: light, dark, auto'
    }),
  
  language: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'pt')
    .messages({
      'any.only': 'Language must be one of: en, es, fr, de, pt'
    }),
  
  notifications: Joi.object({
    email: Joi.boolean(),
    push: Joi.boolean(),
    sms: Joi.boolean()
  }),
  
  timezone: Joi.string()
    .messages({
      'string.base': 'Timezone must be a valid string'
    }),
  
  dateFormat: Joi.string()
    .valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')
    .messages({
      'any.only': 'Date format must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD'
    }),
  
  currency: Joi.string()
    .length(3)
    .uppercase()
    .messages({
      'string.length': 'Currency must be a 3-letter ISO code',
      'string.uppercase': 'Currency must be uppercase'
    })
}).min(1).messages({
  'object.min': 'At least one preference must be provided for update'
});

/**
 * Validation schema for creating a brand
 */
export const createBrandSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Brand name is required',
      'string.min': 'Brand name must be at least 2 characters long',
      'string.max': 'Brand name must not exceed 100 characters',
      'any.required': 'Brand name is required'
    }),
  
  slug: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-z0-9-]+$/)
    .optional()
    .messages({
      'string.min': 'Brand slug must be at least 2 characters long',
      'string.max': 'Brand slug must not exceed 100 characters',
      'string.pattern.base': 'Brand slug must contain only lowercase letters, numbers, and hyphens'
    }),
  
  description: Joi.string()
    .max(500)
    .allow(null, '')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  logo_url: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Please provide a valid URL for logo'
    }),
  
  website: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Please provide a valid URL for website'
    }),
  
  primary_color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .default('#007bff')
    .messages({
      'string.pattern.base': 'Primary color must be a valid hex color (e.g., #007bff)'
    }),
  
  secondary_color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .default('#6c757d')
    .messages({
      'string.pattern.base': 'Secondary color must be a valid hex color (e.g., #6c757d)'
    }),
  
  settings: Joi.object()
    .default({})
});

/**
 * Validation schema for updating a brand
 */
export const updateBrandSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Brand name must be at least 2 characters long',
      'string.max': 'Brand name must not exceed 100 characters'
    }),
  
  description: Joi.string()
    .max(500)
    .allow(null, '')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  logo_url: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Please provide a valid URL for logo'
    }),
  
  website: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Please provide a valid URL for website'
    }),
  
  primary_color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .messages({
      'string.pattern.base': 'Primary color must be a valid hex color (e.g., #007bff)'
    }),
  
  secondary_color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .messages({
      'string.pattern.base': 'Secondary color must be a valid hex color (e.g., #6c757d)'
    }),
  
  settings: Joi.object()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for adding a brand member
 */
export const addBrandMemberSchema = Joi.object({
  user_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'User ID is required',
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    }),
  
  role: Joi.string()
    .valid('admin', 'member', 'viewer')
    .required()
    .messages({
      'any.only': 'Role must be one of: admin, member, viewer',
      'any.required': 'Role is required'
    }),
  
  permissions: Joi.object()
    .default({})
});

/**
 * Validation schema for updating brand member role
 */
export const updateBrandMemberSchema = Joi.object({
  role: Joi.string()
    .valid('admin', 'member', 'viewer')
    .required()
    .messages({
      'any.only': 'Role must be one of: admin, member, viewer',
      'any.required': 'Role is required'
    }),
  
  permissions: Joi.object()
    .default({})
});

/**
 * Validation schema for creating a client
 */
export const createClientSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Client name is required',
      'string.min': 'Client name must be at least 2 characters long',
      'string.max': 'Client name must not exceed 255 characters',
      'any.required': 'Client name is required'
    }),
  
  email: Joi.string()
    .email()
    .allow(null, '')
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number in E.164 format (e.g., +1234567890)'
    }),
  
  company: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'Company name must not exceed 255 characters'
    }),
  
  address: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Address must be a string'
    }),
  
  city: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'City must not exceed 100 characters'
    }),
  
  state: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'State must not exceed 100 characters'
    }),
  
  country: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Country must not exceed 100 characters'
    }),
  
  postal_code: Joi.string()
    .max(20)
    .allow(null, '')
    .messages({
      'string.max': 'Postal code must not exceed 20 characters'
    }),
  
  portal_access: Joi.boolean()
    .default(false),
  
  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'archived')
    .default('active')
    .messages({
      'any.only': 'Status must be one of: active, inactive, pending, archived'
    }),
  
  client_type: Joi.string()
    .valid('regular', 'vip', 'enterprise', 'trial')
    .default('regular')
    .messages({
      'any.only': 'Client type must be one of: regular, vip, enterprise, trial'
    }),
  
  industry: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Industry must not exceed 100 characters'
    }),
  
  website: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Please provide a valid URL for website'
    }),
  
  tax_id: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Tax ID must not exceed 100 characters'
    }),
  
  assigned_to: Joi.string()
    .uuid()
    .allow(null, '')
    .messages({
      'string.guid': 'Assigned to must be a valid UUID'
    }),
  
  notes: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Notes must be a string'
    }),
  
  tags: Joi.array()
    .items(Joi.string())
    .default([])
    .messages({
      'array.base': 'Tags must be an array of strings'
    }),
  
  custom_fields: Joi.object()
    .default({})
});

/**
 * Validation schema for updating a client
 */
export const updateClientSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(255)
    .messages({
      'string.min': 'Client name must be at least 2 characters long',
      'string.max': 'Client name must not exceed 255 characters'
    }),
  
  email: Joi.string()
    .email()
    .allow(null, '')
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number in E.164 format (e.g., +1234567890)'
    }),
  
  company: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'Company name must not exceed 255 characters'
    }),
  
  address: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Address must be a string'
    }),
  
  city: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'City must not exceed 100 characters'
    }),
  
  state: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'State must not exceed 100 characters'
    }),
  
  country: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Country must not exceed 100 characters'
    }),
  
  postal_code: Joi.string()
    .max(20)
    .allow(null, '')
    .messages({
      'string.max': 'Postal code must not exceed 20 characters'
    }),
  
  portal_access: Joi.boolean(),
  
  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'archived')
    .messages({
      'any.only': 'Status must be one of: active, inactive, pending, archived'
    }),
  
  client_type: Joi.string()
    .valid('regular', 'vip', 'enterprise', 'trial')
    .messages({
      'any.only': 'Client type must be one of: regular, vip, enterprise, trial'
    }),
  
  industry: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Industry must not exceed 100 characters'
    }),
  
  website: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Please provide a valid URL for website'
    }),
  
  tax_id: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Tax ID must not exceed 100 characters'
    }),
  
  assigned_to: Joi.string()
    .uuid()
    .allow(null, '')
    .messages({
      'string.guid': 'Assigned to must be a valid UUID'
    }),
  
  notes: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Notes must be a string'
    }),
  
  tags: Joi.array()
    .items(Joi.string())
    .messages({
      'array.base': 'Tags must be an array of strings'
    }),
  
  custom_fields: Joi.object()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for creating a project
 */
export const createProjectSchema = Joi.object({
  client_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'Client ID is required',
      'string.guid': 'Client ID must be a valid UUID',
      'any.required': 'Client ID is required'
    }),
  
  name: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Project name is required',
      'string.min': 'Project name must be at least 2 characters long',
      'string.max': 'Project name must not exceed 255 characters',
      'any.required': 'Project name is required'
    }),
  
  description: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Description must be a string'
    }),
  
  project_type: Joi.string()
    .valid('general', 'website', 'app', 'marketing', 'consulting', 'design', 'other')
    .default('general')
    .messages({
      'any.only': 'Project type must be one of: general, website, app, marketing, consulting, design, other'
    }),
  
  status: Joi.string()
    .valid('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')
    .default('planning')
    .messages({
      'any.only': 'Status must be one of: planning, in_progress, on_hold, completed, cancelled'
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),
  
  start_date: Joi.date()
    .iso()
    .allow(null, '')
    .messages({
      'date.format': 'Start date must be a valid ISO date'
    }),
  
  due_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .allow(null, '')
    .messages({
      'date.format': 'Due date must be a valid ISO date',
      'date.min': 'Due date must be after start date'
    }),
  
  budget: Joi.number()
    .positive()
    .precision(2)
    .allow(null, '')
    .messages({
      'number.positive': 'Budget must be a positive number',
      'number.base': 'Budget must be a number'
    }),
  
  currency: Joi.string()
    .length(3)
    .uppercase()
    .default('USD')
    .messages({
      'string.length': 'Currency must be a 3-letter ISO code',
      'string.uppercase': 'Currency must be uppercase'
    }),
  
  estimated_hours: Joi.number()
    .integer()
    .positive()
    .allow(null, '')
    .messages({
      'number.positive': 'Estimated hours must be a positive number',
      'number.integer': 'Estimated hours must be an integer'
    }),
  
  project_manager_id: Joi.string()
    .uuid()
    .allow(null, '')
    .messages({
      'string.guid': 'Project manager ID must be a valid UUID'
    }),
  
  assigned_team: Joi.array()
    .items(Joi.string().uuid())
    .default([])
    .messages({
      'array.base': 'Assigned team must be an array of user IDs',
      'string.guid': 'Each team member ID must be a valid UUID'
    }),
  
  tags: Joi.array()
    .items(Joi.string())
    .default([])
    .messages({
      'array.base': 'Tags must be an array of strings'
    }),
  
  custom_fields: Joi.object()
    .default({})
});

/**
 * Validation schema for updating a project
 */
export const updateProjectSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(255)
    .messages({
      'string.min': 'Project name must be at least 2 characters long',
      'string.max': 'Project name must not exceed 255 characters'
    }),
  
  description: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Description must be a string'
    }),
  
  project_type: Joi.string()
    .valid('general', 'website', 'app', 'marketing', 'consulting', 'design', 'other')
    .messages({
      'any.only': 'Project type must be one of: general, website, app, marketing, consulting, design, other'
    }),
  
  status: Joi.string()
    .valid('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')
    .messages({
      'any.only': 'Status must be one of: planning, in_progress, on_hold, completed, cancelled'
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),
  
  start_date: Joi.date()
    .iso()
    .allow(null, '')
    .messages({
      'date.format': 'Start date must be a valid ISO date'
    }),
  
  due_date: Joi.date()
    .iso()
    .allow(null, '')
    .messages({
      'date.format': 'Due date must be a valid ISO date'
    }),
  
  completed_date: Joi.date()
    .iso()
    .allow(null, '')
    .messages({
      'date.format': 'Completed date must be a valid ISO date'
    }),
  
  budget: Joi.number()
    .positive()
    .precision(2)
    .allow(null, '')
    .messages({
      'number.positive': 'Budget must be a positive number',
      'number.base': 'Budget must be a number'
    }),
  
  currency: Joi.string()
    .length(3)
    .uppercase()
    .messages({
      'string.length': 'Currency must be a 3-letter ISO code',
      'string.uppercase': 'Currency must be uppercase'
    }),
  
  estimated_hours: Joi.number()
    .integer()
    .positive()
    .allow(null, '')
    .messages({
      'number.positive': 'Estimated hours must be a positive number',
      'number.integer': 'Estimated hours must be an integer'
    }),
  
  actual_hours: Joi.number()
    .integer()
    .min(0)
    .allow(null, '')
    .messages({
      'number.min': 'Actual hours must be zero or positive',
      'number.integer': 'Actual hours must be an integer'
    }),
  
  project_manager_id: Joi.string()
    .uuid()
    .allow(null, '')
    .messages({
      'string.guid': 'Project manager ID must be a valid UUID'
    }),
  
  assigned_team: Joi.array()
    .items(Joi.string().uuid())
    .messages({
      'array.base': 'Assigned team must be an array of user IDs',
      'string.guid': 'Each team member ID must be a valid UUID'
    }),
  
  progress_percentage: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .messages({
      'number.min': 'Progress must be at least 0',
      'number.max': 'Progress must not exceed 100',
      'number.integer': 'Progress must be an integer'
    }),
  
  milestones: Joi.array()
    .items(Joi.object({
      id: Joi.string(),
      name: Joi.string().required(),
      due_date: Joi.date().iso(),
      completed: Joi.boolean().default(false),
      completed_date: Joi.date().iso().allow(null)
    }))
    .messages({
      'array.base': 'Milestones must be an array'
    }),
  
  tags: Joi.array()
    .items(Joi.string())
    .messages({
      'array.base': 'Tags must be an array of strings'
    }),
  
  custom_fields: Joi.object(),
  
  attachments: Joi.array()
    .items(Joi.object({
      id: Joi.string(),
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      size: Joi.number(),
      type: Joi.string(),
      uploaded_at: Joi.date().iso()
    }))
    .messages({
      'array.base': 'Attachments must be an array'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for creating a project update
 */
export const createProjectUpdateSchema = Joi.object({
  update_type: Joi.string()
    .valid('status_change', 'milestone', 'comment', 'file_upload', 'team_change', 'other')
    .required()
    .messages({
      'any.only': 'Update type must be one of: status_change, milestone, comment, file_upload, team_change, other',
      'any.required': 'Update type is required'
    }),
  
  title: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 2 characters long',
      'string.max': 'Title must not exceed 255 characters',
      'any.required': 'Title is required'
    }),
  
  content: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Content must be a string'
    }),
  
  is_visible_to_client: Joi.boolean()
    .default(true),
  
  attachments: Joi.array()
    .items(Joi.object({
      id: Joi.string(),
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      size: Joi.number(),
      type: Joi.string(),
      uploaded_at: Joi.date().iso()
    }))
    .default([])
    .messages({
      'array.base': 'Attachments must be an array'
    }),
  
  metadata: Joi.object()
    .default({})
});

/**
 * Validation schema for updating a project update
 */
export const updateProjectUpdateSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(255)
    .messages({
      'string.min': 'Title must be at least 2 characters long',
      'string.max': 'Title must not exceed 255 characters'
    }),
  
  content: Joi.string()
    .allow(null, '')
    .messages({
      'string.base': 'Content must be a string'
    }),
  
  is_visible_to_client: Joi.boolean(),
  
  attachments: Joi.array()
    .items(Joi.object({
      id: Joi.string(),
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      size: Joi.number(),
      type: Joi.string(),
      uploaded_at: Joi.date().iso()
    }))
    .messages({
      'array.base': 'Attachments must be an array'
    }),
  
  metadata: Joi.object()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for creating a document
 */
export const createDocumentSchema = Joi.object({
  project_id: Joi.string().uuid().optional().allow(null),
  client_id: Joi.string().uuid().optional().allow(null),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional().allow(''),
  file_name: Joi.string().min(1).max(255).required(),
  file_path: Joi.string().min(1).max(500).required(),
  file_size: Joi.number().integer().positive().required(),
  file_type: Joi.string().min(1).max(100).required(),
  file_extension: Joi.string().min(1).max(10).required(),
  category: Joi.string().valid('contract', 'invoice', 'proposal', 'report', 'design', 'other', 'general').default('general'),
  visibility: Joi.string().valid('private', 'client', 'team', 'public').default('private'),
  is_client_visible: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string()).default([]),
  custom_fields: Joi.object().default({})
});

/**
 * Validation schema for updating a document
 */
export const updateDocumentSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  category: Joi.string().valid('contract', 'invoice', 'proposal', 'report', 'design', 'other', 'general').optional(),
  status: Joi.string().valid('active', 'archived', 'deleted').optional(),
  visibility: Joi.string().valid('private', 'client', 'team', 'public').optional(),
  is_client_visible: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
}).min(1);

/**
 * Validation schema for sharing a document
 */
export const shareDocumentSchema = Joi.object({
  shared_with_user_id: Joi.string().uuid().optional(),
  shared_with_client_id: Joi.string().uuid().optional(),
  permission: Joi.string().valid('view', 'download', 'edit').default('view'),
  can_reshare: Joi.boolean().default(false),
  expires_at: Joi.date().iso().optional().allow(null)
}).xor('shared_with_user_id', 'shared_with_client_id');

/**
 * Validation schema for updating a document share
 */
export const updateDocumentShareSchema = Joi.object({
  permission: Joi.string().valid('view', 'download', 'edit').optional(),
  can_reshare: Joi.boolean().optional(),
  expires_at: Joi.date().iso().optional().allow(null)
}).min(1);

/**
 * Validation schema for creating a document version
 */
export const createDocumentVersionSchema = Joi.object({
  file_name: Joi.string().min(1).max(255).required(),
  file_path: Joi.string().min(1).max(500).required(),
  file_size: Joi.number().integer().positive().required(),
  change_description: Joi.string().max(1000).optional().allow('')
});

/**
 * Middleware to validate request body against a schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        status: 'fail',
        message: 'Validation error',
        errors
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};
