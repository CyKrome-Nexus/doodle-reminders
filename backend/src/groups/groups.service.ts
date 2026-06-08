import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Group, GroupDocument } from '@/schemas/group.schema';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>
  ) {}

  // Creates collaborative friend group
  async createGroup(name: string, memberIds: string[], creatorId: string): Promise<GroupDocument> {
    this.logger.log(`Attempting to create group "${name}" with members: [${memberIds.join(', ')}] by creator ID ${creatorId}`);
    
    if (!name || name.trim() === '') {
      this.logger.warn('Group creation failed: Group name was empty.');
      throw new Error('Group name is required');
    }

    // De-duplicate and include creator in members automatically
    const allMemberIds = Array.from(new Set([...memberIds, creatorId]));

    const newGroup = new this.groupModel({
      name: name.trim(),
      members: allMemberIds.map(id => new mongoose.Types.ObjectId(id)),
      createdBy: new mongoose.Types.ObjectId(creatorId)
    });

    await newGroup.save();
    this.logger.log(`Group successfully created: "${name}" (${newGroup._id}) with ${allMemberIds.length} members.`);
    return newGroup;
  }

  // Returns list of groups user belongs to
  async getGroupsForUser(userId: string): Promise<any[]> {
    this.logger.log(`Fetching groups for user ID ${userId}...`);
    
    const groups = await this.groupModel.find({
      members: new mongoose.Types.ObjectId(userId)
    }).populate('members', 'username _id');

    this.logger.log(`Found ${groups.length} groups for user ID ${userId}.`);

    return groups.map(g => ({
      id: g._id.toString(),
      name: g.name,
      members: g.members.map((m: any) => ({ id: m._id.toString(), username: m.username })),
      createdBy: g.createdBy.toString()
    }));
  }
}
