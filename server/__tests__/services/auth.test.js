import { jest } from '@jest/globals';
import { AppError } from '../../src/errors/AppError.js';

const bcryptMock = {
  compare: jest.fn(),
};

const jwtMock = {
  sign: jest.fn(),
};

const userRepositoryMock = {
  findByEmail: jest.fn(),
  toPublicProfile: jest.fn(),
};

jest.unstable_mockModule('bcryptjs', () => ({
  default: bcryptMock,
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: jwtMock,
}));

jest.unstable_mockModule('../../src/repository/userRepository.js', () => ({
  default: userRepositoryMock,
}));

jest.unstable_mockModule('../../src/config.js', () => ({
  default: {
    auth: {
      jwtSecret: 'test-secret',
      jwtAccessExpiresIn: '15m',
    },
  },
}));

const { default: bcrypt } = await import('bcryptjs');
const { default: jwt } = await import('jsonwebtoken');
const { default: authService } = await import('../../src/services/authService.js');
const { default: userRepository } = await import('../../src/repository/userRepository.js');

describe('AuthService', () => {
  const mockUser = {
    id: 'usr-1',
    email: 'sarah@test.com',
    passwordHash: 'hashed-password',
    role: 'employee',
    name: 'Sarah'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('returns a token and public profile on successful login', async () => {
      userRepository.findByEmail.mockReturnValue(mockUser);
      bcrypt.compare.mockResolvedValue(true); // Password matches
      jwt.sign.mockReturnValue('mock-jwt-token');
      userRepository.toPublicProfile.mockReturnValue({ id: 'usr-1', email: 'sarah@test.com' });

      const result = await authService.login('sarah@test.com', 'password123');

      expect(userRepository.findByEmail).toHaveBeenCalledWith('sarah@test.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'usr-1', email: 'sarah@test.com', role: 'employee', name: 'Sarah' },
        'test-secret',
        { expiresIn: '15m' }
      );
      
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('usr-1');
    });

    it('throws UNAUTHORIZED if user not found', async () => {
      userRepository.findByEmail.mockReturnValue(null);

      await expect(authService.login('unknown@test.com', 'pass'))
        .rejects.toThrow(AppError);
        
      try { await authService.login('unknown@test.com', 'pass'); }
      catch (e) { 
        expect(e.statusCode).toBe(401);
        expect(e.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('throws UNAUTHORIZED if password does not match', async () => {
      userRepository.findByEmail.mockReturnValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // Password wrong

      await expect(authService.login('sarah@test.com', 'wrong'))
        .rejects.toThrow(AppError);
    });
  });
});
