import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemindersService } from './reminders.service';
import { Reminder, ReminderSchema } from '@/schemas/reminder.schema';
import { Group, GroupSchema } from '@/schemas/group.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
