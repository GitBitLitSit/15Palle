"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail, Users, Trophy, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const images = [
    { src: "/professional-billiard-table-in-modern-club.jpg", alt: "Billiard table" },
    { src: "/billiard-club-bar-area-with-drinks.jpg", alt: "Bar area" },
    { src: "/people-playing-billiards-in-club.jpg", alt: "Players" },
    { src: "/billiard-club-lounge-seating-area.jpg", alt: "Lounge area" },
    { src: "/billiard-balls-on-table-close-up.jpg", alt: "Billiard balls" },
    { src: "/billiard-club-interior-atmosphere.jpg", alt: "Club interior" },
  ]

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-primary py-20 text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
              <div className="max-w-2xl text-center lg:text-left">
                <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                  Welcome to <span className="text-secondary">15 Palle</span>
                </h1>
                <p className="mb-8 text-lg leading-relaxed text-primary-foreground/90 md:text-xl">
                  Experience the finest billiard club in town. Professional tables, great atmosphere, and a welcoming
                  community await you.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                  <Button asChild size="lg" variant="secondary" className="text-base">
                    <Link href="/register">Join Our Club</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-primary-foreground text-base text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
                  >
                    <Link href="/opening-times">View Hours</Link>
                  </Button>
                </div>
              </div>
              <div className="relative h-64 w-full max-w-md lg:h-80">
                <Image
                  src="/logo.png"
                  alt="15 Palle Logo"
                  width={400}
                  height={400}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">Why Choose 15 Palle?</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">Professional Tables</h3>
                  <p className="text-muted-foreground">
                    Top-quality billiard tables maintained to professional standards for the best playing experience.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-secondary/20">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">Friendly Community</h3>
                  <p className="text-muted-foreground">
                    Join a welcoming community of billiard enthusiasts. From beginners to pros, everyone is welcome.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-accent/20">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <Clock className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">Extended Hours</h3>
                  <p className="text-muted-foreground">
                    Open late every day of the week. Perfect for after-work games or weekend tournaments.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">Our Club</h2>

            <div className="block lg:hidden">
              <div className="relative mx-auto max-w-lg">
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <img
                    src={images[currentImageIndex].src || "/placeholder.svg"}
                    alt={images[currentImageIndex].alt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-primary/90 p-2 text-primary-foreground shadow-lg transition-all hover:bg-primary"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary/90 p-2 text-primary-foreground shadow-lg transition-all hover:bg-primary"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="mt-4 flex justify-center gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 w-2 rounded-full transition-all ${
                        index === currentImageIndex ? "bg-primary w-8" : "bg-muted-foreground/30"
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden grid-cols-2 gap-4 lg:grid lg:grid-cols-3">
              {images.map((image, index) => (
                <div key={index} className="relative aspect-video overflow-hidden rounded-lg">
                  <img
                    src={image.src || "/placeholder.svg"}
                    alt={image.alt}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">Visit Us</h2>
            <div className="mx-auto max-w-3xl">
              <Card className="border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-4 text-xl font-semibold text-primary">Contact Information</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                          <div>
                            <p className="font-medium">Address</p>
                            <p className="text-sm text-muted-foreground">Via Bruno Buozzi, 12, 39100 Bolzano BZ</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                          <div>
                            <p className="font-medium">Phone</p>
                            <p className="text-sm text-muted-foreground">392 810 0919</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Mail className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                          <div>
                            <p className="font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">sala15palle@yahoo.it</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-4 text-xl font-semibold text-primary">Opening Hours</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">Monday - Saturday</span>
                          <span className="font-medium">2:30 PM - 1:00 AM</span>
                        </div>
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">Sunday</span>
                          <span className="font-medium">2:30 PM - 12:00 AM</span>
                        </div>
                      </div>
                      <Button asChild className="mt-6 w-full" variant="default">
                        <Link href="/opening-times">View Full Schedule</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
