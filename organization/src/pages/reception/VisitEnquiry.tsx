import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, Save, X, UserPlus, Clock, Calendar, MapPin, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createEnquiry } from "@/lib/supabase/data";

const PURPOSE_MAP: Record<string, string> = {
  admission: "ADMISSION",
  fee: "FEE",
  meeting: "MEETING",
  complaint: "COMPLAINT",
  delivery: "DELIVERY",
  interview: "INTERVIEW",
  other: "OTHER",
};

const DEPARTMENT_MAP: Record<string, string> = {
  administration: "ADMINISTRATION",
  academics: "ACADEMICS",
  accounts: "ACCOUNTS",
  hr: "HR",
  it: "IT",
};

const ID_TYPE_MAP: Record<string, string> = {
  aadhar: "AADHAR",
  pan: "PAN",
  driving: "DRIVING",
  passport: "PASSPORT",
  voter: "VOTER",
};

const PERSON_MAP: Record<string, string> = {
  principal: "Principal",
  admin: "Admin Officer",
  accounts: "Accounts Dept",
  teacher: "Class Teacher",
  counselor: "Counselor",
  other: "Other Staff",
};

export default function VisitEnquiry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, branchId, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchReady, setBranchReady] = useState(false);

  const [visitorName, setVisitorName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitTime, setVisitTime] = useState(new Date().toTimeString().slice(0, 5));
  const [purpose, setPurpose] = useState("");
  const [personToMeet, setPersonToMeet] = useState("");
  const [department, setDepartment] = useState("");
  const [noOfPersons, setNoOfPersons] = useState("1");
  const [enquiryReason, setEnquiryReason] = useState("");
  const [location, setLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  useEffect(() => {
    if (!authLoading) {
      setBranchReady(true);
    }
  }, [authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const input: Record<string, unknown> = {
        visitorName,
        phone,
        email: email || null,
        idType: ID_TYPE_MAP[idType] || idType || "AADHAR",
        idNumber: idNumber || null,
        company: company || null,
        address: address || null,
        visitDate: new Date(visitDate).toISOString(),
        visitTime,
        purpose: PURPOSE_MAP[purpose] || purpose || "OTHER",
        personToMeet: personToMeet || PERSON_MAP["other"] || "Other Staff",
        department: DEPARTMENT_MAP[department] || department || "ADMINISTRATION",
        noOfPersons: parseInt(noOfPersons) || 1,
        enquiryReason: enquiryReason || null,
        location: location || null,
        remarks: remarks || null,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
        followUpTime: followUpTime || null,
        followUpNotes: followUpNotes || null,
      };

      await createEnquiry(branchId || "", input);

      toast({
        title: "Visitor Registered",
        description: "Visit enquiry has been successfully recorded.",
      });

      navigate("/reception/visitors");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to register visitor",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !branchReady) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Visit Enquiry"
        description="Register a new visitor and record their enquiry details"
        breadcrumbs={[
          { label: "Reception", href: "/reception/enquiry" },
          { label: "Visit Enquiry" },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Visitor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visitorName">Visitor Name *</Label>
                    <Input id="visitorName" placeholder="Enter full name" required value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" placeholder="+91 98765 43210" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="visitor@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idType">ID Type</Label>
                    <Select value={idType} onValueChange={setIdType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aadhar">Aadhar Card</SelectItem>
                        <SelectItem value="pan">PAN Card</SelectItem>
                        <SelectItem value="driving">Driving License</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="voter">Voter ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Number</Label>
                    <Input id="idNumber" placeholder="Enter ID number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Organization/Company</Label>
                    <Input id="company" placeholder="Enter organization name" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" placeholder="Enter visitor's address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Visit Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="visitDate">Visit Date *</Label>
                    <Input id="visitDate" type="date" required value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitTime">Visit Time *</Label>
                    <Input id="visitTime" type="time" required value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose of Visit *</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admission">Admission Enquiry</SelectItem>
                        <SelectItem value="fee">Fee Related</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personToMeet">Person to Meet *</Label>
                    <Select value={personToMeet} onValueChange={(v) => { setPersonToMeet(v); if (!department) setDepartment(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principal">Principal</SelectItem>
                        <SelectItem value="admin">Admin Officer</SelectItem>
                        <SelectItem value="accounts">Accounts Dept</SelectItem>
                        <SelectItem value="teacher">Class Teacher</SelectItem>
                        <SelectItem value="counselor">Counselor</SelectItem>
                        <SelectItem value="other">Other Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administration">Administration</SelectItem>
                        <SelectItem value="academics">Academics</SelectItem>
                        <SelectItem value="accounts">Accounts</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="it">IT Department</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noOfPersons">Number of Persons</Label>
                    <Input id="noOfPersons" type="number" min="1" value={noOfPersons} onChange={(e) => setNoOfPersons(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="enquiryReason">Enquiry Reason</Label>
                    <Textarea id="enquiryReason" placeholder="Describe the reason for enquiry in detail..." rows={2} value={enquiryReason} onChange={(e) => setEnquiryReason(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Visitor Location / City</Label>
                    <Input id="location" placeholder="Enter city or area" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks / Notes</Label>
                  <Textarea id="remarks" placeholder="Any additional information about the visit..." rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Follow-up Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="followUpDate">Follow-up Call Date</Label>
                    <Input id="followUpDate" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="followUpTime">Preferred Time</Label>
                    <Input id="followUpTime" type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpNotes">Follow-up Notes</Label>
                  <Textarea id="followUpNotes" placeholder="Any notes for the follow-up call..." rows={2} value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visitor Photo</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Upload className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="gap-2" type="button">
                  <Upload className="h-4 w-4" />
                  Capture / Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Take a photo using webcam or upload from device
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm">Today's Date</span>
                  </div>
                  <Badge variant="secondary">
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm">Check-in Time</span>
                  </div>
                  <Badge variant="secondary">
                    {new Date().toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ID Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Upload ID proof
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 mt-6 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => navigate("/reception/visitors")} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Registering..." : "Register Visitor"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
