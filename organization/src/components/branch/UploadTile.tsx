import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { pickImage } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

/**
 * A dashed upload slot that actually opens a file picker and previews the
 * choice. The file name rides along in a hidden input so the enclosing form's
 * `FormData` records it; the data URL itself stays in memory (branch records
 * live in localStorage, and a handful of base64 images would blow the quota).
 */
export function UploadTile({
  label,
  hint,
  name,
  size = "sm",
}: {
  label: string;
  hint: string;
  name: string;
  size?: "sm" | "lg";
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<{ name: string; dataUrl: string } | null>(null);

  const choose = async () => {
    const picked = await pickImage();
    if (picked === "too-large") {
      toast({ title: "File too large", description: "Pick an image under 5 MB.", variant: "destructive" });
      return;
    }
    if (picked) setFile(picked);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className={`border-2 border-dashed border-border rounded-lg text-center ${size === "lg" ? "p-8" : "p-4"}`}>
        {file ? (
          <>
            <img src={file.dataUrl} alt={label} className="mx-auto mb-2 max-h-24 rounded object-contain" />
            <p className="mb-2 truncate text-xs text-muted-foreground" title={file.name}>{file.name}</p>
            <div className="flex justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={choose}>Replace</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <Upload className={`mx-auto mb-2 text-muted-foreground ${size === "lg" ? "h-10 w-10" : "h-8 w-8"}`} />
            <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
            <Button type="button" variant="outline" size="sm" onClick={choose}>Choose File</Button>
          </>
        )}
      </div>
      <input type="hidden" name={name} value={file?.name ?? ""} />
    </div>
  );
}
