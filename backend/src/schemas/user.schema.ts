import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  username: string;

  @Prop({ required: false })
  password?: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false, lowercase: true, trim: true })
  email?: string;

  @Prop({ required: false, unique: true, sparse: true })
  phone?: string;

  @Prop({ required: false, default: false })
  isEmailVerified?: boolean;

  @Prop({ required: false })
  emailOtp?: string;

  @Prop({ required: false })
  emailOtpExpires?: Date;

  @Prop({ required: false, default: 0 })
  signupStep?: number;

  @Prop({ required: false, unique: true, sparse: true })
  googleId?: string;

  @Prop({ required: false, unique: true, sparse: true })
  facebookId?: string;

  @Prop({ required: false })
  avatarUrl?: string;

  @Prop({ required: false })
  googleAccessToken?: string;

  @Prop({ required: false })
  facebookAccessToken?: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  friends: mongoose.Types.ObjectId[];

  @Prop({
    type: [{
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      username: { type: String, required: true },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
    }]
  })
  friendRequests: {
    _id?: mongoose.Types.ObjectId;
    from: mongoose.Types.ObjectId;
    username: string;
    status: 'pending' | 'accepted' | 'rejected';
  }[];

  @Prop({
    type: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: { type: Boolean, default: true },
      defaultReminderTime: { type: String, default: '09:00 AM' },
      snoozeDuration: { type: Number, default: 10 }
    },
    default: {
      theme: 'system',
      notifications: true,
      defaultReminderTime: '09:00 AM',
      snoozeDuration: 10
    }
  })
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    defaultReminderTime: string;
    snoozeDuration: number;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;
