import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Shield, Mail, Phone, UserCheck, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getUsers,
  updateUser,
  deleteUser,
  SYSTEM_ROLES,
  type SystemUserRow,
} from "@/lib/supabase/data";

/** `ORGANIZATION_ADMIN` is not a label. */
const pretty = (value: string) =>
  value
    ? value
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ")
    : "—";

const roleBadgeClass = (role: string) => {
  if (role === "SUPER_ADMIN" || role === "ORGANIZATION_ADMIN") return "bg-purple-100 text-purple-800";
  if (role === "BRANCH_ADMIN") return "bg-blue-100 text-blue-800";
  if (role === "ACCOUNTANT" || role === "TEACHER") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-800";
};

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never";

const AllUsers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const organizationId = user?.organizationId ?? null;
  const branchId = user?.branchId ?? null;

  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [viewing, setViewing] = useState<SystemUserRow | null>(null);
  const [editing, setEditing] = useState<SystemUserRow | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", role: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SystemUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers(organizationId, branchId);
      setUsers(result.data);
    } catch (error) {
      toast({
        title: "Could not load users",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, branchId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: SystemUserRow) => {
    setEditing(row);
    // Controlled, not `defaultValue`: the old form read nothing back, so every
    // keystroke was thrown away when the dialog closed.
    setForm({ name: row.name, phone: row.phone, role: row.role, isActive: row.isActive });
  };

  const save = async () => {
    if (!editing) return;
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateUser(editing.id, {
        name: form.name,
        phone: form.phone,
        role: form.role,
        isActive: form.isActive,
      });
      toast({ title: "User updated", description: `${form.name.trim()} has been saved.` });
      setEditing(null);
      await load();
    } catch (error) {
      toast({
        title: "Could not save user",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: SystemUserRow) => {
    try {
      await updateUser(row.id, { isActive: !row.isActive });
      toast({
        title: row.isActive ? "User deactivated" : "User activated",
        description: `${row.name || row.email} can ${row.isActive ? "no longer" : "now"} be marked active.`,
      });
      await load();
    } catch (error) {
      toast({
        title: "Could not change status",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteUser(pendingDelete.id);
      toast({ title: "User removed", description: `${pendingDelete.name || pendingDelete.email} is no longer listed.` });
      setPendingDelete(null);
      await load();
    } catch (error) {
      toast({
        title: "Could not remove user",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const columns: Column<SystemUserRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name || "—"}</p>
          <p className="text-xs text-muted-foreground">{pretty(row.userType)} login</p>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="break-all">{row.email || "—"}</span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{row.phone || "—"}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      cell: (row) => (
        <Badge className={roleBadgeClass(row.role)}>
          <Shield className="mr-1 h-3 w-3" />
          {pretty(row.role)}
        </Badge>
      ),
    },
    {
      key: "branch",
      header: "Branch / Organisation",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{row.branch || row.organization || "—"}</span>
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge className={row.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
          <UserCheck className="mr-1 h-3 w-3" />
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last login",
      sortable: true,
      cell: (row) => <span className="whitespace-nowrap text-sm">{formatDate(row.lastLoginAt)}</span>,
    },
  ];

  const rowActions = (row: SystemUserRow) => [
    { label: "View details", onClick: () => setViewing(row) },
    { label: "Edit user", onClick: () => openEdit(row) },
    { label: row.isActive ? "Deactivate" : "Activate", onClick: () => void toggleActive(row) },
    { label: "Remove user", onClick: () => setPendingDelete(row), destructive: true },
  ];

  const filtered = users.filter((row) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      row.name.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      row.branch.toLowerCase().includes(term);
    const matchesRole = filterRole === "all" || row.role === filterRole;
    const matchesStatus =
      filterStatus === "all" || (filterStatus === "active" ? row.isActive : !row.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeUsers = users.filter((row) => row.isActive).length;
  const adminUsers = users.filter((row) => row.role.includes("ADMIN")).length;
  // Only the roles actually in use — the list used to offer Admin, Manager and
  // Employee, none of which this database has ever accepted.
  const rolesInUse = [...new Set(users.map((row) => row.role).filter(Boolean))].sort();

  const stats = [
    { label: "Total users", value: users.length, note: "Staff logins", className: "" },
    { label: "Active", value: activeUsers, note: "Currently active", className: "text-green-600" },
    { label: "Inactive", value: users.length - activeUsers, note: "Cannot sign in", className: "text-gray-600" },
    { label: "Administrators", value: adminUsers, note: "Organisation and branch admins", className: "text-purple-600" },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <PageHeader
          title="All Users"
          description="Staff logins for this organisation"
          breadcrumbs={[{ label: "User Management", href: "/user/all" }, { label: "All Users" }]}
          actions={
            <Button variant="outline" asChild>
              <Link to="/branch/view">Manage branch logins</Link>
            </Button>
          }
        />

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.className}`}>{loading ? "—" : stat.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Filter users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email or branch..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger aria-label="Filter by role">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {rolesInUse.map((role) => (
                    <SelectItem key={role} value={role}>
                      {pretty(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger aria-label="Filter by status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading users…" : `Showing ${filtered.length} of ${users.length} users`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>User list</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filtered}
              actions={rowActions}
              searchable={false}
              emptyMessage={
                loading
                  ? "Loading users…"
                  : "No staff logins yet. A branch gets one when you set its login from the branch page."
              }
            />
            {/* Every enrolled student has a login too; they are managed with the
                rest of the student record rather than buried in this list. */}
            <p className="mt-4 text-xs text-muted-foreground">
              Student logins are managed under{" "}
              <Link to="/student/view" className="underline">
                Students
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* View */}
        <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User details</DialogTitle>
              <DialogDescription>The login as it is recorded on the institute</DialogDescription>
            </DialogHeader>
            {viewing && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Full name", viewing.name || "—"],
                    ["Login type", pretty(viewing.userType)],
                    ["Email", viewing.email || "—"],
                    ["Phone", viewing.phone || "—"],
                    ["Role", pretty(viewing.role)],
                    ["Branch / organisation", viewing.branch || viewing.organization || "—"],
                    ["Status", viewing.isActive ? "Active" : "Inactive"],
                    ["Last login", formatDate(viewing.lastLoginAt)],
                    ["Account created", formatDate(viewing.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">{label}</Label>
                      <p className="break-all text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              {viewing && <Button onClick={() => { openEdit(viewing); setViewing(null); }}>Edit</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit */}
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>Changes are written to the user record straight away</DialogDescription>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full name</Label>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                      <SelectTrigger id="edit-role" aria-label="Role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {SYSTEM_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {pretty(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={form.isActive ? "active" : "inactive"}
                      onValueChange={(value) => setForm({ ...form, isActive: value === "active" })}
                    >
                      <SelectTrigger id="edit-status" aria-label="Status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Email</Label>
                  <p className="text-sm">{editing.email || "—"}</p>
                  {/* The email is the credential the account signs in with, and
                      changing it means changing the Supabase Auth account —
                      which needs the service-role key the browser does not hold. */}
                  <p className="text-xs text-muted-foreground">
                    The sign-in email is changed by resetting the login from the{" "}
                    <Link to="/branch/view" className="underline">
                      branch page
                    </Link>
                    , not here.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this user?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete?.name || pendingDelete?.email} will no longer be listed as a user of the institute
                and will be marked inactive. The sign-in account itself is revoked from the branch page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Remove user</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default AllUsers;
