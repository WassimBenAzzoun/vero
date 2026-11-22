import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleService {
  private readonly client = new OAuth2Client();
  audiences() {
    return [
      ...new Set(
        [
          process.env.GOOGLE_WEB_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
          process.env.GOOGLE_IOS_CLIENT_ID,
          ...(process.env.GOOGLE_ALLOWED_AUDIENCES || '').split(','),
        ]
          .map((v) => v?.trim())
          .filter((v): v is string => !!v),
      ),
    ];
  }
  async verify(idToken: string) {
    const audience = this.audiences();
    if (!audience.length)
      throw new ServiceUnavailableException({
        code: 'GOOGLE_DISABLED',
        message: 'Google sign-in is not configured',
      });
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      const data = ticket.getPayload();
      if (
        !data?.sub ||
        !data.email ||
        !data.email_verified ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(
          data.iss,
        )
      )
        throw new Error('Invalid claims');
      return {
        subject: data.sub,
        email: data.email.trim().toLowerCase(),
        fullName: data.name || data.email.split('@')[0],
      };
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
  }
}
