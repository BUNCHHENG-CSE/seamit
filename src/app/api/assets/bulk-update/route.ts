import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const asset_ids: number[] = payload.asset_ids || [];

    if (!asset_ids || asset_ids.length === 0) {
      return NextResponse.json({ detail: 'asset_ids list cannot be empty' }, { status: 400 });
    }

    if (payload.action === 'delete') {
      await prisma.asset.deleteMany({
        where: { id: { in: asset_ids } },
      });

      await prisma.syncLog.create({
        data: {
          direction: 'bulk_action',
          rule_name: 'Batch Asset Deletion',
          source: 'manual_ui',
          action_summary: `Batch deleted ${asset_ids.length} asset records from inventory.`,
          status: 'success',
        },
      });

      return NextResponse.json({
        success: true,
        action: 'delete',
        affected_count: asset_ids.length,
        message: `Successfully deleted ${asset_ids.length} assets.`,
      });
    }

    // Update action
    const dataUpdates: any = {};
    if (payload.status) dataUpdates.status = payload.status;
    if (payload.location) dataUpdates.location = payload.location;
    if (payload.department) dataUpdates.department = payload.department;

    if (Object.keys(dataUpdates).length === 0) {
      return NextResponse.json({ detail: 'No fields provided to update' }, { status: 400 });
    }

    let affected_count = 0;
    for (const a_id of asset_ids) {
      const asset = await prisma.asset.findUnique({ where: { id: a_id } });
      if (asset) {
        await prisma.asset.update({
          where: { id: a_id },
          data: dataUpdates,
        });

        const diff: Record<string, any> = {};
        if (payload.status) diff.status = { old: asset.status, new: payload.status };
        if (payload.location) diff.location = { old: asset.location, new: payload.location };
        if (payload.department) diff.department = { old: asset.department, new: payload.department };

        await prisma.syncLog.create({
          data: {
            direction: 'bulk_action',
            rule_name: 'Batch Asset Update',
            source: 'manual_ui',
            asset_id: a_id,
            asset_tag: asset.asset_tag,
            serial_number: asset.serial_number,
            action_summary: `Batch updated ${asset.asset_tag}: ${Object.keys(diff).join(', ')}`,
            diff_json: JSON.stringify(diff),
            status: 'success',
          },
        });
        affected_count++;
      }
    }

    return NextResponse.json({
      success: true,
      action: 'update',
      affected_count,
      message: `Successfully updated ${affected_count} assets.`,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Bulk update failed' }, { status: 500 });
  }
}
