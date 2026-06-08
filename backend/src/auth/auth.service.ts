import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@/schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  // Validates token sent via handshake
  async validateHandshake(token: string): Promise<any> {
    this.logger.log('Validating socket handshake token...');
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.userModel.findById(decoded.userId);
      if (!user) {
        this.logger.warn(`Handshake failed: User ID ${decoded.userId} not found in database.`);
        return null;
      }
      this.logger.log(`Handshake verified successfully for user: @${user.username} (${user._id})`);
      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        phone: user.phone,
        name: user.name,
        signupStep: user.signupStep ?? 4,
        settings: user.settings || { theme: 'system', notifications: true, defaultReminderTime: '09:00 AM', snoozeDuration: 10 }
      };
    } catch (err: any) {
      this.logger.error(`Handshake failed verification: ${err.message}`);
      return null;
    }
  }

  // Register new account
  async register(username: string, password: string): Promise<{ token: string; user: any }> {
    const normalizedUsername = username.toLowerCase().trim();
    this.logger.log(`Attempting to register user: @${normalizedUsername}`);

    const existing = await this.userModel.findOne({ username: normalizedUsername });
    if (existing) {
      this.logger.warn(`Registration failed: Username @${normalizedUsername} already taken.`);
      throw new Error('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      username: normalizedUsername,
      password: hashedPassword,
      friends: [],
      friendRequests: [],
      settings: { theme: 'system', notifications: true, defaultReminderTime: '09:00 AM', snoozeDuration: 10 }
    });

    await newUser.save();
    this.logger.log(`User registered successfully: @${normalizedUsername} (${newUser._id})`);

    const token = this.jwtService.sign({ userId: newUser._id, username: newUser.username });
    return { 
      token, 
      user: { 
        id: newUser._id.toString(), 
        username: newUser.username,
        settings: newUser.settings
      } 
    };
  }

  // Login existing account
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    const normalizedUsername = username.toLowerCase().trim();
    this.logger.log(`Attempting login for user: @${normalizedUsername}`);

    const user = await this.userModel.findOne({ username: normalizedUsername });
    if (!user || !user.password) {
      this.logger.warn(`Login failed: User @${normalizedUsername} not found.`);
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      this.logger.warn(`Login failed: Incorrect password for @${normalizedUsername}.`);
      throw new Error('Invalid credentials');
    }

    this.logger.log(`User logged in successfully: @${normalizedUsername} (${user._id})`);

    const token = this.jwtService.sign({ userId: user._id, username: user.username });
    return {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        signupStep: user.signupStep ?? 4,
        settings: user.settings || { theme: 'system', notifications: true, defaultReminderTime: '09:00 AM', snoozeDuration: 10 }
      },
    };
  }

  // Finds or creates an OAuth user (handling name, Google ID, Facebook ID, email, avatar, and access tokens)
  async findOrCreateOAuthUser(profile: {
    googleId?: string;
    facebookId?: string;
    email: string;
    name: string;
    avatarUrl?: string;
    googleAccessToken?: string;
    facebookAccessToken?: string;
  }): Promise<{ token: string; user: { id: string; username: string; name: string } }> {
    this.logger.log(`OAuth authentication attempt for email: ${profile.email}`);

    let user: UserDocument | null = null;

    // 1. Try to find user by googleId or facebookId
    if (profile.googleId) {
      user = await this.userModel.findOne({ googleId: profile.googleId });
    } else if (profile.facebookId) {
      user = await this.userModel.findOne({ facebookId: profile.facebookId });
    }

    if (user) {
      this.logger.log(`Existing OAuth user found: @${user.username} (${user._id})`);
      // Update access token, name, and avatar if changed
      if (profile.googleId) {
        user.googleAccessToken = profile.googleAccessToken;
        user.googleId = profile.googleId;
      }
      if (profile.facebookId) {
        user.facebookAccessToken = profile.facebookAccessToken;
        user.facebookId = profile.facebookId;
      }
      if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
      user.name = profile.name;
      user.isEmailVerified = true;
      user.signupStep = 4;
      await user.save();
    } else {
      // 2. If not found by social ID, check if a user with the same email exists
      user = await this.userModel.findOne({ email: profile.email.toLowerCase().trim() });

      if (user) {
        this.logger.log(`Binding existing user @${user.username} to OAuth credentials`);
        if (profile.googleId) {
          user.googleId = profile.googleId;
          user.googleAccessToken = profile.googleAccessToken;
        }
        if (profile.facebookId) {
          user.facebookId = profile.facebookId;
          user.facebookAccessToken = profile.facebookAccessToken;
        }
        if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
        user.name = profile.name;
        user.isEmailVerified = true;
        user.signupStep = 4;
        await user.save();
      } else {
        // 3. Create a brand new user
        // Generate a unique username
        const baseUsername = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        let username = baseUsername || 'doodler';
        
        // Ensure username uniqueness
        let suffix = 1;
        while (await this.userModel.findOne({ username })) {
          username = `${baseUsername}${suffix}`;
          suffix++;
        }

        this.logger.log(`Creating new OAuth user with username: @${username}`);
        user = new this.userModel({
          username,
          name: profile.name,
          email: profile.email.toLowerCase().trim(),
          isEmailVerified: true,
          signupStep: 4,
          googleId: profile.googleId,
          facebookId: profile.facebookId,
          avatarUrl: profile.avatarUrl,
          googleAccessToken: profile.googleAccessToken,
          facebookAccessToken: profile.facebookAccessToken,
          friends: [],
          friendRequests: [],
        });

        await user.save();
        this.logger.log(`New OAuth user registered successfully: @${username} (${user._id})`);
      }
    }

    const token = this.jwtService.sign({ userId: user._id, username: user.username });
    return {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name || user.username,
      },
    };
  }

  // --- Step-by-step Registration & OTP flows ---

  async sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not defined in environment variables. Cannot send verification email.');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Doodle Reminders <onboarding@resend.dev>',
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Resend API request failed: ${response.status} - ${errText}`);
        return false;
      }

      this.logger.log(`Email successfully dispatched via Resend to: ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email via Resend: ${error.message}`);
      return false;
    }
  }

  async requestOtp(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    this.logger.log(`OTP request for email: ${normalizedEmail}`);

    const existingUser = await this.userModel.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.signupStep === 4) {
      this.logger.warn(`OTP request failed: ${normalizedEmail} is already registered.`);
      throw new Error('Email already registered');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    this.logger.log(`Generated OTP: ${otp} for ${normalizedEmail}. Valid until ${otpExpires.toISOString()}`);

    if (existingUser) {
      existingUser.emailOtp = otp;
      existingUser.emailOtpExpires = otpExpires;
      existingUser.isEmailVerified = false;
      await existingUser.save();
    } else {
      // Generate a temporary unique username to satisfy uniqueness in DB
      const tempUsername = `temp_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      const newUser = new this.userModel({
        username: tempUsername,
        email: normalizedEmail,
        emailOtp: otp,
        emailOtpExpires: otpExpires,
        isEmailVerified: false,
        signupStep: 0,
        friends: [],
        friendRequests: [],
      });
      await newUser.save();
    }

    const emailSubject = '✏️ Your Doodle Reminders Verification Code';
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1E1E24; background-color: #FAF6EE; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 2px solid #1E1E24;">
        <h2 style="font-size: 28px; margin-top: 0; color: #1E1E24; text-align: center;">✏️ Doodle Reminders</h2>
        <hr style="border: none; border-top: 2px dashed #1E1E24; margin: 20px 0;" />
        <p style="font-size: 16px; line-height: 1.5;">Thanks for joining us! Use the verification code below to verify your email address and continue setting up your account:</p>
        <div style="font-size: 32px; font-weight: bold; background: #FFFFFF; padding: 15px; border: 2px solid #1E1E24; text-align: center; margin: 25px 0; letter-spacing: 6px; border-radius: 8px;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #666; text-align: center;">This code is valid for 15 minutes. If you did not request this code, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 2px dashed #1E1E24; margin: 20px 0;" />
        <p style="font-size: 14px; text-align: center; font-style: italic; color: #1E1E24; margin-bottom: 0;">scribble. share. sync.</p>
      </div>
    `;

    // Attempt to send email
    const emailSent = await this.sendResendEmail(normalizedEmail, emailSubject, emailHtml);
    if (!emailSent) {
      // In development, return the OTP back in the message if the API key is missing so they can still test
      const message = process.env.RESEND_API_KEY 
        ? 'Failed to send OTP email' 
        : `[DEV FALLBACK] OTP generated successfully: ${otp}`;
      return { success: true, message };
    }

    return { success: true, message: 'OTP sent successfully' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ token: string; user: any }> {
    const normalizedEmail = email.toLowerCase().trim();
    this.logger.log(`Verifying OTP for email: ${normalizedEmail}`);

    const user = await this.userModel.findOne({ email: normalizedEmail });
    if (!user) {
      this.logger.warn(`OTP verification failed: User with email ${normalizedEmail} not found.`);
      throw new Error('User not found');
    }

    if (!user.emailOtp || user.emailOtp !== otp || !user.emailOtpExpires || user.emailOtpExpires < new Date()) {
      this.logger.warn(`OTP verification failed: Invalid or expired OTP for ${normalizedEmail}.`);
      throw new Error('Invalid or expired verification code');
    }

    // Clear verification codes, mark verified
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    user.isEmailVerified = true;
    if (user.signupStep === 0) {
      user.signupStep = 1;
    }
    await user.save();

    this.logger.log(`Email ${normalizedEmail} verified successfully (Step: ${user.signupStep})`);

    const token = this.jwtService.sign({ userId: user._id, username: user.username });
    return {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        signupStep: user.signupStep,
        name: user.name,
        phone: user.phone,
        settings: user.settings || { theme: 'system', notifications: true, defaultReminderTime: '09:00 AM', snoozeDuration: 10 }
      },
    };
  }

  async completeStep1(userId: string, username: string, phone: string | undefined, password: string): Promise<any> {
    const normalizedUsername = username.toLowerCase().trim();
    this.logger.log(`User ID ${userId} completing step 1 with username: @${normalizedUsername}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check username uniqueness
    const existingUser = await this.userModel.findOne({ username: normalizedUsername, _id: { $ne: userId } });
    if (existingUser) {
      throw new Error('Username already taken');
    }

    // Check phone uniqueness if provided
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');
      if (cleanPhone) {
        const existingPhone = await this.userModel.findOne({ phone: cleanPhone, _id: { $ne: userId } });
        if (existingPhone) {
          throw new Error('Phone number already registered');
        }
        user.phone = cleanPhone;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.username = normalizedUsername;
    user.password = hashedPassword;
    user.signupStep = 2;
    await user.save();

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      signupStep: user.signupStep,
      name: user.name,
      settings: user.settings || { theme: 'system', notifications: true, defaultReminderTime: '09:00 AM', snoozeDuration: 10 }
    };
  }

  async completeStep2(userId: string, name: string | undefined): Promise<any> {
    this.logger.log(`User ID ${userId} completing step 2 with name: ${name}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.name = name?.trim() || user.username;
    user.signupStep = 3;
    await user.save();

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      signupStep: user.signupStep,
      name: user.name,
      settings: user.settings || { theme: 'system', notifications: true, defaultReminderTime: '09:00 AM', snoozeDuration: 10 }
    };
  }

  async findRecommendedContacts(userId: string, phones: string[]): Promise<any[]> {
    this.logger.log(`User ID ${userId} scanning recommended contacts from ${phones.length} phones.`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const cleanPhones = phones
      .map(p => p.replace(/[^0-9+]/g, ''))
      .filter(p => p.length > 0);

    if (cleanPhones.length === 0) return [];

    const matchedUsers = await this.userModel.find({
      phone: { $in: cleanPhones },
      signupStep: 4,
      _id: { $ne: user._id, $nin: user.friends }
    }, 'username name phone _id').exec();

    return matchedUsers.map(u => ({
      id: u._id.toString(),
      username: u.username,
      name: u.name || u.username,
      phone: u.phone,
    }));
  }

  async completeStep3(userId: string): Promise<any> {
    this.logger.log(`User ID ${userId} completing step 3 (signup completion)`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.signupStep = 4;
    await user.save();

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      signupStep: user.signupStep,
      name: user.name,
      settings: user.settings || { theme: 'system', notifications: true, defaultReminderTime: '09:00 AM', snoozeDuration: 10 }
    };
  }

  async updateUserSettings(userId: string, settings: any): Promise<any> {
    this.logger.log(`Updating settings for user ID ${userId}: ${JSON.stringify(settings)}`);
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.settings = {
      ...user.settings,
      ...settings
    };
    await user.save();
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      signupStep: user.signupStep ?? 4,
      name: user.name,
      settings: user.settings
    };
  }
}

