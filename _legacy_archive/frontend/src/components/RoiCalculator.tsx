import React, { useState } from 'react';
import { 
  Calculator, 
  Clock, 
  TrendingUp, 
  HelpCircle,
  Sparkles,
  Users,
  Briefcase,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const RoiCalculator: React.FC = () => {
  const [employeeCount, setEmployeeCount] = useState<number>(120);
  const [itTeamSize, setItTeamSize] = useState<number>(2);
  const [monthlyTurnoverEvents, setMonthlyTurnoverEvents] = useState<number>(4);
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'pro'>('standard');

  const monthlyPrice = selectedPlan === 'standard' ? 99 : 199;
  const annualCost = monthlyPrice * 12;

  // Calculators
  // 1. Manual reconciliation time: ~3.5 hrs per turnover/repair event
  const monthlyAdminHours = Math.round(monthlyTurnoverEvents * 3.5);
  const hourlyRate = 45; // average SMB IT admin rate
  const annualTimeSavings = monthlyAdminHours * hourlyRate * 12;

  // 2. Hardware loss prevention: ~1.5 laptops saved per year from uncollected offboarding
  const avgLaptopCost = 1450;
  const laptopsLostPerYear = Math.max(1, Math.round((employeeCount / 100) * 1.5));
  const annualHardwareSavings = laptopsLostPerYear * avgLaptopCost;

  // 3. Audit penalty avoidance
  const complianceFindingAvoidance = 5000;

  // Total Annual Value
  const totalAnnualValue = annualTimeSavings + annualHardwareSavings + complianceFindingAvoidance;
  const netSavings = totalAnnualValue - annualCost;
  const roiMultiplier = Math.round((totalAnnualValue / annualCost) * 10) / 10;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <Card size="sm" className="bg-card/90 border-border/80 shadow-md">
        <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] gap-1 h-5 px-1.5">
                <Sparkles className="size-3 text-primary" />
                <span>Economic Model & Validation</span>
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              The "One Fewer Asset Admin" Economic Anchor
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anchored at <strong className="text-foreground font-mono">$99–$199/month</strong>. Built specifically for lean 1–3 person IT teams at 50–300 employee organizations.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-center self-start md:self-center font-mono">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
              Estimated Payback
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              &lt; 14 Days
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sliders Box */}
        <Card size="sm" className="lg:col-span-2 bg-card/90 border-border/80 shadow-md">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Calculator className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Customize Company Profile</CardTitle>
                <CardDescription className="text-xs">Adjust parameters to match your SMB endpoint environment.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-5 text-xs font-mono">
            {/* Employee Count */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <Users className="size-3.5 text-muted-foreground" />
                  <span>Total Employees:</span>
                </span>
                <Badge variant="outline" className="font-mono text-xs h-5">
                  {employeeCount} users
                </Badge>
              </div>
              <input
                type="range"
                min={50}
                max={300}
                step={10}
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>50</span>
                <span>150</span>
                <span>300 (Target SMB)</span>
              </div>
            </div>

            {/* IT Team Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <Briefcase className="size-3.5 text-muted-foreground" />
                  <span>IT Operations Staff:</span>
                </span>
                <Badge variant="outline" className="font-mono text-xs h-5">
                  {itTeamSize} person{itTeamSize > 1 ? 's' : ''}
                </Badge>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={itTeamSize}
                onChange={(e) => setItTeamSize(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 (Solo Admin)</span>
                <span>2 (Standard Lean Team)</span>
                <span>3 (Max SMB Tier)</span>
              </div>
            </div>

            {/* Monthly Ticket & Turnover Events */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Monthly Hardware Lifecycle Events (Offboardings, Repairs, Swaps):</span>
                </span>
                <Badge variant="outline" className="font-mono text-xs h-5">
                  {monthlyTurnoverEvents} events / mo
                </Badge>
              </div>
              <input
                type="range"
                min={2}
                max={25}
                step={1}
                value={monthlyTurnoverEvents}
                onChange={(e) => setMonthlyTurnoverEvents(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>2 events</span>
                <span>12 events</span>
                <span>25 events</span>
              </div>
            </div>

            {/* Pricing Tier Selector */}
            <div className="pt-4 border-t border-border/60 space-y-2.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Select Subscription Plan:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setSelectedPlan('standard')}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedPlan === 'standard'
                      ? 'bg-muted/60 border-primary ring-1 ring-primary/40'
                      : 'bg-muted/20 border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-foreground">Standard Site</span>
                    {selectedPlan === 'standard' && <Check className="size-3.5 text-primary" />}
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    $99 <span className="text-xs text-muted-foreground font-normal">/ mo</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug font-sans">
                    1-way ticket ➔ asset sync, JSM & Freshservice, up to 150 hardware assets.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedPlan === 'pro'
                      ? 'bg-muted/60 border-primary ring-1 ring-primary/40'
                      : 'bg-muted/20 border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-foreground">Pro Automation</span>
                    {selectedPlan === 'pro' && <Check className="size-3.5 text-primary" />}
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    $199 <span className="text-xs text-muted-foreground font-normal">/ mo</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug font-sans">
                    Full 2-way sync, Proactive Warranty Radar, SOC 2 compliance export, unlimited assets.
                  </p>
                </div>
              </div>
            </div>

            {/* Validation Discovery Box */}
            <div className="p-3.5 rounded-lg bg-muted/30 border border-border text-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <HelpCircle className="size-3.5 text-muted-foreground" />
                <span>Customer Discovery Validation Insight</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                "When was the last time your asset table and ticketing status disagreed? What was the consequence?"
              </p>
              <div className="text-[11px] text-muted-foreground space-y-1 pt-0.5">
                <div>• <strong className="text-foreground">Lost Device ($1,800):</strong> Ex-employee kept MacBook because offboarding ticket closed without sheet check.</div>
                <div>• <strong className="text-foreground">Duplicate Order ($7,500):</strong> IT bought 5 spare laptops when stock showed zero, despite unlogged returns.</div>
                <div>• <strong className="text-foreground">Audit Finding ($5,000+):</strong> Auditor found 14 unassigned laptops in use with missing chain-of-custody.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI Breakdown Box */}
        <Card size="sm" className="bg-card/90 border-border/80 flex flex-col justify-between shadow-md">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Annual Value Delivered</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-0 space-y-4 font-mono text-xs">
            <div className="space-y-2.5">
              <div className="bg-muted/40 p-3 rounded-md border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Admin Time Saved</span>
                  <span className="text-foreground font-bold">${annualTimeSavings.toLocaleString()} / yr</span>
                </div>
                <span className="text-[10px] text-muted-foreground/70 block">
                  {monthlyAdminHours} hrs/mo manual reconciliation eliminated
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-md border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Hardware Loss Avoided</span>
                  <span className="text-foreground font-bold">${annualHardwareSavings.toLocaleString()} / yr</span>
                </div>
                <span className="text-[10px] text-muted-foreground/70 block">
                  {laptopsLostPerYear} unrecovered offboarding laptop(s) prevented
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-md border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Audit Penalty Protection</span>
                  <span className="text-foreground font-bold">${complianceFindingAvoidance.toLocaleString()} / yr</span>
                </div>
                <span className="text-[10px] text-muted-foreground/70 block">
                  SOC 2 / Cyber Insurance custody compliance proof
                </span>
              </div>
            </div>

            {/* Total vs Cost */}
            <div className="pt-3 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Cost:</span>
                <span className="text-foreground font-semibold">${annualCost.toLocaleString()} / yr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">${totalAnnualValue.toLocaleString()} / yr</span>
              </div>
            </div>

            {/* Net ROI Pill Card */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Net Annual ROI
              </span>
              <div className="text-3xl font-extrabold text-foreground tracking-tight">
                {roiMultiplier}x
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                +${netSavings.toLocaleString()} net economic value
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
