import type { PrismaClient } from '@prisma/client';
import { JiraConnector } from '../connectors/jira';
import { FreshserviceConnector } from '../connectors/freshservice';
import { ZendeskConnector } from '../connectors/zendesk';

export interface DiscrepancyItem {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  asset_id: number | null;
  asset_tag: string | null;
  serial_number: string | null;
  ticket_id: string | null;
  consequence: string;
  dollar_risk: number;
  suggested_action: string;
}

export interface DiscrepancyRadarResponse {
  discrepancies: DiscrepancyItem[];
  summary: {
    total_discrepancies: number;
    high_severity_count: number;
    total_dollar_risk: number;
    estimated_hours_saved: number;
    audit_readiness_score: number;
    last_scanned_at: string;
  };
}

export class DiscrepancyRadar {
  static async scanDiscrepancies(prisma: PrismaClient): Promise<DiscrepancyRadarResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const discrepancies: DiscrepancyItem[] = [];

    // 1. Orphaned In-Use Assets
    const inUseAssets = await prisma.asset.findMany({
      where: { status: 'in_use' },
    });

    for (const r of inUseAssets) {
      const emailMissing = !r.assigned_to_email || r.assigned_to_email.trim() === '';
      const nameMissing = !r.assigned_to_name || r.assigned_to_name.trim() === '';

      if (emailMissing && nameMissing) {
        discrepancies.push({
          id: `disc_orphan_${r.id}`,
          severity: 'HIGH',
          category: 'Compliance Risk (Ghost Asset)',
          title: 'In-Use device without assigned employee',
          description: `Asset ${r.asset_tag} (${r.model}, S/N: ${r.serial_number}) is marked 'In Use' in the asset table, but has no recorded owner or email.`,
          asset_id: r.id,
          asset_tag: r.asset_tag,
          serial_number: r.serial_number,
          ticket_id: r.last_ticket_id,
          consequence:
            'Fails SOC 2 / ISO 27001 endpoint custody controls; untracked device during offboarding.',
          dollar_risk: 1500,
          suggested_action: "Assign employee or transition status to 'Available / In Stock'.",
        });
      }

      // 2 & 3. Warranty Checks
      if (r.warranty_expiry_date) {
        try {
          const expDate = new Date(r.warranty_expiry_date.slice(0, 10));
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

          if (diffDays >= 0 && diffDays <= 60) {
            const hasRefreshTicket = Boolean(
              r.last_ticket_title &&
                (r.last_ticket_title.toLowerCase().includes('refresh') ||
                  r.last_ticket_title.toLowerCase().includes('warranty'))
            );

            if (!hasRefreshTicket) {
              discrepancies.push({
                id: `disc_warranty_${r.id}`,
                severity: 'MEDIUM',
                category: 'Warranty Expiration (Unprotected)',
                title: `Warranty expires in ${diffDays} days`,
                description: `Asset ${r.asset_tag} (${r.model}, assigned to ${r.assigned_to_name || 'Unknown'}) warranty expires on ${r.warranty_expiry_date} without an active refresh ticket.`,
                asset_id: r.id,
                asset_tag: r.asset_tag,
                serial_number: r.serial_number,
                ticket_id: null,
                consequence:
                  'Device failure after expiration leads to $800+ out-of-pocket repair costs and employee downtime.',
                dollar_risk: 850,
                suggested_action: 'Trigger draft hardware refresh ticket in Jira / Freshservice.',
              });
            }
          } else if (diffDays < 0) {
            discrepancies.push({
              id: `disc_expired_${r.id}`,
              severity: 'HIGH',
              category: 'Expired Asset in Production',
              title: `Asset operating past warranty (${Math.abs(diffDays)} days overdue)`,
              description: `Asset ${r.asset_tag} (${r.model}) expired on ${r.warranty_expiry_date} and remains deployed to ${r.assigned_to_name || 'Unknown'}.`,
              asset_id: r.id,
              asset_tag: r.asset_tag,
              serial_number: r.serial_number,
              ticket_id: null,
              consequence:
                'High failure rate, unpatchable hardware flaws, cyber insurance policy violation.',
              dollar_risk: 1200,
              suggested_action: 'Initiate immediate lifecycle replacement.',
            });
          }
        } catch {}
      }
    }

    // 4. Zombie Repair Assets
    const inRepairAssets = await prisma.asset.findMany({
      where: { status: 'in_repair' },
    });

