import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Clock } from "lucide-react"
import Link from "next/link"
import { getAllUsers, getUnverifiedUsers } from "@/lib/supabase/admin"

export default async function AdminDashboardPage() {
  const allUsers = await getAllUsers()
  const unverifiedUsers = await getUnverifiedUsers()
  const verifiedUsers = allUsers.filter((user) => user.is_verified)

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users and monitor club membership</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/admin/users">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allUsers.length}</div>
              <p className="text-xs text-muted-foreground">All registered members</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedUsers.length}</div>
              <p className="text-xs text-muted-foreground">Active club members</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/pending">
          <Card className="transition-colors hover:border-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unverifiedUsers.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/admin/pending"
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <div>
                <h3 className="font-semibold">Review Pending Users</h3>
                <p className="text-sm text-muted-foreground">
                  {unverifiedUsers.length} user{unverifiedUsers.length !== 1 ? "s" : ""} waiting for verification
                </p>
              </div>
              <UserCheck className="h-5 w-5 text-primary" />
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <div>
                <h3 className="font-semibold">View All Users</h3>
                <p className="text-sm text-muted-foreground">Browse and search all registered members</p>
              </div>
              <Users className="h-5 w-5 text-primary" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
