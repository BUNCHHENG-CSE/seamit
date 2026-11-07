import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from './prisma';

export async function ensureDatabaseSeeded(prisma: PrismaClient = defaultPrisma, force = false) {
  const assetCount = await prisma.asset.count();
  const connectorCount = await prisma.connectorConfig.count();

  if (!force && assetCount > 0 && connectorCount > 0) {
    return;
  }

  if (force) {
    await prisma.syncLog.deleteMany();
    await prisma.cachedTicket.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.rule.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.connectorConfig.deleteMany();
  }

  console.log('[Seed] Seeding initial SMB ITSM-ITAM data...');
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const addDays = (d: Date, days: number) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().slice(0, 10);
  };

  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 3600 * 1000);

  // 1. Seed Connectors
  const connectors = [
    {
      id: 'jira',
      name: 'Jira Service Management (JSM)',
      is_enabled: true,
      base_url: 'https://acme-corp.atlassian.net',
      api_key_or_token: 'mock_jira_api_token_9921',
      email_or_user: 'it-admin@acme-corp.com',
      project_or_workspace_key: 'ITSM',
      webhook_secret: 'whsec_jira_secret_mock_9921',
      mock_mode: true,
      status: 'mock_active',
      last_sync_at: now,
    },
    {
      id: 'freshservice',
      name: 'Freshservice Service Desk',
      is_enabled: true,
      base_url: 'https://acme-corp.freshservice.com',
      api_key_or_token: 'fresh_api_key_example_847192',
      email_or_user: 'servicedesk@acme-corp.com',
      project_or_workspace_key: 'IT',
      webhook_secret: 'whsec_fs_secret_mock_3310',
      mock_mode: true,
      status: 'mock_active',
      last_sync_at: now,
    },
    {
      id: 'zendesk',
      name: 'Zendesk Support Desk',
      is_enabled: true,
      base_url: 'https://acme-corp.zendesk.com',
      api_key_or_token: 'zd_api_token_mock_881920',
      email_or_user: 'helpdesk@acme-corp.com',
      project_or_workspace_key: 'SUPPORT',
      webhook_secret: 'whsec_zd_secret_mock_7712',
      mock_mode: true,
      status: 'mock_active',
      last_sync_at: now,
    },
    {
      id: 'slack_alerts',
      name: 'Slack & Teams Alert Dispatcher',
      is_enabled: true,
      base_url: 'https://hooks.slack.com/services/mock_webhook',
      api_key_or_token: '',
      email_or_user: '#it-operations',
      project_or_workspace_key: '',
      webhook_secret: '',
      mock_mode: true,
      status: 'mock_active',
      last_sync_at: now,
    },
  ];

  for (const c of connectors) {
    await prisma.connectorConfig.upsert({
      where: { id: c.id },
      create: c,
      update: c,
    });
  }

  // 2. Seed Default Best-Practice Rules
  const rules = [
    {
      id: 'rule_offboarding_return',
      name: 'Offboarding Ticket Resolved -> Mark Pending Return',
      description:
        "When HR or IT resolves an employee offboarding ticket, automatically mark their assigned laptop as 'pending_return' and unassign the user.",
      source: 'any',
      direction: 'ticket_to_asset',
      event_type: 'ticket_resolved',
      conditions_json: JSON.stringify({
        ticket_types: ['Offboarding', 'Employee Exit', 'Termination'],
        ticket_statuses: ['Resolved', 'Closed', 'Done', 'Completed'],
        title_keywords: [],
      }),
      actions_json: JSON.stringify({
        set_asset_status: 'pending_return',
        clear_assignee: true,
        set_location: 'IT Quarantine / Return Bay',
        append_notes: 'Automated offboarding return initiated via ticket {ticket_key}.',
      }),
      is_enabled: true,
      execution_count: 14,
      last_executed_at: now,
    },
    {
      id: 'rule_device_repair_start',
      name: 'Hardware Repair Ticket -> Set In Repair',
      description:
        "When a repair or broken screen ticket is in progress, automatically transition asset status to 'in_repair'.",
      source: 'any',
      direction: 'ticket_to_asset',
      event_type: 'ticket_updated',
      conditions_json: JSON.stringify({
        ticket_types: ['Repair', 'Hardware Issue', 'Broken Device'],
        ticket_statuses: ['In Progress', 'Investigating', 'Waiting on Vendor'],
        title_keywords: ['screen', 'battery', 'repair', 'liquid', 'keyboard', 'broken'],
      }),
      actions_json: JSON.stringify({
        set_asset_status: 'in_repair',
        clear_assignee: false,
        set_location: 'IT Repair Depot / Vendor',
        append_notes: 'Sent to repair bench under ticket {ticket_key}.',
      }),
      is_enabled: true,
      execution_count: 9,
      last_executed_at: now,
    },
    {
      id: 'rule_device_repair_closed',
      name: 'Repair Ticket Resolved -> Transition to Stock / Available',
      description:
        "When a device repair ticket is marked resolved, automatically return the asset to 'available' stock in the IT closet.",
      source: 'any',
      direction: 'ticket_to_asset',
      event_type: 'ticket_resolved',
      conditions_json: JSON.stringify({
        ticket_types: ['Repair', 'Hardware Issue', 'Broken Device'],
        ticket_statuses: ['Resolved', 'Closed', 'Done'],
      }),
      actions_json: JSON.stringify({
        set_asset_status: 'available',
        clear_assignee: true,
        set_location: 'IT Storage Closet - Shelf B',
        append_notes: 'Repair completed under ticket {ticket_key}. Ready for redeployment.',
      }),
      is_enabled: true,
      execution_count: 7,
      last_executed_at: now,
    },
    {
      id: 'rule_device_replacement',
      name: 'Hardware Replacement Ticket -> Retire Old Asset',
      description:
        "When a device replacement is completed, automatically mark the replaced hardware as 'retired' to prevent ghost assets.",
      source: 'any',
      direction: 'ticket_to_asset',
      event_type: 'ticket_resolved',
      conditions_json: JSON.stringify({
        ticket_types: ['Hardware Replacement', 'Device Upgrade'],
        ticket_statuses: ['Resolved', 'Closed', 'Done'],
      }),
      actions_json: JSON.stringify({
        set_asset_status: 'retired',
        clear_assignee: true,
        set_location: 'IT E-Waste / Recycling Staging',
        append_notes: 'Asset retired and decommissioned per replacement ticket {ticket_key}.',
      }),
      is_enabled: true,
      execution_count: 12,
      last_executed_at: now,
    },
    {
      id: 'rule_device_stolen_lost',
      name: 'Lost/Stolen Device Ticket -> Flag Lost & Clear Custody',
      description:
        "Instantly flags asset as 'lost_stolen' and alerts compliance logging when reported stolen.",
      source: 'any',
      direction: 'ticket_to_asset',
      event_type: 'ticket_resolved',
      conditions_json: JSON.stringify({
        ticket_types: ['Security Incident', 'Lost Device'],
        ticket_statuses: ['Resolved', 'Closed', 'Open', 'In Progress'],
        title_keywords: ['stolen', 'lost', 'theft', 'missing'],
      }),
      actions_json: JSON.stringify({
        set_asset_status: 'lost_stolen',
        clear_assignee: true,
        set_location: 'Unreachable / Stolen',
        append_notes: 'CRITICAL: Reported lost/stolen in ticket {ticket_key}. Endpoint remote wipe triggered.',
      }),
      is_enabled: true,
      execution_count: 3,
      last_executed_at: now,
    },
    {
      id: 'rule_proactive_warranty_refresh',
      name: 'Warranty Nearing Expiry (<= 60 days) -> Generate JSM Ticket',
      description:
        'Automated 2-way sync: Detects devices approaching warranty expiration and generates proactive draft tickets in Jira Service Management.',
      source: 'warranty_scheduler',
      direction: 'asset_to_ticket',
      event_type: 'warranty_expiring',
      conditions_json: JSON.stringify({
        days_before_warranty: 60,
        asset_statuses: ['in_use'],
      }),
      actions_json: JSON.stringify({
        create_ticket: true,
        destination_itsm: 'jira',
        ticket_type: 'Hardware Refresh',
        ticket_priority: 'Medium',
        ticket_summary_template: 'Hardware Refresh Needed: {model} ({serial_number}) - {assigned_name}',
        ticket_description_template:
          'Automated Lifecycle Alert from TCT-SeamIT:\nDevice: {model}\nSerial: {serial_number}\nAsset Tag: {asset_tag}\nAssignee: {assigned_name} ({assigned_email})\nWarranty Expiration: {warranty_date} ({days_left} days remaining).\nAction: Review renewal or deploy replacement.',
      }),
      is_enabled: true,
      execution_count: 5,
      last_executed_at: now,
    },
  ];

  for (const r of rules) {
    await prisma.rule.upsert({
      where: { id: r.id },
      create: r,
      update: r,
    });
  }

  // 3. Seed Realistic SMB Assets
  const assets = [
    {
      asset_tag: 'ASSET-1001',
      serial_number: 'C02G1234MD6R',
      model: 'MacBook Pro 14" M3 Pro (36GB)',
      category: 'Laptop',
      assigned_to_email: 'sarah.connor@acme-corp.com',
      assigned_to_name: 'Sarah Connor',
      department: 'Engineering',
      location: 'HQ - Floor 3',
      status: 'in_use',
      purchase_date: '2024-03-15',
      warranty_expiry_date: addDays(today, 730),
      eol_date: addDays(today, 1095),
      notes: 'Primary dev machine. MDM enrolled with Jamf Pro.',
      last_ticket_id: 'JSM-9402',
      last_ticket_title: 'Employee Onboarding Setup - Sarah Connor',
    },
    {
      asset_tag: 'ASSET-1002',
      serial_number: '89XYZ42',
      model: 'Dell Latitude 5540 i7-1365U',
      category: 'Laptop',
      assigned_to_email: 'marcus.vance@acme-corp.com',
      assigned_to_name: 'Marcus Vance',
      department: 'Sales',
      location: 'Remote - Chicago',
      status: 'in_use',
      purchase_date: '2023-11-10',
      warranty_expiry_date: addDays(today, 28), // Triggers discrepancy radar!
      eol_date: addDays(today, 1095),
      notes: 'Sales field laptop with Dell ProSupport Plus.',
      last_ticket_id: 'JSM-8812',
      last_ticket_title: 'VPN Access Request',
    },
    {
      asset_tag: 'ASSET-1003',
      serial_number: 'PF4289KL',
      model: 'Lenovo ThinkPad T14s Gen 4',
      category: 'Laptop',
      assigned_to_email: 'alex.miller@acme-corp.com',
      assigned_to_name: 'Alex Miller',
      department: 'Product',
      location: 'IT Repair Depot / Vendor',
      status: 'in_repair',
      purchase_date: '2024-01-20',
      warranty_expiry_date: addDays(today, 365),
      eol_date: addDays(today, 1095),
      notes: 'Sent to Lenovo Depot for cracked bezel & screen flicker.',
      last_ticket_id: 'FS-2041',
      last_ticket_title: 'MacBook Pro broken screen repair',
      updated_at: threeWeeksAgo, // > 14 days in repair (Zombie alert!)
    },
    {
      asset_tag: 'ASSET-1004',
      serial_number: 'C02FL988MD6S',
      model: 'MacBook Air 15" M2 (16GB)',
      category: 'Laptop',
      assigned_to_email: 'elena.rostova@acme-corp.com',
      assigned_to_name: 'Elena Rostova',
      department: 'Finance',
      location: 'HQ - Floor 4',
      status: 'in_use',
      purchase_date: '2023-08-14',
      warranty_expiry_date: addDays(today, 45),
      eol_date: addDays(today, 50),
      notes: 'Executive finance device.',
      last_ticket_id: 'FS-1903',
      last_ticket_title: 'Excel Add-in License Setup',
    },
    {
      asset_tag: 'ASSET-1005',
      serial_number: '37BC901',
      model: 'Dell OptiPlex 7090 Micro',
      category: 'Desktop',
      assigned_to_email: null, // Ghost asset alert!
      assigned_to_name: null,
      department: 'Operations',
      location: 'HQ - Floor 1 Server Room',
      status: 'in_use',
      purchase_date: '2022-05-10',
      warranty_expiry_date: addDays(today, 365),
      eol_date: addDays(today, 1095),
      notes: 'Shared utility desktop. Missing named custodian in inventory.',
      last_ticket_id: null,
      last_ticket_title: null,
    },
    {
      asset_tag: 'ASSET-1006',
      serial_number: '5CD32049XP',
      model: 'HP EliteBook 840 G9',
      category: 'Laptop',
      assigned_to_email: null,
      assigned_to_name: null,
      department: 'IT Operations',
      location: 'IT Storage Closet - Shelf B',
      status: 'available',
      purchase_date: '2024-04-01',
      warranty_expiry_date: addDays(today, 730),
      eol_date: addDays(today, 1095),
      notes: 'Clean imaged spare ready for new hire deployment.',
      last_ticket_id: 'JSM-9120',
      last_ticket_title: 'Spare Laptop Restock & Re-image',
    },
    {
      asset_tag: 'ASSET-1007',
      serial_number: 'C02DK771MD6T',
      model: 'MacBook Pro 16" M1 Max (64GB)',
      category: 'Laptop',
      assigned_to_email: 'david.chen@acme-corp.com',
      assigned_to_name: 'David Chen',
      department: 'Engineering',
      location: 'Remote - Seattle',
      status: 'pending_return',
      purchase_date: '2022-09-18',
      warranty_expiry_date: addDays(today, -12),
      eol_date: addDays(today, 50),
      notes: 'Offboarding initiated. Prepaid FedEx return box dispatched.',
      last_ticket_id: 'JSM-9831',
      last_ticket_title: 'Employee Offboarding - David Chen',
      updated_at: twoWeeksAgo,
    },
    {
      asset_tag: 'ASSET-1008',
      serial_number: '98KJL10',
      model: 'Dell Latitude 7420 i5-1145G7',
      category: 'Laptop',
      assigned_to_email: 'lisa.ray@acme-corp.com',
      assigned_to_name: 'Lisa Ray',
      department: 'Marketing',
      location: 'HQ - Floor 2',
      status: 'in_use',
      purchase_date: '2021-10-15',
      warranty_expiry_date: addDays(today, -12), // Expired in production!
      eol_date: addDays(today, 1095),
      notes: 'Legacy marketing laptop. Requires replacement planning.',
      last_ticket_id: 'FS-2104',
      last_ticket_title: 'Figma Adobe CC performance issues',
    },
    {
      asset_tag: 'ASSET-1009',
      serial_number: '8K290X1',
      model: 'Dell Latitude 5430',
      category: 'Laptop',
      assigned_to_email: null,
      assigned_to_name: null,
      department: 'IT Operations',
      location: 'IT E-Waste / Recycling Staging',
      status: 'retired',
      purchase_date: '2020-04-12',
      warranty_expiry_date: '2023-04-12',
      eol_date: '2025-04-12',
      notes: 'Depreciated & sanitized according to NIST 800-88 guidelines.',
      last_ticket_id: 'JSM-8419',
      last_ticket_title: 'Hardware Decommissioning Request',
      updated_at: threeWeeksAgo,
    },
    {
      asset_tag: 'ASSET-1010',
      serial_number: 'C02E9043MD6Q',
      model: 'MacBook Air 13" M1',
      category: 'Laptop',
      assigned_to_email: null,
      assigned_to_name: null,
      department: 'Executive',
      location: 'Unreachable / Stolen',
      status: 'lost_stolen',
      purchase_date: '2021-06-20',
      warranty_expiry_date: '2024-06-20',
      eol_date: '2025-06-20',
      notes: 'Reported stolen from car trunk during business travel. Remote erased via Apple Business Manager.',
      last_ticket_id: 'JSM-9512',
      last_ticket_title: 'STOLEN LAPTOP REPORT - Remote Lock',
      updated_at: twoWeeksAgo,
    },
  ];

  for (const a of assets) {
    await prisma.asset.upsert({
      where: { asset_tag: a.asset_tag },
      create: a,
      update: a,
    });
  }

  // 4. Seed Initial Sync Logs
  const asset1007 = await prisma.asset.findUnique({ where: { asset_tag: 'ASSET-1007' } });
  const asset1010 = await prisma.asset.findUnique({ where: { asset_tag: 'ASSET-1010' } });
  const asset1003 = await prisma.asset.findUnique({ where: { asset_tag: 'ASSET-1003' } });

  const initialLogs = [
    {
      timestamp: now,
      direction: 'ticket_to_asset',
      rule_id: 'rule_offboarding_return',
      rule_name: 'Offboarding Ticket Resolved -> Mark Pending Return',
      source: 'jira',
      ticket_id: 'JSM-9831',
      ticket_title: 'Employee Offboarding - David Chen',
      asset_id: asset1007?.id ?? null,
      asset_tag: 'ASSET-1007',
      serial_number: 'C02DK771MD6T',
      action_summary: "Changed status from 'in_use' to 'pending_return'; unassigned david.chen@acme-corp.com; set location to 'IT Quarantine / Return Bay'",
      diff_json: JSON.stringify({
        status: { old: 'in_use', new: 'pending_return' },
        assigned_to_email: { old: 'david.chen@acme-corp.com', new: null },
        location: { old: 'Remote - Seattle', new: 'IT Quarantine / Return Bay' },
      }),
      status: 'success',
    },
    {
      timestamp: twoWeeksAgo,
      direction: 'ticket_to_asset',
      rule_id: 'rule_device_stolen_lost',
      rule_name: 'Lost/Stolen Device Ticket -> Flag Lost & Clear Custody',
      source: 'jira',
      ticket_id: 'JSM-9512',
      ticket_title: 'STOLEN LAPTOP REPORT - Remote Lock',
      asset_id: asset1010?.id ?? null,
      asset_tag: 'ASSET-1010',
      serial_number: 'C02E9043MD6Q',
      action_summary: "Marked asset 'lost_stolen', cleared assignee, added security audit note",
      diff_json: JSON.stringify({
        status: { old: 'in_use', new: 'lost_stolen' },
        location: { old: 'HQ - Floor 5', new: 'Unreachable / Stolen' },
      }),
      status: 'success',
    },
    {
      timestamp: threeWeeksAgo,
      direction: 'ticket_to_asset',
      rule_id: 'rule_device_repair_start',
      rule_name: 'Hardware Repair Ticket -> Set In Repair',
      source: 'freshservice',
      ticket_id: 'FS-2041',
      ticket_title: 'MacBook Pro broken screen repair',
      asset_id: asset1003?.id ?? null,
      asset_tag: 'ASSET-1003',
      serial_number: 'PF4289KL',
      action_summary: "Changed status from 'in_use' to 'in_repair'; set location to 'IT Repair Depot / Vendor'",
      diff_json: JSON.stringify({
        status: { old: 'in_use', new: 'in_repair' },
        location: { old: 'HQ - Floor 3', new: 'IT Repair Depot / Vendor' },
      }),
      status: 'success',
    },
  ];

  for (const log of initialLogs) {
    await prisma.syncLog.create({ data: log });
  }

  // 5. Seed Initial Notifications
  const notifications = [
    {
      title: 'Discrepancy Radar Warning',
      message: '5 active discrepancies detected ($6,200 total dollar risk exposure). Quick remediation available in Discrepancy Radar.',
      severity: 'HIGH',
      category: 'discrepancy',
      link_tab: 'radar',
      is_read: 0,
      created_at: now,
    },
    {
      title: 'Zendesk Integration Active',
      message: 'Zendesk Support connector is enabled in Mock Mode. Ready for inbound webhooks and ticket generation.',
      severity: 'INFO',
      category: 'connector',
      link_tab: 'connectors',
      is_read: 0,
      created_at: now,
    },
    {
      title: 'SOC 2 Readiness Benchmark',
      message: 'Current audit readiness score is at 53%. Remediate ghost assets to reach 90%+ compliance.',
      severity: 'MEDIUM',
      category: 'compliance',
      link_tab: 'radar',
      is_read: 0,
      created_at: now,
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  console.log('[Seed] Seeding completed successfully!');
}

if ((import.meta as any).main || process.argv[1]?.includes('seed')) {
  ensureDatabaseSeeded(defaultPrisma, process.argv.includes('--force'))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
