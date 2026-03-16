"use client";

import { Copy, ExternalLink, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TransactionHashProps {
  hash: string;
  status?: string; // "completed" | "pending" | "failed" usually, but generic string allowed
  showStatus?: boolean;
  className?: string;
  subscanLink?: string | null;
}

export function TransactionHash({
  hash,
  status,
  showStatus = false,
  className,
  subscanLink,
}: TransactionHashProps) {
  if (!hash) return null;

  const truncated = `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  const link = subscanLink || `https://assethub-paseo.subscan.io/extrinsic/${hash}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(hash);
    toast.success("Transaction hash copied to clipboard");
  };

  const statusIcon = status === "completed" ? (
    <CheckCircle className="h-3 w-3 text-green-500" />
  ) : status === "pending" ? (
    <Clock className="h-3 w-3 text-yellow-500" />
  ) : status === "failed" ? (
    <AlertCircle className="h-3 w-3 text-red-500" />
  ) : null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showStatus && statusIcon}
      
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1 pr-1.5 pl-2.5 hover:bg-muted transition-colors cursor-default">
              <span>{truncated}</span>
              <div className="flex items-center gap-0.5 border-l pl-1.5 ml-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded-sm hover:bg-background hover:text-foreground text-muted-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyToClipboard();
                  }}
                >
                  <Copy className="h-2.5 w-2.5" />
                  <span className="sr-only">Copy hash</span>
                </Button>
                <Link href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-sm hover:bg-background hover:text-foreground text-muted-foreground"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    <span className="sr-only">View on Subscan</span>
                  </Button>
                </Link>
              </div>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-mono text-xs max-w-[300px] break-all">{hash}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
