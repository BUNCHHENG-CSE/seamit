import type { PrismaClient } from '@prisma/client';
import type { NormalizedTicket } from '../connectors/base';

export interface WebhookSyncResult {
  status: 'success' | 'skipped' | 'partial' | 'failed';
  matched_rules: string[];
  affected_assets: string[];
  actions_taken: string[];
  log_id?: number | null;
  message: string;
}

function matchCondition(expected?: string[], actual?: string | null): boolean {
  if (!expected || expected.length === 0) return true;
  if (!actual) return false;
  const actualLower = actual.trim().toLowerCase();
  return expected.some((e) => e.trim().toLowerCase() === actualLower);
}

function matchKeywords(keywords?: string[], text?: string | null): boolean {
  if (!keywords || keywords.length === 0) return true;
  if (!text) return false;
  const textLower = text.toLowerCase();
  return keywords.some((kw) => textLower.includes(kw.trim().toLowerCase()));
}

export class RuleEngine {
  static async findMatchingAsset(
    prisma: PrismaClient,
    asset_tag?: string | null,
    serial_number?: string | null,
    requester_email?: string | null
  ) {
    if (asset_tag) {
      const byTag = await prisma.asset.findFirst({
        where: { asset_tag: { equals: asset_tag } },
      });
      if (byTag) return byTag;
    }

    if (serial_number) {
      const bySerial = await prisma.asset.findFirst({
        where: { serial_number: { equals: serial_number } },
      });
      if (bySerial) return bySerial;
    }

    if (requester_email) {
      const byEmail = await prisma.asset.findFirst({
        where: {
          assigned_to_email: { equals: requester_email },
          status: 'in_use',
        },
      });
      if (byEmail) return byEmail;
    }

    return null;
  }

