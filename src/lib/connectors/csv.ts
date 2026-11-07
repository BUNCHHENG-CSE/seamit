import type { PrismaClient } from '@prisma/client';

function normalizeColName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

const COLUMN_MAPPING: Record<string, string[]> = {
  asset_tag: ['asset_tag', 'assettag', 'tag', 'asset_id', 'asset_number'],
  serial_number: ['serial_number', 'serial', 'serial_num', 'serialno', 'sn', 'service_tag'],
  model: ['model', 'device_model', 'device', 'hardware_model', 'product'],
  category: ['category', 'device_type', 'type'],
  assigned_to_email: ['assigned_to_email', 'email', 'user_email', 'owner_email', 'assigned_email'],
  assigned_to_name: ['assigned_to_name', 'assigned_to', 'user', 'owner', 'employee', 'employee_name'],
  department: ['department', 'dept', 'team'],
  location: ['location', 'office', 'site'],
  status: ['status', 'asset_status', 'state'],
  purchase_date: ['purchase_date', 'purchased', 'acquired_date'],
  warranty_expiry_date: ['warranty_expiry_date', 'warranty_expiry', 'warranty', 'warranty_end'],
  eol_date: ['eol_date', 'eol', 'end_of_life'],
  notes: ['notes', 'comments', 'description'],
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export async function importAssetsFromCsv(
  csvContent: string,
  prisma: PrismaClient
): Promise<{
  total_rows: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}> {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      total_rows: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: ['Empty or invalid CSV file'],
    };
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const colMap: Record<number, string> = {};

  rawHeaders.forEach((rawCol, idx) => {
    const norm = normalizeColName(rawCol);
    for (const [targetField, aliases] of Object.entries(COLUMN_MAPPING)) {
      if (aliases.includes(norm)) {
        colMap[idx] = targetField;
        break;
      }
    }
  });

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const validStatuses = new Set([
    'in_use',
    'available',
    'in_repair',
    'pending_return',
    'retired',
    'lost_stolen',
    'pending_disposal',
  ]);

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const line = lines[rowIdx];
    const cells = parseCSVLine(line);
    const mapped: Record<string, string> = {};

    cells.forEach((val, colIdx) => {
      const field = colMap[colIdx];
      if (field && val !== undefined) {
        mapped[field] = val.trim();
      }
    });

    let tag = mapped.asset_tag;
    let serial = mapped.serial_number;

    if (!tag && !serial) {
      failed++;
      errors.push(`Row ${rowIdx + 1}: Missing both asset_tag and serial_number`);
      continue;
    }

    if (!tag && serial) {
      tag = `AST-${serial.slice(0, 8)}`;
    }
    if (!serial && tag) {
      serial = `SN-${tag}`;
    }

    const model = mapped.model || 'General IT Asset';
    const category = mapped.category || 'Laptop';
    let status = (mapped.status || 'in_use').toLowerCase().replace(/[\s-]+/g, '_');
    if (!validStatuses.has(status)) {
      status = 'in_use';
    }

    try {
      const existing = await prisma.asset.findFirst({
        where: {
          OR: [{ asset_tag: tag }, { serial_number: serial }],
        },
      });

      if (existing) {
        await prisma.asset.update({
          where: { id: existing.id },
          data: {
            serial_number: serial || existing.serial_number,
            model: model || existing.model,
            category: category || existing.category,
            assigned_to_email: mapped.assigned_to_email ?? existing.assigned_to_email,
            assigned_to_name: mapped.assigned_to_name ?? existing.assigned_to_name,
            department: mapped.department ?? existing.department,
            location: mapped.location ?? existing.location,
            status: status || existing.status,
            purchase_date: mapped.purchase_date ?? existing.purchase_date,
            warranty_expiry_date: mapped.warranty_expiry_date ?? existing.warranty_expiry_date,
            eol_date: mapped.eol_date ?? existing.eol_date,
            notes: mapped.notes ?? existing.notes,
          },
        });
        updated++;
      } else {
        await prisma.asset.create({
          data: {
            asset_tag: tag!,
            serial_number: serial!,
            model,
            category,
            assigned_to_email: mapped.assigned_to_email || null,
            assigned_to_name: mapped.assigned_to_name || null,
            department: mapped.department || null,
            location: mapped.location || 'IT Storage Closet',
            status,
            purchase_date: mapped.purchase_date || null,
            warranty_expiry_date: mapped.warranty_expiry_date || null,
            eol_date: mapped.eol_date || null,
            notes: mapped.notes || null,
          },
        });
        created++;
      }
    } catch (e: any) {
      failed++;
      errors.push(`Row ${rowIdx + 1} (${tag || serial}): ${e.message}`);
    }
  }

  // Record audit log
  try {
    await prisma.syncLog.create({
      data: {
        direction: 'csv_import',
        rule_name: 'CSV Inventory Ingestion',
        source: 'manual_csv',
        action_summary: `Imported CSV: ${created} created, ${updated} updated, ${failed} failed out of ${lines.length - 1} records.`,
        diff_json: JSON.stringify({ created, updated, failed, errors_count: errors.length }),
        status: failed > 0 && created === 0 && updated === 0 ? 'failed' : 'success',
      },
    });
  } catch {}

  return {
    total_rows: lines.length - 1,
    created,
    updated,
    failed,
    errors,
  };
}

export function exportAssetsToCsv(assets: any[]): string {
  const headers = [
    'asset_tag',
    'serial_number',
    'model',
    'category',
    'status',
    'assigned_to_name',
    'assigned_to_email',
    'department',
    'location',
    'purchase_date',
    'warranty_expiry_date',
    'eol_date',
    'last_ticket_id',
    'notes',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(',')];
  for (const a of assets) {
    const row = headers.map((h) => escapeCSV(a[h]));
    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}
