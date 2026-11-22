import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleService } from './google.service';
describe('Google verification boundary', () => {
  const previous = { ...process.env };
  afterEach(() => {
    process.env = { ...previous };
    jest.restoreAllMocks();
  });
  it('disables Google when no audience is configured', async () => {
    for (const key of [
      'GOOGLE_WEB_CLIENT_ID',
      'GOOGLE_ANDROID_CLIENT_ID',
      'GOOGLE_IOS_CLIENT_ID',
      'GOOGLE_ALLOWED_AUDIENCES',
    ])
      delete process.env[key];
    await expect(new GoogleService().verify('anything')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
  it('delegates cryptographic/audience/expiry validation to the official library and rejects its failures', async () => {
    process.env.GOOGLE_ALLOWED_AUDIENCES = 'test-client';
    const service = new GoogleService();
    const mock = jest
      .spyOn(service['client'], 'verifyIdToken')
      .mockRejectedValue(new Error('signature, expiry or audience mismatch'));
    await expect(service.verify('forged')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mock).toHaveBeenCalledWith({
      idToken: 'forged',
      audience: expect.arrayContaining(['test-client']),
    });
  });
  it('rejects missing verified identity claims and maps a valid provider subject', async () => {
    process.env.GOOGLE_ALLOWED_AUDIENCES = 'test-client';
    const service = new GoogleService();
    const mock = jest.spyOn(service['client'], 'verifyIdToken');
    mock.mockResolvedValueOnce({
      getPayload: () => ({
        sub: 'subject',
        email: 'a@example.com',
        email_verified: false,
        iss: 'https://accounts.google.com',
      }),
    } as any);
    await expect(service.verify('unverified')).rejects.toThrow(
      UnauthorizedException,
    );
    mock.mockResolvedValueOnce({
      getPayload: () => ({
        sub: 'subject',
        email: 'Buyer@Example.com',
        email_verified: true,
        iss: 'https://accounts.google.com',
        name: 'Buyer',
      }),
    } as any);
    await expect(service.verify('verified-by-library')).resolves.toEqual({
      subject: 'subject',
      email: 'buyer@example.com',
      fullName: 'Buyer',
    });
  });
});