    for (const r of inRepairAssets) {
      try {
        const updatedDate = new Date(r.updated_at);
        const diffDays = Math.floor((today.getTime() - updatedDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays >= 7) {
          discrepancies.push({
            id: `disc_repair_${r.id}`,
            severity: 'MEDIUM',
            category: 'Zombie Repair Asset',
            title: `Device in repair for ${diffDays} days`,
            description: `Asset ${r.asset_tag} (${r.model}) marked 'In Repair' with last ticket ${r.last_ticket_id || 'None'}, but no status change recorded.`,
            asset_id: r.id,
            asset_tag: r.asset_tag,
            serial_number: r.serial_number,
            ticket_id: r.last_ticket_id,
            consequence:
              'Device forgotten at vendor or sitting on IT shelf; causes premature duplicate purchasing.',
            dollar_risk: 1800,
            suggested_action: "Verify return from repair depot or return to 'Available' stock.",
          });
        }
      } catch {}
    }

    // 5. Unlinked Ticket Ingestions in Sync Logs
    const skippedLogs = await prisma.syncLog.findMany({
      where: {
        status: 'skipped',
        error_message: { contains: 'No matching asset' },
      },
      orderBy: { id: 'desc' },
      take: 5,
    });

    for (const sl of skippedLogs) {
      discrepancies.push({
        id: `disc_unlinked_log_${sl.id}`,
        severity: 'HIGH',
        category: 'Unlinked ITSM Ticket',
        title: `Ticket ${sl.ticket_id} has no matching asset`,
        description: `ITSM Ticket '${sl.ticket_title}' (${sl.ticket_id}) triggered sync rule '${sl.rule_name}', but no asset matched the serial, tag, or requester email.`,
        asset_id: null,
        asset_tag: 'UNKNOWN',
        serial_number: null,
        ticket_id: sl.ticket_id,
        consequence:
          'Asset was serviced or retired without updating asset inventory (creates ghost discrepancy).',
        dollar_risk: 2000,
        suggested_action: 'Manually associate ticket with asset tag or add device to inventory.',
      });
    }

    // Calculate metrics
    const total_discrepancies = discrepancies.length;
    const high_severity_count = discrepancies.filter((d) => d.severity === 'HIGH').length;
    const total_dollar_risk = discrepancies.reduce((sum, d) => sum + d.dollar_risk, 0);
    const estimated_hours_saved = Math.round(total_discrepancies * 2.5 * 10) / 10;
    const audit_readiness_score = Math.max(
      20,
      100 - (high_severity_count * 15 + (total_discrepancies - high_severity_count) * 8)
    );

    return {
      discrepancies,
      summary: {
        total_discrepancies,
        high_severity_count,
        total_dollar_risk,
        estimated_hours_saved,
        audit_readiness_score,
        last_scanned_at: new Date().toISOString(),
      },
    };
  }

