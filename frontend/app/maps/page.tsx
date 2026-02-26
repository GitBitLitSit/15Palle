"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation2, Phone } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "react-i18next"

export default function MapsPage() {
  const { t } = useTranslation()

  const city = t("common.city.bolzano")
  const phoneTel = "+393928100919"
  const mapsQuery = "Circolo sportivo 15 Palle, Via Bruno Buozzi, 12, 39100 Bolzano BZ"
  const mapsHref = "https://maps.app.goo.gl/m9vFp5QStRofnNaJ9"
  const mapsEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`
  const addressLine = `Via Bruno Buozzi, 12, 39100 ${city} BZ`

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 pb-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-black text-foreground">{t("home.contact.title")}</h1>
              <p className="mt-2 text-muted-foreground">{t("home.contact.subtitle", { city })}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card/70 backdrop-blur p-6">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{t("home.contact.addressLabel")}</p>
                    <p className="text-sm text-muted-foreground">{addressLine}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button asChild className="rounded-full">
                    <Link href={mapsHref} target="_blank" rel="noreferrer" className="gap-2">
                      {t("home.contact.directionsCta")}
                      <Navigation2 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={`tel:${phoneTel}`} className="gap-2">
                      {t("home.contact.callCta")}
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-border bg-card">
                <iframe
                  title="15 Palle location"
                  className="h-[420px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapsEmbedSrc}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

