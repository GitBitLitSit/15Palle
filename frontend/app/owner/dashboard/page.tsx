"use client"

import { useEffect, useState, useCallback, useRef, SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getMembers,
  createMember,
  resetQrCode,
  getCheckIns,
  updateMember,
  deleteMember,
  checkExistingUsers,
  bulkCreateUsers,
} from "@/lib/api"
import { useRealtimeCheckIns } from "@/hooks/use-realtime"
import type { Member, CheckInEvent } from "@/lib/types"
import {
  Users,
  Upload,
  Eye,
  RotateCcw,
  Printer,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Pencil,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { escapeHtml } from "@/lib/utils"
import * as XLSX from "xlsx"
import { Spinner } from "@/components/ui/spinner"

// Client-side expiry checks are for UX only; backend enforces auth.
function getTokenExpiryMs(token: string): number | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    if (typeof payload.exp === "number") {
      return payload.exp * 1000
    }
  } catch {
    return null
  }
  return null
}

type CheckInWarningCode = "INVALID_QR" | "MEMBER_BLOCKED"

function resolveWarningCode(checkIn: CheckInEvent): CheckInWarningCode | null {
  const explicitCode = (checkIn.warningCode || "").toUpperCase()
  if (explicitCode === "INVALID_QR" || explicitCode === "MEMBER_BLOCKED") {
    return explicitCode
  }

  const warningText = (checkIn.warning || "").trim().toLowerCase()
  if (!warningText) return null

  if (warningText.includes("invalid qr") || warningText.includes("member not found")) {
    return "INVALID_QR"
  }
  if (warningText.includes("member is blocked") || warningText.includes("member blocked")) {
    return "MEMBER_BLOCKED"
  }
  return null
}

