import { NextResponse } from 'next/server';

export const RECIPES = [
  {
    id: 'recipe_offboarding_laptop',
    name: 'Employee Offboarding -> Auto-Unassign & Pending Return',
    category: 'Offboarding & Custody',
    description:
      "When HR or IT marks an offboarding ticket resolved in Jira or Freshservice, automatically transitions the employee's assigned device to 'pending_return', clears the user assignment, and logs the change.",
    direction: 'ticket_to_asset',
    source: 'any',
    event_type: 'ticket_resolved',
    conditions: {
      ticket_types: ['Offboarding', 'Employee Exit', 'Termination'],
      ticket_statuses: ['Resolved', 'Closed', 'Done'],
    },
    actions: {
      set_asset_status: 'pending_return',
      clear_assignee: true,
      set_location: 'IT Return Bay / Quarantine',
      append_notes: 'Offboarding ticket {ticket_key} closed.',
    },
  },
  {
    id: 'recipe_repair_in_progress',
    name: 'Hardware Repair Ticket -> Transition to In Repair',
    category: 'Hardware Lifecycle',
    description:
      "When a ticket with issue type 'Repair' or title keywords ('broken screen', 'battery', 'liquid') is in progress, updates the asset table status to 'in_repair'.",
    direction: 'ticket_to_asset',
    source: 'any',
    event_type: 'ticket_updated',
    conditions: {
      ticket_types: ['Repair', 'Hardware Issue'],
      ticket_statuses: ['In Progress', 'Waiting on Vendor'],
      title_keywords: ['screen', 'battery', 'repair', 'keyboard'],
    },
    actions: {
      set_asset_status: 'in_repair',
      clear_assignee: false,
      set_location: 'IT Repair Depot',
      append_notes: 'Hardware repair started via ticket {ticket_key}.',
    },
  },
  {
    id: 'recipe_repair_resolved',
    name: 'Repair Resolved -> Return to IT Available Stock',
    category: 'Hardware Lifecycle',
    description:
      "When a repair ticket is resolved, marks the device 'available' in the IT storage closet ready for redeployment.",
    direction: 'ticket_to_asset',
    source: 'any',
    event_type: 'ticket_resolved',
    conditions: {
      ticket_types: ['Repair', 'Hardware Issue'],
      ticket_statuses: ['Resolved', 'Closed'],
    },
    actions: {
      set_asset_status: 'available',
      clear_assignee: true,
      set_location: 'IT Storage Closet - Shelf B',
      append_notes: 'Repair completed via ticket {ticket_key}.',
    },
  },
  {
    id: 'recipe_device_replacement',
    name: 'Hardware Replacement -> Mark Old Asset Retired',
    category: 'Decommissioning',
    description:
      'When a device replacement ticket is completed, retires the old hardware and logs NIST-compliant disposal notes.',
    direction: 'ticket_to_asset',
    source: 'any',
    event_type: 'ticket_resolved',
    conditions: {
      ticket_types: ['Hardware Replacement', 'Device Upgrade'],
      ticket_statuses: ['Resolved', 'Closed'],
    },
    actions: {
      set_asset_status: 'retired',
      clear_assignee: true,
      set_location: 'IT E-Waste Staging',
      append_notes: 'Retired per hardware replacement ticket {ticket_key}.',
    },
  },
  {
    id: 'recipe_lost_stolen',
    name: 'Reported Lost or Stolen -> Mark Lost & Trigger Alert',
    category: 'Security & Compliance',
    description:
      "Immediately flags asset as 'lost_stolen', clears custody, and logs incident in audit records.",
    direction: 'ticket_to_asset',
    source: 'any',
    event_type: 'ticket_resolved',
    conditions: {
      ticket_types: ['Security Incident', 'Lost Device'],
      ticket_statuses: ['Open', 'In Progress', 'Resolved'],
      title_keywords: ['stolen', 'lost', 'theft'],
    },
    actions: {
      set_asset_status: 'lost_stolen',
      clear_assignee: true,
      set_location: 'Unreachable / Stolen',
      append_notes: 'Stolen laptop reported via ticket {ticket_key}.',
    },
  },
  {
    id: 'recipe_warranty_proactive',
    name: 'Warranty Expiry (-60 Days) -> Auto-generate Draft Ticket',
    category: 'Proactive Lifecycle (2-Way)',
    description:
      'Scans assets daily. When warranty expiration is within 60 days, auto-generates a draft hardware refresh ticket in Jira Service Management.',
    direction: 'asset_to_ticket',
    source: 'warranty_scheduler',
    event_type: 'warranty_expiring',
    conditions: {
      days_before_warranty: 60,
      asset_statuses: ['in_use'],
    },
    actions: {
      create_ticket: true,
      destination_itsm: 'jira',
      ticket_type: 'Hardware Refresh',
      ticket_priority: 'Medium',
      ticket_summary_template: 'Hardware Refresh: {model} ({serial_number}) - {assigned_name}',
      ticket_description_template:
        'Warranty expires on {warranty_date} ({days_left} days left). Assigned to {assigned_name}.',
    },
  },
  {
    id: 'recipe_zendesk_offboarding',
    name: 'Zendesk Offboarding Solved -> Auto-Unassign & Return',
    category: 'Offboarding & Custody',
    description:
      "When a Zendesk ticket regarding employee exit or offboarding is marked 'Solved', transitions device to 'pending_return' and unassigns the user.",
    direction: 'ticket_to_asset',
    source: 'zendesk',
    event_type: 'ticket_resolved',
    conditions: {
      ticket_types: ['Incident', 'Task', 'Offboarding'],
      ticket_statuses: ['Solved', 'Closed'],
      title_keywords: ['offboarding', 'exit', 'terminate', 'leaving'],
    },
    actions: {
      set_asset_status: 'pending_return',
      clear_assignee: true,
      set_location: 'IT Return Bay / Quarantine',
      append_notes: 'Zendesk offboarding ticket {ticket_key} solved.',
    },
  },
  {
    id: 'recipe_zendesk_warranty',
    name: 'Warranty Expiry (-60 Days) -> Generate Zendesk Ticket',
    category: 'Proactive Lifecycle (2-Way)',
    description:
      'Scans assets approaching warranty expiration and auto-creates hardware replacement tasks in Zendesk.',
    direction: 'asset_to_ticket',
    source: 'warranty_scheduler',
    event_type: 'warranty_expiring',
    conditions: {
      days_before_warranty: 60,
      asset_statuses: ['in_use'],
    },
    actions: {
      create_ticket: true,
      destination_itsm: 'zendesk',
      ticket_type: 'Task',
      ticket_priority: 'Normal',
      ticket_summary_template: 'Hardware Lifecycle Refresh: {model} ({asset_tag})',
      ticket_description_template:
        'Device assigned to {assigned_name} warranty expires on {warranty_date}.',
    },
  },
];

export async function GET() {
  return NextResponse.json(RECIPES);
}
