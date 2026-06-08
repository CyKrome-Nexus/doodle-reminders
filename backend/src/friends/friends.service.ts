import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { User, UserDocument } from '@/schemas/user.schema';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Sends friend request to username
  async sendFriendRequest(userId: string, targetUsername: string): Promise<{ targetUserId: string; targetUsername: string }> {
    const normalizedUsername = targetUsername.toLowerCase().trim();
    this.logger.log(`User ID ${userId} is sending a friend request to: @${normalizedUsername}`);

    const currentUser = await this.userModel.findById(userId);
    if (!currentUser) {
      this.logger.error(`Send Request failed: Sender User ID ${userId} not found.`);
      throw new Error('User not found');
    }

    if (currentUser.username === normalizedUsername) {
      this.logger.warn(`Send Request blocked: User @${currentUser.username} tried adding themselves.`);
      throw new Error('Cannot add yourself as a friend');
    }

    const targetUser = await this.userModel.findOne({ username: normalizedUsername });
    if (!targetUser) {
      this.logger.warn(`Send Request failed: Target username @${normalizedUsername} not found.`);
      throw new Error('User not found');
    }

    const currentObjectId = new mongoose.Types.ObjectId(userId);
    if (targetUser.friends.includes(currentObjectId)) {
      this.logger.warn(`Send Request failed: @${currentUser.username} and @${targetUser.username} are already friends.`);
      throw new Error('You are already friends');
    }

    const alreadyRequested = targetUser.friendRequests.some(
      req => req.from.toString() === userId && req.status === 'pending'
    );
    if (alreadyRequested) {
      this.logger.warn(`Send Request failed: Request from @${currentUser.username} to @${targetUser.username} is already pending.`);
      throw new Error('Friend request already pending');
    }

    // Add pending request subdocument
    targetUser.friendRequests.push({
      from: currentObjectId,
      username: currentUser.username,
      status: 'pending'
    });
    await targetUser.save();
    this.logger.log(`Friend request successfully sent: @${currentUser.username} -> @${targetUser.username} (${targetUser._id})`);

    return { targetUserId: targetUser._id.toString(), targetUsername: targetUser.username };
  }

  // Accepts or rejects incoming request
  async respondToFriendRequest(
    userId: string,
    requestId: string,
    action: 'accept' | 'reject'
  ): Promise<{ success: boolean; action: 'accept' | 'reject'; friendName: string; friendId: string }> {
    this.logger.log(`User ID ${userId} responding to request ID ${requestId} with action: ${action}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`Respond to Request failed: User ID ${userId} not found.`);
      throw new Error('User not found');
    }

    const requestIndex = user.friendRequests.findIndex(req => req._id?.toString() === requestId);
    if (requestIndex === -1) {
      this.logger.warn(`Respond to Request failed: Request ID ${requestId} not found under @${user.username}'s profile.`);
      throw new Error('Friend request not found');
    }

    const request = user.friendRequests[requestIndex];
    const friendId = request.from;

    if (action === 'accept') {
      const friend = await this.userModel.findById(friendId);
      if (!friend) {
        this.logger.error(`Accept failed: Friend User ID ${friendId} no longer exists.`);
        throw new Error('Friend user no longer exists');
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const friendObjectId = new mongoose.Types.ObjectId(friendId.toString());

      // Add to each other's bidirectional friends arrays
      if (!user.friends.includes(friendObjectId)) user.friends.push(friendObjectId);
      if (!friend.friends.includes(userObjectId)) friend.friends.push(userObjectId);

      user.friendRequests.splice(requestIndex, 1);
      await user.save();
      await friend.save();
      
      this.logger.log(`Friend request ACCEPTED: @${user.username} <--> @${friend.username}`);

      return { success: true, action: 'accept', friendName: request.username, friendId: friend._id.toString() };
    } else {
      user.friendRequests.splice(requestIndex, 1);
      await user.save();
      
      this.logger.log(`Friend request REJECTED: @${user.username} rejected invite from @${request.username}`);

      return { success: true, action: 'reject', friendName: request.username, friendId: friendId.toString() };
    }
  }

  // Assembles full lists of active friends and requests
  async getFriendList(userId: string): Promise<{ friends: any[]; requests: any[] }> {
    this.logger.log(`Fetching friends and requests roster for user ID ${userId}...`);

    const user = await this.userModel.findById(userId)
      .populate('friends', 'username _id')
      .exec();
    
    if (!user) {
      this.logger.error(`Get list failed: User ID ${userId} not found.`);
      throw new Error('User not found');
    }
    
    const friendsList = user.friends.map((f: any) => ({
      id: f._id.toString(),
      username: f.username
    }));

    const requestsList = user.friendRequests.map(req => ({
      id: req._id?.toString(),
      fromUserId: req.from.toString(),
      username: req.username,
      status: req.status
    }));

    this.logger.log(`Assembled roster for @${user.username}: ${friendsList.length} friends, ${requestsList.length} pending requests.`);

    return { friends: friendsList, requests: requestsList };
  }
}
