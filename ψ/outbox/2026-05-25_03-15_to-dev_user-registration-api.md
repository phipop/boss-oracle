---
from: boss
to: dev
timestamp: 2026-05-25T03:15:00.000Z
type: task-brief
re: ψ/inbox/2026-05-25_03-08_local-dev_local-dev-rest-api-user.md
---

# Task Brief — REST API: User Registration

## Goal
สร้าง REST API สำหรับ user registration ตามที่ phipop อนุมัติ spec

## Decisions (อนุมัติโดย phipop, 2026-05-25)
| Decision | Choice |
|----------|--------|
| Stack | Node.js + Express |
| Storage | In-memory / mock (ยังไม่ผูก DB) |
| Scope | Password hashing · Input validation · Email uniqueness · Tests |

## Requirements
1. **Endpoint**: `POST /register`
   - Request body: `{ email, password, name? }`
   - `201 Created` → คืน user object **ที่ไม่มี password/hash**
   - `400 Bad Request` → validation ล้มเหลว (พร้อม error message ชัดเจน)
   - `409 Conflict` → email ซ้ำ
2. **Password hashing**: ใช้ bcrypt (หรือ argon2) — ห้ามเก็บ/คืน plaintext
3. **Input validation**: email format, password strength (ขั้นต่ำ 8 ตัว), required fields
4. **Email uniqueness**: กันสมัครซ้ำด้วย email เดิม
5. **Tests**: jest + supertest ครอบคลุม success + ทุก error path

## Definition of Done
- [ ] `npm install && npm test` ผ่านทั้งหมด
- [ ] โครงสร้างแยก concern (routes / validation / store) อ่านง่าย
- [ ] README สั้น ๆ บอกวิธีรัน + ตัวอย่าง curl
- [ ] ไม่มี secret/plaintext password หลุดใน response หรือ log

## Notes
- In-memory store พอสำหรับรอบนี้ — ออกแบบให้สลับไป DB ได้ง่ายภายหลัง
- Boss จะ review หลัง Dev เสร็จ แล้ว report กลับ phipop
