import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Wallet } from "lucide-react";
import { Course } from "./course-card";

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onSponsor: (course: Course, amount: string) => Promise<void>;
}

export function SponsorModal({ isOpen, onClose, course, onSponsor }: SponsorModalProps) {
  const [sponsorAmount, setSponsorAmount] = useState("");
  const [isSponsoring, setIsSponsoring] = useState(false);

  const calculateExpectedReturn = (amount: string) => {
    if (!amount || isNaN(Number(amount))) return "0";
    const numAmount = Number(amount);
    // Simple calculation: assume 15-25% annual return
    const avgROI = 0.20; // 20% average
    return (numAmount * avgROI).toFixed(0);
  };

  const handleSubmit = async () => {
    if (!course || !sponsorAmount) return;
    
    setIsSponsoring(true);
    try {
      await onSponsor(course, sponsorAmount);
      setSponsorAmount("");
      onClose();
    } catch (error) {
      console.error('Sponsoring failed:', error);
    } finally {
      setIsSponsoring(false);
    }
  };

  const handleClose = () => {
    setSponsorAmount("");
    onClose();
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Sponsor Course
          </DialogTitle>
          <DialogDescription>
            Invest in <span className="font-semibold text-foreground">{course.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Course Price</span>
              <span className="font-semibold">{course.price} PAS</span>
            </div>
          </div>

          {/* Sponsor Amount Input */}
          <div className="space-y-3">
            <label htmlFor="sponsor-amount" className="text-sm font-medium">
              Sponsor Amount (PAS)
            </label>
            <Input
              id="sponsor-amount"
              type="number"
              placeholder="Enter amount in PAS"
              value={sponsorAmount}
              onChange={(e) => setSponsorAmount(e.target.value)}
              min="1"
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Minimum sponsorship: 100 PAS
            </p>
          </div>

          {/* Expected Return Calculation */}
          {sponsorAmount && Number(sponsorAmount) > 0 && (
            <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Investment</span>
                <span className="font-semibold">{Number(sponsorAmount).toLocaleString()} PAS</span>
              </div>
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Select</p>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setSponsorAmount(amount.toString())}
                  className="text-xs"
                >
                  {amount}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSponsoring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!sponsorAmount || Number(sponsorAmount) < 100 || isSponsoring}
            className="min-w-[120px]"
          >
            {isSponsoring ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sponsoring...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Sponsor Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}