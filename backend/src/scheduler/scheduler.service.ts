import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Reminder, ReminderDocument } from '@/schemas/reminder.schema';
import { Group, GroupDocument } from '@/schemas/group.schema';
import { EventsGateway } from '@/events/events.gateway';

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  onModuleInit() {
    console.log('SchedulerService: Background scan scheduler initialized!');
    this.startScanner();
  }

  private startScanner() {
    setInterval(async () => {
      try {
        const now = new Date();

        // Fetch all pending reminders whose deadline has been reached
        const dueReminders = await this.reminderModel.find({
          dueAt: { $lte: now },
          status: 'pending',
        })
        .populate('creator', 'username _id')
        .populate('group', 'name _id')
        .exec();

        if (dueReminders.length > 0) {
          console.log(`SchedulerService: Found ${dueReminders.length} due reminders. Triggering live alarms...`);
        }

        for (const reminder of dueReminders) {
          // 1. Lock state immediately by setting to triggered
          reminder.status = 'triggered';
          await reminder.save();

          // 2. Identify target users to alert
          let targetUserIds: string[] = [];
          if (reminder.group) {
            const group = await this.groupModel.findById(reminder.group);
            if (group) {
              targetUserIds = group.members.map(m => m.toString());
            }
          } else {
            targetUserIds = [reminder.creator._id.toString()];
          }

          // 3. Emit trigger events and sync refresh lists for all targets
          targetUserIds.forEach(userId => {
            console.log(`SchedulerService: Triggering alarm for user ${userId} - reminder "${reminder.title}"`);
            
            // Dispatch fullscreen alarm trigger
            this.eventsGateway.sendToUser(userId, 'reminder:trigger', {
              id: reminder._id.toString(),
              title: reminder.title,
              description: reminder.description,
              dueAt: reminder.dueAt.toISOString(),
              isGroup: !!reminder.group,
              groupName: reminder.group ? (reminder.group as any).name : null,
              creatorUsername: (reminder.creator as any).username,
            });

            // Dispatch list refresh
            this.eventsGateway.emitReminderList(userId);
          });
        }
      } catch (err) {
        console.error('SchedulerService: Error executing scan loop:', err);
      }
    }, 5000);
  }
}
