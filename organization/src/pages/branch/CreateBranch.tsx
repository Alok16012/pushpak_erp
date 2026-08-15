import { useState } from "react";
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
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import {
  BRANCHES_KEY,
  BRANCH_SEED,
  BRANCH_TYPES,
  INSTITUTE_TYPES,
  titleCase,
  type Branch,
} from "@/data/branches";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, add } = useLocalCollection<Branch>(BRANCHES_KEY, BRANCH_SEED);
  // The sections are uncontrolled, so the form itself is the source of truth —
  // `FormData` reads every named input, textarea, Select and Switch in one go.
  const [saving, setSaving] = useState(false);

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
    if (items.some((branch) => branch.code.toUpperCase() === code)) {
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
    add({
      name: value("branchName"),
      code,
      type: BRANCH_TYPES[value("branchType")] ?? "Sub Branch",
      instituteType: INSTITUTE_TYPES[value("instituteType")] ?? "Other",
      city: value("city"),
      state: titleCase(value("state")),
      students: 0,
      staff: Number(value("numFaculty")) || 0,
      revenue: 0,
      // A brand-new branch is only live if the admin left "Active Status" on.
      status: data.get("activeStatus") ? "active" : "inactive",
      expiryDate: value("expiryDate") || value("validDate") || "—",
    });
    toast({
      title: "Branch created",
      description: `${value("branchName")} (${code}) was added to the register.`,
    });
    navigate("/branch/view");
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
            {saving ? "Creating…" : "Create Branch"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
