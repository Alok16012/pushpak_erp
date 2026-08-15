import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useLocalState } from "@/hooks/use-local-collection";
import { Shield, Lock, Eye, Edit, Save, RefreshCcw } from "lucide-react";

interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  /** The Manager baseline; other roles derive from it in `defaultsFor`. */
  enabled: boolean;
  locked?: boolean;
}

const CATEGORIES: PermissionCategory[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Access to dashboard and overview features",
    permissions: [
      { id: "view_dashboard", name: "View Dashboard", description: "Access to main dashboard", enabled: true },
      { id: "view_analytics", name: "View Analytics", description: "Access to analytics data", enabled: true },
      { id: "export_reports", name: "Export Reports", description: "Download reports", enabled: false },
    ],
  },
  {
    id: "student_management",
    name: "Student Management",
    description: "Manage student records and admissions",
    permissions: [
      { id: "view_students", name: "View Students", description: "View student list", enabled: true },
      { id: "add_student", name: "Add Student", description: "Create new student", enabled: false },
      { id: "edit_student", name: "Edit Student", description: "Modify student data", enabled: false },
      { id: "delete_student", name: "Delete Student", description: "Remove student", enabled: false, locked: true },
    ],
  },
  {
    id: "attendance",
    name: "Attendance Management",
    description: "Manage attendance tracking",
    permissions: [
      { id: "mark_attendance", name: "Mark Attendance", description: "Mark daily attendance", enabled: true },
      { id: "view_attendance", name: "View Attendance", description: "View attendance records", enabled: true },
      { id: "edit_attendance", name: "Edit Attendance", description: "Modify attendance", enabled: false },
      { id: "export_attendance", name: "Export Attendance", description: "Download attendance data", enabled: false },
    ],
  },
  {
    id: "exam_management",
    name: "Exam & Marks",
    description: "Manage exams and marks",
    permissions: [
      { id: "create_exam", name: "Create Exam", description: "Schedule new exam", enabled: false },
      { id: "view_exam", name: "View Exams", description: "View exam schedule", enabled: true },
      { id: "assign_marks", name: "Assign Marks", description: "Enter student marks", enabled: false },
      { id: "edit_marks", name: "Edit Marks", description: "Modify marks", enabled: false, locked: true },
    ],
  },
  {
    id: "fee_management",
    name: "Fee Management",
    description: "Manage fee collection and tracking",
    permissions: [
      { id: "collect_fee", name: "Collect Fee", description: "Receive fee payments", enabled: false },
      { id: "view_fee", name: "View Fee Records", description: "View fee details", enabled: true },
      { id: "refund_fee", name: "Process Refund", description: "Issue refunds", enabled: false, locked: true },
      { id: "fee_reports", name: "Fee Reports", description: "Generate fee reports", enabled: false },
    ],
  },
  {
    id: "user_management",
    name: "User Management",
    description: "Manage system users and roles",
    permissions: [
      { id: "view_users", name: "View Users", description: "View user list", enabled: true },
      { id: "add_user", name: "Add User", description: "Create new user", enabled: false },
      { id: "edit_user", name: "Edit User", description: "Modify user data", enabled: false },
      { id: "delete_user", name: "Delete User", description: "Remove user", enabled: false, locked: true },
      { id: "manage_roles", name: "Manage Roles", description: "Assign roles", enabled: false, locked: true },
    ],
  },
];

const ALL_PERMISSIONS = CATEGORIES.flatMap((c) => c.permissions);

const BASE_ROLES = ["Admin", "Manager", "Employee", "HR Manager"];

/** Starting grant set for a role. Unknown (custom) roles start read-only. */
const defaultsFor = (role: string): Record<string, boolean> =>
  Object.fromEntries(
    ALL_PERMISSIONS.map((permission) => {
      if (role === "Admin") return [permission.id, true];
      if (role === "Manager") return [permission.id, permission.enabled];
      if (role === "HR Manager")
        return [
          permission.id,
          permission.enabled || ["add_user", "edit_user", "export_attendance"].includes(permission.id),
        ];
      return [permission.id, permission.id.startsWith("view_") || permission.id === "mark_attendance"];
    }),
  );

const defaultMatrix = () =>
  Object.fromEntries(BASE_ROLES.map((role) => [role, defaultsFor(role)]));

