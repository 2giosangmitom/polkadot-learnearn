import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, DollarSign, TrendingUp, Users } from "lucide-react";
import { Badge } from "../ui/badge";
import { useWalletProvider } from "@/hooks/use-wallet-provider";
import { useCoursePool } from "@/hooks/use-course-pool";
import { useEffect } from "react";

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  course_pool_address?: string | null;
  author_id: string;
  author_wallet_address: string;
  platform_wallet_address: string;
  created_at: string;
  updated_at: string;
}

interface CourseCardProps {
  course: Course;
  onSponsor: (course: Course) => void;
  refreshTrigger?: number;
}

export function CourseCard({ course, onSponsor, refreshTrigger }: CourseCardProps) {
  const { signer, metamaskAddress, connect, isCorrectNetwork, switchNetwork } = useWalletProvider();
  const { poolData, refreshData } = useCoursePool(course.course_pool_address);

  // Refresh pool data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refreshData();
    }
  }, [refreshTrigger, refreshData]);
  
  return (
    <Card className="relative group hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>

        <div className="text-sm text-muted-foreground">
          Created: {new Date(course.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long'
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {course.description}
        </p>

        {/* Pool Balance Display */}
        {course.course_pool_address && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total Pool</span>
              </div>
              <div className="flex items-center gap-1">
                {poolData.loading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                ) : poolData.error ? (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                ) : poolData.poolBalance ? (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {parseFloat(poolData.poolBalance.formatted).toFixed(2)} PAS
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    0 ETH
                  </Badge>
                )}
              </div>
            </div>

            {/* Sponsor Count */}
            {!poolData.loading && poolData.sponsors.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{poolData.sponsors.length} Sponsors{poolData.sponsors.length !== 1 ? 's' : ''}</span>
              </div>
            )}

          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-3">
            <Badge
              variant="secondary"
              className="gap-1.5 bg-primary/10 text-primary text-base px-3 py-1"
            >
              <Coins className="h-4 w-4" />
              {course.price} PAS
            </Badge>
          </div>

          <Button
            className="w-full group-hover:bg-primary/90 transition-colors"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSponsor(course);
            }}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Sponsor This Course
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}