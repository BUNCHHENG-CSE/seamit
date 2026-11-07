import { NextResponse } from 'next/server';
import { getSoc2ReportData } from '../route';

export async function GET() {
  const data = await getSoc2ReportData();
  const inv = data.inventory_summary;

  let rowsHtml = '';
  for (const log of data.recent_custody_events) {
    rowsHtml += `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${log.timestamp.slice(0, 19)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${log.ticket_id || 'N/A'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${log.asset_tag || '—'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${log.action_summary || ''}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold;">${(log.status || 'success').toUpperCase()}</span>
        </td>
      </tr>
    `;
  }

  const scoreColor =
    data.audit_readiness_score >= 80
      ? '#10b981'
      : data.audit_readiness_score >= 60
        ? '#f59e0b'
        : '#ef4444';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SOC 2 & ISO 27001 ITAM-ITSM Audit Attestation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
        h1, h2, h3 { margin: 0 0 8px 0; }
        .header { border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .badge { background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
        .metric-val { font-size: 26px; font-weight: 800; margin-top: 4px; }
        .metric-lbl { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 30px; font-size: 13px; }
        th { background: #f1f5f9; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }
        .attestation-box { background: #f8fafc; border-left: 4px solid #0f172a; padding: 18px 24px; margin-bottom: 30px; border-radius: 0 8px 8px 0; }
        .sig-block { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #cbd5e1; }
        .sig-line { width: 250px; border-top: 1px solid #475569; margin-top: 50px; font-size: 12px; color: #64748b; padding-top: 6px; }
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #0f172a; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
    </div>

    <div class="header">
        <div>
            <div style="font-size: 12px; font-weight: bold; color: #0284c7; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;">TCT-SeamIT Automated Compliance Attestation</div>
            <h1 style="font-size: 24px; font-weight: 800;">SOC 2 Type II & ISO 27001 Device Custody Audit Report</h1>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;">
                Organization: <strong>${data.organization}</strong> | Report ID: <strong>${data.report_id}</strong>
            </div>
        </div>
        <div style="text-align: right;">
            <span class="badge">Official ITAM Audit</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Generated: ${data.generated_at.slice(0, 19).replace('T', ' ')} UTC</div>
        </div>
    </div>

    <div class="metric-grid">
        <div class="metric-card">
            <div class="metric-lbl">Audit Readiness Score</div>
            <div class="metric-val" style="color: ${scoreColor};">${data.audit_readiness_score}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-lbl">Total Managed Assets</div>
            <div class="metric-val">${inv.total_assets}</div>
        </div>
        <div class="metric-card">
            <div class="metric-lbl">Ghost Assets (Unassigned)</div>
            <div class="metric-val" style="color: ${data.ghost_assets_count > 0 ? '#ef4444' : '#10b981'};">${data.ghost_assets_count}</div>
        </div>
        <div class="metric-card">
            <div class="metric-lbl">Total Dollar Risk Exposure</div>
            <div class="metric-val" style="color: ${data.dollar_risk_exposure > 0 ? '#ef4444' : '#10b981'};">$${data.dollar_risk_exposure.toLocaleString()}</div>
        </div>
    </div>

    <div class="attestation-box">
        <h3 style="font-size: 15px; margin-bottom: 8px;">Compliance Scope & Attestation Statement</h3>
        <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0;">
            ${data.attestation_statement}
        </p>
        <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
            Audited Standards: ${data.standards.join(', ')}
        </div>
    </div>

    <h3>Inventory State Distribution</h3>
    <table style="margin-top: 12px;">
        <thead>
            <tr>
                <th>Deployed (In Use)</th>
                <th>Available (Stock)</th>
                <th>In Repair</th>
                <th>Pending Return</th>
                <th>Retired / EOL</th>
                <th>Reported Lost/Stolen</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${inv.in_use}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${inv.available}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${inv.in_repair}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${inv.pending_return}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${inv.retired}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #ef4444;">${inv.lost_stolen}</td>
            </tr>
        </tbody>
    </table>

    <h3>Device Custody Turnover & Synchronization Trail (Recent 30 Days)</h3>
    <table style="margin-top: 12px;">
        <thead>
            <tr>
                <th>Timestamp (UTC)</th>
                <th>Ticket ID</th>
                <th>Asset Tag</th>
                <th>Action & Custody Transition Summary</th>
                <th style="text-align: center;">Verification</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml || "<tr><td colspan='5' style='text-align:center; padding: 20px;'>No custody turnover events in the past 30 days.</td></tr>"}
        </tbody>
    </table>

    <div class="sig-block">
        <div>
            <div style="font-weight: 600; font-size: 13px;">Lead IT Systems Administrator</div>
            <div class="sig-line">Signature / Timestamp Attestation</div>
        </div>
        <div>
            <div style="font-weight: 600; font-size: 13px;">External Compliance / SOC 2 Auditor</div>
            <div class="sig-line">Auditor Verification & Review</div>
        </div>
    </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
