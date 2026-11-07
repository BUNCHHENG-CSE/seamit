import type { PrismaClient } from '@prisma/client';

export class NotificationEngine {
  static async notify(
    prisma: PrismaClient,
    params: {
      title: string;
      message: string;
      severity?: string;
      category?: string;
      link_tab?: string | null;
    }
  ) {
    const { title, message, severity = 'INFO', category = 'general', link_tab = null } = params;

    const notif = await prisma.notification.create({
      data: {
        title,
        message,
        severity,
        category,
        link_tab,
        is_read: 0,
      },
    });

    // Check for slack_alerts connector
    const slackConn = await prisma.connectorConfig.findUnique({
      where: { id: 'slack_alerts' },
    });

    let outbound_sent = false;
    let outbound_error: string | null = null;

    if (slackConn && slackConn.is_enabled && slackConn.base_url) {
      const webhookUrl = slackConn.base_url.trim();
      if (!slackConn.mock_mode && webhookUrl.startsWith('http')) {
        try {
          const payload = {
            text: `*${severity}* | *${title}*\n${message}`,
            attachments: [
              {
                color:
                  severity === 'HIGH'
                    ? '#ef4444'
                    : severity === 'MEDIUM'
                      ? '#f59e0b'
                      : '#10b981',
                fields: [
                  { title: 'Category', value: category, short: true },
                  { title: 'Severity', value: severity, short: true },
                ],
                footer: 'TCT-SeamIT ITSM-ITAM Bridge',
              },
            ],
          };

          const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          outbound_sent = res.ok;
        } catch (e: any) {
          outbound_error = e.message;
        }
      } else {
        outbound_sent = true; // Mock mode dispatched
      }
    }

    return {
      notification_id: notif.id,
      title,
      severity,
      outbound_sent,
      outbound_error,
      created_at: notif.created_at.toISOString(),
    };
  }
}
