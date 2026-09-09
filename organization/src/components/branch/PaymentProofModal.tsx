import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Building2,
  Calendar,
  User,
  Hash,
  CreditCard,
  Loader2,
} from "lucide-react";
import type { WalletTransactionItem } from "@/lib/supabase/data";

interface PaymentProofModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: WalletTransactionItem | null;
  onApprove?: (tx: WalletTransactionItem) => Promise<void>;
  onReject?: (tx: WalletTransactionItem) => void;
  isProcessing?: boolean;
}

export function PaymentProofModal({
  open,
  onOpenChange,
  transaction,
  onApprove,
  onReject,
  isProcessing = false,
}: PaymentProofModalProps) {
  const [copiedUtr, setCopiedUtr] = useState(false);

  if (!transaction) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const isPending = transaction.status === "PENDING";
  const isApproved = transaction.status === "COMPLETED";
  const isRejected = transaction.status === "FAILED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Payment Proof Verification
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {transaction.id}
              </p>
            </div>
            <Badge
              variant={
                isApproved ? "default" : isPending ? "secondary" : "destructive"
              }
              className={`text-xs px-2.5 py-0.5 ${
                isApproved
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : isPending
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
                  : "bg-rose-600 hover:bg-rose-600 text-white"
              }`}
            >
              {isApproved ? "Approved" : isPending ? "Pending Approval" : "Rejected"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 grid gap-6 md:grid-cols-12">
          {/* Document / Screenshot Display */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div className="rounded-lg border bg-muted/30 overflow-hidden flex flex-col items-center justify-center min-h-[300px] max-h-[440px] relative group">
              {transaction.proofUrl ? (
                <>
                  <img
                    src={transaction.proofUrl}
                    alt={`Payment receipt for ${transaction.reference}`}
                    className="object-contain w-full h-full max-h-[420px] rounded"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 shadow-sm text-xs bg-background/90 backdrop-blur"
                      onClick={() => window.open(transaction.proofUrl!, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Full Image
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="font-medium text-sm text-foreground">No Document File Attached</p>
                  <p className="text-xs max-w-[240px]">
                    This transaction was submitted with reference UTR{" "}
                    <span className="font-mono font-medium">{transaction.reference}</span> without an image attachment.
                  </p>
                </div>
              )}
            </div>

            {transaction.remarks && (
              <div className="mt-3 p-3 rounded border bg-muted/10 text-xs">
                <span className="font-medium text-muted-foreground">Submitter Remarks:</span>{" "}
                <span className="text-foreground">{transaction.remarks}</span>
              </div>
            )}
          </div>

          {/* Transaction Metadata Card */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Highlight Amount Card */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Recharge Amount
                </span>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground mt-1">
                  ₹{transaction.amount.toLocaleString("en-IN")}
                </div>
              </div>

              {/* UTR Card with Copy */}
              <div className="p-3 rounded-lg border bg-background space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    <Hash className="h-3.5 w-3.5" /> UTR / Reference
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(transaction.reference)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedUtr ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-sm font-semibold tracking-wide text-foreground break-all">
                  {transaction.reference}
                </div>
              </div>

              {/* Institute & Submission Details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start justify-between py-1.5 border-b">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Branch / Institute
                  </span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">{transaction.branch}</span>
                    {transaction.branchCode && (
                      <span className="text-[11px] text-muted-foreground block font-mono">
                        {transaction.branchCode}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Payment Method
                  </span>
                  <Badge variant="outline" className="font-medium text-[11px] uppercase">
                    {transaction.paymentMethod}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Submitted By
                  </span>
                  <span className="font-medium text-foreground">{transaction.submittedBy}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Submission Date
                  </span>
                  <span className="font-medium text-foreground">{transaction.formattedDateTime}</span>
                </div>

                {transaction.reviewedBy && (
                  <div className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">Reviewed By</span>
                    <span className="font-medium text-foreground">{transaction.reviewedBy}</span>
                  </div>
                )}

                {transaction.rejectionReason && (
                  <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    <span className="font-semibold block mb-0.5">Rejection Reason:</span>
                    {transaction.rejectionReason}
                  </div>
                )}
              </div>
            </div>

            {/* Direct Approval / Rejection in Proof Viewer */}
            <div className="pt-4 border-t flex flex-col gap-2">
              {isPending && onApprove && onReject ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => onReject(transaction)}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => onApprove(transaction)}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    )}
                    Approve & Credit
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close Proof Viewer
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
