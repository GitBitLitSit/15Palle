"use client"

import { RequireRole } from "@/components/require-role"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { customers, auth } from "@/lib/mock-api"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  LogOut,
  Users,
  UserCheck,
  UserX,
  Download,
  Printer,
  UserPlus,
} from "lucide-react"
import type { Customer } from "@/lib/mock-api"
import { useToast } from "@/hooks/use-toast"

function DashboardContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("unverified")
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: "verify" | "revoke" | null
    customerId: string | null
  }>({ open: false, action: null, customerId: null })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [searchQuery, activeTab, allCustomers])

  const loadCustomers = () => {
    const result = customers.list({ pageSize: 100 })
    setAllCustomers(result.data)
  }

  const filterCustomers = () => {
    let filtered = allCustomers

    // Filter by tab
    if (activeTab === "verified") {
      filtered = filtered.filter((c) => c.verified)
    } else if (activeTab === "unverified") {
      filtered = filtered.filter((c) => !c.verified)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query))
    }

    setFilteredCustomers(filtered)
  }

  const handleSignOut = () => {
    auth.logout()
    router.push("/")
  }

  const handleVerify = (id: string) => {
    setConfirmDialog({ open: true, action: "verify", customerId: id })
  }

  const handleRevoke = (id: string) => {
    setConfirmDialog({ open: true, action: "revoke", customerId: id })
  }

  const handleConfirmAction = () => {
    if (!confirmDialog.customerId) return

    try {
      if (confirmDialog.action === "verify") {
        customers.verify(confirmDialog.customerId)
        toast({
          title: "Customer verified",
          description: "The customer has been successfully verified.",
        })
      } else if (confirmDialog.action === "revoke") {
        customers.revoke(confirmDialog.customerId)
        toast({
          title: "Verification revoked",
          description: "The customer's verification has been revoked.",
        })
      }

      loadCustomers()
      setConfirmDialog({ open: false, action: null, customerId: null })
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkVerify = () => {
    try {
      selectedIds.forEach((id) => customers.verify(id))
      toast({
        title: "Customers verified",
        description: `${selectedIds.length} customer(s) have been verified.`,
      })
      setSelectedIds([])
      loadCustomers()
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during bulk verification.",
        variant: "destructive",
      })
    }
  }

  const handleViewProfile = (customer: Customer) => {
    setSelectedCustomer(customer)
    setNotes(customer.notes || "")
    setDrawerOpen(true)
  }

  const handleSaveNotes = () => {
    if (selectedCustomer) {
      customers.updateNotes(selectedCustomer.id, notes)
      toast({
        title: "Notes saved",
        description: "Customer notes have been updated.",
      })
      loadCustomers()
      setDrawerOpen(false)
    }
  }

  const handleExportCSV = () => {
    const csvData = filteredCustomers.map((c) => ({
      Name: c.name,
      Email: c.email,
      Phone: c.phone || "",
      "Created At": new Date(c.createdAt).toLocaleDateString(),
      Verified: c.verified ? "Yes" : "No",
      "Verified At": c.verifiedAt ? new Date(c.verifiedAt).toLocaleDateString() : "",
      Notes: c.notes || "",
    }))

    const headers = Object.keys(csvData[0])
    const csv = [
      headers.join(","),
      ...csvData.map((row) => headers.map((header) => `"${row[header as keyof typeof row]}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `customers-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export complete",
      description: "Customer data has been exported to CSV.",
    })
  }

  const handleCreateUser = () => {
    try {
      if (!newUserForm.name || !newUserForm.email) {
        toast({
          title: "Validation error",
          description: "Name and email are required",
          variant: "destructive",
        })
        return
      }

      customers.create(newUserForm)

      toast({
        title: "Customer created",
        description: "New customer has been added successfully.",
      })

      setCreateUserOpen(false)
      setNewUserForm({ name: "", email: "", phone: "", notes: "" })
      loadCustomers()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create customer",
        variant: "destructive",
      })
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const verifiedCount = allCustomers.filter((c) => c.verified).length
  const unverifiedCount = allCustomers.filter((c) => !c.verified).length

  const handlePrintQR = (customer: Customer) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      JSON.stringify({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        verified: customer.verified,
      }),
    )}`

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${customer.name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            .logo {
              margin-bottom: 20px;
            }
            .logo img {
              width: 150px;
              height: auto;
            }
            h1 {
              color: #2f699f;
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .subtitle {
              color: #666;
              margin: 0 0 30px 0;
              font-size: 14px;
            }
            .qr-code {
              margin: 30px 0;
              padding: 20px;
              background: white;
              border: 2px solid #2f699f;
              border-radius: 12px;
              display: inline-block;
            }
            .qr-code img {
              display: block;
              width: 300px;
              height: 300px;
            }
            .customer-info {
              margin-top: 30px;
              padding: 20px;
              background: #f5f5f5;
              border-radius: 8px;
              text-align: left;
            }
            .info-row {
              margin: 10px 0;
              font-size: 14px;
            }
            .info-label {
              font-weight: 600;
              color: #2f699f;
              display: inline-block;
              width: 100px;
            }
            .info-value {
              color: #333;
            }
            .verified-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            }
            @media print {
              body {
                padding: 0;
              }
              .container {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="/logo.png" alt="15 Palle Logo" />
            </div>
            <h1>15 Palle</h1>
            <p class="subtitle">Associazione Sportiva</p>
            
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
            
            <div class="customer-info">
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${customer.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${customer.email}</span>
              </div>
              ${
                customer.phone
                  ? `
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${customer.phone}</span>
              </div>
              `
                  : ""
              }
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="verified-badge">✓ Verified Member</span>
              </div>
              <div class="info-row">
                <span class="info-label">Member ID:</span>
                <span class="info-value">${customer.id}</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Owner Dashboard</h1>
              <p className="text-muted-foreground">Manage customer verifications</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{allCustomers.length}</div>
              </CardContent>
            </Card>

            <Card className="border-accent/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <UserCheck className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{verifiedCount}</div>
              </CardContent>
            </Card>

            <Card className="border-secondary/20 sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <UserX className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{unverifiedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Customer Management</CardTitle>
                  <CardDescription>View and manage customer verifications</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => setCreateUserOpen(true)} size="sm" className="w-full sm:w-auto">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                  {selectedIds.length > 0 && activeTab === "unverified" && (
                    <Button onClick={handleBulkVerify} size="sm" className="w-full sm:w-auto">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verify Selected ({selectedIds.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-transparent"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="w-full sm:w-auto bg-transparent"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 grid w-full grid-cols-3">
                  <TabsTrigger value="unverified">Unverified ({unverifiedCount})</TabsTrigger>
                  <TabsTrigger value="verified">Verified ({verifiedCount})</TabsTrigger>
                  <TabsTrigger value="all">All ({allCustomers.length})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                  {filteredCustomers.length === 0 ? (
                    <div className="py-12 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No customers found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {activeTab === "unverified" && (
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectedIds.length === filteredCustomers.length}
                                  onCheckedChange={toggleSelectAll}
                                />
                              </TableHead>
                            )}
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Email</TableHead>
                            <TableHead className="hidden md:table-cell">Created</TableHead>
                            {activeTab === "verified" && (
                              <TableHead className="hidden lg:table-cell">Verified At</TableHead>
                            )}
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCustomers.map((customer) => (
                            <TableRow key={customer.id}>
                              {activeTab === "unverified" && (
                                <TableCell>
                                  <Checkbox
                                    checked={selectedIds.includes(customer.id)}
                                    onCheckedChange={() => toggleSelect(customer.id)}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="font-medium">{customer.name}</TableCell>
                              <TableCell className="hidden sm:table-cell">{customer.email}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {new Date(customer.createdAt).toLocaleDateString()}
                              </TableCell>
                              {activeTab === "verified" && (
                                <TableCell className="hidden lg:table-cell">
                                  {customer.verifiedAt ? new Date(customer.verifiedAt).toLocaleDateString() : "-"}
                                </TableCell>
                              )}
                              <TableCell>
                                {customer.verified ? (
                                  <Badge className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleViewProfile(customer)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {customer.verified && (
                                    <Button variant="ghost" size="sm" onClick={() => handlePrintQR(customer)}>
                                      <Printer className="h-4 w-4 text-primary" />
                                    </Button>
                                  )}
                                  {customer.verified ? (
                                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(customer.id)}>
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" onClick={() => handleVerify(customer.id)}>
                                      <CheckCircle className="h-4 w-4 text-accent" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Create New Customer
            </DialogTitle>
            <DialogDescription>
              Add a new customer to the system. They will need to be verified before gaining full access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="John Doe"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="john.doe@example.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                type="tel"
                placeholder="+39 06 1234 5678"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                placeholder="Add any notes about this customer..."
                value={newUserForm.notes}
                onChange={(e) => setNewUserForm({ ...newUserForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null, customerId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.action === "verify" ? "Verify Customer" : "Revoke Verification"}</DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "verify"
                ? "Are you sure you want to verify this customer? They will gain full access to member benefits."
                : "Are you sure you want to revoke this customer's verification? They will lose access to member benefits."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, action: null, customerId: null })}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full overflow-y-auto bg-card sm:max-w-lg">
          {selectedCustomer && (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="text-primary">Customer Details</SheetTitle>
                <SheetDescription>View and manage customer information</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/50 p-4 px-4">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</Label>
                    <p className="mt-1 text-sm font-medium">{selectedCustomer.name}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4 px-4">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</Label>
                    <p className="mt-1 text-sm">{selectedCustomer.email}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4 px-4">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</Label>
                    <p className="mt-1 text-sm">{selectedCustomer.phone || "Not provided"}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4 px-4">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Customer ID
                    </Label>
                    <p className="mt-1 text-sm font-mono">{selectedCustomer.id}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4 px-4">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Created At
                    </Label>
                    <p className="mt-1 text-sm">{new Date(selectedCustomer.createdAt).toLocaleString()}</p>
                  </div>

                  {selectedCustomer.verifiedAt && (
                    <div className="rounded-lg border border-border bg-muted/50 p-4 px-4">
                      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Verified At
                      </Label>
                      <p className="mt-1 text-sm">{new Date(selectedCustomer.verifiedAt).toLocaleString()}</p>
                    </div>
                  )}

                  <div className="rounded-lg border border-border bg-muted/50 p-4 px-4">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</Label>
                    <div className="mt-2">
                      {selectedCustomer.verified ? (
                        <Badge className="bg-accent hover:bg-accent/90 text-accent-foreground">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                          Pending Verification
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this customer..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                  <Button onClick={handleSaveNotes} className="flex-1">
                    Save Notes
                  </Button>
                  {selectedCustomer.verified ? (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDrawerOpen(false)
                        handleRevoke(selectedCustomer.id)
                      }}
                      className="flex-1"
                    >
                      Revoke
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={() => {
                        setDrawerOpen(false)
                        handleVerify(selectedCustomer.id)
                      }}
                      className="flex-1 bg-accent hover:bg-accent/90"
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function OwnerDashboardPage() {
  return (
    <RequireRole role="owner">
      <DashboardContent />
    </RequireRole>
  )
}