  static async processTicketEvent(
    ticket: NormalizedTicket,
    prisma: PrismaClient
  ): Promise<WebhookSyncResult> {
    const now = new Date();
    const matchedRules: string[] = [];
    const affectedAssets: string[] = [];
    const actionsTaken: string[] = [];
    let lastLogId: number | null = null;

    // Cache ticket
    try {
      await prisma.cachedTicket.create({
        data: {
          source: ticket.source,
          ticket_key: ticket.ticket_key,
          title: ticket.title,
          status: ticket.status,
          ticket_type: ticket.ticket_type,
          requester_email: ticket.requester_email || null,
          requester_name: ticket.requester_name || null,
          serial_number: ticket.serial_number || null,
          asset_tag: ticket.asset_tag || null,
          raw_payload_json: JSON.stringify(ticket.raw_payload || {}),
        },
      });
    } catch {}

    // Fetch active ticket_to_asset rules
    const rules = await prisma.rule.findMany({
      where: {
        is_enabled: true,
        direction: 'ticket_to_asset',
      },
    });

    for (const rule of rules) {
      const conditions = JSON.parse(rule.conditions_json || '{}');
      const actions = JSON.parse(rule.actions_json || '{}');

      // Source filter
      if (rule.source !== 'any' && rule.source !== ticket.source) {
        continue;
      }

      // Event type check
      if (rule.event_type && ticket.event_name && rule.event_type !== ticket.event_name) {
        if (
          rule.event_type === 'ticket_resolved' &&
          !['resolved', 'closed', 'done', 'completed'].includes(ticket.status.toLowerCase())
        ) {
          continue;
        }
      }

      // Condition filters
      if (conditions.ticket_types && !matchCondition(conditions.ticket_types, ticket.ticket_type)) {
        continue;
      }
      if (conditions.ticket_statuses && !matchCondition(conditions.ticket_statuses, ticket.status)) {
        continue;
      }
      if (conditions.title_keywords && !matchKeywords(conditions.title_keywords, ticket.title)) {
        continue;
      }

      // Condition matched -> Find asset
      const asset = await this.findMatchingAsset(
        prisma,
        ticket.asset_tag,
        ticket.serial_number,
        ticket.requester_email
      );

      if (!asset) {
        // Discrepancy: Rule matched, but no asset found
        const log = await prisma.syncLog.create({
          data: {
            direction: 'ticket_to_asset',
            rule_id: rule.id,
            rule_name: rule.name,
            source: ticket.source,
            ticket_id: ticket.ticket_key,
            ticket_title: ticket.title,
            action_summary: `Rule '${rule.name}' matched ticket, but no associated asset found by tag, serial, or user email`,
            diff_json: JSON.stringify({ ticket }),
            status: 'skipped',
            error_message: 'No matching asset in inventory',
          },
        });
        lastLogId = log.id;
        continue;
      }

      // Apply actions
      const diff: Record<string, any> = {};
      const updates: any = {};

      if (actions.set_asset_status && actions.set_asset_status !== asset.status) {
        diff.status = { old: asset.status, new: actions.set_asset_status };
        updates.status = actions.set_asset_status;
      }

      if (actions.clear_assignee) {
        diff.assigned_to_email = { old: asset.assigned_to_email, new: null };
        diff.assigned_to_name = { old: asset.assigned_to_name, new: null };
        updates.assigned_to_email = null;
        updates.assigned_to_name = null;
      }

      if (actions.set_location && actions.set_location !== asset.location) {
        diff.location = { old: asset.location, new: actions.set_location };
        updates.location = actions.set_location;
      }

      updates.last_ticket_id = ticket.ticket_key;
      updates.last_ticket_title = ticket.title;

      if (actions.append_notes) {
        const dateStr = now.toISOString().slice(0, 10);
        const noteMsg = actions.append_notes
          .replace(/\{ticket_key\}/g, ticket.ticket_key)
          .replace(/\{ticket_type\}/g, ticket.ticket_type)
          .replace(/\{timestamp\}/g, dateStr);

        const currentNotes = asset.notes || '';
        const newNotes = currentNotes ? `${currentNotes}\n[${dateStr}] ${noteMsg}` : `[${dateStr}] ${noteMsg}`;
        diff.notes = { old: currentNotes, new: newNotes };
        updates.notes = newNotes;
      }

      // Update asset
      await prisma.asset.update({
        where: { id: asset.id },
        data: updates,
      });

      // Update rule execution stats
      await prisma.rule.update({
        where: { id: rule.id },
        data: {
          execution_count: { increment: 1 },
          last_executed_at: now,
        },
      });

      const summaryParts = Object.entries(diff).map(([k, v]) => `${k} -> ${v.new}`);
      const actionSummary = `Updated asset ${asset.asset_tag} (${asset.model}): ${summaryParts.join(', ')}`;

      // Write sync log
      const log = await prisma.syncLog.create({
        data: {
          direction: 'ticket_to_asset',
          rule_id: rule.id,
          rule_name: rule.name,
          source: ticket.source,
          ticket_id: ticket.ticket_key,
          ticket_title: ticket.title,
          asset_id: asset.id,
          asset_tag: asset.asset_tag,
          serial_number: asset.serial_number,
          action_summary: actionSummary,
          diff_json: JSON.stringify(diff),
          status: 'success',
        },
      });
      lastLogId = log.id;

      matchedRules.push(rule.name);
      affectedAssets.push(`${asset.asset_tag} (${asset.model})`);
      actionsTaken.push(actionSummary);
    }

    if (matchedRules.length > 0) {
      return {
        status: 'success',
        matched_rules: matchedRules,
        affected_assets: affectedAssets,
        actions_taken: actionsTaken,
        log_id: lastLogId,
        message: `Synced successfully: Triggered ${matchedRules.length} rule(s) affecting ${affectedAssets.length} asset(s).`,
      };
    } else {
      return {
        status: 'skipped',
        matched_rules: [],
        affected_assets: [],
        actions_taken: [],
        log_id: lastLogId,
        message: 'No active rules matched the incoming ticket criteria.',
      };
    }
  }
}
