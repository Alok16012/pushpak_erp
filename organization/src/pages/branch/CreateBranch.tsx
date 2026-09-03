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
import { createBranchWithDetails, createBranchLogin, getBranches } from "@/lib/supabase/data";

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
  ["email", "Email"],
  ["directorName", "Director Name"],
  ["directorGender", "Gender"],
  ["directorDOB", "Date of Birth"],
  ["adminName", "Admin Name"],
  ["adminUsername", "Admin Username"],
  ["adminPassword", "Admin Password"],
];

/** Select values arrive slugged ("uttar-pradesh"); the tables store them as text. */
const titleCase = (value: string) =>
  value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function CreateBranch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const result = await getBranches(user?.organizationId || null);
        setBranches((result.data ?? []) as Branch[]);
      } catch {
        // start with empty list on failure
      }
    };
    fetchBranches();
  }, [user?.organizationId]);

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
    if (value("adminPassword").length < 6) {
      toast({
        title: "Admin password is too short",
        description: "Use at least 6 characters - this is the branch's login password.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.organizationId) {
      toast({ title: "No organization assigned", variant: "destructive" });
      setSaving(false);
      return;
    }
    setSaving(true);
    // Branch details live across three tables: the branch itself, its address
    // and its director. Enum columns take the uppercase form of the select value.
    createBranchWithDetails(user.organizationId, {
      branch: {
        name: value("branchName"),
        code,
        branchType: (value("branchType") || "sub").toUpperCase(),
        instituteType: (value("instituteType") || "other").toUpperCase(),
        academicYear: value("academicYear"),
        establishedYear: Number(value("establishedYear")) || null,
        website: value("website") || null,
        description: value("description") || null,
        phone: value("phone"),
        altPhone: value("altPhone") || null,
        whatsappNumber: value("whatsappNumber") || null,
        email: value("email"),
        numComputers: Number(value("numComputers")) || 0,
        numFaculty: Number(value("numFaculty")) || 0,
        numRooms: Number(value("numRooms")) || 0,
        isActive: Boolean(data.get("activeStatus")),
        onlineEnrollment: Boolean(data.get("onlineEnrollment")),
        smsNotifications: Boolean(data.get("smsNotifications")),
        emailNotifications: Boolean(data.get("emailNotifications")),
        onlineFeePayment: Boolean(data.get("onlineFeePayment")),
        studentPortal: Boolean(data.get("studentPortal")),
        parentPortal: Boolean(data.get("parentPortal")),
      },
      address: {
        streetAddress: value("address"),
        state: titleCase(value("state")),
        district: titleCase(value("district")),
        block: value("block") || null,
        city: value("city"),
        pincode: value("pincode"),
        latitude: value("latitude") ? Number(value("latitude")) : null,
        longitude: value("longitude") ? Number(value("longitude")) : null,
        country: titleCase(value("country")) || "India",
      },
      director: {
        name: value("directorName"),
        gender: value("directorGender").toUpperCase(),
        dob: new Date(value("directorDOB")).toISOString(),
        bloodGroup: value("directorBloodGroup") || null,
      },
      // The registration input is a month picker, so it needs a day to parse.
      license: value("expiryDate")
        ? {
            registrationDate: new Date(`${value("registrationDate") || value("expiryDate").slice(0, 7)}-01`).toISOString(),
            validDate: value("validDate") ? new Date(value("validDate")).toISOString() : null,
            expiryDate: new Date(value("expiryDate")).toISOString(),
            referralCode: value("referralCode") || null,
          }
        : undefined,
    }).then(async (created) => {
      // The branch exists now; its login is a separate step, so a failure here
      // is reported on its own rather than losing the branch.
      try {
        const login = await createBranchLogin({
          branchId: created.data.id as string,
          username: value("adminUsername"),
          password: value("adminPassword"),
          name: value("adminName"),
          email: value("adminEmail"),
          phone: value("adminPhone"),
        });
        toast({
          title: "Branch created",
          description: `${value("branchName")} (${code}) is on the register. Login ID: ${login.data.username}`,
        });
      } catch (error) {
        toast({
          title: "Branch created, login was not",
          description: `${error instanceof Error ? error.message : "Could not create the branch login"}. Add it from Supabase Authentication.`,
          variant: "destructive",
        });
      }
      navigate("/branch/view");
    }).catch((error: unknown) => {
      toast({
        title: "Failed to create branch",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
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
