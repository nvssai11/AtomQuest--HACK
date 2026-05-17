/**
 * @module userRepository
 * @description Data access layer for User entities.
 */

import store from '../store/inMemoryStore.js';

const userRepository = {
  findById(id) {
    return store.users.get(id) ?? null;
  },

  findByEmail(email) {
    const normalised = email.toLowerCase().trim();
    for (const user of store.users.values()) {
      if (user.email === normalised) {
        return user;
      }
    }
    return null;
  },

  findByRole(role) {
    return Array.from(store.users.values()).filter((u) => u.role === role);
  },

  /**
   * Direct reports via user.managerId (L1 reporting line).
   */
  findDirectReports(managerId) {
    return Array.from(store.users.values()).filter((u) => u.managerId === managerId);
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
    return Array.from(store.users.values())
      .filter((u) => u.role === 'employee' || u.role === 'manager')
      .map((u) => ({
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
};

export default userRepository;
