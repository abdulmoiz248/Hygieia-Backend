import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AnnouncementTarget, SendAnnouncementDto } from './dto/send-announcement.dto';

type UserRole = 'doctor' | 'nutritionist' | 'lab_technician' | 'patient' | 'admin';

type UserRecord = {
  id: string;
  role: UserRole;
};

@Injectable()
export class AnnouncementService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async sendAnnouncement(payload: SendAnnouncementDto) {
    const rolesToTarget = this.resolveTargetRoles(payload.target);
    let userQuery = this.supabaseService.getClient().from('users').select('id, role');

    if (rolesToTarget.length > 0) {
      userQuery = userQuery.in('role', rolesToTarget);
    }

    const { data: users, error: usersError } = await userQuery;

    if (usersError) {
      throw new InternalServerErrorException('Failed to fetch users for announcement');
    }

    const recipients = (users || []) as UserRecord[];

    if (recipients.length === 0) {
      return {
        success: true,
        recipientCount: 0,
        insertedCount: 0,
        target: payload.target,
        message: 'No matching users found for the selected target',
      };
    }

    const notifications = recipients.map((user) => ({
      user_id: user.id,
      notification_msg: payload.message,
      action: null,
      title: payload.title || 'Announcement',
    }));

    const chunkSize = 500;
    let insertedCount = 0;

    for (let index = 0; index < notifications.length; index += chunkSize) {
      const chunk = notifications.slice(index, index + chunkSize);
      const { error: insertError } = await this.supabaseService
        .getClient()
        .from('notifications')
        .insert(chunk);

      if (insertError) {
        throw new InternalServerErrorException('Failed to insert announcement notifications');
      }

      insertedCount += chunk.length;
    }

    return {
      success: true,
      recipientCount: recipients.length,
      insertedCount,
      target: payload.target,
      message: 'Announcement notifications created successfully',
    };
  }

  private resolveTargetRoles(target: AnnouncementTarget): UserRole[] {
    switch (target) {
      case 'doctor':
        return ['doctor'];
      case 'nutritionist':
        return ['nutritionist'];
      case 'pathologist':
        return ['lab_technician'];
      case 'patient':
        return ['patient'];
      case 'all_workers':
        return ['doctor', 'nutritionist', 'lab_technician'];
      case 'all_users':
        return [];
      default:
        return [];
    }
  }
}
