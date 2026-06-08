import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { FriendsService } from '../friends/friends.service';
import { GroupsService } from '../groups/groups.service';
import { RemindersService } from '../reminders/reminders.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  // In-memory registry of online userId -> socketIds
  public readonly onlineUsers = new Map<string, string[]>();

  constructor(
    private readonly authService: AuthService,
    private readonly friendsService: FriendsService,
    private readonly groupsService: GroupsService,
    private readonly remindersService: RemindersService,
  ) {}

  // Handle client connections
  handleConnection(client: Socket) {
    this.logger.log(`[WS Connection] Socket client connected: ${client.id}`);
  }

  // Handle client disconnections
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const existing = this.onlineUsers.get(userId) || [];
      const index = existing.indexOf(client.id);
      if (index !== -1) {
        existing.splice(index, 1);
      }
      if (existing.length === 0) {
        this.onlineUsers.delete(userId);
      } else {
        this.onlineUsers.set(userId, existing);
      }
      this.logger.log(`[WS Disconnect] User @${client.data.username} logged off from connection ID ${client.id}`);
    } else {
      this.logger.log(`[WS Disconnect] Unauthenticated client closed connection ID ${client.id}`);
    }
  }

  // Helper to emit events directly to all active connections of a user
  sendToUser(userId: string, eventName: string, data: any) {
    this.logger.log(`[WS Outbound ↗️] Direct dispatch event '${eventName}' to user ID ${userId}`);
    this.server.to(`user:${userId}`).emit(eventName, data);
  }

  // Bind a connection to authenticated session
  private registerOnlineUser(client: Socket, userId: string, username: string) {
    const existing = this.onlineUsers.get(userId) || [];
    if (!existing.includes(client.id)) {
      existing.push(client.id);
      this.onlineUsers.set(userId, existing);
    }
    client.data.userId = userId;
    client.data.username = username;
    client.join(`user:${userId}`);
    this.logger.log(`[WS Roster 🔄] Bound session ID ${client.id} to user @${username} (Room: user:${userId})`);
  }

  // JWT Validation Handshake
  @SubscribeMessage('auth:handshake')
  async handleHandshake(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token?: string },
  ) {
    this.logger.log(`[WS Inbound 📥] Received 'auth:handshake' on connection ID ${client.id}`);
    try {
      if (!data.token) {
        this.logger.warn(`Handshake aborted: Token not supplied by connection ID ${client.id}`);
        return client.emit('auth:handshake_failed', { message: 'No token provided' });
      }
      const user = await this.authService.validateHandshake(data.token);
      if (!user) {
        this.logger.warn(`Handshake rejected: invalid/expired token on connection ID ${client.id}`);
        return client.emit('auth:handshake_failed', { message: 'Invalid or expired token' });
      }

      this.registerOnlineUser(client, user.id, user.username);
      client.emit('auth:success', {
        token: data.token,
        user,
      });
    } catch (err: any) {
      this.logger.error(`Handshake exception: ${err.message}`);
      client.emit('auth:handshake_failed', { message: 'Handshake validation error' });
    }
  }

  // Register Event
  @SubscribeMessage('auth:register')
  async handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username?: string; password?: string },
  ) {
    this.logger.log(`[WS Inbound 📥] Received 'auth:register' for username @${data.username}`);
    try {
      const result = await this.authService.register(data.username, data.password);
      this.registerOnlineUser(client, result.user.id, result.user.username);
      client.emit('auth:success', result);
    } catch (err: any) {
      this.logger.error(`Register exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Registration error' });
    }
  }

  // Login Event
  @SubscribeMessage('auth:login')
  async handleLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username?: string; password?: string },
  ) {
    this.logger.log(`[WS Inbound 📥] Received 'auth:login' for username @${data.username}`);
    try {
      const result = await this.authService.login(data.username, data.password);
      this.registerOnlineUser(client, result.user.id, result.user.username);
      client.emit('auth:success', result);
    } catch (err: any) {
      this.logger.error(`Login exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Login error' });
    }
  }

  // Request OTP Event
  @SubscribeMessage('auth:request_otp')
  async handleRequestOtp(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { email?: string },
  ) {
    this.logger.log(`[WS Inbound 📥] Received 'auth:request_otp' for ${data.email}`);
    try {
      if (!data.email) {
        throw new Error('Email is required');
      }
      const result = await this.authService.requestOtp(data.email);
      client.emit('auth:otp_sent', result);
    } catch (err: any) {
      this.logger.error(`Request OTP exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Error requesting OTP' });
    }
  }

  // Verify OTP Event
  @SubscribeMessage('auth:verify_otp')
  async handleVerifyOtp(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { email?: string; otp?: string },
  ) {
    this.logger.log(`[WS Inbound 📥] Received 'auth:verify_otp' for ${data.email}`);
    try {
      if (!data.email || !data.otp) {
        throw new Error('Email and OTP are required');
      }
      const result = await this.authService.verifyOtp(data.email, data.otp);
      this.registerOnlineUser(client, result.user.id, result.user.username);
      client.emit('auth:success', result);
    } catch (err: any) {
      this.logger.error(`Verify OTP exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Error verifying OTP' });
    }
  }

  // Step 1 Completion Event
  @SubscribeMessage('auth:signup_step1')
  async handleSignupStep1(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username?: string; phone?: string; password?: string },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'auth:signup_step1' for user ID ${userId}`);
    try {
      if (!userId) {
        throw new Error('Unauthorized');
      }
      if (!data.username || !data.password) {
        throw new Error('Username and password are required');
      }
      const updatedUser = await this.authService.completeStep1(userId, data.username, data.phone, data.password);
      
      // Update socket metadata in case username changed
      client.data.username = updatedUser.username;

      client.emit('auth:step_success', { user: updatedUser });
    } catch (err: any) {
      this.logger.error(`Step 1 completion exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Error saving Step 1 details' });
    }
  }

  // Step 2 Completion Event
  @SubscribeMessage('auth:signup_step2')
  async handleSignupStep2(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name?: string },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'auth:signup_step2' for user ID ${userId}`);
    try {
      if (!userId) {
        throw new Error('Unauthorized');
      }
      const updatedUser = await this.authService.completeStep2(userId, data.name);
      client.emit('auth:step_success', { user: updatedUser });
    } catch (err: any) {
      this.logger.error(`Step 2 completion exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Error saving Step 2 details' });
    }
  }

  // Check Contacts Recommendation Event
  @SubscribeMessage('auth:check_contacts')
  async handleCheckContacts(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { phones?: string[] },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'auth:check_contacts' for user ID ${userId}`);
    try {
      if (!userId) {
        throw new Error('Unauthorized');
      }
      const recommendations = await this.authService.findRecommendedContacts(userId, data.phones || []);
      client.emit('auth:contacts_matched', { recommendations });
    } catch (err: any) {
      this.logger.error(`Check contacts exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Error checking contacts' });
    }
  }

  // Step 3 Completion (Finish) Event
  @SubscribeMessage('auth:signup_step3_complete')
  async handleSignupStep3Complete(
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'auth:signup_step3_complete' for user ID ${userId}`);
    try {
      if (!userId) {
        throw new Error('Unauthorized');
      }
      const updatedUser = await this.authService.completeStep3(userId);
      client.emit('auth:success', {
        token: client.handshake.auth?.token || '',
        user: updatedUser,
      });
    } catch (err: any) {
      this.logger.error(`Step 3 completion exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Error completing signup' });
    }
  }

  // Friend Request
  @SubscribeMessage('friend:request')
  async handleFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { toUsername?: string },
  ) {
    const userId = client.data.userId;
    const username = client.data.username;
    this.logger.log(`[WS Inbound 📥] Received 'friend:request' from @${username} to add target @${data.toUsername}`);
    try {
      if (!userId) {
        this.logger.warn(`Friend Request blocked: Connection ID ${client.id} is unauthenticated.`);
        return client.emit('friend:error', { message: 'Unauthorized' });
      }

      const result = await this.friendsService.sendFriendRequest(userId, data.toUsername);
      
      // Alert target user
      this.logger.log(`[WS Outbound ↗️] Sending alert 'friend:request_received' to user ID ${result.targetUserId}`);
      this.sendToUser(result.targetUserId, 'friend:request_received', {
        fromUserId: userId,
        username: username,
      });

      client.emit('friend:success', { message: `Friend request sent to ${data.toUsername}` });
      
      // Refresh current user list
      this.emitFriendList(userId);
    } catch (err: any) {
      this.logger.error(`Friend request exception: ${err.message}`);
      client.emit('friend:error', { message: err.message || 'Friend request error' });
    }
  }

  // Friend Request Response
  @SubscribeMessage('friend:respond')
  async handleFriendRespond(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId?: string; action?: 'accept' | 'reject' },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'friend:respond' from @${client.data.username} for request ${data.requestId} (Action: ${data.action})`);
    try {
      if (!userId) return client.emit('friend:error', { message: 'Unauthorized' });

      const result = await this.friendsService.respondToFriendRequest(userId, data.requestId, data.action);
      
      if (result.action === 'accept') {
        client.emit('friend:success', { message: `Accepted friend request from ${result.friendName}` });
        
        // Notify other user
        this.logger.log(`[WS Outbound ↗️] Sending alert 'friend:accepted' to friend user ID ${result.friendId}`);
        this.sendToUser(result.friendId, 'friend:accepted', {
          userId,
          username: client.data.username,
        });

        this.emitFriendList(result.friendId);
      } else {
        client.emit('friend:success', { message: `Declined friend request from ${result.friendName}` });
      }

      this.emitFriendList(userId);
    } catch (err: any) {
      this.logger.error(`Friend respond exception: ${err.message}`);
      client.emit('friend:error', { message: err.message || 'Friend request respond error' });
    }
  }

  // Friend List request
  @SubscribeMessage('friend:list')
  async handleFriendList(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'friend:list' from @${client.data.username}`);
    if (!userId) return client.emit('friend:error', { message: 'Unauthorized' });
    this.emitFriendList(userId);
  }

  private async emitFriendList(userId: string) {
    try {
      const list = await this.friendsService.getFriendList(userId);
      this.sendToUser(userId, 'friend:list_response', list);
    } catch (err: any) {
      this.logger.error(`Failed to emit friend list for user ID ${userId}: ${err.message}`);
    }
  }

  // Group Create
  @SubscribeMessage('group:create')
  async handleGroupCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name?: string; memberIds?: string[] },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'group:create' for "${data.name}" from @${client.data.username}`);
    try {
      if (!userId) return client.emit('group:error', { message: 'Unauthorized' });

      const group = await this.groupsService.createGroup(data.name, data.memberIds, userId);
      
      // Notify all members
      group.members.forEach((mId) => {
        const memberIdStr = mId.toString();
        this.logger.log(`[WS Outbound ↗️] Sending 'group:new' announcement to group participant ${memberIdStr}`);
        this.sendToUser(memberIdStr, 'group:new', {
          id: group._id.toString(),
          name: group.name,
          createdBy: userId,
        });
        this.emitGroupList(memberIdStr);
      });

      client.emit('group:success', { message: `Group "${data.name}" created successfully` });
    } catch (err: any) {
      this.logger.error(`Group creation exception: ${err.message}`);
      client.emit('group:error', { message: err.message || 'Group create error' });
    }
  }

  // Group List request
  @SubscribeMessage('group:list')
  async handleGroupList(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'group:list' from @${client.data.username}`);
    if (!userId) return client.emit('group:error', { message: 'Unauthorized' });
    this.emitGroupList(userId);
  }

  private async emitGroupList(userId: string) {
    try {
      const list = await this.groupsService.getGroupsForUser(userId);
      this.sendToUser(userId, 'group:list_response', list);
    } catch (err: any) {
      this.logger.error(`Failed to emit group list for user ID ${userId}: ${err.message}`);
    }
  }

  // Reminder Create
  @SubscribeMessage('reminder:create')
  async handleReminderCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      title?: string;
      description?: string;
      dueAt?: string;
      groupId?: string;
      category?: string;
      repeat?: string;
      tags?: string[];
      customFields?: { label: string; value: string }[]
    },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'reminder:create' ("${data.title}") from @${client.data.username}`);
    try {
      if (!userId) return client.emit('reminder:error', { message: 'Unauthorized' });

      const reminder = await this.remindersService.createReminder(
        data.title,
        data.description,
        data.dueAt,
        userId,
        data.groupId,
        data.category,
        data.repeat,
        data.tags,
        data.customFields
      );

      // Alert members
      if (data.groupId) {
        const groupsList = await this.groupsService.getGroupsForUser(userId);
        const currentGroup = groupsList.find((g) => g.id === data.groupId);
        if (currentGroup) {
          currentGroup.members.forEach((member) => {
            this.logger.log(`[WS Outbound ↗️] Emitting 'reminder:new' to group participant @${member.username} (${member.id})`);
            this.sendToUser(member.id, 'reminder:new', {
              id: reminder._id.toString(),
              title: reminder.title,
              groupName: currentGroup.name,
            });
            this.emitReminderList(member.id);
          });
        }
      } else {
        this.logger.log(`[WS Outbound ↗️] Dispatching personal 'reminder:new' locally back to creator`);
        client.emit('reminder:new', {
          id: reminder._id.toString(),
          title: reminder.title,
        });
        this.emitReminderList(userId);
      }

      client.emit('reminder:success', { message: 'Reminder created successfully' });
    } catch (err: any) {
      this.logger.error(`Reminder creation exception: ${err.message}`);
      client.emit('reminder:error', { message: err.message || 'Reminder create error' });
    }
  }

  // Reminder List request
  @SubscribeMessage('reminder:list')
  async handleReminderList(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'reminder:list' from @${client.data.username}`);
    if (!userId) return client.emit('reminder:error', { message: 'Unauthorized' });
    this.emitReminderList(userId);
  }

  public async emitReminderList(userId: string) {
    try {
      const list = await this.remindersService.getRemindersForUser(userId);
      this.sendToUser(userId, 'reminder:list_response', list);
    } catch (err: any) {
      this.logger.error(`Failed to emit reminders list for user ID ${userId}: ${err.message}`);
    }
  }

  // Reminder Dismissal
  @SubscribeMessage('reminder:dismiss')
  async handleReminderDismiss(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reminderId?: string },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'reminder:dismiss' for reminder ID ${data.reminderId} from @${client.data.username}`);
    try {
      if (!userId) return client.emit('reminder:error', { message: 'Unauthorized' });

      const reminder = await this.remindersService.dismissReminder(data.reminderId, userId);
      
      if (reminder.group) {
        const groupsList = await this.groupsService.getGroupsForUser(userId);
        const currentGroup = groupsList.find((g) => g.id === reminder.group.toString());
        if (currentGroup) {
          currentGroup.members.forEach((member) => {
            this.logger.log(`[WS Outbound ↗️] Sending 'reminder:dismissed_sync' to group member ID ${member.id}`);
            this.sendToUser(member.id, 'reminder:dismissed_sync', { reminderId: data.reminderId });
            this.emitReminderList(member.id);
          });
        }
      } else {
        this.logger.log(`[WS Outbound ↗️] Dispatching 'reminder:dismissed_sync' back to creator`);
        client.emit('reminder:dismissed_sync', { reminderId: data.reminderId });
        this.emitReminderList(userId);
      }
    } catch (err: any) {
      this.logger.error(`Reminder dismiss exception: ${err.message}`);
      client.emit('reminder:error', { message: err.message || 'Reminder dismiss error' });
    }
  }

  // User settings updates
  @SubscribeMessage('user:update_settings')
  async handleUpdateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      theme?: 'light' | 'dark' | 'system';
      notifications?: boolean;
      defaultReminderTime?: string;
      snoozeDuration?: number;
    },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'user:update_settings' from @${client.data.username}`);
    try {
      if (!userId) return client.emit('auth:error', { message: 'Unauthorized' });

      const updatedUser = await this.authService.updateUserSettings(userId, data);
      
      // Send token and updated user profile back to client
      client.emit('auth:success', {
        token: client.handshake.auth?.token || '',
        user: updatedUser,
      });
    } catch (err: any) {
      this.logger.error(`Update settings exception: ${err.message}`);
      client.emit('auth:error', { message: err.message || 'Error updating settings' });
    }
  }

  // Reminder Delete
  @SubscribeMessage('reminder:delete')
  async handleReminderDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reminderId?: string },
  ) {
    const userId = client.data.userId;
    this.logger.log(`[WS Inbound 📥] Received 'reminder:delete' for reminder ID ${data.reminderId} from @${client.data.username}`);
    try {
      if (!userId) return client.emit('reminder:error', { message: 'Unauthorized' });

      await this.remindersService.deleteReminder(data.reminderId, userId);
      
      // Sync across clients
      client.emit('reminder:deleted_sync', { reminderId: data.reminderId });
      this.emitReminderList(userId);
    } catch (err: any) {
      this.logger.error(`Reminder delete exception: ${err.message}`);
      client.emit('reminder:error', { message: err.message || 'Reminder delete error' });
    }
  }
}
