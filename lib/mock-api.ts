// Mock API backed by localStorage for demo purposes
export type UserRole = "customer" | "owner"

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  createdAt: string
  verified: boolean
  verifiedAt?: string
  notes?: string
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string
}

// Seed data
const SEED_CUSTOMERS: Customer[] = [
  {
    id: "cust-001",
    name: "Marco Rossi",
    email: "marco.rossi@example.com",
    phone: "+39 06 1234 5678",
    createdAt: "2025-01-15T10:30:00Z",
    verified: true,
    verifiedAt: "2025-01-16T14:20:00Z",
    notes: "Regular player, prefers table 3",
  },
  {
    id: "cust-002",
    name: "Giulia Bianchi",
    email: "giulia.bianchi@example.com",
    phone: "+39 06 2345 6789",
    createdAt: "2025-01-20T15:45:00Z",
    verified: true,
    verifiedAt: "2025-01-21T09:10:00Z",
    notes: "Tournament player",
  },
  {
    id: "cust-003",
    name: "Luca Ferrari",
    email: "luca.ferrari@example.com",
    phone: "+39 06 3456 7890",
    createdAt: "2025-02-01T11:20:00Z",
    verified: false,
    notes: "New member",
  },
  {
    id: "cust-004",
    name: "Sofia Romano",
    email: "sofia.romano@example.com",
    phone: "+39 06 4567 8901",
    createdAt: "2025-02-05T16:30:00Z",
    verified: false,
  },
  {
    id: "cust-005",
    name: "Alessandro Conti",
    email: "alessandro.conti@example.com",
    phone: "+39 06 5678 9012",
    createdAt: "2025-02-10T13:15:00Z",
    verified: false,
    notes: "Interested in lessons",
  },
  {
    id: "cust-006",
    name: "Francesca Marino",
    email: "francesca.marino@example.com",
    phone: "+39 06 6789 0123",
    createdAt: "2025-02-12T10:00:00Z",
    verified: false,
  },
]

// Initialize localStorage with seed data if not present
function initializeStorage() {
  if (typeof window === "undefined") return

  if (!localStorage.getItem("customers")) {
    localStorage.setItem("customers", JSON.stringify(SEED_CUSTOMERS))
  }
}

// Auth API
export const auth = {
  loginCustomer: async (email: string, password: string): Promise<AuthUser> => {
    initializeStorage()
    // Simple validation - in real app, check against database
    if (password.length < 8) {
      throw new Error("Invalid credentials")
    }

    const customers = JSON.parse(localStorage.getItem("customers") || "[]") as Customer[]
    const customer = customers.find((c) => c.email === email)

    if (!customer) {
      throw new Error("Invalid credentials")
    }

    const authUser: AuthUser = {
      id: customer.id,
      email: customer.email,
      role: "customer",
      name: customer.name,
    }

    localStorage.setItem("authUser", JSON.stringify(authUser))
    return authUser
  },

  loginOwner: async (email: string, password: string): Promise<AuthUser> => {
    // Simple owner login - hardcoded for demo
    if (email === "owner@15palle.it" && password.length >= 8) {
      const authUser: AuthUser = {
        id: "owner-001",
        email: "owner@15palle.it",
        role: "owner",
        name: "Club Owner",
      }

      localStorage.setItem("authUser", JSON.stringify(authUser))
      return authUser
    }

    throw new Error("Invalid credentials")
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authUser")
    }
  },
}

// Me API
export const me = {
  get: (): AuthUser | null => {
    if (typeof window === "undefined") return null

    const authUser = localStorage.getItem("authUser")
    return authUser ? JSON.parse(authUser) : null
  },
}

// Customers API
export const customers = {
  list: ({
    query,
    verified,
    page = 1,
    pageSize = 20,
  }: {
    query?: string
    verified?: boolean
    page?: number
    pageSize?: number
  } = {}): { data: Customer[]; total: number; page: number; pageSize: number } => {
    initializeStorage()

    let allCustomers = JSON.parse(localStorage.getItem("customers") || "[]") as Customer[]

    // Filter by verified status
    if (verified !== undefined) {
      allCustomers = allCustomers.filter((c) => c.verified === verified)
    }

    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase()
      allCustomers = allCustomers.filter(
        (c) => c.name.toLowerCase().includes(lowerQuery) || c.email.toLowerCase().includes(lowerQuery),
      )
    }

    // Sort by createdAt (newest first)
    allCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedCustomers = allCustomers.slice(start, end)

    return {
      data: paginatedCustomers,
      total: allCustomers.length,
      page,
      pageSize,
    }
  },

  getById: (id: string): Customer | null => {
    initializeStorage()

    const customers = JSON.parse(localStorage.getItem("customers") || "[]") as Customer[]
    return customers.find((c) => c.id === id) || null
  },

  verify: (id: string): Customer => {
    initializeStorage()

    const customers = JSON.parse(localStorage.getItem("customers") || "[]") as Customer[]
    const customer = customers.find((c) => c.id === id)

    if (!customer) {
      throw new Error("Customer not found")
    }

    customer.verified = true
    customer.verifiedAt = new Date().toISOString()

    localStorage.setItem("customers", JSON.stringify(customers))
    return customer
  },

  revoke: (id: string): Customer => {
    initializeStorage()

    const customers = JSON.parse(localStorage.getItem("customers") || "[]") as Customer[]
    const customer = customers.find((c) => c.id === id)

    if (!customer) {
      throw new Error("Customer not found")
    }

    customer.verified = false
    customer.verifiedAt = undefined

    localStorage.setItem("customers", JSON.stringify(customers))
    return customer
  },

  updateNotes: (id: string, notes: string): Customer => {
    initializeStorage()

    const customers = JSON.parse(localStorage.getItem("customers") || "[]") as Customer[]
    const customer = customers.find((c) => c.id === id)

    if (!customer) {
      throw new Error("Customer not found")
    }

    customer.notes = notes
    localStorage.setItem("customers", JSON.stringify(customers))
    return customer
  },
}
