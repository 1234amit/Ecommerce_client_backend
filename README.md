<h2>Client Ecommerce Application Backend</h2>

# Ecommerce Backend API

## Profile Image Upload for All User Roles

All user roles (Admin, Wholesaler, Producer, Consumer, SuperSeller) can now upload and update their profile images. Each role has two endpoints:
1. Update profile with optional image upload
2. Update profile image only

### File Requirements
- **Supported formats**: JPG, JPEG, PNG, GIF
- **Maximum file size**: 5MB
- **Field name**: `image`

---

## Admin Profile Image Upload

### Update Admin Profile with Image
**PUT** `/api/v1/admin/profile`

Update admin profile information with optional image upload.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `name` (optional): Admin name
- `email` (optional): Admin email
- `phone` (optional): Admin phone
- `division` (optional): Division
- `district` (optional): District
- `thana` (optional): Thana
- `address` (optional): Address
- `nid` (optional): NID number
- `image` (optional): Profile image file (JPG, PNG, GIF, max 5MB)

### Update Admin Profile Image Only
**PUT** `/api/v1/admin/profile-image`

Update only the admin profile image.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `image` (required): Profile image file (JPG, PNG, GIF, max 5MB)

---

## Wholesaler Profile Image Upload

### Update Wholesaler Profile with Image
**PUT** `/api/v1/wholesaler/profile`

Update wholesaler profile information with optional image upload.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `name` (optional): Wholesaler name
- `email` (optional): Wholesaler email
- `phone` (optional): Wholesaler phone
- `division` (optional): Division
- `district` (optional): District
- `thana` (optional): Thana
- `address` (optional): Address
- `nid` (optional): NID number
- `image` (optional): Profile image file (JPG, PNG, GIF, max 5MB)

### Update Wholesaler Profile Image Only
**PUT** `/api/v1/wholesaler/profile-image`

Update only the wholesaler profile image.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `image` (required): Profile image file (JPG, PNG, GIF, max 5MB)

---

## Producer Profile Image Upload

### Update Producer Profile with Image
**PUT** `/api/v1/producer/profile`

Update producer profile information with optional image upload.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `name` (optional): Producer name
- `email` (optional): Producer email
- `phone` (optional): Producer phone
- `division` (optional): Division
- `district` (optional): District
- `thana` (optional): Thana
- `address` (optional): Address
- `nid` (optional): NID number
- `image` (optional): Profile image file (JPG, PNG, GIF, max 5MB)

### Update Producer Profile Image Only
**PUT** `/api/v1/producer/profile-image`

Update only the producer profile image.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `image` (required): Profile image file (JPG, PNG, GIF, max 5MB)

---

## Consumer Profile Image Upload

### Update Consumer Profile with Image
**PUT** `/api/v1/consumer/profile`

Update consumer profile information with optional image upload.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `name` (optional): Consumer name
- `email` (optional): Consumer email
- `phone` (optional): Consumer phone
- `division` (optional): Division
- `district` (optional): District
- `thana` (optional): Thana
- `address` (optional): Address
- `nid` (optional): NID number
- `image` (optional): Profile image file (JPG, PNG, GIF, max 5MB)

### Update Consumer Profile Image Only
**PUT** `/api/v1/consumer/profile-image`

Update only the consumer profile image.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `image` (required): Profile image file (JPG, PNG, GIF, max 5MB)

---

## SuperSeller Profile Image Upload

### Update SuperSeller Profile with Image
**PUT** `/api/v1/supersaler/profile`

Update superseller profile information with optional image upload.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `name` (optional): SuperSeller name
- `email` (optional): SuperSeller email
- `phone` (optional): SuperSeller phone
- `division` (optional): Division
- `district` (optional): District
- `thana` (optional): Thana
- `address` (optional): Address
- `nid` (optional): NID number
- `image` (optional): Profile image file (JPG, PNG, GIF, max 5MB)

### Update SuperSeller Profile Image Only
**PUT** `/api/v1/supersaler/profile-image`

Update only the superseller profile image.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `image` (required): Profile image file (JPG, PNG, GIF, max 5MB)

---

## Get Profile Information

All user roles can get their profile information (including image URL) using their existing profile endpoints:

- **Admin**: `GET /api/v1/admin/profile`
- **Wholesaler**: `GET /api/v1/wholesaler/profile`
- **Producer**: `GET /api/v1/producer/profile`
- **Consumer**: `GET /api/v1/consumer/profile`
- **SuperSeller**: `GET /api/v1/supersaler/profile`

### Example Response
```json
{
  "message": "Profile fetched successfully",
  "user": {
    "_id": "67e84c1270e6de7d321f1b84",
    "name": "John Doe",
    "phone": "01822769722",
    "email": "john@example.com",
    "nid": "019289123133",
    "division": "Dhaka",
    "district": "Dhaka",
    "thana": "Dhanmondi",
    "address": "House #12, Road #3, Dhanmondi, Dhaka",
    "tradelicense": "2472938911144511",
    "role": "consumer",
    "status": "approved",
    "image": "http://localhost:4000/uploads/image-1741459020724-123456789.jpg",
    "lastLogin": "2025-06-23T16:20:35.029Z",
    "createdAt": "2025-03-29T19:37:54.596Z",
    "updatedAt": "2025-06-23T16:20:35.035Z"
  }
}
```

## Notes

- Images are stored in the `uploads/` directory
- Supported image formats: JPG, JPEG, PNG, GIF
- Maximum file size: 5MB
- Images are accessible via the returned URL
- The image field will be `null` if no image has been uploaded
- All endpoints require proper authentication with Bearer token
- Error handling is included for file size limits and invalid file types
