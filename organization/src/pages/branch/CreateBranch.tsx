import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { BranchInfoSection } from "@/components/branch/BranchInfoSection";
import { AddressSection } from "@/components/branch/AddressSection";
import { ContactSection } from "@/components/branch/ContactSection";
import { DirectorInfoSection } from "@/components/branch/DirectorInfoSection";
import { BranchSpaceSection } from "@/components/branch/BranchSpaceSection";
import { BranchDocumentsSection } from "@/components/branch/BranchDocumentsSection";
import { BranchAdminSection } from "@/components/branch/BranchAdminSection";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createBranch } from "@/lib/supabase/data";

interface Branch {
  id: string;
  code: string;
}

/** Fields the register cannot do without, in the order they appear on the page. */
const REQUIRED: Array<[string, string]> = [
  ["branchName", "Branch Name"],
  ["branchCode", "Branch Code"],
  ["instituteType", "Institute Type"],
  ["academicYear", "Academic Year"],
  ["address", "Street Address"],
  ["state", "State"],
  ["district", "District"],
  ["city", "City"],
  ["pincode", "Pincode"],
  ["phone", "Phone"],
  ["directorName", "Director Name"],
  ["directorGender", "Gender"],
  ["directorDOB", "Date of Birth"],
  ["adminName", "Admin Name"],
  ["adminUsername", "Admin Username"],
  ["adminPassword", "Admin Password"],
];

export default function CreateBranch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const body = await api<{ items: Branch[] }>("/core/branches");
        setBranches(body.data.items);
      } catch {
        // start with empty list on failure
      }
    };
    fetchBranches();
  }, []);

  // The sections are uncontrolled, so the form itself is the source of truth -
  // `FormData` reads every named input, textarea, Select and Switch in one go.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();

    const missing = REQUIRED.filter(([key]) => !value(key)).map(([, label]) => label);
    if (missing.length) {
      toast({
        title: "Fill the required fields",
        description: missing.join(", "),
        variant: "destructive",
      });
      return;
    }

    const code = value("branchCode").toUpperCase();
    if (branches.some((branch) => branch.code.toUpperCase() === code)) {
      toast({
        title: "Branch code already used",
        description: `${code} belongs to an existing branch. Pick another code.`,
        variant: "destructive",
      });
      return;
    }
    if (!/^\d{6}$/.test(value("pincode"))) {
      toast({ title: "Pincode must be 6 digits", variant: "destructive" });
      return;
    }

    setSaving(true);
    createBranch(user!.organizationId!, {
      name: value("branchName"),
      code,
      type: value("branchType") || "Sub Branch",
      instituteType: value("instituteType") || "Other",
      city: value("city"),
      state: value("state").replace(/\b\w/g, (c) => c.toUpperCase()),
      students: 0,
      staff: Number(value("numFaculty")) || 0,
      revenue: 0,
      status: data.get("activeStatus") ? "active" : "inactive",
      expiryDate: value("expiryDate") || value("validDate") || "—",
    }).then(() => {
      toast({
        title: "Branch created",
        description: `${value("branchName")} (${code}) was added to the register.`,
      });
      navigate("/branch/view");
    }).catch(() => {
      toast({ title: "Failed to create branch", variant: "destructive" });
      setSaving(false);
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Create Branch"
        description="Add a new branch to your institution"
        breadcrumbs={[
          { label: "Branch Management", href: "/branch/view" },
          { label: "Create Branch" },
        ]}
      />

      <form onSubmit={submit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <BranchInfoSection />
            <AddressSection />
            <ContactSection />
            <DirectorInfoSection />
            <BranchSpaceSection />
            <BranchDocumentsSection />
          </div>

          <BranchAdminSection />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/branch/view")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Branch"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
