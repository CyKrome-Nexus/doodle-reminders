import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Group extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  members: mongoose.Types.ObjectId[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: mongoose.Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
export type GroupDocument = Group & Document;
