import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Reminder, ReminderDocument } from '@/schemas/reminder.schema';
import { Group, GroupDocument } from '@/schemas/group.schema';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>
  ) {}

  // Creates personal or group reminder
  async createReminder(
    title: string,
    description: string,
    dueAt: string,
    creatorId: string,
    groupId?: string,
    category?: string,
    repeat?: string,
    tags?: string[],
    customFields?: { label: string; value: string }[],
    sound?: { type: 'default' | 'custom'; name: string; uri?: string }
  ): Promise<ReminderDocument> {
    this.logger.log(`Creating reminder "${title}" by creator ID ${creatorId} (Group ID: ${groupId || 'None'})`);
    
    if (!title || !dueAt) {
      this.logger.warn('Reminder creation failed: Title or due date was missing.');
      throw new Error('Title and due date are required');
    }

    const dueTime = new Date(dueAt);
    if (isNaN(dueTime.getTime())) {
      this.logger.warn(`Reminder creation failed: Invalid date format: ${dueAt}`);
      throw new Error('Invalid due date format');
    }

    const newReminder = new this.reminderModel({
      title: title.trim(),
      description: description.trim(),
      dueAt: dueTime,
      status: 'pending',
      creator: new mongoose.Types.ObjectId(creatorId),
      dismissedBy: [],
      group: groupId ? new mongoose.Types.ObjectId(groupId) : undefined,
      category: category || 'Personal',
      repeat: repeat || 'Does not repeat',
      tags: tags || [],
      customFields: customFields || [],
      sound: sound || undefined
    });

    await newReminder.save();
    this.logger.log(`Reminder successfully created: "${title}" (${newReminder._id}) scheduled for: ${dueTime.toISOString()}`);
    return newReminder;
  }

  // Returns reminders created by user or linked to groups user belongs to
  async getRemindersForUser(userId: string): Promise<any[]> {
    this.logger.log(`Fetching active reminders list for user ID ${userId}...`);

    // 1. Fetch group IDs user belongs to
    const userGroups = await this.groupModel.find({
      members: new mongoose.Types.ObjectId(userId)
    }).select('_id');
    const groupIds = userGroups.map(g => g._id);
    this.logger.log(`User ID ${userId} belongs to ${groupIds.length} groups.`);

    // 2. Fetch reminders: created by user OR assigned to user's groups
    const reminders = await this.reminderModel.find({
      $or: [
        { creator: new mongoose.Types.ObjectId(userId) },
        { group: { $in: groupIds } }
      ]
    })
    .populate('creator', 'username _id')
    .populate('group', 'name _id')
    .sort({ dueAt: 1 })
    .exec();

    this.logger.log(`Found ${reminders.length} reminders total (personal + group) for user ID ${userId}.`);

    return reminders.map(r => ({
      id: r._id.toString(),
      title: r.title,
      description: r.description,
      dueAt: r.dueAt.toISOString(),
      status: r.status,
      isGroup: !!r.group,
      groupName: r.group ? (r.group as any).name : null,
      groupId: r.group ? (r.group as any)._id.toString() : null,
      creatorId: r.creator._id.toString(),
      creatorUsername: (r.creator as any).username,
      isDismissedByMe: r.dismissedBy.includes(new mongoose.Types.ObjectId(userId)),
      category: r.category || 'Personal',
      repeat: r.repeat || 'Does not repeat',
      tags: r.tags || [],
      customFields: r.customFields || [],
      sound: r.sound || undefined
    }));
  }

  // Dismisses / acknowledges a reminder
  async dismissReminder(reminderId: string, userId: string): Promise<ReminderDocument> {
    this.logger.log(`Dismissing reminder ID ${reminderId} for user ID ${userId}...`);

    const reminder = await this.reminderModel.findById(reminderId);
    if (!reminder) {
      this.logger.error(`Dismiss failed: Reminder ID ${reminderId} not found.`);
      throw new Error('Reminder not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Add to dismissedBy if not already there
    if (!reminder.dismissedBy.includes(userObjectId)) {
      reminder.dismissedBy.push(userObjectId);
      this.logger.log(`Added user ID ${userId} to dismissedBy list for reminder "${reminder.title}".`);
    }

    // Check if everyone involved has dismissed it
    let allDismissed = false;
    if (reminder.group) {
      const group = await this.groupModel.findById(reminder.group);
      if (group) {
        allDismissed = group.members.every(mId => reminder.dismissedBy.includes(mId));
        this.logger.log(`Group reminder dismissal evaluation: ${reminder.dismissedBy.length}/${group.members.length} members acknowledged.`);
      }
    } else {
      allDismissed = reminder.dismissedBy.includes(reminder.creator);
      this.logger.log(`Personal reminder dismissal evaluation: Creator acknowledged.`);
    }

    if (allDismissed) {
      reminder.status = 'completed';
      this.logger.log(`All participants acknowledged! Closing task. Reminder "${reminder.title}" marked COMPLETED.`);
    }

    await reminder.save();
    return reminder;
  }

  // Deletes a reminder created by the user
  async deleteReminder(reminderId: string, userId: string): Promise<boolean> {
    this.logger.log(`Deleting reminder ID ${reminderId} for user ID ${userId}...`);
    const result = await this.reminderModel.deleteOne({
      _id: new mongoose.Types.ObjectId(reminderId),
      creator: new mongoose.Types.ObjectId(userId)
    });
    return result.deletedCount > 0;
  }
}
