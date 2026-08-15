import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import { UploadTile } from "./UploadTile";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function DirectorInfoSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Director Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="directorName">Director Name *</Label>
            <Input id="directorName" name="directorName" placeholder="Enter director name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="directorGender">Gender *</Label>
            <Select name="directorGender">
              <SelectTrigger id="directorGender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="directorDOB">Date of Birth *</Label>
            <Input id="directorDOB" name="directorDOB" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="directorBloodGroup">Blood Group</Label>
            <Select name="directorBloodGroup">
              <SelectTrigger id="directorBloodGroup">
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {bloodGroups.map((group) => (
                  <SelectItem key={group} value={group.toLowerCase()}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <UploadTile name="directorPhoto" label="Director Photo" hint="Upload photo" />
          <UploadTile name="directorSignature" label="Director Signature" hint="Upload signature" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <UploadTile name="aadharFront" label="Aadhar Card (Front)" hint="Upload front side" />
          <UploadTile name="aadharBack" label="Aadhar Card (Back)" hint="Upload back side" />
        </div>
      </CardContent>
    </Card>
  );
}
