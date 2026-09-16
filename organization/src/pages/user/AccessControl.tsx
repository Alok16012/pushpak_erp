import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Save, Shield } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRoles, updateRole, canManageUsers, type RoleRow } from "@/lib/supabase/data";
import { modulesForView } from "@/lib/navigation";
import { viewForRole, type View } from "@/lib/roles";

/**
 * What each role may open.
 *
 * The page used to show a fixed list of invented permissions -- "Export
 * Reports", "Delete Student" -- whose switches were wired to nothing at all.
 * These are the real pages of the app, grouped as the sidebar groups them, and
 * ticking one is what puts it in that role's menu.
 *
 * Granting is bounded by the role's own level: a branch role cannot be handed
 * an organisation page, because the database would refuse the data behind it
 * anyway. Nothing ticked means the whole menu for that level, which is how
 * every account behaved before roles existed.
 */
export default function AccessControl() {
  const { toast } = useToast();
  const { user, organizationId } = useAuth();
  const [params, setParams] = useSearchParams();

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [granted, setGranted] = useState<string[]>([]);

  const mayEdit = viewForRole(user?.role) === "admin" && canManageUsers(user?.role);
  const roleId = params.get("role") ?? "";
  const role = roles.find((r) => r.id === roleId) ?? null;

  /** The pages this role's level can reach at all — the ceiling on the ticks. */
  const groups = useMemo(
    () => (role ? modulesForView(viewForRole(role.baseRole)) : []),
    [role],
  );
  const everyPath = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => item.url)),
    [groups],
  );

  useEffect(() => {
    let live = true;
    setLoading(true);
    getRoles(organizationId)
      .then((result) => {
        if (!live) return;
        setRoles(result.data);
        if (!params.get("role") && result.data.length) {
          setParams({ role: result.data[0].id }, { replace: true });
        }
      })
      .catch((error: unknown) =>
        toast({
          title: "Could not load the roles",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        }),
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // The ticks follow whichever role is being looked at.
  useEffect(() => {
    setGranted(role?.modules ?? []);
  }, [role?.id, role?.modules]);

  const toggle = (url: string, on: boolean) =>
    setGranted((list) => (on ? [...new Set([...list, url])] : list.filter((p) => p !== url)));

  const toggleGroup = (urls: string[], on: boolean) =>
    setGranted((list) =>
      on ? [...new Set([...list, ...urls])] : list.filter((p) => !urls.includes(p)),
    );

  const save = async () => {
    if (!role) return;
    setSaving(true);
    try {
      // Everything ticked is stored as nothing: "the whole menu" should keep
      // meaning the whole menu even after a page is added to the app later.
      const modules = granted.length === everyPath.length ? [] : granted;
      await updateRole(role.id, { modules });
      setRoles((list) => list.map((r) => (r.id === role.id ? { ...r, modules } : r)));
      toast({
        title: "Permissions saved",
        description:
          modules.length === 0
            ? `${role.name} gets every page for its level.`
            : `${role.name} gets ${modules.length} page(s). Anyone signed in sees the change on their next page load.`,
      });
    } catch (error) {
      toast({
        title: "Could not save the permissions",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Access Control"
        description="Tick the pages each role may open. Everything unticked disappears from their menu."
        breadcrumbs={[{ label: "User Management", href: "/user/all" }, { label: "Access Control" }]}
        actions={
          mayEdit &&
          role && (
            <Button className="gap-2" onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save permissions"}
            </Button>
          )
        }
      />

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">Roles are not set up on this database yet.</p>
            <p className="mt-1 text-muted-foreground">
              Run <code>supabase/schema/roles.sql</code> in the Supabase SQL editor. Until then
              everyone keeps the menu their built-in role has always had.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-end gap-4 p-4">
              <div className="w-full max-w-xs space-y-2">
                <Label htmlFor="role-picker">Role</Label>
                <Select
                  value={roleId}
                  onValueChange={(value) => setParams({ role: value }, { replace: true })}
                >
                  <SelectTrigger id="role-picker">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {role && (
                <p className="text-xs text-muted-foreground">
                  {role.description || "No description"}
                  <br />
                  {granted.length === 0
                    ? "Nothing ticked — this role gets every page its level allows."
                    : `${granted.length} of ${everyPath.length} pages granted.`}
                </p>
              )}
              {role && mayEdit && (
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setGranted(everyPath)}>
                    Select all
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setGranted([])}>
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const urls = group.items.map((item) => item.url);
              const all = urls.every((url) => granted.includes(url));
              return (
                <Card key={group.group}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {group.group}
                    </CardTitle>
                    <Checkbox
                      checked={all}
                      disabled={!mayEdit}
                      aria-label={`Grant all of ${group.group}`}
                      onCheckedChange={(value) => toggleGroup(urls, value === true)}
                    />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.items.map((item) => (
                      <label
                        key={item.url}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={granted.includes(item.url)}
                          disabled={!mayEdit}
                          aria-label={item.title}
                          onCheckedChange={(value) => toggle(item.url, value === true)}
                        />
                        <span>{item.title}</span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {role && (
            <p className="text-xs text-muted-foreground">
              These decide the menu and the pages this app will open. The database keeps its own
              rules on top — a branch role cannot read another branch's records whatever is ticked
              here.{" "}
              <Badge variant="outline" className="ml-1">
                {role.isSystem ? "Built-in role" : "Custom role"}
              </Badge>
            </p>
          )}
        </div>
      )}
    </AppLayout>
  );
}
