import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user is authenticated (admin check could be added here)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update user verification status
    const { error } = await supabase.from("users").update({ is_verified: true }).eq("id", userId)

    if (error) {
      console.error("Error verifying user:", error)
      return NextResponse.json({ error: "Failed to verify user" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in verify-user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
