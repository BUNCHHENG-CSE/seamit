import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, X, Sparkles, Sliders, Database, Radar, Play } from 'lucide-react';

interface Props {
  onNavigateTab: (tab: string) => void;
  discrepancyCount: number;
  assetsCount: number;
}

export const OnboardingWizard: React.FC<Props> = ({
  onNavigateTab,
  discrepancyCount,
  assetsCount
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('seamit_onboarding_dismissed') === 'true';
  });
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: true, // Mock connector active by default
    2: assetsCount > 0,
    3: false,
    4: false
  });

  if (isDismissed) return null;

  const toggleStep = (step: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('seamit_onboarding_dismissed', 'true');
  };

  const steps = [
    {
      id: 1,
      title: 'Verify ITSM Connectors',
      desc: 'Jira, Freshservice & Zendesk connectors are ready in Mock Mode.',
      tab: 'connectors',
      icon: Sliders
    },
    {
      id: 2,
      title: 'Review Asset Table or Import CSV',
      desc: `${assetsCount} assets tracked. Import your existing spreadsheet anytime.`,
      tab: 'assets',
      icon: Database
    },
    {
      id: 3,
      title: 'Scan & Remediate Discrepancies',
      desc: `${discrepancyCount} discrepancies detected. Use 1-Click Auto-Fix to achieve 90%+ compliance.`,
      tab: 'radar',
      icon: Radar
    },
    {
      id: 4,
      title: 'Simulate First ITSM Webhook',
      desc: 'Fire a simulated Offboarding or Repair event to see live two-way sync.',
      tab: 'simulator',
      icon: Play
    }
  ];

  return (
    <div className="mb-6 bg-card border border-primary/30 rounded-xl p-5 shadow-sm relative overflow-hidden font-mono">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/15 text-primary rounded-lg">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Getting Started with SeamIT (SMB IT Fast Setup)</h3>
            <p className="text-[11px] text-muted-foreground">Follow these 4 steps to eliminate spreadsheet double-entry in under 5 minutes</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-primary">{progressPercent}%</span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            title="Dismiss setup guide"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {steps.map((s) => {
          const isDone = completedSteps[s.id];
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              onClick={() => onNavigateTab(s.tab)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${isDone ? 'bg-muted/30 border-border/60 opacity-80 hover:opacity-100' : 'bg-card border-primary/40 hover:border-primary shadow-xs'}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Icon className="size-3.5 text-primary" />
                    <span>Step {s.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleStep(s.id, e)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <CheckCircle2 className={`size-4 ${isDone ? 'text-emerald-500 fill-emerald-500/20' : 'text-muted-foreground/40'}`} />
                  </button>
                </div>
                <div className="text-xs font-bold text-foreground leading-snug">{s.title}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.desc}</div>
              </div>

              <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-primary font-semibold">
                <span>Open {s.tab.toUpperCase()}</span>
                <ChevronRight className="size-3" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