const AccessControl = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [roles, setRoles] = useLocalState<string[]>("erp-access-roles", BASE_ROLES);
  const [matrix, setMatrix] = useLocalState<Record<string, Record<string, boolean>>>(
    "erp-access-matrix",
    defaultMatrix(),
  );
  const [selectedRole, setSelectedRole] = useState("Manager");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [newRole, setNewRole] = useState("");

  const grants = matrix[selectedRole] ?? defaultsFor(selectedRole);
  const grantedCount = ALL_PERMISSIONS.filter((p) => grants[p.id]).length;

  const handleTogglePermission = (permissionId: string, value: boolean) => {
    setMatrix((current) => ({
      ...current,
      [selectedRole]: { ...(current[selectedRole] ?? defaultsFor(selectedRole)), [permissionId]: value },
    }));
  };

  const handleSaveChanges = () => {
    // The matrix is written through on every toggle; this confirms the state and
    // is where a PUT /roles/:role/permissions belongs once the API models it.
    toast({
      title: "Settings Saved",
      description: `${selectedRole} now has ${grantedCount} of ${ALL_PERMISSIONS.length} permissions.`,
    });
  };

  const handleResetToDefault = () => {
    setMatrix((current) => ({ ...current, [selectedRole]: defaultsFor(selectedRole) }));
    toast({
      title: "Settings Reset",
      description: `${selectedRole} permissions are back to their defaults.`,
    });
  };

  const createCustomRole = () => {
    const name = newRole.trim();
    if (!name) {
      toast({ title: "Name required", description: "Enter a name for the new role.", variant: "destructive" });
      return;
    }
    if (roles.some((r) => r.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Role exists", description: `${name} is already in the list.`, variant: "destructive" });
      return;
    }
    // Clone the role on screen so the copy is a starting point, not a blank slate.
    setRoles((list) => [...list, name]);
    setMatrix((current) => ({ ...current, [name]: { ...grants } }));
    setSelectedRole(name);
    setNewRole("");
    setCustomOpen(false);
    toast({ title: "Role created", description: `${name} starts as a copy of ${selectedRole}.` });
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <PageHeader
          title="Access Control"
          description="Manage role-based permissions and access control"
          breadcrumbs={[
            { label: "User Management", href: "/user/access-control" },
            { label: "Access Control" },
          ]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetToDefault}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
              <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          }
        />

        {/* Role Selection */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configure Permissions For Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="role-select">Select Role:</Label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <Badge variant="secondary">
                {grantedCount} of {ALL_PERMISSIONS.length} granted
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Configure what users with the <strong>{selectedRole}</strong> role can access and do in the system
            </p>
          </CardContent>
        </Card>

        {/* Permission Categories */}
        <div className="space-y-6 mt-6">
          {CATEGORIES.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={permission.id} className="font-medium cursor-pointer">
                            {permission.name}
                          </Label>
                          {permission.locked && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                      </div>
                      <Switch
                        id={permission.id}
                        checked={Boolean(grants[permission.id])}
                        // Locked permissions stay editable for Admin only; every
                        // other role is barred from the destructive ones.
                        disabled={permission.locked && selectedRole !== "Admin"}
                        onCheckedChange={(value) => handleTogglePermission(permission.id, value)}
                      />
                    </div>
                  ))}
                </div>
                {category.id !== CATEGORIES[CATEGORIES.length - 1].id && (
                  <Separator className="mt-4" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Permission Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>Enabled - Permission is granted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-300"></div>
                <span>Disabled - Permission is not granted</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>Locked - System protected permission</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start" onClick={() => setPreviewOpen(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview Role View
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setCustomOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Customize Role
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate("/user/roles")}>
                <Shield className="mr-2 h-4 w-4" />
                View All Roles
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>What a {selectedRole} can do</DialogTitle>
              <DialogDescription>
                {grantedCount} of {ALL_PERMISSIONS.length} permissions are granted.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {CATEGORIES.map((category) => {
                const allowed = category.permissions.filter((p) => grants[p.id]);
                return (
                  <div key={category.id}>
                    <p className="text-sm font-medium">{category.name}</p>
                    {allowed.length ? (
                      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                        {allowed.map((p) => (
                          <li key={p.id}>{p.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">No access</p>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={customOpen} onOpenChange={setCustomOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize Role</DialogTitle>
              <DialogDescription>
                Create a new role starting from the {selectedRole} permission set.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role name</Label>
              <Input
                id="new-role"
                placeholder="e.g., Front Desk Supervisor"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCustomRole()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button>
              <Button onClick={createCustomRole}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AccessControl;
