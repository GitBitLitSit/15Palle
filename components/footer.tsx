import { MapPin, Phone, Mail, Clock } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-primary">15 Palle</h3>
            <p className="text-sm text-muted-foreground">
              Your premier billiard club and bar. Experience the perfect combination of sport and entertainment.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Via Bruno Buozzi, 12, 39100 Bolzano BZ</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">392 810 0919</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">sala15palle@yahoo.it</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Opening Hours</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-primary" />
                <div className="text-muted-foreground">
                  <p>Mon-Sat: 2:30 PM - 1:00 AM</p>
                  <p>Sunday: 2:30 PM - 12:00 AM</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <a href="/" className="block text-muted-foreground transition-colors hover:text-primary">
                Home
              </a>
              <a href="/opening-times" className="block text-muted-foreground transition-colors hover:text-primary">
                Opening Times
              </a>
              <a href="/contact" className="block text-muted-foreground transition-colors hover:text-primary">
                Contact
              </a>
              <a href="/register" className="block text-muted-foreground transition-colors hover:text-primary">
                Register
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} 15 Palle. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
