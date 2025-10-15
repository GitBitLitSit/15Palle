import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Mail } from "lucide-react"
import Link from "next/link"

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">Registration Successful!</CardTitle>
                <CardDescription>Thank you for joining 15 Palle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-6">
                  <div className="flex items-start gap-4">
                    <Mail className="mt-1 h-6 w-6 flex-shrink-0 text-secondary" />
                    <div>
                      <h3 className="mb-2 text-lg font-semibold">Check Your Email</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        We've sent a confirmation email to your inbox. Please click the link in the email to verify your
                        account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <h4 className="font-semibold text-foreground">What happens next?</h4>
                  <ol className="list-inside list-decimal space-y-2">
                    <li>Verify your email address by clicking the confirmation link</li>
                    <li>Wait for the club owner to approve your registration</li>
                    <li>Once approved, you'll receive a notification and can start using all member benefits</li>
                  </ol>
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4 text-sm">
                  <p className="font-medium text-foreground">Didn't receive the email?</p>
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>Wait a few minutes and check again</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="flex-1">
                    <Link href="/">Return to Homepage</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 bg-transparent">
                    <Link href="/opening-times">View Opening Times</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
