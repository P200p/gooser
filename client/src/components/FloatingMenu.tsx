import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Layers, 
  Plus, 
  Columns2, 
  Rows2,
  Maximize, 
  X,
  Languages,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingMenuProps {
  onOpenLayers: () => void;
  onToggleSplit: () => void;
  isSplit: boolean;
  splitOrientation?: 'vertical' | 'horizontal';
  onLanguageChange: () => void;
}

export function FloatingMenu({ 
  onOpenLayers, 
  onToggleSplit, 
  isSplit,
  splitOrientation = 'horizontal',
  onLanguageChange
}: FloatingMenuProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getSplitIcon = () => {
    if (!isSplit) return Columns2;
    return splitOrientation === 'horizontal' ? Rows2 : Maximize;
  };

  const getSplitLabel = () => {
    if (!isSplit) return t('split_view_horizontal') || 'แบ่งจอแนวนอน';
    return splitOrientation === 'horizontal' ? (t('split_view_vertical') || 'แบ่งจอแนวตั้ง') : (t('single_view') || 'จอเดี่ยว');
  };

  const menuItems = [
    { 
      id: "layers", 
      icon: Layers, 
      label: t('layers'), 
      onClick: () => {
        onOpenLayers();
        setIsOpen(false);
      },
      color: "bg-blue-500" 
    },
    { 
      id: "split", 
      icon: getSplitIcon(), 
      label: getSplitLabel(), 
      onClick: () => {
        onToggleSplit();
        if (isSplit && splitOrientation === 'vertical') {
          setIsOpen(false);
        }
      },
      color: "bg-purple-500" 
    },
    { 
      id: "lang", 
      icon: Languages, 
      label: i18n.language === 'th' ? 'EN' : 'TH', 
      onClick: onLanguageChange,
      color: "bg-green-500" 
    },
    { 
      id: "theme", 
      icon: isDark ? Sun : Moon, 
      label: t('theme'), 
      onClick: toggleTheme,
      color: "bg-orange-500" 
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="bg-background/80 backdrop-blur px-3 py-1 rounded-md text-sm font-medium shadow-sm border border-border/50">
                  {item.label}
                </span>
                <Button
                  size="icon"
                  className={`rounded-full shadow-lg ${item.color} text-white hover:brightness-110 border-0 h-12 w-12`}
                  onClick={item.onClick}
                >
                  <item.icon className="w-5 h-5" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.div
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        <Button
          size="icon"
          className="h-16 w-16 rounded-2xl shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-2 border-primary-foreground/10"
          onClick={toggleOpen}
        >
          {isOpen ? <Plus className="w-8 h-8" /> : <Settings className="w-8 h-8" />}
        </Button>
      </motion.div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[-1]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
