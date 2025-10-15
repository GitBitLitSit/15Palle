import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // After email confirmation, create the user profile in the database
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        first_name: data.user.user_metadata.first_name || "",
        last_name: data.user.user_metadata.last_name || "",
        email: data.user.email || "",
        phone: "",
        address: "",
        date_of_birth: "",
        country: "",
        city: "",
        zip: "",
        cp: "",
        privacy_accepted: true,
        is_verified: false,
      })

      // Ignore duplicate key errors (user already exists)
      if (profileError && !profileError.message.includes("duplicate")) {
        console.error("Profile creation error:", profileError)
      }
    }
  }

  // Redirect to home page after confirmation
  return NextResponse.redirect(new URL("/", requestUrl.origin))
}
