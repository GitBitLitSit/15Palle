"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import i18n, { getStoredLanguage, normalizeLanguage, setStoredLanguage, type SupportedLanguage } from "@/lib/i18n"
import LanguageSelector from "@/components/LanguageSelector"

export function Navigation() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState<"customer" | "owner" | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [language, setLanguage] = useState<SupportedLanguage>("it")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const sessionMember = sessionStorage.getItem("currentMember")
    const legacyMember = localStorage.getItem("currentMember")
    const memberData = sessionMember ?? legacyMember

    if (!sessionMember && legacyMember) {
      sessionStorage.setItem("currentMember", legacyMember)
      localStorage.removeItem("currentMember")
    }

    if (token) {
      setIsLoggedIn(true)
      setUserType("owner")
    } else if (memberData) {
      setIsLoggedIn(true)
      setUserType("customer")
    } else {
      setIsLoggedIn(false)
      setUserType(null)
    }
  }, [pathname])

  useEffect(() => {
    const stored = getStoredLanguage()
    const initial = stored || normalizeLanguage(i18n.language)
    setLanguage(initial)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    sessionStorage.removeItem("currentMember")
    localStorage.removeItem("currentMember")
    setIsLoggedIn(false)
    setUserType(null)
    router.push("/")
  }

  const handleLanguageChange = (next: SupportedLanguage) => {
    setLanguage(next)
    setStoredLanguage(next)
  }

  const getNavItems = () => {

    if (!isLoggedIn) {
      return [{ href: "/login", label: t("nav.login") }]
    }

    if (userType === "customer") {
      return [{ href: "/customer/profile", label: t("nav.myProfile") }]
    }

    if (userType === "owner") {
      return [{ href: "/owner/dashboard", label: t("nav.dashboard") }]
    }

    return []
  }

  const navItems = getNavItems()

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-lg" : "bg-transparent",
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/logo.webp"
                alt="15 Palle Logo"
                width={60}
                height={60}
                sizes="56px"
                className="h-14 w-14 rounded-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <span className="text-2xl font-bold text-foreground hidden sm:block">
              15 <span className="text-primary">Palle</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-4 md:flex">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant={pathname === item.href ? "default" : "outline"}
                className={cn(
                  "text-sm font-medium px-6",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "border-primary/50 text-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}

            <LanguageSelector
              language={language}
              onLanguageChange={(newLang) => handleLanguageChange(newLang as SupportedLanguage)}
            />
            {isLoggedIn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">{t("nav.toggleMenu")}</span>
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background/98 backdrop-blur-md border-b border-border py-6 px-4 md:hidden">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={pathname === item.href ? "default" : "outline"}
                  className="w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}

              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">{t("nav.language")}</span>
                <LanguageSelector
                  language={language}
                  onLanguageChange={(newLang) => handleLanguageChange(newLang as SupportedLanguage)}
                />
              </div>

              {isLoggedIn && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="gap-2 justify-center"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
