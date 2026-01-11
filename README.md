# gooser — เบราว์เซอร์ปรับแต่งได้พร้อมระบบฝัง Snippet (ภาษาไทย)

โปรเจกต์นี้มีเป้าหมายสร้างเบราว์เซอร์/แอปที่ผู้ใช้ทั่วไปสามารถเพิ่มและจัดการ "snippet" (โค้ดสั้น ๆ เช่น JavaScript) เพื่อปรับแต่งหรือเพิ่มฟีเจอร์ให้กับหน้าเว็บที่เปิดอยู่ โดยยังคงความปลอดภัยผ่าน sandboxing และระบบสิทธิ์ที่ชัดเจน

สรุปย่อ

- ชื่อ: gooser
- แนวคิด: ให้ผู้ใช้ทั่วไป (non-developers) เพิ่ม/จัดการ snippet เพื่อปรับแต่งประสบการณ์เว็บได้ง่ายและปลอดภัย
- สแต็กหลัก: Frontend — React + TypeScript, Tailwind CSS, Vite
- เป้าหมายระยะยาว: รองรับ Desktop (Electron/Tauri), Mobile (Android/iOS) และระบบแชร์/marketplace ของ snippet

คุณสมบัติเด่น

- ไลบรารี Snippet: เพิ่ม/แก้ไข/ลบ snippet และบันทึกในเครื่อง (localStorage / native DB)
- Toolbar ปุ่มลัด: ผูกปุ่มกับ snippet เพื่อรันโค้ดทันที
- การสื่อสาร web↔host: ส่งคำสั่งด้วย window.postMessage หรือผ่าน native bridge (JSInterface)
- Sandbox & Permission: แนวทางรันโค้ดอย่างจำกัดเพื่อความปลอดภัย (iframe sandbox, permission prompt, domain restriction)
- ขยายได้: เหมาะสำหรับต่อยอดเป็น Electron/Tauri หรือสร้าง Android APK ด้วย WebView + native bridge

สถาปัตยกรรม (ภาพรวม)

แยกเป็น 2 ชั้นหลัก:
1. UI (Frontend)
   - React + TypeScript: หน้าเพิ่ม/แก้ไข snippet, toolbar, gallery
   - Build ด้วย Vite → ผลลัพธ์เป็น static files ที่สามารถฝังในแอป native ได้

2. Host / Runtime
   - Desktop: Electron หรือ Tauri (แนะนำสำหรับการเริ่มต้นและการผลิต)
   - Mobile: Android (WebView + Kotlin) หรือ Capacitor เพื่อเร่งการสร้าง APK
   - Host ทำหน้าที่: โหลดเว็บ UI, เก็บ/ซิงก์ snippet ใน DB (เช่น Room/SQLite), ตรวจสอบสิทธิ์, และ evaluateSnippet ผ่าน evaluateJavascript / executeJavaScript

เทคโนโลยีที่แนะนำ

- Desktop: Electron (rapid prototype) หรือ Tauri (ขนาดเล็ก)
- Mobile wrapper: Capacitor หรือ native WebView (Kotlin Android)
- DB ใน native: Room (Android) หรือ SQLite
- Editor: Monaco Editor หรือ CodeMirror สำหรับ syntax highlight (ในหน้าเว็บ)

การจัดการความปลอดภัย และ sandboxing

ความเสี่ยงที่ต้องระวัง:
- XSS / Data exfiltration: Snippet เข้าถึง DOM หรือข้อมูลสำคัญ
- CSP Bypass: Host อาจรันโค้ดที่ถูก CSP ป้องกันบนฝั่ง client
- Privilege escalation: โค้ดเข้าถึง API ที่แอปเป็นเจ้าของ

แนวทางป้องกัน (แนะนำ):
- รัน snippet ใน iframe sandbox เมื่อเป็นไปได้ (sandbox="allow-scripts" แบบจำกัด)
- บังคับ permission prompt ก่อนรัน snippet ที่ขอสิทธิ์พิเศษ (clipboard, geolocation เป็นต้น)
- ตรวจสอบ domain (allowlist / denylist) ก่อนฉีดโค้ดอัตโนมัติ
- บันทึกและโชว์ logs / errors ของการรัน snippet แยกต่างหาก
- ในระดับ host (native) ให้ตรวจสอบและ sanitize ก่อน evaluateJavascript
- สำหรับ community-snippet: ต้องมีกระบวนการ review/moderation ก่อนเผยแพร่

Snippet system (ฟังก์ชันหลัก)

- Library: บันทึก snippet เป็นรายการพร้อม metadata (id, title, code, domain, permissions, version)
- Import/Export: JSON import/export เพื่อแชร์หรือสำรองข้อมูล
- Versioning: เก็บประวัติการแก้ไขเพื่อ rollback
- Permissions: ระบุสิทธิ์ที่ snippet ต้องการ และ UI ให้ผู้ใช้อนุญาตแบบละเอียด
- Toolbar/Shortcuts: ให้ผู้ใช้สร้างปุ่มลัดสำหรับ snippet ที่ใช้บ่อย

การทดสอบและดีบัก

- ใช้ DevTools ของ WebView / Electron ในการ debug
- มี console/log แยกสำหรับ snippet
- จับ error ด้วย try/catch และแสดงข้อความที่เข้าใจง่าย

จากเว็บแอปไปเป็น APK (สองทางเลือก)

วิธีที่ 1 ใช้ Capacitor (เร็วสุดสำหรับการลองจริงบน Android):

1. ติดตั้ง Capacitor ในโปรเจกต์เว็บ
   - npm install @capacitor/core @capacitor/cli
