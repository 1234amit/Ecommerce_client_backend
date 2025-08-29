# Chat API Documentation

## Overview
This chat API provides comprehensive chat functionality for an e-commerce platform, allowing users (producer, wholesaler, superseller, consumer) to communicate with admin support staff. The system includes real-time messaging, admin management tools, and comprehensive notification systems.

## User Types Supported
- **Consumer**: Regular customers
- **Producer**: Product manufacturers/suppliers
- **Wholesaler**: Bulk product distributors
- **Superseller**: Premium sellers
- **Admin**: Support staff and administrators

## Features

### Core Chat Features
- ✅ Real-time messaging between users and admins
- ✅ Support for text, image, file, audio, video, and location messages
- ✅ Message reactions and replies
- ✅ Message editing and deletion
- ✅ System messages for chat events
- ✅ Unread message tracking
- ✅ Chat status management (open, in-progress, resolved, closed, escalated)

### Admin Management Features
- ✅ Chat assignment to specific admins
- ✅ Priority management (low, medium, high, urgent)
- ✅ Category classification (sales, support, technical, billing, general, complaint, feedback)
- ✅ Chat escalation system (3 levels)
- ✅ Response time tracking
- ✅ Comprehensive chat analytics and statistics

### Notification System
- ✅ Real-time notifications for new messages
- ✅ Chat assignment notifications
- ✅ Status change notifications
- ✅ Priority and category change alerts
- ✅ Push notification support

## API Endpoints

### Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Chat Management

#### 1. Create or Get Chat
```http
POST /api/v1/chats/create
```
**Body:**
```json
{
  "subject": "Product inquiry",
  "priority": "medium",
  "category": "sales",
  "chatType": "user_to_admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat retrieved successfully",
  "chat": {
    "_id": "chat_id",
    "subject": "Product inquiry",
    "userType": "consumer",
    "priority": "medium",
    "category": "sales",
    "status": "open"
  }
}
```

#### 2. Get User Chats
```http
GET /api/v1/chats/user-chats?page=1&limit=20&status=open&category=sales
```

#### 3. Get Chat Messages
```http
GET /api/v1/chats/messages/:chatId?page=1&limit=50
```

### Messaging

#### 4. Send Message
```http
POST /api/v1/chats/send-message
```
**Body:**
```json
{
  "chatId": "chat_id",
  "content": "Hello, I need help with my order",
  "messageType": "text",
  "replyTo": "message_id_optional",
  "mediaUrl": "url_optional",
  "fileName": "filename_optional",
  "fileType": "file_type_optional"
}
```

#### 5. Edit Message
```http
PUT /api/v1/chats/messages/:messageId/edit
```
**Body:**
```json
{
  "content": "Updated message content"
}
```

#### 6. Delete Message
```http
DELETE /api/v1/chats/messages/:messageId
```

#### 7. Add Reaction
```http
POST /api/v1/chats/messages/:messageId/reactions
```
**Body:**
```json
{
  "emoji": "👍"
}
```

#### 8. Remove Reaction
```http
DELETE /api/v1/chats/messages/:messageId/reactions
```

### Chat Control

#### 9. Close Chat
```http
PUT /api/v1/chats/:chatId/close
```

### Admin-Only Endpoints

#### 10. Get Admin Chats
```http
GET /api/v1/chats/admin-chats?page=1&limit=20&status=open&priority=high&userType=consumer&category=support
```

#### 11. Assign Chat to Admin
```http
PUT /api/v1/chats/:chatId/assign
```

#### 12. Resolve Chat
```http
PUT /api/v1/chats/:chatId/resolve
```

#### 13. Escalate Chat
```http
PUT /api/v1/chats/:chatId/escalate
```
**Body:**
```json
{
  "reason": "Requires technical expertise"
}
```

#### 14. Change Chat Priority
```http
PUT /api/v1/chats/:chatId/priority
```
**Body:**
```json
{
  "priority": "urgent"
}
```

#### 15. Change Chat Category
```http
PUT /api/v1/chats/:chatId/category
```
**Body:**
```json
{
  "category": "technical"
}
```

#### 16. Get Chat Statistics
```http
GET /api/v1/chats/stats?userType=consumer&status=open&category=support&startDate=2024-01-01&endDate=2024-01-31
```

## Data Models

