import { createClient } from "@/lib/supabase/server"

/**
 * Get all users from the database
 * This uses the authenticated user's session, so make sure the user is an admin
 */
export async function getAllUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  return data
}

/**
 * Get all unverified users from the database
 */
export async function getUnverifiedUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("is_verified", false)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching unverified users:", error)
    return []
  }

  return data
}

/**
 * Verify a user by their ID
 */
export async function verifyUser(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("users").update({ is_verified: true }).eq("id", userId)

  if (error) {
    console.error("Error verifying user:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