2. สร้าง build ของเว็บ: npm run build
3. เริ่มต้น Capacitor และเพิ่ม Android
   - npx cap init com.example.gooser gooser
   - npx cap add android
4. คัดลอกไฟล์เว็บเข้า Android project
   - npx cap copy
5. เปิด Android Studio: npx cap open android
6. ใน MainActivity (หรือ SplashActivity) ให้ตั้งค่า WebView และเพิ่ม JavascriptInterface (HostBridge) เพื่อรับคำสั่งจากเว็บ และเรียก evaluateJavascript เมื่อจำเป็น
7. ติดตั้ง permission ใน AndroidManifest.xml (INTERNET)
8. ทดสอบบนอุปกรณ์หรือ emulator → ทำ signing และ build release APK/AAB

จุดที่ต้องทำเพิ่ม (native side):
- เก็บ snippet ใน DB (Room) และให้ native code อ่าน/ฉีดเมื่อ onPageFinished
- ทำ permission prompt และ domain checking ก่อน evaluate
- เก็บ logs ของการ evaluate และจัดการ errors

วิธีที่ 2 — ทำ Native Android โดยตรง (Kotlin WebView)

- สร้าง Android project (Kotlin)
- ฝังไฟล์เว็บลงใน assets (android/app/src/main/assets/www) หรือโหลดจาก local server
- ตั้งค่า WebView: javaScriptEnabled = true, addJavascriptInterface(HostBridge)
- ใน WebViewClient.onPageFinished ให้เรียก injectSnippetsForUrl(url)
- ใช้ Room/SQLite เก็บ snippet และกฎการอนุญาต

ตัวอย่างสั้น ๆ ของแนวทางโค้ด (Kotlin)

- ใน MainActivity:
  - เปิด WebView, เปิด JS, เพิ่ม HostBridge, โหลดไฟล์ index.html จาก assets
  - ใน onPageFinished: ดึง snippet ที่ตรง domain แล้วเรียก webView.evaluateJavascript(code, null)

- ใน HostBridge (JavascriptInterface): ให้เว็บส่งคำสั่ง JSON มา (เช่น {type: 'inject-snippet', snippet: {...}}) แล้ว native จะ validate แล้ว inject

ตัวอย่างการ forward ข้อความจากเว็บไปยัง native (index.html หรือ main script)

- ถ้ารันใน WebView ที่มี HostBridge ให้ใช้ window.Android.postMessage(JSON.stringify(payload))
- หรือฟัง window.postMessage แล้ว forward ไปยัง HostBridge

การ deploy และการเซ็น APK

- สำหรับ release build: ใช้ Android Studio เพื่อสร้าง signed APK/AAB
- ตรวจสอบ permission และ privacy policy ก่อนปล่อยจริง

การขยายฟีเจอร์และ marketplace

- Plugin API: เปิด API ให้ external dev สร้าง plugin/snippet ที่เข้าถึง sandboxed API เท่านั้น
- Marketplace: ระบบแชร์ snippet พร้อมระบบ review และ rating
- AI Assistant: ใช้ LLM ช่วยสร้าง/ปรับ snippet (human-in-the-loop ตรวจสอบก่อนรัน)

คำแนะนำสำหรับ contributor

- เปิด PR พร้อมคำอธิบายชัดเจน
- เขียน unit tests และ integration tests เมื่อเป็นไปได้
- ปฏิบัติตาม code style และ lint rules (ดู eslint config ใน repo)

Roadmap (ฉบับย่อ)

- ระยะสั้น (1-3 เดือน): Snippet manager, UI แบบพื้นฐาน, sandbox iframe
- ระยะกลาง (3-6 เดือน): Snippet gallery, import/export, permission UI, versioning
- ระยะยาว (6-12 เดือน): Plugin API, Mobile support (Android/iOS), Marketplace, AI assistant

วิธีเริ่มทำงานกับ repo นี้ (Developer Quick Start)

1. ติดตั้ง dependencies

```powershell
npm install
```

2. รัน dev server

```powershell
npm run dev
```

3. สร้าง build สำหรับ production

```powershell
npm run build
```

4. ใช้ Capacitor หรือ Android Studio เพื่อนำ build เป็น APK ตามขั้นตอนด้านบน

เอกสารเพิ่มเติมและการติดต่อ

- ดูไฟล์ `agent.md` ใน repo สำหรับบริบทเชิงเทคนิคเพิ่มเติมและแนวทางการพัฒนาเชิงลึก
- ถ้าต้องการให้ผมช่วยสร้างตัวอย่าง Android/Kotlin (HostBridge + Room + inject logic) หรือไฟล์ native ที่ต้องใช้สำหรับ Capacitor/Android Studio แจ้งมาได้เลย

สรุปความคุ้มค่า

gooser เป็นโครงการที่เหมาะสำหรับผู้ที่ต้องการปรับแต่งเว็บอย่างลึกซึ้งในรูปแบบที่เป็นมิตรต่อผู้ใช้ทั่วไป โดยคงความปลอดภัยผ่าน sandboxing และระบบ permission ที่รัดกุม การต่อยอดเป็น APK ทำได้ทั้งแบบใช้ Capacitor (เร็ว) หรือ native WebView (ยืดหยุ่นและปลอดภัยกว่าในระดับ production)

---

*ไฟล์ README นี้ถูกเขียนขึ้นโดยสรุปจากเนื้อหาใน `agent.md` เพื่อให้ใช้งานเป็นเอกสารเริ่มต้นทีชัดเจนและเป็นภาษาไทย*
