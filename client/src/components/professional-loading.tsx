import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ProfessionalTableSkeleton() {
  return (
    <div className="medical-card">
      <div className="medical-card-header">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfessionalCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfessionalHeaderSkeleton() {
  return (
    <header className="medical-header">
      <div className="medical-container">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <Skeleton className="h-10 w-48" />
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ProfessionalSearchSkeleton() {
  return (
    <div className="medical-card">
      <div className="medical-card-header">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <Skeleton className="h-12 flex-1 max-w-lg" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}