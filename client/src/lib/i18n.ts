import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "back": "Back",
      "forward": "Forward",
      "reload": "Reload",
      "layers": "Layers",
      "settings": "Settings",
      "split_view": "Split View",
      "single_view": "Single View",
      "add_layer": "Add Layer",
      "edit_layer": "Edit Layer",
      "delete_layer": "Delete Layer",
      "layer_name": "Layer Name",
      "layer_type": "Type",
      "content": "Content",
      "save": "Save",
      "cancel": "Cancel",
      "url_placeholder": "Enter URL...",
      "no_layers": "No layers added yet",
      "language": "Language",
      "theme": "Theme",
      "system": "System",
      "light": "Light",
      "dark": "Dark",
      "new_layer": "New Layer",
      "code_js": "JavaScript",
      "code_css": "CSS",
      "bookmarklet": "Bookmarklet",
      "confirm_delete": "Are you sure you want to delete this layer?"
    }
  },
  th: {
    translation: {
      "back": "ย้อนกลับ",
      "forward": "ไปข้างหน้า",
      "reload": "รีโหลด",
      "layers": "เลเยอร์",
      "settings": "การตั้งค่า",
      "split_view": "มุมมองแยก",
      "single_view": "มุมมองเดียว",
      "add_layer": "เพิ่มเลเยอร์",
      "edit_layer": "แก้ไขเลเยอร์",
      "delete_layer": "ลบเลเยอร์",
      "layer_name": "ชื่อเลเยอร์",
      "layer_type": "ประเภท",
      "content": "เนื้อหา",
      "save": "บันทึก",
      "cancel": "ยกเลิก",
      "url_placeholder": "ป้อน URL...",
      "no_layers": "ยังไม่มีเลเยอร์",
      "language": "ภาษา",
      "theme": "ธีม",
      "system": "ระบบ",
      "light": "สว่าง",
      "dark": "มืด",
      "new_layer": "เลเยอร์ใหม่",
      "code_js": "JavaScript",
      "code_css": "CSS",
      "bookmarklet": "Bookmarklet",
      "confirm_delete": "คุณแน่ใจหรือไม่ที่จะลบเลเยอร์นี้?"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'th', // Default to Thai as requested
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
