import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Trophy, Medal, TrendingUp } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Skeleton */}
        <section className="border-b border-border bg-gradient-to-br from-card via-background to-card">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          {/* Ranking General Skeleton */}
          <div className="mb-12">
            <div className="mb-6 flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-500" />
              <Skeleton className="h-6 w-48" />
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rankings por Categoría Skeleton */}
          <div>
            <div className="mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <Skeleton className="h-6 w-56" />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="flex items-center gap-4 p-4">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
