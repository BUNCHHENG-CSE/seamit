import React, { useState } from 'react';
import { X, Bell, Check, Send, AlertTriangle, ShieldAlert, Info, ExternalLink } from 'lucide-react';
import type { NotificationItem } from '../types';

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

  if (!isOpen) return null;

  const handleTestAlert = async () => {
    setIsSendingTest(true);
    try {
      await onSendTestAlert();
    } finally {
      setIsSendingTest(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 font-bold border border-red-500/20">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">INFO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background/60 backdrop-blur-xs flex justify-end font-mono">
      <div className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Bell className="size-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Alert & Notification Center</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">Discrepancy warnings & ITSM events</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-[11px] text-primary hover:underline px-2 py-1 flex items-center gap-1"
                title="Mark all notifications as read"
              >
                <Check className="size-3" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <Info className="size-8 mx-auto mb-2 opacity-50" />
              <span>No notifications in history.</span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition-all ${item.is_read ? 'bg-muted/20 border-border/60 text-muted-foreground' : 'bg-card border-primary/40 shadow-xs'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(item.severity)}
                    <span className="text-xs font-bold text-foreground leading-snug">{item.title}</span>
                  </div>
                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(item.id)}
                      className="text-muted-foreground hover:text-foreground text-[10px]"
                      title="Mark as read"
                    >
                      <Check className="size-3" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">{item.message}</p>

                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : 'Just now'}</span>
                  {item.link_tab && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab(item.link_tab!);
                        onClose();
                      }}
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Go to {item.link_tab.toUpperCase()}</span>
                      <ExternalLink className="size-2.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={isSendingTest}
            onClick={handleTestAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Send className="size-3" />
            <span>{isSendingTest ? 'Sending...' : 'Test Slack/Teams Alert'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
