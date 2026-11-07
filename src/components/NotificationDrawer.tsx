import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Check, 
  Send, 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  ExternalLink,
  CheckCheck,
  RefreshCw,
  Sparkles,
  Inbox
} from 'lucide-react';
import type { NotificationItem } from '../types';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: number) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onSendTestAlert: () => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

export const NotificationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onSendTestAlert,
  onNavigateTab
}) => {
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestAlert = async () => {
    setIsSendingTest(true);
    try {
      await onSendTestAlert();
    } finally {
      setIsSendingTest(false);
    }
  };

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'unread') return !item.is_read;
    return true;
  });

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return dateString.replace('T', ' ').slice(0, 16);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight bg-destructive/15 text-destructive border border-destructive/25">
            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
            <span>HIGH</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>MEDIUM</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-tight bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-card/95 backdrop-blur-xl border-l border-border h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 z-10">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-card/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <Bell className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Alert & Notification Center
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-destructive text-destructive-foreground animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Discrepancy warnings & ITSM webhook events
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
                title="Close drawer"
                aria-label="Close drawer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Subheader: Filter Switcher & Mark All Read */}
          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-border/50">
            <div className="flex items-center p-0.5 bg-muted/60 border border-border/70 rounded-lg">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-background text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-background text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50 border border-border/80 mx-auto mb-3 text-muted-foreground/60">
                <Inbox className="size-6" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">
                {filter === 'unread' ? 'No unread alerts' : 'No notifications yet'}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                {filter === 'unread' 
                  ? 'All detected discrepancies and lifecycle events have been reviewed.' 
                  : 'Automated warnings and webhook updates will appear here in real time.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`group relative p-3.5 rounded-xl border transition-all duration-200 ${
                  !item.is_read 
                    ? 'bg-card border-primary/30 shadow-xs hover:border-primary/50' 
                    : 'bg-muted/20 border-border/60 hover:bg-muted/40 hover:border-border text-muted-foreground'
                }`}
              >
                {/* Header Row: Badge, Title & Mark Read Check */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {getSeverityBadge(item.severity)}
                    <h4 className="text-xs font-semibold text-foreground leading-snug">
                      {item.title}
                    </h4>
                  </div>

                  {!item.is_read ? (
                    <button
                      type="button"
                      onClick={() => onMarkRead(item.id)}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer shrink-0"
                      title="Mark as read"
                    >
                      <Check className="size-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                      Read
                    </span>
                  )}
                </div>

                {/* Message Body */}
                <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
                  {item.message}
                </p>

                {/* Footer Row: Timestamp & Link */}
                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <span 
                    className="font-mono text-muted-foreground"
                    title={item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : ''}
                  >
                    {formatTimeAgo(item.created_at)}
                  </span>

                  {item.link_tab && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab(item.link_tab!);
                        onClose();
                      }}
                      className="text-primary hover:text-primary/80 flex items-center gap-1 font-medium group-hover:underline cursor-pointer"
                    >
                      <span>Go to {item.link_tab.charAt(0).toUpperCase() + item.link_tab.slice(1)}</span>
                      <ExternalLink className="size-2.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/80 bg-card/60 flex items-center justify-between gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={isSendingTest}
            onClick={handleTestAlert}
            className="h-8 text-xs font-medium gap-1.5 border-border/80 hover:bg-muted/60 transition-colors cursor-pointer"
          >
            {isSendingTest ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5 text-primary" />
            )}
            <span>{isSendingTest ? 'Dispatching...' : 'Test Slack/Teams Alert'}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold shadow-xs cursor-pointer"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  );
};