### Chat Model
```javascript
{
  participants: [ObjectId], // User IDs
  chatType: "user_to_admin" | "user_to_user" | "support_request" | "general_inquiry" | "technical_issue" | "billing_question",
  userType: "producer" | "wholesaler" | "superseller" | "consumer",
  subject: String,
  priority: "low" | "medium" | "high" | "urgent",
  status: "open" | "in_progress" | "resolved" | "closed" | "escalated",
  category: "sales" | "support" | "technical" | "billing" | "general" | "complaint" | "feedback",
  assignedAdmin: ObjectId,
  escalationLevel: Number, // 1-3
  messageCount: Number,
  averageResponseTime: Number, // in minutes
  unreadCount: Map, // userId -> count
  tags: [String],
  startedAt: Date,
  resolvedAt: Date,
  closedAt: Date,
  firstResponseTime: Date,
  resolutionTime: Date
}
```

### Message Model
```javascript
{
  chatId: ObjectId,
  sender: ObjectId, // User ID
  receiver: ObjectId, // User ID
  content: String,
  messageType: "text" | "image" | "file" | "audio" | "video" | "location" | "system",
  mediaUrl: String,
  fileName: String,
  fileType: String,
  mediaSize: Number,
  mediaDuration: Number,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  isRead: Boolean,
  isDelivered: Boolean,
  isEdited: Boolean,
  isDeleted: Boolean,
  isSystemMessage: Boolean,
  systemMessageType: String,
  senderRole: String,
  priority: "normal" | "important" | "urgent",
  replyTo: ObjectId, // Message ID
  reactions: [{
    user: ObjectId,
    emoji: String,
    createdAt: Date
  }]
}
```

### Notification Model
```javascript
{
  recipient: ObjectId, // User ID
  sender: ObjectId, // User ID
  type: String, // Notification type
  title: String,
  message: String,
  chatId: ObjectId,
  messageId: ObjectId,
  priority: "low" | "normal" | "high" | "urgent",
  category: "chat" | "product" | "user" | "system" | "security",
  userType: String,
  isRead: Boolean,
  isDelivered: Boolean,
  actions: [{
    label: String,
    action: String,
    url: String,
    method: "GET" | "POST" | "PUT" | "DELETE"
  }],
  expiresAt: Date,
  pushSent: Boolean
}
```

## Socket.IO Events

### Client to Server
- `join_chat`: Join a chat room
- `leave_chat`: Leave a chat room
- `typing_start`: Start typing indicator
- `typing_stop`: Stop typing indicator
- `message_reaction`: Add reaction to message

### Server to Client
- `connected`: Connection confirmation
- `joined_chat`: Chat room joined confirmation
- `user_joined_chat`: User joined chat notification
- `user_typing`: Typing indicator
- `message_reaction_added`: Reaction added notification
- `user_status_change`: User online/offline status
- `new_message`: New message notification
- `chat_assigned`: Chat assignment notification
- `chat_resolved`: Chat resolution notification
- `chat_escalated`: Chat escalation notification

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting
Rate limiting can be enabled on chat routes:
```javascript
router.use(rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes
```

## Security Features
- JWT-based authentication
- Role-based access control
- User validation for chat access
- Input sanitization and validation
- CORS configuration for frontend integration

## Performance Optimizations
- Database indexing on frequently queried fields
- Pagination for large datasets
- Efficient aggregation pipelines for statistics
- Socket.IO for real-time communication
- Message caching and optimization

## Monitoring and Analytics
- Chat response time tracking
- Message volume statistics
- User engagement metrics
- Admin performance metrics
- Chat resolution rates
- Escalation tracking

## Usage Examples

### Frontend Integration
```javascript
// Connect to chat
const socket = io('http://localhost:4001', {
  auth: {
    token: 'jwt_token_here'
  }
});

// Join chat room
socket.emit('join_chat', { chatId: 'chat_id' });

// Send message
socket.emit('send_message', {
  chatId: 'chat_id',
  content: 'Hello, I need help!'
});

// Listen for new messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

### Admin Dashboard
```javascript
// Get chat statistics
const stats = await fetch('/api/v1/chats/stats?userType=consumer', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

// Assign chat to admin
await fetch(`/api/v1/chats/${chatId}/assign`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});
```

## Future Enhancements
- [ ] File upload support with size limits
- [ ] Chat bot integration
- [ ] Advanced search and filtering
- [ ] Chat templates and canned responses
- [ ] Multi-language support
- [ ] Chat export functionality
- [ ] Advanced analytics dashboard
- [ ] Mobile push notifications
- [ ] Chat quality scoring
- [ ] Integration with CRM systems

## Support
For technical support or questions about the chat API, please contact the development team or create an issue in the project repository.
