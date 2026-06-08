import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulerService } from './scheduler.service';
import { Reminder, ReminderSchema } from '@/schemas/reminder.schema';
import { Group, GroupSchema } from '@/schemas/group.schema';
import { EventsModule } from '@/events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    EventsModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
