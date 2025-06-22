import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ClientListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filtros skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-10 w-full md:w-96" />
        <Skeleton className="h-10 w-full md:w-64" />
      </div>

      {/* Botones de ordenación skeleton */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Grid de tarjetas skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="min-h-[200px]">
            <CardHeader className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
                <div>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-0.5 shrink-0" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
            <CardFooter className="px-6 pb-6 pt-0">
              <div className="flex gap-3 w-full">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
