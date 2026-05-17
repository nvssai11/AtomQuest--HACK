/**
 * @module authService
 * @description Business logic for user authentication.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repository/userRepository.js';
import config from '../config.js';
import { AppError } from '../errors/AppError.js';

const authService = {
  /**
   * Authenticates a user and generates a JWT.
   * 
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{token: string, user: Object}>}
   * @throws {AppError} 401 INVALID_CREDENTIALS if email/password is wrong
   */
  async login(email, password) {
    const user = userRepository.findByEmail(email);
    if (!user) {
      // Use the same error message for both user-not-found and wrong-password
      // to prevent email enumeration attacks.
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Standard JWT payload
    const payload = {
      sub: user.id, // Subject (standard JWT claim)
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtAccessExpiresIn,
    });

    return {
      token,
      user: userRepository.toPublicProfile(user),
    };
  }
};

export default authService;
