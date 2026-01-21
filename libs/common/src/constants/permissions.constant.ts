// ========================================
// Permission Keys (Centralized)
// ========================================

export enum PermissionKey {
  // User permissions - own resources
  USER_CREATE_OWN = 'user.create_own',
  USER_READ_OWN = 'user.read_own',
  USER_UPDATE_OWN = 'user.update_own',
  USER_DELETE_OWN = 'user.delete_own',

  // Admin permissions - all resources
  USER_CREATE_ALL = 'user.create_all',
  USER_READ_ALL = 'user.read_all',
  USER_UPDATE_ALL = 'user.update_all',
  USER_DELETE_ALL = 'user.delete_all',

  // Verification document permissions
  VERIFICATION_CREATE_OWN = 'verification.create_own',
  VERIFICATION_READ_OWN = 'verification.read_own',
  VERIFICATION_UPDATE_OWN = 'verification.update_own',
  VERIFICATION_APPROVE_ALL = 'verification.approve_all',
  VERIFICATION_REJECT_ALL = 'verification.reject_all',

  // Bank account permissions
  BANK_CREATE_OWN = 'bank.create_own',
  BANK_READ_OWN = 'bank.read_own',
  BANK_UPDATE_OWN = 'bank.update_own',
  BANK_DELETE_OWN = 'bank.delete_own',
  BANK_READ_ALL = 'bank.read_all',
  BANK_DELETE_ALL = 'bank.delete_all',

  // Role management (SuperAdmin only)
  ROLE_CREATE = 'role.create',
  ROLE_READ = 'role.read',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',
  ROLE_ASSIGN = 'role.assign',

  // System permissions
  SYSTEM_MANAGE = 'system.manage',
  AUDIT_READ = 'audit.read',
}

// ========================================
// Role Names (Centralized)
// ========================================

export enum RoleName {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// ========================================
// Role -> Permission Mapping
// ========================================

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  [RoleName.USER]: [
    // Users can only manage their own resources
    PermissionKey.USER_CREATE_OWN,
    PermissionKey.USER_READ_OWN,
    PermissionKey.USER_UPDATE_OWN,
    PermissionKey.VERIFICATION_CREATE_OWN,
    PermissionKey.VERIFICATION_READ_OWN,
    PermissionKey.VERIFICATION_UPDATE_OWN,
    PermissionKey.BANK_CREATE_OWN,
    PermissionKey.BANK_READ_OWN,
    PermissionKey.BANK_UPDATE_OWN,
    PermissionKey.BANK_DELETE_OWN,
  ],

  [RoleName.ADMIN]: [
    // Admins can manage all users and resources
    PermissionKey.USER_CREATE_ALL,
    PermissionKey.USER_READ_ALL,
    PermissionKey.USER_UPDATE_ALL,
    PermissionKey.USER_DELETE_ALL,
    PermissionKey.VERIFICATION_APPROVE_ALL,
    PermissionKey.VERIFICATION_REJECT_ALL,
    PermissionKey.BANK_READ_ALL,
    PermissionKey.BANK_DELETE_ALL,
    PermissionKey.AUDIT_READ,
  ],

  [RoleName.SUPER_ADMIN]: [
    // SuperAdmin has ALL permissions
    ...Object.values(PermissionKey),
  ],
};

// ========================================
// Permission Descriptions (for seeding)
// ========================================

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  [PermissionKey.USER_CREATE_OWN]: 'Create own user profile',
  [PermissionKey.USER_READ_OWN]: 'Read own user profile',
  [PermissionKey.USER_UPDATE_OWN]: 'Update own user profile',
  [PermissionKey.USER_DELETE_OWN]: 'Delete own user profile',

  [PermissionKey.USER_CREATE_ALL]: 'Create any user',
  [PermissionKey.USER_READ_ALL]: 'Read all users',
  [PermissionKey.USER_UPDATE_ALL]: 'Update any user',
  [PermissionKey.USER_DELETE_ALL]: 'Delete any user',

  [PermissionKey.VERIFICATION_CREATE_OWN]: 'Submit own verification documents',
  [PermissionKey.VERIFICATION_READ_OWN]: 'View own verification documents',
  [PermissionKey.VERIFICATION_UPDATE_OWN]: 'Update own verification documents',
  [PermissionKey.VERIFICATION_APPROVE_ALL]:
    'Approve any verification documents',
  [PermissionKey.VERIFICATION_REJECT_ALL]: 'Reject any verification documents',

  [PermissionKey.BANK_CREATE_OWN]: 'Add own bank account',
  [PermissionKey.BANK_READ_OWN]: 'View own bank account',
  [PermissionKey.BANK_UPDATE_OWN]: 'Update own bank account',
  [PermissionKey.BANK_DELETE_OWN]: 'Delete own bank account',
  [PermissionKey.BANK_READ_ALL]: 'View all bank accounts',
  [PermissionKey.BANK_DELETE_ALL]: 'Delete any bank account',

  [PermissionKey.ROLE_CREATE]: 'Create new roles',
  [PermissionKey.ROLE_READ]: 'View roles',
  [PermissionKey.ROLE_UPDATE]: 'Update roles',
  [PermissionKey.ROLE_DELETE]: 'Delete roles',
  [PermissionKey.ROLE_ASSIGN]: 'Assign roles to users',

  [PermissionKey.SYSTEM_MANAGE]: 'Manage system settings',
  [PermissionKey.AUDIT_READ]: 'View audit logs',
};

// ========================================
// Role Descriptions
// ========================================

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [RoleName.USER]: 'Standard user with access to own resources only',
  [RoleName.ADMIN]:
    'Administrator with full access to manage users and resources',
  [RoleName.SUPER_ADMIN]:
    'Super Administrator with complete system access and role management',
};
