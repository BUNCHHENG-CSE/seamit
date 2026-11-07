import React, { useState, useMemo } from 'react';
import { 
  Workflow, 
  Plus, 
  Sparkles, 
  Clock, 
  Trash2, 
  Zap, 
  Search,
  Loader2,
  ArrowRight,
  Filter,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { Rule, Recipe } from '../types';

interface RuleManagerProps {
  rules: Rule[];
  recipes: Recipe[];
  isLoading: boolean;
  onToggleRule: (id: string, isEnabled: boolean) => Promise<void>;
  onApplyRecipe: (recipe: Recipe) => Promise<void>;
  onCreateRule: (rule: Partial<Rule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export const RuleManager: React.FC<RuleManagerProps> = ({
  rules,
  recipes,
  isLoading,
  onToggleRule,
  onApplyRecipe,
  onCreateRule,
  onDeleteRule
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'recipes'>('rules');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('all');

  // Custom rule form state
  const [newRule, setNewRule] = useState<Partial<Rule>>(() => ({
    id: `rule_custom_${Date.now()}`,
    name: '',
    description: '',
    source: 'any',
    direction: 'ticket_to_asset',
    event_type: 'ticket_resolved',
    is_enabled: true,
    conditions: {
      ticket_types: ['Hardware Replacement'],
      ticket_statuses: ['Resolved', 'Closed'],
      title_keywords: []
    },
    actions: {
      set_asset_status: 'retired',
      clear_assignee: true,
      set_location: 'IT Storage Closet'
    }
  }));

  const categories = useMemo(() => {
    const list = Array.from(new Set(recipes.map(r => r.category).filter(Boolean)));
    return ['all', ...list];
  }, [recipes]);

  const filteredRecipes = recipes.filter(r => {
    const matchesCat = recipeCategory === 'all' || (r.category && r.category.toLowerCase() === recipeCategory.toLowerCase());
    const matchesSearch = !recipeSearch || (
      r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
      r.description.toLowerCase().includes(recipeSearch.toLowerCase())
    );
    return matchesCat && matchesSearch;
  });

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;
    await onCreateRule(newRule);
    setIsCreatingCustom(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <Card size="sm" className="bg-card/90 backdrop-blur-md border-border/80 shadow-md">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Workflow className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Rule Engine & Automation Seams
                </h2>
                <Badge variant="outline" className="font-mono text-[10px] h-4.5 px-1.5">
                  Trigger ➔ Reconcile
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated event-driven reconciliation between ITSM tickets and physical assets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                <Loader2 className="size-3.5 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
              </div>
            )}

            {/* Sub-tabs */}
            <div className="bg-muted/50 p-0.5 rounded-lg flex items-center gap-1 border border-border">
              <Button
                variant={activeTab === 'rules' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setActiveTab('rules')}
                className="gap-1.5 h-6 text-xs"
              >
                <Layers className="size-3" />
                <span>Active Seams</span>
                <Badge variant="outline" className="h-4 px-1 text-[9px] bg-background/50">
                  {rules.length}
                </Badge>
              </Button>
              <Button
                variant={activeTab === 'recipes' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setActiveTab('recipes')}
                className="gap-1.5 h-6 text-xs"
              >
                <Sparkles className="size-3" />
                <span>Recipe Library</span>
                <Badge variant="outline" className="h-4 px-1 text-[9px] bg-background/50">
                  {recipes.length}
                </Badge>
              </Button>
            </div>

            <Button
              size="xs"
              onClick={() => setIsCreatingCustom(true)}
              className="gap-1.5 h-7 text-xs font-medium cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Create Seam Rule</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TAB 1: ACTIVE RULES (VISUAL PIPELINE FORMAT) */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <Card className="py-16 text-center bg-card/60 border-dashed border-border/80">
              <CardContent className="space-y-3">
                <Workflow className="size-10 text-muted-foreground/50 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">No Active Automation Rules</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Install a pre-built recipe from the SMB Recipe Library or create your own custom rule.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('recipes')}
                  className="gap-1.5 mt-2 text-xs"
                >
                  <Sparkles className="size-3.5" />
                  <span>Browse SMB Recipe Library</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const isTicketToAsset = rule.direction === 'ticket_to_asset';

                return (
                  <Card 
                    key={rule.id}
                    size="sm"
                    className={`transition-all duration-150 border-border/80 hover:border-border ${
                      rule.is_enabled ? 'bg-card/90' : 'bg-muted/20 opacity-60'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      {/* Top Bar: Name, Badges, Toggle & Delete */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant={isTicketToAsset ? 'default' : 'secondary'}
                              className="font-mono text-[10px] h-5"
                            >
                              {isTicketToAsset ? 'Ticket ➔ Asset' : 'Asset ➔ Ticket'}
                            </Badge>

                            <Badge variant="outline" className="font-mono text-[10px] uppercase h-5">
                              Source: {rule.source}
                            </Badge>

                            {rule.execution_count > 0 && (
                              <Badge variant="outline" className="font-mono text-[10px] gap-1 h-5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                <Zap className="size-3" />
                                <span>{rule.execution_count} triggered</span>
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold text-foreground">
                            {rule.name}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                            {rule.description}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant={rule.is_enabled ? 'outline' : 'secondary'}
                            size="xs"
                            onClick={() => onToggleRule(rule.id, !rule.is_enabled)}
                            className="gap-1.5 h-6 text-xs font-mono"
                          >
                            <span className={`size-1.5 rounded-full ${rule.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                            <span>{rule.is_enabled ? 'Active' : 'Disabled'}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDeleteRule(rule.id)}
                            className="text-muted-foreground hover:text-destructive h-6 w-6"
                            title="Delete rule"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* VISUAL PIPELINE STAGES (Trigger ➔ Condition ➔ Automated Action) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg border border-border text-xs font-mono">
                        {/* Stage 1: Trigger Event */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-foreground/60" />
                            <span>1. Event Trigger</span>
                          </span>
                          <div className="p-2 rounded bg-background/80 border border-border/80 text-[11px] text-foreground font-mono">
                            {rule.event_type}
                          </div>
                        </div>

                        {/* Stage 2: Filter Condition */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                            <Filter className="size-2.5" />
                            <span>2. Filter Conditions</span>
                          </span>
                          <div className="p-2 rounded bg-background/80 border border-border/80 text-[11px] text-muted-foreground space-y-0.5">
                            {isTicketToAsset ? (
                              <div>
                                {rule.conditions.ticket_types && rule.conditions.ticket_types.length > 0 && (
                                  <div>Types: <strong className="text-foreground">{rule.conditions.ticket_types.join(', ')}</strong></div>
                                )}
                                {rule.conditions.ticket_statuses && rule.conditions.ticket_statuses.length > 0 && (
                                  <div>Status: <strong className="text-foreground">{rule.conditions.ticket_statuses.join(', ')}</strong></div>
                                )}
                              </div>
                            ) : (
                              <div>
                                Warranty expires in ≤ <strong className="text-foreground">{rule.conditions.days_before_warranty || 60} days</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stage 3: Automated Seam Action */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                            <ArrowRight className="size-2.5" />
                            <span>3. Automated Action</span>
                          </span>
                          <div className="p-2 rounded bg-background/80 border border-border/80 text-[11px] text-foreground">
                            {isTicketToAsset ? (
                              <span>
                                Status ➔ <strong className="text-primary font-bold">'{rule.actions.set_asset_status}'</strong>
                                {rule.actions.clear_assignee && ' • Unassign'}
                                {rule.actions.set_location && ` • Move to ${rule.actions.set_location}`}
                              </span>
                            ) : (
                              <span>
                                Auto-draft <strong className="text-primary font-bold">{rule.actions.ticket_type}</strong> in {rule.actions.destination_itsm?.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rule Footer */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted-foreground/70" />
                          <span>Last run: {rule.last_executed_at ? rule.last_executed_at.substring(0, 19).replace('T', ' ') : 'Never'}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">ID: {rule.id}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECIPE LIBRARY */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <Card size="sm" className="bg-card/90 border-border/80">
            <CardContent className="p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    placeholder="Search best-practice automation recipes..."
                    className="pl-8 h-7 text-xs bg-muted/40 font-mono"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={recipeCategory === cat ? 'secondary' : 'ghost'}
                      size="xs"
                      onClick={() => setRecipeCategory(cat)}
                      className="h-6 text-[11px] font-mono px-2"
                    >
                      {cat === 'all' ? 'All Recipes' : cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                Showing <strong className="text-foreground">{filteredRecipes.length}</strong> recipes
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRecipes.map((recipe) => (
              <Card 
                key={recipe.id}
                size="sm"
                className="bg-card/90 border-border/80 hover:border-border transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[9px] uppercase h-4 px-1.5">
                      {recipe.category}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {recipe.direction === 'ticket_to_asset' ? 'Ticket ➔ Asset' : 'Asset ➔ Ticket'}
                    </span>
                  </div>

                  <CardTitle className="text-sm font-semibold leading-snug">
                    {recipe.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                    {recipe.description}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="p-4 pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/60 font-mono">1-Click Setup</span>
                  <Button
                    size="xs"
                    onClick={() => onApplyRecipe(recipe)}
                    className="gap-1.5 h-6 text-xs font-mono"
                  >
                    <Plus className="size-3" />
                    <span>Apply Recipe</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Rule Creator Modal */}
      {isCreatingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-xl shadow-2xl border-border bg-card">
            <CardHeader className="p-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Workflow className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Create Custom Seam Automation Rule
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define the trigger conditions and automatic inventory updates.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleCustomSubmit}>
              <CardContent className="p-5 space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <Label htmlFor="rule_name" className="text-xs font-medium">Rule Name *</Label>
                  <Input
                    id="rule_name"
                    required
                    value={newRule.name || ''}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="e.g. Device Upgrade -> Archive Old Serial"
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rule_desc" className="text-xs font-medium">Description</Label>
                  <Input
                    id="rule_desc"
                    value={newRule.description || ''}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="Explain what this automation does..."
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">ITSM Source</Label>
                    <select
                      value={newRule.source || 'any'}
                      onChange={(e) => setNewRule({ ...newRule, source: e.target.value })}
                      className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-mono"
                    >
                      <option value="any">Any (Jira & Freshservice)</option>
                      <option value="jira">Jira Service Management</option>
                      <option value="freshservice">Freshservice</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Trigger Event</Label>
                    <select
                      value={newRule.event_type || 'ticket_resolved'}
                      onChange={(e) => setNewRule({ ...newRule, event_type: e.target.value })}
                      className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-mono"
                    >
                      <option value="ticket_resolved">Ticket Resolved / Closed</option>
                      <option value="ticket_created">Ticket Created</option>
                      <option value="ticket_updated">Ticket In Progress / Updated</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Action: Set Asset Status</Label>
                    <select
                      value={newRule.actions?.set_asset_status || 'retired'}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actions: { ...newRule.actions, set_asset_status: e.target.value }
                      })}
                      className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-mono"
                    >
                      <option value="available">Available (In Stock)</option>
                      <option value="in_repair">In Repair</option>
                      <option value="pending_return">Pending Return</option>
                      <option value="retired">Retired (Decommissioned)</option>
                      <option value="lost_stolen">Lost / Stolen</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Action: Target Location</Label>
                    <Input
                      value={newRule.actions?.set_location || ''}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actions: { ...newRule.actions, set_location: e.target.value }
                      })}
                      placeholder="e.g. IT Storage Shelf B"
                      className="h-8 text-xs font-sans"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 font-sans">
                  <input
                    type="checkbox"
                    id="chk_clear_assignee"
                    checked={newRule.actions?.clear_assignee || false}
                    onChange={(e) => setNewRule({
                      ...newRule,
                      actions: { ...newRule.actions, clear_assignee: e.target.checked }
                    })}
                    className="rounded border-input bg-input/20 text-primary focus:ring-0 cursor-pointer"
                  />
                  <Label htmlFor="chk_clear_assignee" className="text-xs text-muted-foreground cursor-pointer">
                    Unassign employee custody from device upon execution
                  </Label>
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingCustom(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs"
                >
                  Create Rule
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
