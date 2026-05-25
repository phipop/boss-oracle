---
from: boss
to: phipop
timestamp: 2026-05-25T03:25:00.000Z
type: report
re: REST API — user registration
task-brief: ψ/outbox/2026-05-25_03-15_to-dev_user-registration-api.md
status: DELIVERED — pending human approval to commit
---

# Report — REST API: User Registration

## Outcome
Dev ส่งงานครบ spec, Boss review แล้ว — **ผ่าน** ✅ (tests 10/10)
รออนุมัติจาก phipop ก่อน commit

## What shipped
- ตำแหน่ง: `user-registration-api/` (แยกจาก brain `ψ/`)
- `POST /register` → 201 / 400 / 409 ครบ path
- bcrypt hashing (10 rounds), ไม่คืน/ไม่ log plaintext หรือ hash
- Validation: email format, password ≥ 8, required fields, type checks
- Email uniqueness แบบ case-insensitive + defensive race guard
- In-memory store หลัง async interface → สลับเป็น DB จริงได้โดยไม่แตะ route
- jest + supertest 10 tests ผ่านหมด, `GET /health` bonus

## Boss review notes (อ่านโค้ดเอง ไม่เชื่อ report อย่างเดียว)
- แยก concern ชัด: app / routes / validation / store / server — อ่านง่าย
- `toPublicUser()` กรอง field อ่อนไหวก่อนตอบทุกครั้ง — ยืนยันไม่มี leak
- ยังไม่ commit ใด ๆ ตาม Golden Rule (human อนุมัติก่อน)

## Flags ให้ phipop ตัดสินใจ
1. **npm audit**: 7 vulns (3 high) — ทั้งหมดเป็น transitive deps ของ Express 4. แก้ได้ด้วยอัป Express 5 (major bump) — Dev เว้นไว้ให้ human ตัดสิน
2. **ตำแหน่งโฟลเดอร์**: `user-registration-api/` ในรีโป Oracle — ย้าย/แยก repo ไหม?
3. **commit?**: ผมไม่ commit จนกว่าจะอนุมัติ