  static async remediate(
    prisma: PrismaClient,
    params: {
      action: string;
      discrepancy_id?: string | null;
      asset_id?: number | null;
      target_status?: string | null;
      target_location?: string | null;
      assigned_to_name?: string | null;
      assigned_to_email?: string | null;
      ticket_id?: string | null;
    }
  ) {
    const { action, discrepancy_id, asset_id, target_status, target_location, assigned_to_name, assigned_to_email } = params;
    const now = new Date();

    // 1. Batch remediation
    if (action === 'remediate_all_low_hanging') {
      let remediated_count = 0;

      // Orphans -> available
      const orphans = await prisma.asset.findMany({
        where: {
          status: 'in_use',
          AND: [
            { OR: [{ assigned_to_email: null }, { assigned_to_email: '' }] },
            { OR: [{ assigned_to_name: null }, { assigned_to_name: '' }] },
          ],
        },
      });

      for (const r of orphans) {
        await prisma.asset.update({
          where: { id: r.id },
          data: {
            status: 'available',
            location: 'IT Storage Closet - Shelf B',
          },
        });

        await prisma.syncLog.create({
          data: {
            direction: 'radar_remediation',
            rule_name: 'Auto-Remediation: Batch Orphan Fix',
            source: 'discrepancy_radar',
            asset_id: r.id,
            asset_tag: r.asset_tag,
            serial_number: r.serial_number,
            action_summary: `Auto-Remediated Ghost Asset ${r.asset_tag}: Moved to available stock in IT Storage Closet.`,
            diff_json: JSON.stringify({
              status: { old: r.status, new: 'available' },
              location: { old: r.location, new: 'IT Storage Closet - Shelf B' },
            }),
            status: 'success',
          },
        });
        remediated_count++;
      }

      // Zombie repairs -> available
      const repairs = await prisma.asset.findMany({
        where: { status: 'in_repair' },
      });

      for (const r of repairs) {
        const diffDays = Math.floor((now.getTime() - new Date(r.updated_at).getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 7) {
          await prisma.asset.update({
            where: { id: r.id },
            data: {
              status: 'available',
              location: 'IT Storage Closet - Shelf B',
            },
          });

          await prisma.syncLog.create({
            data: {
              direction: 'radar_remediation',
              rule_name: 'Auto-Remediation: Zombie Repair Return',
              source: 'discrepancy_radar',
              asset_id: r.id,
              asset_tag: r.asset_tag,
              serial_number: r.serial_number,
              action_summary: `Auto-Remediated Zombie Repair ${r.asset_tag}: Returned to available stock.`,
              diff_json: JSON.stringify({
                status: { old: r.status, new: 'available' },
                location: { old: r.location, new: 'IT Storage Closet - Shelf B' },
              }),
              status: 'success',
            },
          });
          remediated_count++;
        }
      }

      return {
        success: true,
        action,
        remediated_count,
        message: `Successfully auto-remediated ${remediated_count} ghost & zombie discrepancies!`,
      };
    }

    // Dismiss unlinked log
    if (!asset_id && discrepancy_id && discrepancy_id.startsWith('disc_unlinked_log_')) {
      const logId = parseInt(discrepancy_id.replace('disc_unlinked_log_', ''), 10);
      await prisma.syncLog.update({
        where: { id: logId },
        data: { status: 'dismissed' },
      });
      return {
        success: true,
        action: 'dismiss_unlinked',
        message: `Dismissed unlinked discrepancy log #${logId}.`,
      };
    }

    if (!asset_id) {
      throw new Error('asset_id is required for asset remediation actions.');
    }

    const asset = await prisma.asset.findUnique({
      where: { id: asset_id },
    });

    if (!asset) {
      throw new Error(`Asset with ID ${asset_id} not found.`);
    }

    let summary = '';
    let diff: Record<string, any> = {};

    if (action === 'set_available' || action === 'return_to_available') {
      const new_status = 'available';
      const new_location = target_location || 'IT Storage Closet - Shelf B';

      await prisma.asset.update({
        where: { id: asset_id },
        data: {
          status: new_status,
          location: new_location,
          assigned_to_name: '',
          assigned_to_email: '',
        },
      });

      diff = {
        status: { old: asset.status, new: new_status },
        location: { old: asset.location, new: new_location },
        assigned_to_email: { old: asset.assigned_to_email, new: null },
      };
      summary = `Remediated discrepancy ${discrepancy_id || ''}: Marked ${asset.asset_tag} as '${new_status}' in ${new_location}.`;
    } else if (action === 'set_pending_return') {
      const new_status = 'pending_return';
      const new_location = target_location || 'IT Return Bay / Quarantine';

      await prisma.asset.update({
        where: { id: asset_id },
        data: {
          status: new_status,
          location: new_location,
          assigned_to_name: '',
          assigned_to_email: '',
        },
      });

      diff = {
        status: { old: asset.status, new: new_status },
        location: { old: asset.location, new: new_location },
        assigned_to_email: { old: asset.assigned_to_email, new: null },
      };
      summary = `Remediated discrepancy: Marked ${asset.asset_tag} as 'pending_return' in ${new_location}.`;
    } else if (action === 'assign_owner') {
      const new_name = assigned_to_name || 'Assigned Employee';
      const new_email = assigned_to_email || 'employee@acme-corp.com';

      await prisma.asset.update({
        where: { id: asset_id },
        data: {
          assigned_to_name: new_name,
          assigned_to_email: new_email,
          status: 'in_use',
        },
      });

      diff = {
        assigned_to_name: { old: asset.assigned_to_name, new: new_name },
        assigned_to_email: { old: asset.assigned_to_email, new: new_email },
      };
      summary = `Remediated discrepancy: Assigned ${asset.asset_tag} to custodian ${new_name} (${new_email}).`;
    } else if (action === 'create_refresh_ticket') {
      const activeConn = await prisma.connectorConfig.findFirst({
        where: { is_enabled: true },
        orderBy: { id: 'asc' },
      });

      const connId = activeConn?.id || 'jira';
      let connector;
      if (connId === 'freshservice') {
        connector = new FreshserviceConnector(activeConn || { mock_mode: true });
      } else if (connId === 'zendesk') {
        connector = new ZendeskConnector(activeConn || { mock_mode: true });
      } else {
        connector = new JiraConnector(activeConn || { mock_mode: true });
      }

      const ticketSummary = `Hardware Refresh: ${asset.model} (${asset.asset_tag}) - ${asset.assigned_to_name || 'Unassigned'}`;
      const ticketDesc = `Proactive refresh ticket created via Discrepancy Radar. Warranty expires: ${asset.warranty_expiry_date || 'N/A'}.`;
      const ticketRes = await connector.createTicket(ticketSummary, ticketDesc, 'Hardware Refresh', 'Medium');

      const tKey = ticketRes.ticket_key || 'REFRESH-TICKET';

      await prisma.asset.update({
        where: { id: asset_id },
        data: {
          last_ticket_id: tKey,
          last_ticket_title: ticketSummary,
        },
      });

      diff = {
        last_ticket_id: { old: asset.last_ticket_id, new: tKey },
        last_ticket_title: { old: asset.last_ticket_title, new: ticketSummary },
      };
      summary = `Proactive refresh ticket ${tKey} created in ${connId.toUpperCase()} for asset ${asset.asset_tag}.`;
    } else {
      throw new Error(`Unsupported remediation action: '${action}'`);
    }

    // Record immutable audit log
    await prisma.syncLog.create({
      data: {
        direction: 'radar_remediation',
        rule_name: 'Discrepancy Radar Remediation',
        source: 'discrepancy_radar',
        asset_id,
        asset_tag: asset.asset_tag,
        serial_number: asset.serial_number,
        action_summary: summary,
        diff_json: JSON.stringify(diff),
        status: 'success',
      },
    });

    return {
      success: true,
      action,
      asset_id,
      message: summary,
    };
  }
}
