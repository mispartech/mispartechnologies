
# Django-First Migration Plan

## Executive Summary

This plan establishes Django as the **single source of truth** for identity, face data, and attendance while maintaining frontend functionality during the transition. The migration follows an incremental approach that:

1. Preserves existing Supabase Auth during Phase 1 (session management only)
2. Introduces Django user sync at registration time
3. Migrates fully to Django JWT auth in Phase 2
4. Eliminates all dual-write patterns

---

## 1. New Canonical Data Flow

### User Registration (Admin creating account via /auth signup)

```text
+------------------+     +------------------+     +------------------+
|   Frontend       |---->|   Django API     |---->|  Django Postgres |
|   Auth Form      |     |  POST /register/ |     |  users table     |
+------------------+     +------------------+     +------------------+
                              |
                              v
                         Django returns JWT tokens
                         + user object (id, role, org_id)
```

**Django Endpoint**: `POST /api/auth/register/`

**Payload**:
```json
{
  "email": "admin@org.com",
  "password": "securepass",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+123456789",
  "gender": "male"
}
```

**Response**:
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>",
  "user": {
    "id": "uuid",
    "email": "admin@org.com",
    "first_name": "John",
    "last_name": "John",
    "role": "admin"
  }
}
```

---

### Member Invite Flow

```text
+------------------+     +------------------+     +------------------+
|  Admin Dashboard |---->|   Django API     |---->|  Django Postgres |
|  AddMemberModal  |     |  POST /invite/   |     |  member_invites  |
+------------------+     +------------------+     +------------------+
                              |
                              v
                         Django sends invite email
                         with registration link
```

**Django Endpoint**: `POST /api/members/invite/`

**Payload**:
```json
{
  "email": "member@org.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "organization_id": "org-uuid",
  "department_id": "dept-uuid"
}
```

---

### Member Registration (/register page with token)

```text
+------------------+     +------------------+     +------------------+
|  /register page  |---->|   Django API     |---->|  Django Postgres |
|  Profile + Face  |     | POST /register/  |     |  users table     |
+------------------+     +------------------+     +------------------+
        |
        v (after profile saved)
+------------------+     +------------------+
|  Face Capture    |---->|   Django API     |
|  (image base64)  |     | /recognize-frame |
+------------------+     | mode: ENROLL     |
                         +------------------+
                              |
                              v
                         Django saves embedding
                         Returns: { success, embedding_saved }
```

---

### Face Enrollment Flow

```text
+------------------+     +------------------+     +------------------+
|  FaceEnrollment  |---->|  Edge Function   |---->|   Django API     |
|  Page (base64)   |     | face-recognition |     | /recognize-frame |
+------------------+     |  (pass-through)  |     |  mode: ENROLL    |
                         +------------------+     +------------------+
                                                       |
                                                       v
                                              +------------------+
                                              |  Django Postgres |
                                              |  face_embeddings |
                                              |  users.face_url  |
                                              +------------------+
```

---

### Attendance Recognition Flow

```text
+------------------+     +------------------+     +------------------+
| AttendanceCapture|---->|  Edge Function   |---->|   Django API     |
|  (camera frame)  |     | face-recognition |     | /recognize-frame |
+------------------+     |  (pass-through)  |     |  mode: RECOGNIZE |
                         +------------------+     +------------------+
                                                       |
                                                       v
                                              Django matches embedding,
                                              marks attendance,
                                              returns response
                                                       |
                                                       v
                                              +------------------+
                                              |  Django Postgres |
                                              |   attendance     |
                                              +------------------+
