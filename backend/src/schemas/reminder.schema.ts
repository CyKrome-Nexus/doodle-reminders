import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Reminder extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  dueAt: Date;

  @Prop({ type: String, enum: ['pending', 'triggered', 'completed'], default: 'pending' })
  status: 'pending' | 'triggered' | 'completed';

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: false })
  group?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  creator: mongoose.Types.ObjectId;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  dismissedBy: mongoose.Types.ObjectId[];

  @Prop({ default: 'Personal' })
  category: string;

  @Prop({ default: 'Does not repeat' })
  repeat: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({
    type: [{
      label: { type: String, required: true },
      value: { type: String, required: true }
    }],
    default: []
  })
  customFields: { label: string; value: string }[];

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
export type ReminderDocument = Reminder & Document;
