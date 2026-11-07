import type { PrismaClient } from '@prisma/client';
import { JiraConnector } from '../connectors/jira';
import { FreshserviceConnector } from '../connectors/freshservice';
import { ZendeskConnector } from '../connectors/zendesk';

export class LifecycleScheduler {
  static async runLifecycleSync(prisma: PrismaClient) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ticketsCreated: Array<{
      asset_tag: string;
      ticket_key: string;
      summary: string;
      destination: string;
    }> = [];

    // Load active asset_to_ticket rules
    const rules = await prisma.rule.findMany({
      where: {
        is_enabled: true,
        direction: 'asset_to_ticket',
      },
    });

    const connectors = await prisma.connectorConfig.findMany();
    const connectorsDict: Record<string, any> = {};
    for (const c of connectors) {
      connectorsDict[c.id] = c;
    }

    for (const rule of rules) {
      const conditions = JSON.parse(rule.conditions_json || '{}');
      const actions = JSON.parse(rule.actions_json || '{}');

      const daysThreshold = conditions.days_before_warranty ?? 60;
      const allowedStatuses: string[] = conditions.asset_statuses ?? ['in_use'];
      const destinationItsm = actions.destination_itsm || 'jira';

      // Find matching assets
      const assets = await prisma.asset.findMany({
        where: {
          status: { in: allowedStatuses },
          warranty_expiry_date: { not: null },
        },
      });

      for (const asset of assets) {
        if (!asset.warranty_expiry_date) continue;

        try {
          const expDate = new Date(asset.warranty_expiry_date.slice(0, 10));
          const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

          if (daysLeft >= 0 && daysLeft <= daysThreshold) {
            // Check if already created
            const alreadyLogged = await prisma.syncLog.findFirst({
              where: {
                asset_id: asset.id,
                direction: 'asset_to_ticket',
                rule_id: rule.id,
                status: 'success',
              },
            });

            if (alreadyLogged) continue;

            const summaryTemplate =
              actions.ticket_summary_template ||
              'Warranty Expiry ({days_left}d): {model} ({serial_number}) - {assigned_name}';
            const descTemplate =
              actions.ticket_description_template ||
              'Automated TCT-SeamIT lifecycle alert:\nAsset Tag: {asset_tag}\nModel: {model}\nSerial Number: {serial_number}\nCurrent Assignee: {assigned_name} ({assigned_email})\nWarranty Expiration Date: {warranty_date}\nDays Remaining: {days_left}\n\nRecommended Action: Initiate vendor warranty extension or schedule device refresh replacement.';

            const formatVars: Record<string, any> = {
              asset_tag: asset.asset_tag,
              model: asset.model,
              serial_number: asset.serial_number,
              assigned_name: asset.assigned_to_name || 'Unassigned',
              assigned_email: asset.assigned_to_email || 'N/A',
              warranty_date: asset.warranty_expiry_date,
              days_left: daysLeft,
            };

            const replaceVars = (tmpl: string) => {
              let res = tmpl;
              for (const [k, v] of Object.entries(formatVars)) {
                res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
              }
              return res;
            };

            const ticketSummary = replaceVars(summaryTemplate);
            const ticketDesc = replaceVars(descTemplate);
            const ticketType = actions.ticket_type || 'Hardware Refresh';
            const priority = actions.ticket_priority || 'Medium';

            const connConfig = connectorsDict[destinationItsm] || {
              id: destinationItsm,
              mock_mode: true,
            };

            let connector;
            if (destinationItsm === 'freshservice') {
              connector = new FreshserviceConnector(connConfig);
            } else if (destinationItsm === 'zendesk') {
              connector = new ZendeskConnector(connConfig);
            } else {
              connector = new JiraConnector(connConfig);
            }

            const ticketRes = await connector.createTicket(ticketSummary, ticketDesc, ticketType, priority);
            const createdKey = ticketRes.ticket_key || 'UNKNOWN-KEY';

            await prisma.asset.update({
              where: { id: asset.id },
              data: {
                last_ticket_id: createdKey,
                last_ticket_title: ticketSummary,
              },
            });

            await prisma.rule.update({
              where: { id: rule.id },
              data: {
                execution_count: { increment: 1 },
                last_executed_at: new Date(),
              },
            });

            const actionSummary = `Generated proactive draft ticket ${createdKey} in ${destinationItsm.toUpperCase()} for asset ${asset.asset_tag} (Warranty expires in ${daysLeft} days)`;

            await prisma.syncLog.create({
              data: {
                direction: 'asset_to_ticket',
                rule_id: rule.id,
                rule_name: rule.name,
                source: destinationItsm,
                ticket_id: createdKey,
                ticket_title: ticketSummary,
                asset_id: asset.id,
                asset_tag: asset.asset_tag,
                serial_number: asset.serial_number,
                action_summary: actionSummary,
                diff_json: JSON.stringify({ ticket_response: ticketRes, days_left: daysLeft }),
                status: 'success',
              },
            });

            ticketsCreated.push({
              asset_tag: asset.asset_tag,
              ticket_key: createdKey,
              summary: ticketSummary,
              destination: destinationItsm,
            });
          }
        } catch (e: any) {
          await prisma.syncLog.create({
            data: {
              direction: 'asset_to_ticket',
              rule_id: rule.id,
              rule_name: rule.name,
              source: destinationItsm,
              asset_id: asset.id,
              asset_tag: asset.asset_tag,
              action_summary: `Failed creating proactive ticket for ${asset.asset_tag}`,
              status: 'failed',
              error_message: e.message,
            },
          });
        }
      }
    }

    return {
      success: true,
      tickets_created_count: ticketsCreated.length,
      tickets: ticketsCreated,
      executed_at: new Date().toISOString(),
    };
  }
}