```

**Django Response Contract**:
```json
{
  "success": true,
  "code": "FACE_RECOGNIZED",
  "type": "KNOWN",
  "user_id": "uuid",
  "name": "John Doe",
  "confidence": 0.92,
  "attendance_marked": true,
  "bbox": [x, y, w, h]
}
```

---

## 2. Frontend Changes Required

### 2.1 Auth.tsx (Login/Signup)

| Current State | Target State |
|--------------|--------------|
| `supabase.auth.signInWithPassword()` | `djangoApi.login(email, password)` |
| `supabase.auth.signUp()` | `djangoApi.register(data)` |
| Profile fetched from Supabase `profiles` | Profile returned in login response |

**Changes Required**:
- Replace `supabase.auth.signInWithPassword()` with `djangoApi.login()`
- Replace `supabase.auth.signUp()` with `djangoApi.register()`
- Store JWT tokens via `DjangoApiClient.saveTokens()`
- Use `useDjangoAuth()` hook for session state
- Remove `supabase.auth.onAuthStateChange()` listener
- Redirect logic reads from Django user object

---

### 2.2 Register.tsx (Member Invite Registration)

| Current State | Target State |
|--------------|--------------|
| Fetches invite from Supabase `member_invites` | Fetches invite from Django API |
| `supabase.auth.signUp()` | `djangoApi.register({ invite_token })` |
| Uploads face to Supabase Storage | Sends base64 to Django via edge function |
| Updates Supabase `profiles` table | Django handles all profile updates |
| Creates `user_roles` entry | Django handles role assignment |
| Invokes `face-recognition` edge function | Same (already proxies to Django) |

**Changes Required**:
- Replace `supabase.from('member_invites').select()` with Django endpoint `GET /api/invites/{token}/`
- Replace `supabase.auth.signUp()` with `djangoApi.register({ invite_token })`
- Remove Supabase Storage upload - send base64 directly to Django
- Remove `profiles` and `user_roles` inserts - Django handles these
- Keep edge function call for face enrollment (already Django proxy)
- Update invite status via Django: `PATCH /api/invites/{id}/accept/`

---

### 2.3 Onboarding.tsx (Admin Organization Setup)

| Current State | Target State |
|--------------|--------------|
| `supabase.auth.getUser()` for current user | `djangoApi.getCurrentUser()` |
| Inserts into Supabase `organizations` | `djangoApi.createOrganization(data)` |
| Upserts Supabase `profiles` | Django updates user's org_id on org creation |
| Inserts Supabase `user_roles` | Django assigns role during org creation |
| Inserts `service_schedules` | Django endpoint `POST /api/schedules/` |

**Changes Required**:
- Replace `supabase.auth.getUser()` with `useDjangoAuth()` hook
- Replace `supabase.from('organizations').insert()` with `djangoApi.createOrganization()`
- Remove direct `profiles` and `user_roles` manipulation
- Replace `service_schedules` insert with Django endpoint
- Django should handle atomic org + user + role creation

---

### 2.4 AddMemberModal.tsx

| Current State | Target State |
|--------------|--------------|
| Fetches admin profile from Supabase | Uses `useDjangoAuth()` context |
| Inserts into Supabase `member_invites` | `djangoApi.inviteMember(data)` |
| Invokes `send-member-invite` edge function | Django sends email directly |

**Changes Required**:
- Replace `supabase.auth.getUser()` with `useDjangoAuth()`
- Replace `supabase.from('member_invites').insert()` with `djangoApi.inviteMember()`
- Remove `send-member-invite` edge function call - Django handles email
- Frontend only displays success/error from Django response

---

### 2.5 FaceEnrollment.tsx

| Current State | Target State |
|--------------|--------------|
| Uses Supabase edge function (already proxy) | No change - already correct |
| Checks `profile.face_image_url` for guard | Uses Django `/enrollment-status/` endpoint |

**Changes Required**:
- Already using edge function as proxy (correct)
- Update `useFaceEnrollmentGuard` to call Django endpoint exclusively
- Remove Supabase profile fallback check

---

### 2.6 DashboardLayout.tsx

| Current State | Target State |
|--------------|--------------|
| `supabase.auth.onAuthStateChange()` | `useDjangoAuth()` context |
| Fetches profile from Supabase | Profile from Django auth context |
| `useFaceEnrollmentGuard` with Supabase fallback | Pure Django enrollment check |

**Changes Required**:
- Wrap app in `<DjangoAuthProvider>`
- Replace `supabase.auth` calls with `useDjangoAuth()`
- Profile and session come from Django context
- Remove Supabase auth state listener

---

## 3. Auth Strategy Decision

**Recommended: Django JWT as Primary Auth**

### Rationale

1. **Single Source of Truth**: Django owns all user data - auth tokens should come from the same source
2. **Consistent Token Flow**: No bridging between two auth systems reduces complexity
3. **Already Implemented**: `DjangoApiClient` and `DjangoAuthContext` already exist in codebase
4. **Standard JWT Flow**: Access/refresh token pattern with automatic refresh on 401

### Token Flow

```text
Login Request
     |
     v
Django validates credentials
     |
     v
Django returns { access, refresh, user }
     |
     v
Frontend stores tokens in localStorage
     |
     v
All API requests include: Authorization: Bearer <access_token>
     |
     v
On 401 response:
  - Try refresh: POST /api/auth/token/refresh/ { refresh }
  - If success: Update access token, retry original request
  - If fail: Clear tokens, redirect to /auth
```

### Token Storage

The `DjangoApiClient` already handles this:
- `localStorage.setItem('django_access_token', access)`
- `localStorage.setItem('django_refresh_token', refresh)`

---

## 4. Minimal Transition Plan (Incremental)

### Phase 1: Dual-Auth Bridge (Temporary - 1-2 weeks)

**Goal**: Allow existing Supabase users to continue while new users go to Django

**Implementation**:
1. Keep Supabase Auth for login (existing users)
2. On successful Supabase login, call Django sync endpoint to create/update Django user
3. Store Django JWT alongside Supabase session
4. All face/attendance calls use Django JWT
5. New signups go directly to Django (skip Supabase Auth)

```text
Existing User Login:
Supabase Auth -> Django POST /api/auth/sync/ -> Django returns JWT

