import { Controller, Get, Query, Res, Logger, Header, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('google')
  async googleAuth(
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    const appRedirectUri = redirectUri || 'doodlereminders://oauth-callback';
    this.logger.log(`Initiating Google OAuth flow. App redirect target: ${appRedirectUri}`);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      this.logger.error('Google Client Credentials are not configured in the backend .env file.');
      throw new InternalServerErrorException(
        'Google Client Credentials are not configured in the backend .env file. Please define GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }

    // --- Real Google OAuth 2.0 Flow ---
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.append('client_id', clientId);
    googleAuthUrl.searchParams.append('redirect_uri', `${backendUrl}/auth/google/callback`);
    googleAuthUrl.searchParams.append('response_type', 'code');
    googleAuthUrl.searchParams.append('scope', 'openid profile email https://www.googleapis.com/auth/contacts.readonly');
    googleAuthUrl.searchParams.append('access_type', 'offline');
    googleAuthUrl.searchParams.append('prompt', 'consent');
    googleAuthUrl.searchParams.append('state', appRedirectUri); // pass app deep link through state

    return res.redirect(googleAuthUrl.toString());
  }

  // --- Real Google OAuth 2.0 Callback ---
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string, // the app redirect URI
    @Res() res: Response,
  ) {
    this.logger.log(`Received real Google OAuth callback. Exchange code...`);
    const appRedirectUri = state || 'doodlereminders://oauth-callback';

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured.');
      }

      // 1. Exchange OAuth code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${backendUrl}/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        this.logger.error(`Token exchange failed: ${errorText}`);
        return res.redirect(`${appRedirectUri}?error=token_exchange_failed`);
      }

      const tokens = await tokenResponse.json() as {
        access_token: string;
        id_token: string;
        expires_in: number;
        refresh_token?: string;
      };

      // 2. Fetch User Profile using access token
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        this.logger.error(`Failed to fetch user profile: ${errorText}`);
        return res.redirect(`${appRedirectUri}?error=profile_fetch_failed`);
      }

      const googleProfile = await profileResponse.json() as {
        sub: string;
        name: string;
        email: string;
        picture?: string;
      };

      this.logger.log(`Google profile fetched successfully for email: ${googleProfile.email}`);

      // 3. Upsert user and sign a backend JWT (passing access token for contacts permission!)
      const result = await this.authService.findOrCreateOAuthUser({
        googleId: googleProfile.sub,
        email: googleProfile.email,
        name: googleProfile.name,
        avatarUrl: googleProfile.picture,
        googleAccessToken: tokens.access_token, // Store for later Contacts integrations!
      });

      // 4. Redirect user back to Expo app
      const finalRedirectUrl = `${appRedirectUri}?token=${result.token}&userId=${result.user.id}&username=${result.user.username}`;
      this.logger.log(`Redirecting user back to App deep link: ${finalRedirectUrl}`);
      return res.redirect(finalRedirectUrl);
    } catch (err: any) {
      this.logger.error(`Real Google callback exception: ${err.message}`);
      return res.redirect(`${appRedirectUri}?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Get('facebook')
  async facebookAuth(
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    const appRedirectUri = redirectUri || 'doodlereminders://oauth-callback';
    this.logger.log(`Initiating Facebook OAuth flow. App redirect target: ${appRedirectUri}`);

    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      this.logger.error('Facebook Client Credentials are not configured in the backend .env file.');
      throw new InternalServerErrorException(
        'Facebook Client Credentials are not configured in the backend .env file. Please define FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET.',
      );
    }

    // --- Real Facebook OAuth 2.0 Flow ---
    const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    facebookAuthUrl.searchParams.append('client_id', clientId);
    facebookAuthUrl.searchParams.append('redirect_uri', `${backendUrl}/auth/facebook/callback`);
    facebookAuthUrl.searchParams.append('response_type', 'code');
    facebookAuthUrl.searchParams.append('scope', 'email,public_profile');
    facebookAuthUrl.searchParams.append('state', appRedirectUri); // pass app deep link through state

    return res.redirect(facebookAuthUrl.toString());
  }

  @Get('facebook/callback')
  async facebookCallback(
    @Query('code') code: string,
    @Query('state') state: string, // the app redirect URI
    @Res() res: Response,
  ) {
    this.logger.log(`Received Facebook OAuth callback. Exchange code...`);
    const appRedirectUri = state || 'doodlereminders://oauth-callback';

    try {
      const clientId = process.env.FACEBOOK_CLIENT_ID;
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

      if (!clientId || !clientSecret) {
        throw new Error('Facebook OAuth credentials not configured.');
      }

      // 1. Exchange OAuth code for access token
      const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
      tokenUrl.searchParams.append('client_id', clientId);
      tokenUrl.searchParams.append('client_secret', clientSecret);
      tokenUrl.searchParams.append('redirect_uri', `${backendUrl}/auth/facebook/callback`);
      tokenUrl.searchParams.append('code', code);

      const tokenResponse = await fetch(tokenUrl.toString());

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        this.logger.error(`Facebook Access Token exchange failed: ${errorText}`);
        return res.redirect(`${appRedirectUri}?error=facebook_token_exchange_failed`);
      }

      const tokens = await tokenResponse.json() as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      // 2. Fetch User Profile (id, name, email, picture) using access token
      const profileUrl = new URL('https://graph.facebook.com/me');
      profileUrl.searchParams.append('fields', 'id,name,email,picture.type(large)');
      profileUrl.searchParams.append('access_token', tokens.access_token);

      const profileResponse = await fetch(profileUrl.toString());

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        this.logger.error(`Failed to fetch Facebook user profile: ${errorText}`);
        return res.redirect(`${appRedirectUri}?error=facebook_profile_fetch_failed`);
      }

      const facebookProfile = await profileResponse.json() as {
        id: string;
        name: string;
        email?: string;
        picture?: {
          data?: {
            url?: string;
          };
        };
      };

      this.logger.log(`Facebook profile fetched successfully for ID: ${facebookProfile.id}`);

      // Facebook may not return an email under some sandbox/permissions/unverified conditions, so fall back safely
      const finalEmail = facebookProfile.email || `${facebookProfile.id}@facebook.com`;
      const avatarUrl = facebookProfile.picture?.data?.url;

      // 3. Upsert user and sign a backend JWT
      const result = await this.authService.findOrCreateOAuthUser({
        facebookId: facebookProfile.id,
        email: finalEmail,
        name: facebookProfile.name,
        avatarUrl,
        facebookAccessToken: tokens.access_token,
      });

      // 4. Redirect user back to Expo app
      const finalRedirectUrl = `${appRedirectUri}?token=${result.token}&userId=${result.user.id}&username=${result.user.username}`;
      this.logger.log(`Redirecting user back to App deep link: ${finalRedirectUrl}`);
      return res.redirect(finalRedirectUrl);
    } catch (err: any) {
      this.logger.error(`Facebook callback exception: ${err.message}`);
      return res.redirect(`${appRedirectUri}?error=${encodeURIComponent(err.message)}`);
    }
  }
}
