import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';
import { FriendsModule } from '../friends/friends.module';
import { GroupsModule } from '../groups/groups.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [AuthModule, FriendsModule, GroupsModule, RemindersModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
