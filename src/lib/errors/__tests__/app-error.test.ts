import { describe, it, expect } from 'vitest';
import { AppError } from '../app-error';
import { AuthErrors, DomainErrors, TenantErrors } from '../error-codes';

describe('AppError', () => {
  it('creates an error with all required fields', () => {
    const error = new AppError({
      code: 'TEST_001',
      message: 'Test error',
      statusCode: 400,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('TEST_001');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.severity).toBe('medium'); // default
    expect(error.timestamp).toBeDefined();
  });

  it('toClientResponse excludes internal context', () => {
    const error = new AppError({
      code: 'TEST_002',
      message: 'Public message',
      statusCode: 500,
      context: { internalSecret: 'should-not-appear' },
    });

    const response = error.toClientResponse();
    expect(response.error.code).toBe('TEST_002');
    expect(response.error.message).toBe('Public message');
    expect(response.error.statusCode).toBe(500);
    expect(response).not.toHaveProperty('context');
    expect(JSON.stringify(response)).not.toContain('should-not-appear');
  });

  it('toLogEntry includes context', () => {
    const error = new AppError({
      code: 'TEST_003',
      message: 'Log message',
      statusCode: 400,
      context: { detail: 'some-detail' },
    });

    const log = error.toLogEntry();
    expect(log.context).toEqual({ detail: 'some-detail' });
  });
});

describe('Error Code Factories', () => {
  it('creates AUTH_001 unauthenticated error', () => {
    const error = AuthErrors.unauthenticated();
    expect(error.code).toBe('AUTH_001_UNAUTHENTICATED');
    expect(error.statusCode).toBe(401);
  });

  it('creates DOMAIN_001 unknown host error with hostname context', () => {
    const error = DomainErrors.unknownHost('evil.example.com');
    expect(error.code).toBe('DOMAIN_001_UNKNOWN_HOST');
    expect(error.statusCode).toBe(404);
    expect(error.context.hostname).toBe('evil.example.com');
  });

  it('creates TENANT_001 access denied error', () => {
    const error = TenantErrors.accessDenied({ organizationId: 'org-123' });
    expect(error.code).toBe('TENANT_001_ACCESS_DENIED');
    expect(error.statusCode).toBe(403);
    expect(error.severity).toBe('high');
  });
});
