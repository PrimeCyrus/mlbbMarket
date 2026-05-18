export type ListingStatus = "active" | "sold"

export type Listing = {
  id: string
  title: string
  description: string
  price: number
  imageUrls: string[] // primary image is imageUrls[0]
  userId: string
  isGirlsId?: boolean
  collectorLevel?: string
  status?: ListingStatus
  createdAt?: string | null
  updatedAt?: string | null
  soldAt?: string | null
}
