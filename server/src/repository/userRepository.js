/**
 * @module userRepository
 * @description Data access layer for User entities.
 */

import store from '../store/inMemoryStore.js';

// Secondary Indexes for O(1) performance
const emailIndex = new Map();
const roleIndex = new Map(); // role -> Set of users
const directReportsIndex = new Map(); // managerId -> Set of users

let lastStoreSize = 0;

function rebuildUserIndexes() {
  emailIndex.clear();
  roleIndex.clear();
  directReportsIndex.clear();
  
  for (const user of store.users.values()) {
    emailIndex.set(user.email.toLowerCase().trim(), user);
    
    if (!roleIndex.has(user.role)) {
      roleIndex.set(user.role, new Set());
    }
    roleIndex.get(user.role).add(user);
    
    if (user.managerId) {
      if (!directReportsIndex.has(user.managerId)) {
        directReportsIndex.set(user.managerId, new Set());
      }
      directReportsIndex.get(user.managerId).add(user);
    }
  }
  lastStoreSize = store.users.size;
}

// Auto-reactive index rebuild if store updates or resets
function ensureUserIndexes() {
  if (emailIndex.size === 0 && store.users.size > 0) {
    rebuildUserIndexes();
  } else if (store.users.size !== lastStoreSize) {
    rebuildUserIndexes();
  }
}

const userRepository = {
  findById(id) {
    return store.users.get(id) ?? null;
  },

  findByEmail(email) {
    ensureUserIndexes();
    const normalised = email.toLowerCase().trim();
    return emailIndex.get(normalised) ?? null;
  },

  findByRole(role) {
    ensureUserIndexes();
    const set = roleIndex.get(role);
    return set ? Array.from(set) : [];
  },

  /**
   * Direct reports via user.managerId (L1 reporting line).
   */
  findDirectReports(managerId) {
    ensureUserIndexes();
    const set = directReportsIndex.get(managerId);
    return set ? Array.from(set) : [];
  },

  findManagerOf(userId) {
    const user = store.users.get(userId);
    if (!user?.managerId) {
      return null;
    }
    return store.users.get(user.managerId) ?? null;
  },

  getHierarchy(userId) {
    const user = store.users.get(userId);
    if (!user) return null;
    return {
      userId: user.id,
      managerId: user.managerId ?? null,
      department: user.department,
      level: user.level ?? 'L1',
    };
  },

  findAll() {
    return Array.from(store.users.values());
  },

  getAllHierarchy() {
    ensureUserIndexes();
    const employees = roleIndex.get('employee') || new Set();
    const managers = roleIndex.get('manager') || new Set();
    
    const relevantUsers = [];
    employees.forEach(u => relevantUsers.push(u));
    managers.forEach(u => relevantUsers.push(u));
    
    return relevantUsers.map((u) => ({
      userId: u.id,
      managerId: u.managerId ?? null,
      department: u.department,
      level: u.level ?? 'L1',
      user: { name: u.name, role: u.role, email: u.email },
    }));
  },

  toPublicProfile(user) {
    if (!user) {
      return null;
    }
    // eslint-disable-next-line no-unused-vars
    const { passwordHash, ...publicProfile } = user;
    return publicProfile;
  },

  // Save updates to support transactional write triggers
  saveUser(user) {
    store.users.set(user.id, user);
    rebuildUserIndexes();
    return user;
  }
};

export default userRepository;