New User Signup:
Django POST /api/auth/register/ -> Django returns JWT (no Supabase)
```

**Required Django Endpoint**:
```
POST /api/auth/sync/
{
  "supabase_uid": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

This endpoint:
- Creates Django user if not exists (with matching UUID)
- Returns Django JWT tokens
- Allows gradual migration of existing users

---

### Phase 2: Full Django Auth (Week 3-4)

**Goal**: Remove all Supabase Auth dependency

**Steps**:
1. Replace `supabase.auth.*` calls with `djangoApi.*` methods
2. Use `<DjangoAuthProvider>` as root auth context
3. All components use `useDjangoAuth()` hook
4. Remove Supabase auth state listeners
5. Password reset, email verification through Django

---

### Phase 3: Data Migration & Cleanup (Week 4+)

**Goal**: Migrate existing Supabase data to Django, remove unused Supabase tables

**Steps**:
1. One-time migration script: Supabase users -> Django users (preserving UUIDs)
2. Migrate organizations, departments, schedules to Django
3. Verify all attendance data flows to Django only
4. Remove or archive Supabase tables:
   - `profiles` (redundant)
   - `user_roles` (redundant)
   - `organizations` (redundant)
   - `face_embeddings` (Django owns)
   - `attendance` (Django owns)
   - `temp_attendance` (Django owns)

---

## 5. Final State Architecture

### Django PostgreSQL (Source of Truth)

| Table | Purpose |
|-------|---------|
| `users` | All user accounts (admins, members) |
| `organizations` | Organization records |
| `departments` | Department records |
| `members` | Organization membership with roles |
| `member_invites` | Pending invitations |
| `face_embeddings` | Face vectors for recognition |
| `attendance` | Confirmed attendance records |
| `temp_attendance` | Unrecognized face records |
| `service_schedules` | Attendance schedules |

### Supabase PostgreSQL (Minimal - UI/Realtime Only)

| Table | Purpose | Status |
|-------|---------|--------|
| `notifications` | Real-time notifications to dashboard | Keep |
| `onboarding_sessions` | UI state persistence | Keep (optional) |
| `activity_logs` | Audit trail (optional - can move to Django) | Evaluate |

### Supabase Services to Keep

| Service | Purpose |
|---------|---------|
| Edge Functions | Pass-through proxy to Django (CORS handling) |
| Storage | Face image storage (optional - can move to Django/S3) |
| Realtime | Live notification updates |

### Supabase Services to Remove

| Service | Reason |
|---------|--------|
| Supabase Auth | Django JWT replaces |
| Database (most tables) | Django owns data |

---

## 6. Implementation Checklist

### Phase 1 Tasks

- [ ] Create Django `/api/auth/sync/` endpoint for existing Supabase users
- [ ] Modify `Auth.tsx` to call sync after Supabase login
- [ ] Store Django JWT on successful sync
- [ ] New signups call `djangoApi.register()` directly
- [ ] Update `DashboardLayout` to check Django JWT validity
- [ ] Test face enrollment works with Django user IDs

### Phase 2 Tasks

- [ ] Replace all `supabase.auth.*` calls with `djangoApi.*`
- [ ] Wrap `App.tsx` with `<DjangoAuthProvider>`
- [ ] Update `Onboarding.tsx` to use Django organization creation
- [ ] Update `Register.tsx` to use Django registration
- [ ] Update `AddMemberModal` to use Django invite API
- [ ] Remove Supabase auth state listeners
- [ ] Test login, logout, token refresh flows

### Phase 3 Tasks

- [ ] Create data migration script (users, orgs, schedules)
- [ ] Run migration in staging environment
- [ ] Verify all attendance data in Django
- [ ] Remove unused Supabase tables
- [ ] Update `useFaceEnrollmentGuard` to use Django only
- [ ] Remove Supabase profile fetches throughout app

---

## Technical Notes

### Django API Client Location
File: `src/lib/api/client.ts`

The `DjangoApiClient` class is already implemented with:
- Token storage/retrieval
- Automatic 401 retry with token refresh
- All required methods: `login()`, `register()`, `getCurrentUser()`, `createOrganization()`, `inviteMember()`, etc.

### Auth Context Location
File: `src/contexts/DjangoAuthContext.tsx`

The `DjangoAuthProvider` and `useDjangoAuth()` hook are already implemented but **not currently used**. The app still relies on Supabase Auth.

### Edge Functions
All edge functions (`face-recognition`, `face-enroll`, `django-proxy`) are already configured as pure pass-through proxies. No changes required to edge function logic.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Existing users can't login | Phase 1 sync endpoint preserves Supabase UIDs |
| Data loss during migration | UUID preservation ensures attendance history links |
| Token expiry during transition | Dual-token storage in Phase 1 |
| Django API downtime | Edge function health checks with user-friendly errors |
| Face enrollment fails | Fallback to Supabase profile check in Phase 1 |

