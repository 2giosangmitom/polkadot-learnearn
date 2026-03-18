import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, DollarSign } from "lucide-react";
import { Badge } from "../ui/badge";

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  author_id: string;
  author_wallet_address: string;
  platform_wallet_address: string;
  created_at: string;
  updated_at: string;
}

interface CourseCardProps {
  course: Course;
  onSponsor: (course: Course) => void;
}

export function CourseCard({ course, onSponsor }: CourseCardProps) {
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
            onClick={() => onSponsor(course)}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Sponsor This Course
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}