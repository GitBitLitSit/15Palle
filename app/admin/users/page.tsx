import { getAllUsers } from "@/lib/supabase/admin"
import { UsersTable } from "@/components/users-table"

export default async function AllUsersPage() {
  const users = await getAllUsers()

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">All Users</h1>
        <p className="text-muted-foreground">View and search all registered members</p>
      </div>

      <UsersTable users={users} showVerificationStatus={true} />
    </div>
  )
}
