import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronRight, X, Sparkles, Sliders, Database, Radar, Play, ArrowRight } from 'lucide-react';

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
  const [mounted, setMounted] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== 'undefined') {
        setIsDismissed(localStorage.getItem('seamit_onboarding_dismissed') === 'true');
      }
    } catch {}
  }, []);

  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: true, // Mock connector active by default
    2: assetsCount > 0,
    3: false,
    4: false
  });

  useEffect(() => {
    if (assetsCount > 0) {
      setCompletedSteps(prev => ({ ...prev, 2: true }));
    }
  }, [assetsCount]);

  if (!mounted || isDismissed) return null;

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
      desc: 'Jira, Freshservice & Zendesk connectors ready in Mock Mode.',
      tab: 'connectors',
      icon: Sliders,
      actionLabel: 'Configure Connectors'
    },
    {
      id: 2,
      title: 'Review Inventory or Import CSV',
      desc: `${assetsCount} assets tracked. Import existing spreadsheet anytime.`,
      tab: 'assets',
      icon: Database,
      actionLabel: 'View Asset Table'
    },
    {
      id: 3,
      title: 'Scan & Remediate Discrepancies',
      desc: `${discrepancyCount} issues detected. Use 1-Click Auto-Fix to achieve 90%+ compliance.`,
      tab: 'radar',
      icon: Radar,
      actionLabel: 'Open Radar'
    },
    {
      id: 4,
      title: 'Simulate First ITSM Webhook',
      desc: 'Trigger a simulated Offboarding or Repair event to see live sync.',
      tab: 'simulator',
      icon: Play,
      actionLabel: 'Run Simulator'
    }
  ];

  return (
    <div className="mb-6 relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-xs transition-all">
      {/* Subtle top accent gradient */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-emerald-500 opacity-80" />

      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Sparkles className="size-4.5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Getting Started with TCT-SeamIT
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  SMB Fast Setup
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete these 4 steps to eliminate spreadsheet double-entry and audit discrepancies in under 5 minutes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 self-end sm:self-auto shrink-0">
            {/* Modern Progress Bar */}
            <div className="flex items-center gap-2.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60">
              <span className="text-xs font-mono font-medium text-muted-foreground">Progress</span>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-foreground min-w-[28px] text-right">
                {progressPercent}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
              title="Dismiss onboarding guide"
              aria-label="Dismiss guide"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {steps.map((s) => {
            const isDone = completedSteps[s.id];
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                onClick={() => onNavigateTab(s.tab)}
                className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                  isDone
                    ? 'bg-muted/20 border-border/60 hover:border-border hover:bg-muted/40'
                    : 'bg-card/90 border-border/80 hover:border-primary/50 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${
                        isDone 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-muted text-muted-foreground border-border/60 group-hover:text-primary group-hover:border-primary/30'
                      }`}>
                        <Icon className="size-3.5" />
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                        Step 0{s.id}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleStep(s.id, e)}
                      className="p-0.5 text-muted-foreground hover:text-foreground transition-transform hover:scale-110 cursor-pointer"
                      title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      <CheckCircle2 className={`size-4.5 transition-colors ${
                        isDone 
                          ? 'text-emerald-500 fill-emerald-500/15' 
                          : 'text-muted-foreground/30 hover:text-muted-foreground'
                      }`} />
                    </button>
                  </div>

                  <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {s.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] font-medium text-primary">
                  <span>{s.actionLabel}</span>
                  <ArrowRight className="size-3 transition-transform duration-150 group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
