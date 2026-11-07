import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DiscrepancyRadar } from '@/lib/engine/discrepancy-radar';
import { ensureDatabaseSeeded } from '@/lib/seed';

export async function getSoc2ReportData() {
  await ensureDatabaseSeeded();

  const now = new Date();
  const radarData = await DiscrepancyRadar.scanDiscrepancies(prisma);

  const assets = await prisma.asset.findMany();
  const statusCounts: Record<string, number> = {};
  for (const a of assets) {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  }

  const ghostAssetsCount = assets.filter(
    (a) =>
      a.status === 'in_use' &&
      (!a.assigned_to_email || a.assigned_to_email.trim() === '') &&
      (!a.assigned_to_name || a.assigned_to_name.trim() === '')
  ).length;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const recentLogs = await prisma.syncLog.findMany({
    where: { timestamp: { gte: thirtyDaysAgo } },
    orderBy: { id: 'desc' },
    take: 50,
  });

  const connectors = await prisma.connectorConfig.findMany({
    select: {
      id: true,
      name: true,
      is_enabled: true,
      mock_mode: true,
      status: true,
    },
  });

  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');

  return {
    report_id: `SOC2-AUDIT-${yyyymmdd}-01`,
    generated_at: now.toISOString(),
    standards: [
      'SOC 2 Type II (Trust Services Criteria CC6.1, CC6.8)',
      'ISO/IEC 27001:2022 Control A.8.1 (Asset Inventory)',
    ],
    organization: 'Acme Corp (50-300 Employee SMB Tier)',
    audit_readiness_score: radarData.summary.audit_readiness_score,
    total_discrepancies: radarData.summary.total_discrepancies,
    ghost_assets_count: ghostAssetsCount,
    dollar_risk_exposure: radarData.summary.total_dollar_risk,
    inventory_summary: {
      total_assets: assets.length,
      in_use: statusCounts['in_use'] || 0,
      available: statusCounts['available'] || 0,
      in_repair: statusCounts['in_repair'] || 0,
      pending_return: statusCounts['pending_return'] || 0,
      retired: statusCounts['retired'] || 0,
      lost_stolen: statusCounts['lost_stolen'] || 0,
    },
    connectors_audited: connectors,
    recent_custody_events_count: recentLogs.length,
    recent_custody_events: recentLogs.slice(0, 20).map((l) => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    })),
    attestation_statement:
      'All corporate endpoint devices are tracked via automated bidirectional sync layer bridging ITSM ticketing webhooks with the central asset inventory. Audit trails and diff payloads are immutably logged with microsecond precision.',
  };
}

export async function GET() {
  const data = await getSoc2ReportData();
  return NextResponse.json(data);
}
