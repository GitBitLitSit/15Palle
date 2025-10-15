import { getUnverifiedUsers } from "@/lib/supabase/admin"
import { PendingUsersTable } from "@/components/pending-users-table"

export default async function PendingUsersPage() {
  const users = await getUnverifiedUsers()

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Pending Verification</h1>
        <p className="text-muted-foreground">Review and approve new member registrations</p>
      </div>

      <PendingUsersTable users={users} />
    </div>
  )
}
