import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary py-20 text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">Get in Touch</h1>
              <p className="text-lg leading-relaxed text-primary-foreground/90 md:text-xl">
                Have questions or want to book a table? We'd love to hear from you. Reach out and let's connect.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form & Info Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
              <Card className="border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <h2 className="mb-6 text-2xl font-bold text-primary">Send us a Message</h2>
                  <form className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">
                          First Name
                        </Label>
                        <Input id="firstName" placeholder="John" required className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium">
                          Last Name
                        </Label>
                        <Input id="lastName" placeholder="Doe" required className="h-11" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email
                      </Label>
                      <Input id="email" type="email" placeholder="john@example.com" required className="h-11" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone (Optional)
                      </Label>
                      <Input id="phone" type="tel" placeholder="+39 06 1234 5678" className="h-11" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us how we can help you..."
                        className="min-h-32 resize-none"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full h-11" size="lg">
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <div className="space-y-6 md:space-y-8">
                <Card className="border-primary/20">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="mb-6 text-2xl font-bold text-primary">Contact Information</h2>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold">Address</h3>
                          <p className="text-sm text-muted-foreground">
                            Via Bruno Buozzi, 12
                            <br />
                            39100 Bolzano BZ
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold">Phone</h3>
                          <p className="text-sm text-muted-foreground">392 810 0919</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold">Email</h3>
                          <p className="text-sm text-muted-foreground">sala15palle@yahoo.it</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold">Opening Hours</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Monday - Saturday: 2:30 PM - 1:00 AM</p>
                            <p>Sunday: 2:30 PM - 12:00 AM</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20 bg-secondary/5">
                  <CardContent className="p-6 md:p-8">
                    <h3 className="mb-3 text-lg font-semibold text-secondary">Visit Our Club</h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      Drop by anytime during our opening hours. No appointment needed for casual play. For group
                      bookings or events, please contact us in advance.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full h-11 bg-transparent border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                    >
                      <a href="https://www.google.com/maps/place/Billardclub+%2215+Palle%22/@46.4738883,11.3221534,822m/data=!3m2!1e3!4b1!4m6!3m5!1s0x47829c48eb419955:0x61657b0814acdd84!8m2!3d46.4738883!4d11.3247337!16s%2Fg%2F11cn945qnv?entry=ttu&g_ep=EgoyMDI1MTAxNC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer">
                        View on Map
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-12 text-center text-3xl font-bold">Frequently Asked Questions</h2>
              <div className="space-y-4 md:space-y-6">
                <Card className="border-primary/20">
                  <CardContent className="p-6">
                    <h3 className="mb-2 font-semibold text-primary">Do I need to book in advance?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Walk-ins are welcome! However, we recommend booking for groups of 4+ or during peak hours
                      (Friday-Saturday evenings) to guarantee table availability.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20">
                  <CardContent className="p-6">
                    <h3 className="mb-2 font-semibold text-secondary">What are your rates?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Our hourly rates vary by time and day. Contact us for current pricing or visit during our opening
                      hours. Members enjoy special discounted rates.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-accent/20">
                  <CardContent className="p-6">
                    <h3 className="mb-2 font-semibold text-accent">Can I host a private event?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We offer private bookings for birthdays, corporate events, and tournaments. Get in touch to
                      discuss your requirements and we'll create a custom package for you.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
