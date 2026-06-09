import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { GroupsModule } from './groups/groups.module';
import { RemindersModule } from './reminders/reminders.module';
import { EventsModule } from './events/events.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { UploadModule } from './upload/upload.module';
import * as dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/doodle-reminders';

@Module({
  imports: [
    MongooseModule.forRoot(MONGO_URI),
    AuthModule,
    FriendsModule,
    GroupsModule,
    RemindersModule,
    EventsModule,
    SchedulerModule,
    UploadModule,
  ],
})
export class AppModule {}