function resolveCheckInDate(checkIn: CheckInEvent): Date | null {
  const rawTimestamp = checkIn.timestamp || checkIn.checkInTime
  if (!rawTimestamp) return null

  const parsed = new Date(rawTimestamp)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function isUnauthorized(error: unknown): boolean {
  const err = error as Error & { status?: number }
  return err?.status === 401
}

export default function OwnerDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, i18n } = useTranslation()

  const redirectToOwnerLogin = useCallback(() => {
    localStorage.removeItem("token")
    router.replace("/admin")
  }, [router])

  // Auth check + token expiry redirect
  useEffect(() => {
    if (typeof window === "undefined") return
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/admin")
      return
    }

    const expiresAt = getTokenExpiryMs(token)
    if (!expiresAt) {
      localStorage.removeItem("token")
      router.replace("/admin")
      return
    }

    const now = Date.now()
    if (expiresAt <= now) {
      localStorage.removeItem("token")
      router.replace("/admin")
      return
    }

    const timeoutId = window.setTimeout(() => {
      localStorage.removeItem("token")
      router.replace("/admin")
    }, expiresAt - now)

    return () => window.clearTimeout(timeoutId)
  }, [router])

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState("members")

  // --- MEMBERS STATE ---
  const [searchQuery, setSearchQuery] = useState("")
  const [blockedFilter, setBlockedFilter] = useState<"all" | "blocked" | "active">("all")
  const [membersPage, setMembersPage] = useState(1)
  const [membersData, setMembersData] = useState<Member[]>([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [totalMembersPages, setTotalMembersPages] = useState(0)
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const membersPageSize = 20

  // --- CHECK-INS STATE ---
  const [checkInsData, setCheckInsData] = useState<CheckInEvent[]>([])
  const [checkInsPage, setCheckInsPage] = useState(1)
  const [totalCheckIns, setTotalCheckIns] = useState(0)
  const [totalCheckInsPages, setTotalCheckInsPages] = useState(0)
  const [isCheckInsLoading, setIsCheckInsLoading] = useState(false)
  const [unreadCheckInsCount, setUnreadCheckInsCount] = useState(0)
  const checkInsPageSize = 20

  // --- REFS ---
  const activeTabRef = useRef(activeTab)
  const checkInsPageRef = useRef(checkInsPage)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const playFeedbackSound = useCallback((variant: "positive" | "negative") => {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext()
    }
    const audioContext = audioContextRef.current

    const playSequence = () => {
      const startAt = audioContext.currentTime + 0.01
      const scheduleTone = (
        frequency: number,
        duration: number,
        offset: number,
        oscillatorType: OscillatorType,
        peakGain: number,
        endFrequency?: number,
      ) => {
        const oscillator = audioContext.createOscillator()
        const filterNode = audioContext.createBiquadFilter()
        const gainNode = audioContext.createGain()

        const toneStart = startAt + offset
        oscillator.type = oscillatorType
        oscillator.frequency.setValueAtTime(frequency, toneStart)
        if (typeof endFrequency === "number") {
          oscillator.frequency.linearRampToValueAtTime(endFrequency, toneStart + duration)
        }
        filterNode.type = "lowpass"
        filterNode.frequency.setValueAtTime(2800, toneStart)
        filterNode.Q.setValueAtTime(0.7, toneStart)
        gainNode.gain.setValueAtTime(0.0001, toneStart)
        gainNode.gain.exponentialRampToValueAtTime(peakGain, toneStart + 0.03)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, toneStart + duration)

        oscillator.connect(filterNode)
        filterNode.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.start(toneStart)
        oscillator.stop(toneStart + duration + 0.02)
      }

      if (variant === "positive") {
        // Soft ascending major chord (pleasant "success" chime).
        scheduleTone(523.25, 0.26, 0, "sine", 0.19) // C5
        scheduleTone(659.25, 0.3, 0.12, "sine", 0.18) // E5
        scheduleTone(783.99, 0.34, 0.24, "triangle", 0.16) // G5
        return
      }

      // Gentle descending tones for invalid scans (clear but less harsh).
      scheduleTone(392, 0.28, 0, "sine", 0.2, 369.99) // G4 -> F#4
      scheduleTone(311.13, 0.34, 0.2, "triangle", 0.18, 293.66) // Eb4 -> D4
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume().then(playSequence).catch(() => undefined)
      return
    }
    playSequence()
  }, [])

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined)
        audioContextRef.current = null
      }
    }
  }, [])

  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  useEffect(() => { checkInsPageRef.current = checkInsPage }, [checkInsPage])

  const getLocalizedWarningMessage = useCallback(
    (checkIn: CheckInEvent): string | null => {
      const warningCode = resolveWarningCode(checkIn)
      if (!warningCode) return checkIn.warning || null

      if (warningCode === "INVALID_QR") {
        return t("dashboard.checkins.warnings.invalidQr")
      }
      if (warningCode === "MEMBER_BLOCKED") {
        return t("dashboard.checkins.warnings.memberBlocked")
      }
      return null
    },
    [t],
  )

  // --- DIALOGS & FORMS ---
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
  
  // Create State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newMemberForm, setNewMemberForm] = useState({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    sendEmail: true
  })
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Import State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importStep, setImportStep] = useState<"idle" | "parsing" | "checking" | "review" | "creating" | "done">("idle")
  const [importSummary, setImportSummary] = useState<{ created: number; invalid: number; duplicates: number } | null>(null)
  const [importCounts, setImportCounts] = useState<{ invalid: number; duplicates: number } | null>(null)
  const [importPreviewRows, setImportPreviewRows] = useState<Array<{ firstName: string; lastName: string; email: string; sendEmail: boolean }>>([])
  const [importPreviewPage, setImportPreviewPage] = useState(1)
  const importPreviewPageSize = 12
  const [importError, setImportError] = useState<string | null>(null)
  
  // Edit State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editMemberForm, setEditMemberForm] = useState({ 
    id: "", 
    firstName: "", 
    lastName: "", 
    email: "", 
    blocked: false,
    sendEmail: true
  })

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reset QR State
  const [resetQrDialogOpen, setResetQrDialogOpen] = useState(false)
  const [memberToReset, setMemberToReset] = useState<Member | null>(null)
  const [isResettingQr, setIsResettingQr] = useState(false)

  const [stats, setStats] = useState({ total: 0, blocked: 0, active: 0 })
  const LEGACY_IMPORT_STORAGE_KEY = "importPreviewState"

  // --- CLEANUP EFFECT ---
  useEffect(() => {
    if (!createDialogOpen) {
      setCreateError(null)
      setNewMemberForm({ firstName: "", lastName: "", email: "", sendEmail: true })
    }
  }, [createDialogOpen])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(LEGACY_IMPORT_STORAGE_KEY)
  }, [])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(importPreviewRows.length / importPreviewPageSize))
    setImportPreviewPage((page) => Math.min(page, totalPages))
  }, [importPreviewRows.length, importPreviewPageSize])

  // --- WEBSOCKET HANDLER ---
  const handleNewCheckIn = useCallback((event: CheckInEvent) => {
    const warningCode = resolveWarningCode(event)
    const localizedWarning = getLocalizedWarningMessage(event)
    const isAccessDenied = warningCode === "INVALID_QR" || warningCode === "MEMBER_BLOCKED"

    if (isAccessDenied) {
      playFeedbackSound("negative")
    } else {
      playFeedbackSound("positive")
    }

    setCheckInsData((prev) => {
      if (checkInsPageRef.current === 1) {
        const newList = [event, ...prev]
        if (newList.length > checkInsPageSize) return newList.slice(0, checkInsPageSize)
        return newList
      }
      return prev
    })

    if (activeTabRef.current !== "checkins") {
      setUnreadCheckInsCount((prev) => prev + 1)
      const memberName = event.member
        ? `${event.member.firstName} ${event.member.lastName}`
        : t("dashboard.checkins.unknownMember")
      const description = isAccessDenied
        ? (localizedWarning || t("dashboard.checkins.warnings.invalidQr"))
        : t("dashboard.realtime.memberCheckedIn", {
            firstName: event.member?.firstName || t("dashboard.checkins.unknownMember"),
            lastName: event.member?.lastName || "",
          })
      toast({
        title: isAccessDenied
          ? t("dashboard.realtime.accessDenied")
          : t("dashboard.realtime.newCheckin"),
        description,
        variant: isAccessDenied ? "destructive" : "default",
      })
    }
  }, [getLocalizedWarningMessage, playFeedbackSound, t, toast])

  const { isConnected, error: wsError } = useRealtimeCheckIns(handleNewCheckIn)

  // --- LOAD MEMBERS ---
  const loadMembers = async () => {
    setIsMembersLoading(true)
    try {
      const blocked = blockedFilter === "blocked" ? true : blockedFilter === "active" ? false : undefined
      const result = await getMembers(membersPage, searchQuery, blocked || false, membersPageSize.toString())

      setMembersData(result.data || [])
      setTotalMembers(result.pagination?.total || 0)
      setTotalMembersPages(result.pagination?.totalPages || 1)
      
      const allData = result.data || []
      setStats({
          total: result.pagination?.total || 0,
          blocked: allData.filter((m: Member) => m.blocked).length,
          active: allData.filter((m: Member) => !m.blocked).length,
      })

    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      console.error(error)
      toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedLoadMembers"), variant: "destructive" })
    } finally {
      setIsMembersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "members") {
      loadMembers()
    }
  }, [searchQuery, blockedFilter, membersPage, activeTab])

  // --- LOAD CHECK-INS ---
  const loadCheckIns = async () => {
    setIsCheckInsLoading(true)
    try {
      const result = await getCheckIns(checkInsPage, checkInsPageSize)
      setCheckInsData(result.data || [])
      setTotalCheckIns(result.pagination?.total || 0)
      setTotalCheckInsPages(result.pagination?.totalPages || 1)
    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      console.error(error)
      toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedLoadCheckins"), variant: "destructive" })
    } finally {
      setIsCheckInsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "checkins") {
      setUnreadCheckInsCount(0)
      loadCheckIns()
    }
  }, [checkInsPage, activeTab])


  // --- ACTION HANDLERS ---
  const handleSignOut = () => {
    localStorage.removeItem("token")
    localStorage.removeItem(LEGACY_IMPORT_STORAGE_KEY)
    router.push("/")
  }

  const handleCreateMember = async () => {
    setCreateError(null)

    if (!newMemberForm.firstName || !newMemberForm.lastName || !newMemberForm.email) {
      setCreateError(t("dashboard.toasts.allFieldsRequired"))
      return
    }

    setIsCreating(true)
    try {
      await createMember(newMemberForm)
      toast({ title: t("dashboard.toasts.memberCreatedTitle"), description: t("dashboard.toasts.memberCreatedDesc") })
      setCreateDialogOpen(false)
      setMembersPage(1)
      loadMembers()
    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      const errorMessage = error instanceof Error ? error.message : t("dashboard.toasts.failedCreateMember")
      setCreateError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditClick = (member: Member) => {
    setEditMemberForm({
      id: member._id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      blocked: member.blocked || false,
      sendEmail: true
    })
    setEditDialogOpen(true)
  }

  const handleUpdateMember = async () => {
     if (!editMemberForm.firstName || !editMemberForm.lastName || !editMemberForm.email) {
      toast({ title: t("dashboard.toasts.validationErrorTitle"), description: t("dashboard.toasts.allFieldsRequired"), variant: "destructive" })
      return
    }
    setIsUpdating(true)
    try {
      await updateMember(editMemberForm.id, {
        firstName: editMemberForm.firstName,
        lastName: editMemberForm.lastName,
        email: editMemberForm.email,
        blocked: editMemberForm.blocked,
        sendEmail: editMemberForm.sendEmail
      })
      toast({ title: t("dashboard.toasts.memberUpdatedTitle"), description: t("dashboard.toasts.memberUpdatedDesc") })
      setEditDialogOpen(false)
      loadMembers()
    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedUpdateMember"), variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteClick = (member: Member) => {
    setMemberToDelete(member)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return

    setIsDeleting(true)
    try {
      await deleteMember(memberToDelete._id)
      toast({ title: t("dashboard.toasts.memberDeletedTitle"), description: t("dashboard.toasts.memberDeletedDesc", { name: memberToDelete.firstName }) })
      setDeleteDialogOpen(false)
      setMemberToDelete(null)
      loadMembers()
    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedDeleteMember"), variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResetQrClick = (member: Member) => {
    setMemberToReset(member)
    setResetQrDialogOpen(true)
  }

  const handleResetQrConfirm = async () => {
    if (!memberToReset) return
    setIsResettingQr(true)
    try {
      await resetQrCode(memberToReset._id)
      toast({ title: t("dashboard.toasts.qrResetTitle"), description: t("dashboard.toasts.qrResetDesc") })
      loadMembers()
      if (selectedMember && selectedMember._id === memberToReset._id) {
        setDetailsDrawerOpen(false)
      }
      setResetQrDialogOpen(false)
      setMemberToReset(null)
    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedResetQr"), variant: "destructive" })
    } finally {
      setIsResettingQr(false)
    }
  }

  function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }

  async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += limit) {
      const batch = items.slice(i, i + limit)
      await Promise.all(batch.map((item) => worker(item)))
    }
  }

  const handleImportFileChange = (file: File | null) => {
    setImportFile(file)
    setImportFileName(file?.name ?? null)
    setImportStep("idle")
    setImportSummary(null)
    setImportCounts(null)
    setImportPreviewRows([])
    setImportPreviewPage(1)
    setImportError(null)
  }

  const handleSendEmailAllToggle = (checked: boolean) => {
    setImportPreviewRows((prev) => prev.map((row) => ({ ...row, sendEmail: checked })))
  }

  const updatePreviewRow = (index: number, updates: Partial<{ firstName: string; lastName: string; sendEmail: boolean }>) => {
    setImportPreviewRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)))
  }

  const removePreviewRow = (index: number) => {
    setImportPreviewRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirmCreate = async () => {
    if (isImporting || importPreviewRows.length === 0) return
    setIsImporting(true)
    setImportStep("creating")
    setImportError(null)
    try {
      const chunkSize = 500
      const concurrency = 3
      let created = 0
      let duplicates = importCounts?.duplicates ?? 0

      const createChunks = chunkArray(importPreviewRows, chunkSize)
      await runWithConcurrency(createChunks, concurrency, async (chunk) => {
        const bulkResult = await bulkCreateUsers(chunk)
        const inserted = typeof bulkResult?.inserted === "number" ? bulkResult.inserted : chunk.length
        created += inserted
        if (typeof bulkResult?.duplicates === "number") {
          duplicates += bulkResult.duplicates
        }
      })

      setImportSummary({
        created,
        invalid: importCounts?.invalid ?? 0,
        duplicates,
      })
      setImportStep("done")
      setImportPreviewRows([])

      if (created > 0) {
        setMembersPage(1)
        loadMembers()
      }

      toast({
        title: t("dashboard.toasts.importCompleteTitle"),
        description: t("dashboard.toasts.importCompleteDesc", { created }),
      })
    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      setImportError(t("dashboard.toasts.failedImport"))
      setImportStep("review")
      toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedImport"), variant: "destructive" })
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportExcel = async () => {
    if (!importFile || isImporting) return
    setIsImporting(true)
    setImportError(null)
    setImportSummary(null)
    setImportCounts(null)
    setImportStep("parsing")
    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        throw new Error("Missing worksheet")
      }

      const worksheet = workbook.Sheets[sheetName]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" })

      // Normalize headers and extract firstName/lastName/email.
      const normalizedRows = rawRows.map((row) => {
        const normalized: Record<string, string> = {}
        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = String(key).trim().toLowerCase().replace(/[\s_]+/g, "")
          normalized[normalizedKey] = String(value ?? "").trim()
        })

        return {
          firstName: normalized.firstname || "",
          lastName: normalized.lastname || "",
          email: (normalized.email || "").toLowerCase(),
        }
      })

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const validRows = normalizedRows.filter(
        (row) => row.firstName && row.lastName && row.email && emailPattern.test(row.email),
      )
      const invalidRows = Math.max(normalizedRows.length - validRows.length, 0)

      const uniqueByEmail = new Map<string, { firstName: string; lastName: string; email: string }>()
      validRows.forEach((row) => {
        uniqueByEmail.set(row.email, row)
      })
      const uniqueRows = Array.from(uniqueByEmail.values())
      const duplicateRows = Math.max(validRows.length - uniqueRows.length, 0)

      if (uniqueRows.length === 0) {
        setImportSummary({ created: 0, invalid: invalidRows, duplicates: duplicateRows })
        setImportStep("done")
        setImportCounts({ invalid: invalidRows, duplicates: duplicateRows })
        toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedImport"), variant: "destructive" })
        return
      }

      // Step A: ask backend which emails already exist (chunked to avoid 413).
      const chunkSize = 500
      const concurrency = 3
      setImportStep("checking")
      const existingSet = new Set<string>()
      const emailChunks = chunkArray(uniqueRows.map((row) => row.email), chunkSize)
      await runWithConcurrency(emailChunks, concurrency, async (chunk) => {
        const existingResponse = await checkExistingUsers(chunk)
        if (Array.isArray(existingResponse?.existingEmails)) {
          existingResponse.existingEmails.forEach((email: string) => {
            existingSet.add(String(email).toLowerCase())
          })
        }
      })

      // Step B: client-side set difference to keep only new users.
      const newUsers = uniqueRows.filter((row) => !existingSet.has(row.email))

      setImportCounts({ invalid: invalidRows, duplicates: duplicateRows })

      if (newUsers.length === 0) {
        setImportSummary({ created: 0, invalid: invalidRows, duplicates: duplicateRows })
        setImportStep("done")
        toast({
          title: t("dashboard.toasts.importCompleteTitle"),
          description: t("dashboard.toasts.importCompleteDesc", { created: 0 }),
        })
        return
      }

      setImportPreviewRows(newUsers.map((row) => ({ ...row, sendEmail: true })))
      setImportPreviewPage(1)
      setImportStep("review")
    } catch (error) {
      if (isUnauthorized(error)) {
        redirectToOwnerLogin()
        return
      }
      setImportError(t("dashboard.toasts.failedImport"))
      setImportStep("idle")
      toast({ title: t("dashboard.toasts.errorTitle"), description: t("dashboard.toasts.failedImport"), variant: "destructive" })
    } finally {
      setIsImporting(false)
    }
  }

  const handleViewMember = (member: Member) => { setSelectedMember(member); setDetailsDrawerOpen(true) }
  
  const handlePrintQR = (member: Member) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(member.qrUuid)}`
    const safeName = `${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)}`.trim()
    const safeEmail = escapeHtml(member.email)
    const safeId = escapeHtml(member._id)

    // We use translation keys even inside the HTML template
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${safeName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; background: white; }
            .container { text-align: center; max-width: 400px; }
            .logo { margin-bottom: 20px; }
            h1 { color: #2f699f; margin: 0 0 10px 0; font-size: 24px; }
            .subtitle { color: #666; margin: 0 0 30px 0; font-size: 14px; }
            .qr-code { margin: 30px 0; padding: 20px; background: white; border: 2px solid #2f699f; border-radius: 12px; display: inline-block; }
            .qr-code img { display: block; width: 300px; height: 300px; }
            .member-info { margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: left; }
            .info-row { margin: 10px 0; font-size: 14px; }
            .info-label { font-weight: 600; color: #2f699f; display: inline-block; width: 100px; }
            .info-value { color: #333; }
            @media print { body { padding: 0; } .container { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>15 Palle</h1>
            <p class="subtitle">Associazione Sportiva</p>
            <div class="qr-code"><img src="${qrCodeUrl}" alt="QR Code" /></div>
            <div class="member-info">
              <div class="info-row"><span class="info-label">${t("dashboard.dialogs.nameLabel")}</span><span class="info-value">${safeName}</span></div>
              <div class="info-row"><span class="info-label">${t("dashboard.dialogs.emailLabel")}</span><span class="info-value">${safeEmail}</span></div>
              <div class="info-row"><span class="info-label">${t("dashboard.dialogs.idLabel")}</span><span class="info-value">${safeId}</span></div>
            </div>
          </div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const sendEmailAllState =
    importPreviewRows.length === 0
      ? false
      : importPreviewRows.every((row) => row.sendEmail)
        ? true
        : importPreviewRows.some((row) => row.sendEmail)
          ? "indeterminate"
          : false

  const totalPreviewPages = Math.max(1, Math.ceil(importPreviewRows.length / importPreviewPageSize))
  const previewPage = Math.min(importPreviewPage, totalPreviewPages)
  const previewStart = (previewPage - 1) * importPreviewPageSize
  const previewEnd = Math.min(previewStart + importPreviewPageSize, importPreviewRows.length)
  const previewRows = importPreviewRows.slice(previewStart, previewEnd)
  const resetMemberName = memberToReset ? `${memberToReset.firstName} ${memberToReset.lastName}` : ""

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{t("dashboard.title")}</h1>
              <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
              {wsError && (
                <p className="text-sm text-destructive mt-1">
                  {t("dashboard.websocketPrefix")}{" "}
                  {t(`dashboard.realtimeErrors.${wsError}`, { defaultValue: wsError })}
                </p>
              )}
              {isConnected && <p className="text-sm text-green-600 mt-1">{t("dashboard.realtimeConnected")}</p>}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">{t("dashboard.stats.totalMembers")}</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">{t("dashboard.stats.active")}</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                    {membersData.filter(m => !m.blocked).length}
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">{t("dashboard.stats.blocked")}</CardTitle>
                <Users className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                    {membersData.filter(m => m.blocked).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/50 p-2 shadow-sm">
              <TabsTrigger
                value="members"
                className="h-10 rounded-lg text-sm font-semibold text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {t("dashboard.tabs.members")}
              </TabsTrigger>
              <TabsTrigger
                value="checkins"
                className="h-10 rounded-lg text-sm font-semibold text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {t("dashboard.tabs.checkins")}
                {unreadCheckInsCount > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">{unreadCheckInsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="h-10 rounded-lg text-sm font-semibold text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {t("dashboard.tabs.import")}
              </TabsTrigger>
            </TabsList>

            {/* --- MEMBERS TAB --- */}
            <TabsContent value="members" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>{t("dashboard.members.title")}</CardTitle>
                      <CardDescription>{t("dashboard.members.description")}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button onClick={() => setCreateDialogOpen(true)} size="sm">
                        <UserPlus className="mr-2 h-4 w-4" /> {t("dashboard.members.addMember")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Filters */}
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="search">{t("dashboard.members.searchLabel")}</Label>
                        <Input
                          id="search"
                          placeholder={t("dashboard.members.searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setMembersPage(1) }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">{t("dashboard.members.statusLabel")}</Label>
                        <select
                          id="status"
                          value={blockedFilter}
                          onChange={(e) => { setBlockedFilter(e.target.value as SetStateAction<"all" | "blocked" | "active">); setMembersPage(1) }}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="all">{t("dashboard.members.statusAll")}</option>
                          <option value="active">{t("dashboard.members.statusActive")}</option>
                          <option value="blocked">{t("dashboard.members.statusBlocked")}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Members Table */}
                  {isMembersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-muted-foreground">{t("dashboard.members.loading")}</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("dashboard.members.table.name")}</TableHead>
                            <TableHead className="hidden sm:table-cell">{t("dashboard.members.table.email")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("dashboard.members.table.created")}</TableHead>
                            <TableHead>{t("dashboard.members.table.status")}</TableHead>
                            <TableHead className="text-right">{t("dashboard.members.table.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {membersData.map((member) => (
                            <TableRow key={member._id}>
                              <TableCell className="font-medium">{member.firstName} {member.lastName}</TableCell>
                              <TableCell className="hidden sm:table-cell">{member.email}</TableCell>
                              <TableCell className="hidden md:table-cell">{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {member.blocked ? (
                                    <Badge variant="destructive">{t("dashboard.members.statusBadges.blocked")}</Badge>
                                ) : member.emailValid ? (
                                    <Badge className="bg-green-600 hover:bg-green-700">{t("dashboard.members.statusBadges.active")}</Badge>
                                ) : (
                                    <Badge variant="secondary">{t("dashboard.members.statusBadges.pending")}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleViewMember(member)} title={t("dashboard.dialogs.detailsTitle")}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handlePrintQR(member)} title={t("dashboard.dialogs.printQr")}>
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleResetQrClick(member)} title={t("dashboard.dialogs.resetQr")}>
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(member)} title={t("dashboard.dialogs.editTitle")}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(member)} title={t("dashboard.dialogs.deleteTitle")}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {membersData.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("dashboard.members.noMembers")}</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalMembersPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.members.pagination", { page: membersPage, totalPages: totalMembersPages, total: totalMembers })}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setMembersPage(p => Math.max(1, p - 1))} disabled={membersPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMembersPage(p => Math.min(totalMembersPages, p + 1))} disabled={membersPage === totalMembersPages}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- CHECK-INS TAB --- */}
            <TabsContent value="checkins" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t("dashboard.checkins.title")}</CardTitle>
                    <CardDescription>{t("dashboard.checkins.description")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {isCheckInsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-muted-foreground">{t("dashboard.checkins.loading")}</div>
                    </div>
                  ) : checkInsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t("dashboard.checkins.none")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {checkInsData.map((checkIn: CheckInEvent, index) => {
                        const warningMessage = getLocalizedWarningMessage(checkIn)
                        const hasWarning = Boolean(warningMessage)
                        const checkInDate = resolveCheckInDate(checkIn)
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                              hasWarning 
                                ? "border-destructive/50 bg-destructive/15" 
                                : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm ${
                                  hasWarning ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                                }`}>
                                {hasWarning ? <AlertCircle className="h-5 w-5" /> : "✓"}
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {checkIn.member ? `${checkIn.member.firstName} ${checkIn.member.lastName}` : t("dashboard.checkins.unknownMember")}
                                </p>
                                <p className={`text-sm ${hasWarning ? "text-foreground/80" : "text-muted-foreground"}`}>
                                  {checkIn.member?.email || t("dashboard.checkins.noEmail")}
                                </p>
                                {hasWarning && (
                                  <p className="text-sm text-destructive font-medium mt-1 flex items-center gap-1">
                                    {warningMessage}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {checkInDate
                                  ? checkInDate.toLocaleTimeString(i18n.language || undefined, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })
                                  : "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {checkInDate
                                  ? checkInDate.toLocaleDateString(i18n.language || undefined)
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Check-ins Pagination */}
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                       {t("dashboard.checkins.pagination", { page: checkInsPage, totalPages: totalCheckInsPages, total: totalCheckIns })}
                    </p>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCheckInsPage(p => Math.max(1, p - 1))} 
                            disabled={checkInsPage === 1 || isCheckInsLoading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCheckInsPage(p => Math.min(totalCheckInsPages, p + 1))} 
                            disabled={checkInsPage === totalCheckInsPages || isCheckInsLoading}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- IMPORT TAB --- */}
            <TabsContent value="import" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.dialogs.importTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.dialogs.importDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="import-file">{t("dashboard.dialogs.importFileLabel")}</Label>
                      <div className="rounded-lg border border-dashed border-border/70 bg-card/60 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <Upload className="mt-0.5 h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{t("dashboard.dialogs.importDropHint")}</p>
                            <p className="text-xs text-muted-foreground">{t("dashboard.dialogs.importFileTypes")}</p>
                          </div>
                        </div>
                        <input
                          ref={importInputRef}
                          id="import-file"
                          type="file"
                          accept=".xlsx,.xls"
                          className="sr-only"
                          onChange={(e) => handleImportFileChange(e.target.files?.[0] || null)}
                        />
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => importInputRef.current?.click()}
                            disabled={isImporting}
                          >
                            {t("dashboard.dialogs.importChooseFile")}
                          </Button>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{importFile?.name || importFileName || t("dashboard.dialogs.importNoFile")}</span>
                            {importFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleImportFileChange(null)}
                                disabled={isImporting}
                                className="text-destructive/90 hover:text-destructive hover:bg-destructive/10"
                              >
                                {t("dashboard.dialogs.importRemoveFile")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {importError && (
                      <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {importError}
                      </div>
                    )}

                    {(importStep !== "idle" || importSummary) && (
                      <div className="space-y-3 rounded-md border bg-card/60 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {importStep === "done" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Spinner className="text-primary" />
                          )}
                          <span>
                            {importStep === "done"
                              ? t("dashboard.dialogs.importDone")
                              : importStep === "review"
                                ? t("dashboard.dialogs.importReview")
                                : t("dashboard.dialogs.importInProgress")}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(["parsing", "checking", "review", "creating"] as const).map((step, index) => {
                            const stepOrder = ["parsing", "checking", "review", "creating"] as const
                            const activeIndex = stepOrder.indexOf(importStep as (typeof stepOrder)[number])
                            const isDone = importStep === "done" || (activeIndex !== -1 && index < activeIndex)
                            const isActive = activeIndex !== -1 && index === activeIndex

                            return (
                              <div key={step} className="flex items-center gap-2 text-sm">
                                {isDone ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : isActive ? (
                                  <Spinner className="h-4 w-4 text-primary" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                                )}
                                <span className={isDone || isActive ? "text-foreground" : "text-muted-foreground"}>
                                  {t(`dashboard.importSteps.${step}`)}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {importSummary && (
                          <div className="rounded-md bg-background p-3 text-xs text-muted-foreground">
                            <p className="text-sm font-medium text-foreground">{t("dashboard.dialogs.importResultsTitle")}</p>
                            <ul className="mt-2 space-y-1">
                              <li>{t("dashboard.dialogs.importCreated", { count: importSummary.created })}</li>
                              <li>{t("dashboard.dialogs.importInvalid", { count: importSummary.invalid })}</li>
                              {importSummary.duplicates > 0 && (
                                <li>{t("dashboard.dialogs.importDuplicates", { count: importSummary.duplicates })}</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {importStep === "review" && (
                      <div className="space-y-4 rounded-md border bg-card/60 p-4 shadow-sm">
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">
                            {t("dashboard.dialogs.importNewMembers", { count: importPreviewRows.length })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("dashboard.dialogs.importInvalid", { count: importCounts?.invalid ?? 0 })}
                            {importCounts && importCounts.duplicates > 0 ? ` · ${t("dashboard.dialogs.importDuplicates", { count: importCounts.duplicates })}` : ""}
                          </p>
                        </div>

                        <div className="rounded-md border bg-background">
                          <Table className="min-w-[980px]">
                            <TableHeader>
                              <TableRow className="bg-muted/40">
                                <TableHead className="w-[44px] text-center" />
                                <TableHead className="w-[240px]">{t("dashboard.dialogs.firstName")}</TableHead>
                                <TableHead className="w-[240px]">{t("dashboard.dialogs.lastName")}</TableHead>
                                <TableHead className="w-[360px]">{t("dashboard.dialogs.email")}</TableHead>
                                <TableHead className="w-[220px] text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-medium">{t("dashboard.dialogs.sendEmailWithQr")}</span>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id="send-email-all"
                                        checked={sendEmailAllState}
                                        onCheckedChange={(checked) => handleSendEmailAllToggle(checked === true)}
                                        className="size-5 border-muted-foreground/70 bg-background/80 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                      />
                                      <span className="text-[11px] text-muted-foreground">
                                        {t("dashboard.dialogs.importSendEmailAll")}
                                      </span>
                                    </div>
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importPreviewRows.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                                    {t("dashboard.dialogs.importEmpty")}
                                  </TableCell>
                                </TableRow>
                              ) : (
                                previewRows.map((row, index) => (
                                  <TableRow key={`${row.email}-${previewStart + index}`} className="odd:bg-muted/10">
                                    <TableCell className="text-center">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removePreviewRow(previewStart + index)}
                                        className="text-destructive/90 hover:text-destructive hover:bg-destructive/10"
                                        title={t("dashboard.dialogs.remove")}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={row.firstName}
                                        onChange={(e) => updatePreviewRow(previewStart + index, { firstName: e.target.value })}
                                        className="h-9 min-w-[200px] bg-background/80"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={row.lastName}
                                        onChange={(e) => updatePreviewRow(previewStart + index, { lastName: e.target.value })}
                                        className="h-9 min-w-[200px] bg-background/80"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm text-muted-foreground" title={row.email}>
                                        {row.email}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={row.sendEmail}
                                        onCheckedChange={(checked) => updatePreviewRow(previewStart + index, { sendEmail: checked === true })}
                                        className="size-5 border-muted-foreground/70 bg-background/80 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        {importPreviewRows.length > 0 && (
                          <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-muted-foreground">
                              {t("dashboard.dialogs.importShowing", {
                                from: previewEnd === 0 ? 0 : previewStart + 1,
                                to: previewEnd,
                                total: importPreviewRows.length,
                              })}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImportPreviewPage((page) => Math.max(1, page - 1))}
                                disabled={previewPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                {t("dashboard.dialogs.importPage", { page: previewPage, totalPages: totalPreviewPages })}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImportPreviewPage((page) => Math.min(totalPreviewPages, page + 1))}
                                disabled={previewPage === totalPreviewPages}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleImportFileChange(null)} disabled={isImporting}>
                      {t("dashboard.dialogs.importClear")}
                    </Button>
                    {importStep === "review" ? (
                      <Button onClick={handleConfirmCreate} disabled={isImporting || importPreviewRows.length === 0}>
                        {isImporting ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="h-4 w-4" />
                            {t("dashboard.dialogs.importing")}
                          </span>
                        ) : (
                          t("dashboard.dialogs.importCreateCta")
                        )}
                      </Button>
                    ) : (
                      <Button onClick={handleImportExcel} disabled={!importFile || isImporting}>
                        {isImporting ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="h-4 w-4" />
                            {t("dashboard.dialogs.importing")}
                          </span>
                        ) : (
                          t("dashboard.dialogs.importCta")
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Create Member Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.createTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.dialogs.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-firstName">{t("dashboard.dialogs.firstName")}</Label>
              <Input
                id="new-firstName"
                value={newMemberForm.firstName}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, firstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-lastName">{t("dashboard.dialogs.lastName")}</Label>
              <Input
                id="new-lastName"
                value={newMemberForm.lastName}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">{t("dashboard.dialogs.email")}</Label>
              <Input
                id="new-email"
                type="email"
                value={newMemberForm.email}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>

            {/* Send Email Toggle */}
            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                id="send-email" 
                checked={newMemberForm.sendEmail}
                onCheckedChange={(checked) => setNewMemberForm({...newMemberForm, sendEmail: checked})}
              />
              <Label htmlFor="send-email" className="font-normal cursor-pointer">
                {t("dashboard.dialogs.sendEmailWithQr")}
              </Label>
            </div>

            {/* Error Message Display */}
            {createError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 mt-2">
                <p className="text-sm text-destructive font-medium flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {createError}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateMember} disabled={isCreating}>{isCreating ? t("dashboard.dialogs.creating") : t("dashboard.dialogs.createCta")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.editTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.dialogs.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">{t("dashboard.dialogs.firstName")}</Label>
              <Input
                id="edit-firstName"
                value={editMemberForm.firstName}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">{t("dashboard.dialogs.lastName")}</Label>
              <Input
                id="edit-lastName"
                value={editMemberForm.lastName}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t("dashboard.dialogs.email")}</Label>
              <Input
                id="edit-email"
                value={editMemberForm.email}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
              />
            </div>

            {/* Send Email Toggle */}
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="edit-send-email"
                checked={editMemberForm.sendEmail}
                onCheckedChange={(checked) => setEditMemberForm({ ...editMemberForm, sendEmail: checked })}
              />
              <Label htmlFor="edit-send-email" className="font-normal cursor-pointer">
                {t("dashboard.dialogs.sendEmailWithQr")}
              </Label>
            </div>
            
            {/* Status Radio Buttons */}
            <div className="space-y-3 pt-2">
              <Label>{t("dashboard.dialogs.status")}</Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-active"
                    name="status"
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    checked={!editMemberForm.blocked}
                    onChange={() => setEditMemberForm({ ...editMemberForm, blocked: false })}
                  />
                  <Label htmlFor="status-active" className="font-normal cursor-pointer">{t("dashboard.dialogs.active")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-blocked"
                    name="status"
                    className="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-600"
                    checked={editMemberForm.blocked}
                    onChange={() => setEditMemberForm({ ...editMemberForm, blocked: true })}
                  />
                  <Label htmlFor="status-blocked" className="font-normal cursor-pointer text-red-600">{t("dashboard.dialogs.blocked")}</Label>
                </div>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdateMember} disabled={isUpdating}>
              {isUpdating ? t("dashboard.dialogs.saving") : t("dashboard.dialogs.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.dialogs.deleteDescription", { name: memberToDelete?.firstName + " " + memberToDelete?.lastName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm} 
              disabled={isDeleting}
            >
              {isDeleting ? t("dashboard.dialogs.deleting") : t("dashboard.dialogs.deleteCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset QR Confirmation Dialog */}
      <Dialog
        open={resetQrDialogOpen}
        onOpenChange={(open) => {
          if (isResettingQr) return
          setResetQrDialogOpen(open)
          if (!open) {
            setMemberToReset(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.resetQrConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.dialogs.resetQrConfirmDescription", { name: resetMemberName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetQrDialogOpen(false)
                setMemberToReset(null)
              }}
              disabled={isResettingQr}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleResetQrConfirm} disabled={isResettingQr}>
              {isResettingQr ? t("dashboard.dialogs.resettingQr") : t("dashboard.dialogs.resetQr")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Member Details Drawer */}
      <Sheet open={detailsDrawerOpen} onOpenChange={setDetailsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>{t("dashboard.dialogs.detailsTitle")}</SheetTitle>
            <SheetDescription>{t("dashboard.dialogs.detailsDescription")}</SheetDescription>
          </SheetHeader>
          {selectedMember && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                
                {/* 1. Personal Information */}
                <Card className="px-4 py-3">
                  <h3 className="mb-3 text-sm font-semibold">{t("dashboard.dialogs.personalInfo")}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("dashboard.dialogs.nameLabel")}</span>
                      <span className="font-medium">{selectedMember.firstName} {selectedMember.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("dashboard.dialogs.emailLabel")}</span>
                      <span className="font-medium">{selectedMember.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("dashboard.dialogs.idLabel")}</span>
                      <span className="font-mono text-xs">{selectedMember._id}</span>
                    </div>
                  </div>
                </Card>

                {/* 2. Account Status */}
                <Card className="px-4 py-3">
                  <h3 className="mb-3 text-sm font-semibold">{t("profile.accountDetails")}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("dashboard.dialogs.status")}</span>
                      {selectedMember.blocked ? (
                        <Badge variant="destructive">{t("dashboard.members.statusBadges.blocked")}</Badge>
                      ) : selectedMember.emailValid ? (
                        <Badge className="bg-green-600">{t("dashboard.members.statusBadges.active")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("dashboard.members.statusBadges.pending")}</Badge>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("dashboard.members.table.created")}:</span>
                      <span className="font-medium">{new Date(selectedMember.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>

                <Card className="px-4 py-3">
                  <h3 className="mb-3 text-sm font-semibold">{t("dashboard.dialogs.qrCode")}</h3>
                  <div className="flex justify-center py-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedMember.qrUuid || selectedMember._id)}`}
                      alt={t("dashboard.dialogs.qrCode")}
                      width={200}
                      height={200}
                      loading="lazy"
                      className="h-[200px] w-[200px] border border-border/40 bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    QR UUID: {selectedMember.qrUuid.substring(0, 8)}...
                  </p>
                </Card>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => handlePrintQR(selectedMember)} className="w-full">
                  <Printer className="mr-2 h-4 w-4" /> {t("dashboard.dialogs.printQr")}
                </Button>
                <Button variant="outline" onClick={() => handleResetQrClick(selectedMember)} className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" /> {t("dashboard.dialogs.resetQr")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}