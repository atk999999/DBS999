import { ARCS, stageForms, entityInfo as getEntityPowerInfo, comparePower, savedPower, fusionPower, powerLabel, powerTier, type PowerProfile } from './power';
import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Zap, 
  Book,
  Plus, 
  Trash2, 
  Loader2, 
  Shield, 
  Dna, 
  Cpu, 
  Trophy,
  User,
  Flame, 
  ShieldAlert,
  Activity,
  Image as ImageIcon,
  Download,
  Upload,
  Skull,
  ChevronRight,
  Sparkles,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Settings,
  Ghost
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getRankColor = (rank: string) => ({'Thiên sứ':'text-purple-300','Thần cấp':'text-yellow-300','Thần khí':'text-cyan-300','Siêu chiến binh':'text-orange-300','Chiến binh Namek+':'text-green-300'}[rank] || 'text-slate-300');
const getRankBg = (_rank: string) => 'bg-slate-800/60 border-slate-600';

// --- Types ---
interface BaseCharacter {
  id: string;
  name: string;
  era: string;
  state: string;
  fusionId?: string;
  wish?: string;
}

interface DnaComponent {
  race: string;
  percentage: number;
  color: string;
}

interface FusionResult {
  powerProfile?: PowerProfile;
  id: string;
  name: string;
  description: string;
  dna_analysis?: string;
  dna_components?: DnaComponent[];
  fusion_logic?: string;
  quote: string;
  powerLevel: number;
  level: number;
  rank: string;
  imageUrl: string;
  visual_prompt?: string;
  baseCharacters: BaseCharacter[];
  userId: string;
  createdAt: any;
  zombie_compatibility?: number; // 0-100%
  zombie_multiplier?: number; // x10, x100, etc.
  power_comparison?: string;
  compatibility_score: number; // 0-100%
  compatibility_status: "Perfect" | "Stable" | "Unstable" | "Failed" | "Fatal";
}

interface ComparisonResult {
  winner: string;
  winnerReason: string;
  powerAnalysis: string;
  battleScenario: string;
  powerRatio?: string;
  winProbability?: { char1: number; char2: number };
  stats: {
    char1: { power: number; speed: number; intelligence: number; durability: number };
    char2: { power: number; speed: number; intelligence: number; durability: number };
  };
}

// Power v2 lives in power.ts. Legacy fields remain only for backup compatibility.
const fusionLabel = (f: FusionResult, all: FusionResult[]) => powerLabel(savedPower(f, all));
const fusionTier = (f: FusionResult, all: FusionResult[]) => powerTier(savedPower(f, all));

// --- Constants ---
const CHARACTER_DATA: Record<string, { eras: string[], states: Record<string, string[]> }> = {
  "Goku": {
    eras: ["Dragon Ball (Kid)", "Dragon Ball Z", "Dragon Ball GT", "Dragon Ball Super", "Xeno (Multiverse)"],
    states: {
      "Dragon Ball (Kid)": ["Base", "Great Ape"],
      "Dragon Ball Z": ["Base", "Super Saiyan", "Super Saiyan 2", "Super Saiyan 3"],
      "Dragon Ball GT": ["Base", "Super Saiyan", "Super Saiyan 2", "Super Saiyan 3", "Super Saiyan 4"],
      "Dragon Ball Super": ["Base", "Super Saiyan", "Super Saiyan God", "Super Saiyan Blue", "Ultra Instinct"],
      "Xeno (Multiverse)": ["Base", "Super Saiyan", "Super Saiyan 3", "Super Saiyan 4"]
    }
  },
  "Vegeta": {
    eras: ["Dragon Ball Z", "Dragon Ball GT", "Dragon Ball Super", "Xeno (Multiverse)"],
    states: {
      "Dragon Ball Z": ["Base", "Super Saiyan", "Super Saiyan 2", "Majin"],
      "Dragon Ball GT": ["Base", "Super Saiyan", "Super Saiyan 2", "Super Saiyan 4"],
      "Dragon Ball Super": ["Base", "Super Saiyan", "Super Saiyan God", "Super Saiyan Blue", "Blue Evolution", "Ultra Ego"],
      "Xeno (Multiverse)": ["Base", "Super Saiyan", "Super Saiyan 4"]
    }
  },
  "Gohan": {
    eras: ["Dragon Ball Z (Kid)", "Dragon Ball Z (Teen)", "Dragon Ball Z (Adult)", "Dragon Ball Super", "Future Timeline"],
    states: {
      "Dragon Ball Z (Kid)": ["Base", "Great Ape"],
      "Dragon Ball Z (Teen)": ["Base", "Super Saiyan", "Super Saiyan 2"],
      "Dragon Ball Z (Adult)": ["Base", "Super Saiyan", "Super Saiyan 2", "Ultimate"],
      "Dragon Ball Super": ["Base", "Super Saiyan", "Ultimate", "Beast Mode"],
      "Future Timeline": ["Base", "Super Saiyan"]
    }
  },
  "Trunks": {
    eras: ["Dragon Ball Z (Kid)", "Future Timeline", "Dragon Ball Super", "Xeno (Multiverse)"],
    states: {
      "Dragon Ball Z (Kid)": ["Base", "Super Saiyan"],
      "Future Timeline": ["Base", "Super Saiyan", "Super Saiyan 2"],
      "Dragon Ball Super": ["Base", "Super Saiyan", "Super Saiyan 2", "Super Saiyan Rage"],
      "Xeno (Multiverse)": ["Base", "Super Saiyan", "Super Saiyan 3", "God"]
    }
  },
  "Piccolo": {
    eras: ["Dragon Ball Z", "Dragon Ball Super"],
    states: {
      "Dragon Ball Z": ["Base", "Fused with Nail", "Fused with Kami"],
      "Dragon Ball Super": ["Base", "Potential Unleashed", "Orange Form"]
    }
  },
  "Frieza": {
    eras: ["Dragon Ball Z", "Dragon Ball Super"],
    states: {
      "Dragon Ball Z": ["1st Form", "2nd Form", "3rd Form", "Final Form", "Full Power"],
      "Dragon Ball Super": ["Final Form", "Golden Form", "Black Form"]
    }
  },
  "Broly": {
    eras: ["Dragon Ball Z (Movie)", "Dragon Ball Super", "Dragon Ball GT"],
    states: {
      "Dragon Ball Z (Movie)": ["Base", "Super Saiyan", "Legendary Super Saiyan"],
      "Dragon Ball Super": ["Base", "Wrathful", "Super Saiyan", "Full Power Super Saiyan"],
      "Dragon Ball GT": ["Base", "Super Saiyan 4"]
    }
  },
  "Omega Shenron": {
    eras: ["Dragon Ball GT"],
    states: {
      "Dragon Ball GT": ["Syn Shenron", "Omega Shenron (7 Dragons Absorbed)"]
    }
  },
  "Beerus": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Suppressed", "Hakai Mode"] }
  },
  "Whis": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Serious"] }
  },
  "Android 17": {
    eras: ["Dragon Ball Z", "Dragon Ball Super"],
    states: {
      "Dragon Ball Z": ["Base"],
      "Dragon Ball Super": ["Base", "Ranger Mode"]
    }
  },
  "Android 18": {
    eras: ["Dragon Ball Z", "Dragon Ball Super"],
    states: {
      "Dragon Ball Z": ["Base"],
      "Dragon Ball Super": ["Base"]
    }
  },
  "Krillin": {
    eras: ["Dragon Ball Z", "Dragon Ball Super"],
    states: {
      "Dragon Ball Z": ["Base", "Potential Unlocked"],
      "Dragon Ball Super": ["Base", "No Ego Zone"]
    }
  },
  "Majin Buu": {
    eras: ["Dragon Ball Z"],
    states: { "Dragon Ball Z": ["Fat Buu", "Super Buu", "Kid Buu", "Buu (Gohan Absorbed)"] }
  },
  "Cell": {
    eras: ["Dragon Ball Z"],
    states: { "Dragon Ball Z": ["First Form", "Semi-Perfect", "Perfect Form", "Super Perfect"] }
  },
  "Hit": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Full Power", "Time Skip Mastery"] }
  },
  "Cabba": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Super Saiyan", "Super Saiyan 2"] }
  },
  "Caulifla": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Super Saiyan", "Super Saiyan 2"] }
  },
  "Kale": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Super Saiyan (Berserk)", "Super Saiyan (Controlled)", "Super Saiyan 2"] }
  },
  "Champa": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base"] }
  },
  "Vados": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base"] }
  },
  "Frost": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["1st Form", "3rd Form", "Final Form", "Full Power"] }
  },
  "Jiren": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Full Power"] }
  },
  "Toppo": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "God of Destruction Mode"] }
  },
  "Dyspo": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Super Maximum Light Speed Mode"] }
  },
  "Belmod": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base"] }
  },
  "Marcarita": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base"] }
  },
  "Đại Thiên Sứ": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Serious (Xuất thủ nghiêm túc)"] }
  },
  "Zeno": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Angry (Toàn Năng - Xóa Sổ Vạn Vật)"] }
  },
  "Khởi Nguyên Thần": {
    eras: ["Cảnh Giới Tối Cao"],
    states: { "Cảnh Giới Tối Cao": ["Base", "Thức Tỉnh (1 Ý Nghĩ Xóa Sổ Vạn Thế Giới)"] }
  },
  "Hỗn Độn Thần": {
    eras: ["Cảnh Giới Tối Cao"],
    states: { "Cảnh Giới Tối Cao": ["1 Ngôi Sao ⭐", "2 Ngôi Sao ⭐⭐", "3 Ngôi Sao ⭐⭐⭐", "5 Ngôi Sao ⭐⭐⭐⭐⭐", "Tối Thượng Hư Vô ⭐ x10"] }
  },
  "Zamasu": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Fused Zamasu", "Fused Zamasu (Corrupted)"] }
  },
  "Goku Black": {
    eras: ["Dragon Ball Super"],
    states: { "Dragon Ball Super": ["Base", "Super Saiyan", "Super Saiyan Rosé"] }
  },
  "Baby (Kí sinh trùng)": {
    eras: ["Dragon Ball GT"],
    states: { "Dragon Ball GT": ["Baby Form", "Baby Vegeta", "Super Baby 1", "Super Baby 2", "Golden Great Ape Baby"] }
  },
  "Virus Zombie": {
    eras: ["Đại Dịch (Apocalypse)"],
    states: {
      "Đại Dịch (Apocalypse)": [
        "Dạng lây nhiễm cơ bản",
        "Dạng đột biến DNA",
        "Dạng cộng sinh hoàn hảo"
      ]
    }
  },
  "Pin Infinity": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Nguồn năng lượng vô hạn", "Hút 99.9% năng lượng của vật chủ"] }
  },
  "DNA Saiyan": {
    eras: ["DNA"],
    states: { "DNA": ["Base", "Super Saiyan 1", "Super Saiyan 2", "Super Saiyan 3", "Super Saiyan God", "Super Saiyan Blue"] }
  },
  "DNA Hakai": {
    eras: ["DNA"],
    states: { "DNA": ["Base", "Năng lượng Hủy Diệt", "Hakai Mode"] }
  },
  "DNA Thiên sứ": {
    eras: ["DNA"],
    states: { "DNA": ["Base", "Ultra Instinct", "Angel Power"] }
  },
  "DNA Kaioshin": {
    eras: ["DNA"],
    states: { "DNA": ["Base", "Potara Magic", "Creation Power"] }
  },
  "Nữ thần quyến rũ": {
    eras: ["NSFW"],
    states: { "NSFW": ["Dạng cơ bản", "Dạng mê hoặc", "Dạng tối thượng"] }
  },
  "Huyết mạch dâm đãng": {
    eras: ["NSFW"],
    states: { "NSFW": ["Kích hoạt", "Bùng nổ ham muốn"] }
  },
  "Trang phục thiếu vải": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Mặc vào", "Rách rưới"] }
  },
  "Hào quang mê hoặc": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kích hoạt", "Tỏa sáng"] }
  },
  "Nụ hôn tử thần": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kích hoạt", "Hút hồn"] }
  },
  "DNA Mabu": {
    eras: ["DNA"],
    states: { "DNA": ["Base", "Hấp thụ", "Tái tạo vô hạn", "Ma thuật Buu"] }
  },
  "DNA Kaioken x1000000000": {
    eras: ["DNA"],
    states: { "DNA": ["Kích hoạt", "Quá tải năng lượng", "Vượt giới hạn tuyệt đối"] }
  },
  "Người Phàm": {
    eras: ["Trái Đất"],
    states: { "Trái Đất": ["Base", "Võ sư", "Thiên tài công nghệ"] }
  },
  "Găng tay vô cực": {
    eras: ["Vật phẩm (Items)"],
    states: {
      "Vật phẩm (Items)": ["Quyền năng 6 viên đá", "Búng tay xóa sổ"]
    }
  },
  "DNA 10 quả tim": {
    eras: ["DNA"],
    states: { "DNA": ["Kích hoạt 10 quả tim", "Bùng nổ sức sống"] }
  },
  "Sợi xích infinity": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Phong ấn sức mạnh", "Giải phóng xiềng xích"] }
  },
  "Kamen Rider Decade": {
    eras: ["Heisei Era", "Neo Heisei Era"],
    states: { 
      "Heisei Era": ["Base Form", "Complete Form", "Violent Emotion"],
      "Neo Heisei Era": ["Neo Decade Form"]
    }
  },
  "Đai lưng decade": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kamen Ride: Decade", "Complete Form", "Violent Emotion"] }
  },
  "DNA sao chép": {
    eras: ["DNA"],
    states: { "DNA": ["Sao chép 99% sức mạnh", "Phân tích đối thủ"] }
  },
  "Đóng băng vĩnh viễn": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Nhốt trong khối băng", "Mất ý thức vĩnh cửu"] }
  },
  "Dơi hút máu": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Hút cạn máu", "Kí sinh năng lượng"] }
  },
  "Bộ não siêu máy tính": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kích hoạt trí tuệ nhân tạo", "Phân tích đa vũ trụ"] }
  },
  "Máy Triệu Hồi (Summon Machine)": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kích hoạt triệu hồi", "Phân tích bản gốc"] }
  },
  "Sinh mệnh vô hạn": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Bất tử bất diệt", "Hồi phục tuyệt đối"] }
  },
  "Thánh kiếm vô cực": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Chém đứt không gian", "Sát thần"] }
  },
  "Thanh tẩy debuff": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Xóa bỏ mọi trạng thái xấu", "Khôi phục trạng thái hoàn hảo"] }
  },
  "Máy Hút DNA": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kích hoạt chế độ hút DNA", "Phân tích cấu trúc gen"] }
  },
  "Bàn tay phải của Daishinkan (bị chặt đứt)": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Nguồn sức mạnh tối cao", "Lời nguyền của Thiên Sứ"] }
  },
  "Thiện Ác": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Chuyển đổi Thiện sang Ác", "Chuyển đổi Ác sang Thiện"] }
  },
  "Dragon Ball Super": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kích hoạt điều ước"] }
  },
  "Đoạt linh hồn": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Kích hoạt"] }
  },
  "Đoạt xác": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Hút hồn", "Đoạt xác"] }
  },
  "Linh hồn": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Nhập hồn", "Hồi sinh"] }
  },
  "Tước đoạt": {
    eras: ["Vật phẩm (Items)"],
    states: { "Vật phẩm (Items)": ["Cướp huyết mạch", "Tước đoạt sức mạnh", "Hấp thụ linh hồn"] }
  },
  "Cumber": {
    eras: ["Dragon Ball Heroes"],
    states: {
      "Dragon Ball Heroes": ["Base", "Evil Saiyan", "Super Saiyan", "Super Saiyan 3", "Golden Great Ape"]
    }
  },
  "Fu": {
    eras: ["Dragon Ball Heroes"],
    states: {
      "Dragon Ball Heroes": ["Base", "Super Fu", "Dark King Fu"]
    }
  },
  "Hearts": {
    eras: ["Dragon Ball Heroes"],
    states: {
      "Dragon Ball Heroes": ["Base", "Super Hearts", "Ultimate Hearts"]
    }
  },
  "Mechikabura": {
    eras: ["Dragon Ball Heroes"],
    states: {
      "Dragon Ball Heroes": ["Dạng già", "Dạng trẻ", "Dark King Mechikabura"]
    }
  },
  "Sealas": {
    eras: ["Dragon Ball Heroes"],
    states: {
      "Dragon Ball Heroes": ["Base", "Dung hợp với Ahms"]
    }
  },
  "Chronoa": {
    eras: ["Dragon Ball Heroes"],
    states: {
      "Dragon Ball Heroes": ["Base", "Giải phóng sức mạnh thời gian"]
    }
  }
};

// Explicit story stages: selection changes both the base power and available forms.
for (const name of ['Goku', 'Vegeta']) {
  const data = CHARACTER_DATA[name];
  for (const [era, config] of Object.entries(ARCS)) {
    const states = stageForms(name, era);
    data.states[era] = states;
  }
  data.eras = [...Object.keys(ARCS), ...data.eras];
}

const UNIVERSES: Record<string, string[]> = {
  "Vũ trụ 7": ["Goku", "Vegeta", "Gohan", "Trunks", "Piccolo", "Frieza", "Broly", "Beerus", "Whis", "Android 17", "Android 18", "Krillin", "Majin Buu", "Cell", "Omega Shenron"],
  "Vũ trụ 6": ["Hit", "Cabba", "Caulifla", "Kale", "Champa", "Vados", "Frost"],
  "Vũ trụ 11": ["Jiren", "Toppo", "Dyspo", "Belmod", "Marcarita"],
  "Thần Thánh Tối Cao": ["Đại Thiên Sứ", "Zeno", "Khởi Nguyên Thần", "Hỗn Độn Thần"],
  "Dragon Ball Heroes": ["Cumber", "Fu", "Hearts", "Mechikabura", "Sealas", "Chronoa"],
  "Trang bị": ["Pin Infinity", "Sợi xích infinity", "Găng tay vô cực", "Thánh kiếm vô cực", "Máy Hút DNA", "Máy Triệu Hồi (Summon Machine)", "Bộ não siêu máy tính", "Bàn tay phải của Daishinkan (bị chặt đứt)"],
  "Vật phẩm (Items)": ["Đóng băng vĩnh viễn", "Dơi hút máu", "Sinh mệnh vô hạn", "Thanh tẩy debuff", "Tước đoạt", "Đoạt linh hồn", "Đoạt xác", "Linh hồn", "Thiện Ác", "Dragon Ball Super"],
  "DNA": ["DNA Saiyan", "DNA Hakai", "DNA Thiên sứ", "DNA Kaioshin", "DNA Mabu", "DNA Kaioken x1000000000", "DNA 10 quả tim", "DNA sao chép"],
  "NSFW 18+": ["Nữ thần quyến rũ", "Huyết mạch dâm đãng", "Trang phục thiếu vải", "Hào quang mê hoặc", "Nụ hôn tử thần"],
  "Khác": ["Goku Black", "Zamasu", "Baby (Kí sinh trùng)", "Virus Zombie", "Người Phàm"]
};

const PRESET_CHARACTERS = Object.keys(CHARACTER_DATA);

// --- Components ---
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("App Error:", e.error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 p-8 rounded-3xl text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Đã xảy ra lỗi hệ thống</h1>
          <p className="text-slate-400">Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

const CharacterSelector = ({ 
  value, 
  onChange, 
  fusions, 
  upgradeFusion,
  isNsfw,
  fusionsOnly
}: { 
  value: string, 
  onChange: (val: string) => void, 
  fusions: FusionResult[],
  upgradeFusion?: FusionResult | null,
  isNsfw?: boolean,
  fusionsOnly?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>(fusionsOnly ? ["Sổ Dung Hợp"] : ["Vũ trụ 7"]); 
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fusionsOnly && !expandedCats.includes("Sổ Dung Hợp")) {
      setExpandedCats(prev => [...prev, "Sổ Dung Hợp"]);
    }
  }, [fusionsOnly]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const getDisplayName = (val: string) => {
    if (val.startsWith('FUSION:')) {
      const id = val.replace('FUSION:', '');
      return fusions.find(f => f.id === id)?.name || val;
    }
    return val;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white hover:bg-slate-700 transition-colors"
      >
        <span className="truncate">{getDisplayName(value)}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform text-slate-500", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-y-auto max-h-[400px]"
          >
            <div className="p-2 space-y-1">
              {!fusionsOnly && Object.entries(UNIVERSES)
                .filter(([universe]) => {
                  if (universe === "NSFW 18+" && !isNsfw) return false;
                  if (upgradeFusion) {
                    return universe === "Trang bị" || universe === "Vật phẩm (Items)" || universe === "DNA" || (universe === "NSFW 18+" && isNsfw);
                  }
                  return true;
                })
                .map(([universe, chars]) => {
                  const isExpanded = expandedCats.includes(universe);
                  return (
                    <div key={universe} className="space-y-1">
                      <button
                        onClick={() => toggleCat(universe)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-cyan-400"
                      >
                        <span>{universe}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-1 gap-0.5 pl-2">
                          {chars.map(p => (
                            <button
                              key={p}
                              onClick={() => {
                                onChange(p);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                                value === p ? "bg-cyan-500/20 text-cyan-400" : "text-slate-300 hover:bg-slate-800"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {fusions.length > 0 && (
                <div className={cn("space-y-1", !fusionsOnly && "border-t border-slate-800 pt-1 mt-1")}>
                  <button
                    onClick={() => toggleCat("Sổ Dung Hợp")}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-yellow-400"
                  >
                    <span className="flex items-center gap-1"><Book className="w-3 h-3" /> Sổ Dung Hợp</span>
                    {expandedCats.includes("Sổ Dung Hợp") ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedCats.includes("Sổ Dung Hợp") && (
                    <div className="grid grid-cols-1 gap-0.5 pl-2">
                      {fusions.map(f => (
                        <button
                          key={f.id}
                          title={f.name}
                          onClick={() => {
                            onChange(`FUSION:${f.id}`);
                            setIsOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                            value === `FUSION:${f.id}` ? "bg-yellow-500/20 text-yellow-400" : "text-slate-300 hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{f.name}</span>
                            <span className="text-[9px] opacity-50 shrink-0 ml-2">Rank {fusionTier(f, fusions)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <FusionApp />
    </ErrorBoundary>
  );
}

function FusionApp() {
  const [selectedChars, setSelectedChars] = useState<BaseCharacter[]>(() => {
    const saved = localStorage.getItem('selected_chars');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load selected characters:", e);
      }
    }
    return [
      { id: crypto.randomUUID(), name: "Goku", era: "DBZ · Namek / Frieza", state: "Super Saiyan" },
      { id: crypto.randomUUID(), name: "Vegeta", era: "DBZ · Cell", state: "Super Saiyan" }
    ];
  });
  const [fusions, setFusions] = useState<FusionResult[]>(() => {
    const saved = localStorage.getItem('fusion_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((f: any) => f && typeof f.name === 'string').map((f: any) => ({...f, id: f.id || crypto.randomUUID()})) : [];
    } catch (e) {
      console.error("Failed to load history:", e);
      return [];
    }
  });
  const [isFusing, setIsFusing] = useState(false);
  const [mode, setMode] = useState<'fusion' | 'comparison'>('fusion');
  
  // Comparison State
  const [compareChar1, setCompareChar1] = useState<BaseCharacter>(() => {
    if (fusions.length > 0) {
      const f = fusions[0];
      return { id: 'c1', name: f.name, era: "Sổ Dung Hợp", state: `Rank ${fusionTier(f, fusions)}`, fusionId: f.id };
    }
    return { id: 'c1', name: "Goku", era: "DBZ · Namek / Frieza", state: "Super Saiyan" };
  });
  const [compareChar2, setCompareChar2] = useState<BaseCharacter>(() => {
    if (fusions.length > 1) {
      const f = fusions[1];
      return { id: 'c2', name: f.name, era: "Sổ Dung Hợp", state: `Rank ${fusionTier(f, fusions)}`, fusionId: f.id };
    }
    return { id: 'c2', name: "Goku", era: "DBS · Giải đấu Sức mạnh", state: "Super Saiyan" };
  });
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const [fusionStep, setFusionStep] = useState<string>("");
  const [currentFusion, setCurrentFusion] = useState<FusionResult | null>(null);
  const [upgradeFusion, setUpgradeFusion] = useState<FusionResult | null>(null);
  const [view, setView] = useState<'lab' | 'fusions'>('lab');
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [quotaUsed, setQuotaUsed] = useState<number>(0);
  const [isNsfw, setIsNsfw] = useState<boolean>(() => {
    return localStorage.getItem('is_nsfw') === 'true';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const DAILY_QUOTA_LIMIT = 50;

  // --- Latest AI Models Configuration ---
  const [textModel, setTextModel] = useState<string>(() => {
    const saved = localStorage.getItem('gemini_text_model');
    if (!saved || saved === 'gemini-3-flash-preview') return 'gemini-3.8-flash';
    return saved;
  });
  const [imageModel, setImageModel] = useState<string>(() => {
    const saved = localStorage.getItem('gemini_image_model');
    if (!saved || saved === 'gemini-2.5-flash-image') return 'gemini-3.1-flash-lite-image';
    return saved;
  });

  const handleTextModelChange = (model: string) => {
    setTextModel(model);
    localStorage.setItem('gemini_text_model', model);
  };

  const handleImageModelChange = (model: string) => {
    setImageModel(model);
    localStorage.setItem('gemini_image_model', model);
  };

  // --- Quota Management ---
  useEffect(() => {
    const today = new Date().toDateString();
    const savedQuotaDate = localStorage.getItem('fusion_quota_date');
    const savedQuotaUsed = localStorage.getItem('fusion_quota_used');

    if (savedQuotaDate !== today) {
      localStorage.setItem('fusion_quota_date', today);
      localStorage.setItem('fusion_quota_used', '0');
      setQuotaUsed(0);
    } else if (savedQuotaUsed) {
      setQuotaUsed(parseInt(savedQuotaUsed, 10));
    }
  }, []);

  const updateQuota = () => {
    const newUsed = quotaUsed + 1;
    setQuotaUsed(newUsed);
    localStorage.setItem('fusion_quota_used', newUsed.toString());
  };

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('fusion_history', JSON.stringify(fusions));
  }, [fusions]);

  useEffect(() => {
    localStorage.setItem('selected_chars', JSON.stringify(selectedChars));
  }, [selectedChars]);

  const deleteFusion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting === id) {
      setFusions(prev => prev.filter(f => f.id !== id));
      setIsDeleting(null);
    } else {
      setIsDeleting(id);
      setTimeout(() => setIsDeleting(null), 3000);
    }
  };

  const exportBackup = () => {
    const backupData = {
      fusions,
      quotaUsed,
      quotaDate: localStorage.getItem('fusion_quota_date'),
      version: "2.0"
    };
    const data = JSON.stringify(backupData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fusion-lab-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          setFusions(data);
          localStorage.setItem('fusion_history', JSON.stringify(data));
        } else if (data && typeof data === 'object') {
          if (data.fusions) {
            setFusions(data.fusions);
            localStorage.setItem('fusion_history', JSON.stringify(data.fusions));
          }
          if (typeof data.quotaUsed === 'number') {
            setQuotaUsed(data.quotaUsed);
            localStorage.setItem('fusion_quota_used', data.quotaUsed.toString());
          }
          if (data.quotaDate) {
            localStorage.setItem('fusion_quota_date', data.quotaDate);
          }
        }
        setError(null);
      } catch (err) {
        setError("Dữ liệu sao lưu không hợp lệ.");
      }
    };
    reader.readAsText(file);
  };

  // --- Fusion Logic ---
  const addCharacter = () => {
    if (selectedChars.length < 6) {
      if (upgradeFusion) {
        setSelectedChars([...selectedChars, { id: crypto.randomUUID(), name: "Pin Infinity", era: "Vật phẩm (Items)", state: "Nguồn năng lượng vô hạn" }]);
      } else {
        setSelectedChars([...selectedChars, { id: crypto.randomUUID(), name: "Gohan", era: "Dragon Ball Z (Teen)", state: "Base" }]);
      }
    }
  };

  const removeCharacter = (id: string) => {
    const minChars = 1;
    if (selectedChars.length > minChars) {
      setSelectedChars(selectedChars.filter(c => c.id !== id));
    }
  };

  const updateCharacter = (index: number, field: keyof BaseCharacter, value: string) => {
    const newChars = [...selectedChars];
    const char = newChars[index];
    if (field === 'name') {
      if (value.startsWith('FUSION:')) {
        const fusionId = value.replace('FUSION:', '');
        const fusion = fusions.find(f => f.id === fusionId);
        if (fusion) {
          newChars[index] = { 
            ...char, 
            name: fusion.name, 
            era: "Sổ Dung Hợp", 
            state: `Rank ${fusion.rank}`,
            fusionId: fusion.id 
          };
        }
      } else {
        const firstEra = CHARACTER_DATA[value].eras[0];
        const firstState = CHARACTER_DATA[value].states[firstEra][0];
        newChars[index] = { ...char, name: value, era: firstEra, state: firstState, fusionId: undefined };
      }
    } else if (field === 'era') {
      if (!char.fusionId) {
        const firstState = CHARACTER_DATA[char.name].states[value][0];
        newChars[index] = { ...char, era: value, state: firstState };
      }
    } else if (field === 'state') {
      newChars[index] = { ...char, state: value };
    } else if (field === 'wish') {
      newChars[index] = { ...char, wish: value };
    }
    setSelectedChars(newChars);
  };

  const compressImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        ctx?.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = base64;
    });
  };

  useEffect(() => { setComparisonResult(null); }, [compareChar1, compareChar2, fusions]);
  const startComparison = () => {
    setError(null);
    const a = getEntityPowerInfo(compareChar1, fusions);
    const b = getEntityPowerInfo(compareChar2, fusions);
    const m = comparePower(a, b);
    setComparisonResult({
      winner: m.expectedWinner,
      winnerReason: m.known ? 'Kết quả mô phỏng dựa trên lực thuần, kỹ thuật, tốc độ và sức bền. Các hệ số là quy ước game.' : 'Một bên chưa có hồ sơ hiệu chỉnh hoặc dùng quyền năng ngoài thang đấu tay đôi.',
      powerAnalysis: `${a.name} — ${a.era} / ${a.state}: ${a.formattedPower}. ${a.description}\n\n${b.name} — ${b.era} / ${b.state}: ${b.formattedPower}. ${b.description}`,
      battleScenario: m.known ? (m.winnerChar === 0 ? 'Hai bên cân bằng theo các thuộc tính hiện tại; không ép chọn người thắng.' : `${m.expectedWinner} có lợi thế trong đấu trực diện ở trạng thái đã chọn. Mô phỏng không tính phục kích, phong ấn, hồi sinh hoặc điều kiện chiến trường đặc biệt.`) : 'Hãy chọn nhân vật và trạng thái đã hiệu chỉnh. Không gán chỉ số mặc định cho hồ sơ thiếu.',
      powerRatio: m.ratioText,
      ...(m.known ? {winProbability:{char1:m.prob1,char2:m.prob2}} : {}),
      stats:m.stats
    });
  };

  const sanitizePrompt = (prompt: string): string => {
    let sanitized = prompt;
    sanitized = sanitized.replace(/corpse|dead body|xác/gi, "soulless vessel");
    sanitized = sanitized.replace(/dead eyes|lifeless eyes/gi, "opaque eyes");
    sanitized = sanitized.replace(/revived from death|hồi sinh/gi, "awakened from slumber");
    sanitized = sanitized.replace(/blood|máu|gore/gi, "crimson energy");
    sanitized = sanitized.replace(/flesh/gi, "physical form");
    sanitized = sanitized.replace(/kill|killing|murder/gi, "defeat");
    sanitized = sanitized.replace(/death|dying/gi, "dormant state");
    return sanitized;
  };

  const startFusion = async () => {
    if (quotaUsed >= DAILY_QUOTA_LIMIT) {
      setError(`Bạn đã hết lượt dung hợp trong ngày (${DAILY_QUOTA_LIMIT}/${DAILY_QUOTA_LIMIT}). Vui lòng quay lại vào ngày mai!`);
      return;
    }
    setIsFusing(true);
    const isSummon = selectedChars.length === 1 && !upgradeFusion;
    setFusionStep(isSummon ? "Đang triệu hồi thực thể bản gốc..." : "Đang phân tích cấu trúc DNA...");
    setError(null);
    setCurrentFusion(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const currentAi = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      let specialInstructions = "";
      if (isNsfw) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (NSFW 18+ - NỘI DUNG NGƯỜI LỚN):
        - Thực thể có thể mang các đặc điểm cực kỳ quyến rũ, gợi cảm, trang phục thiếu vải hoặc táo bạo (nếu phù hợp).
        - Mô tả (description) và câu thoại (quote) có thể mang tính chất trưởng thành, lôi cuốn, mang hơi hướng 18+.
        - Hình ảnh (visual_prompt): Thêm các từ khóa mạnh như "extremely seductive", "revealing outfit", "curvy", "mature theme", "sensual pose", "adult content" (nhưng vẫn phải cân nhắc để không bị AI chặn hoàn toàn).
        - LƯU Ý: Vẫn phải giữ được cái chất của nhân vật gốc nhưng ở phiên bản "người lớn" hơn.`;
      }
      const hasPurifier = selectedChars.some(c => c.name === "Thanh tẩy debuff");
      
      if (isSummon && UNIVERSES["DNA"].includes(selectedChars[0].name)) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Ống DNA):
        - ĐÂY LÀ MỘT VẬT PHẨM DNA.
        - NGOẠI HÌNH (Visual Prompt): Một ống thủy tinh nhỏ (glass vial/tube) trong suốt, bên trong chứa dung dịch DNA lỏng đang cuộn xoáy và phát sáng rực rỡ. TUYỆT ĐỐI KHÔNG ĐƯỢC xuất hiện khuôn mặt hay cơ thể nhân vật bên trong hay bên ngoài ống, chỉ là 1 ống thủy tinh chứa DNA lỏng.`;
      }

      if (isSummon) {
        specialInstructions += `
        ĐÂY LÀ TRIỆU HỒI BẢN GỐC (TUYỆT ĐỐI KHÔNG PHẢI DUNG HỢP):
        - Nhân vật: ${selectedChars[0].name} (${selectedChars[0].era}, ${selectedChars[0].state}).
        - YÊU CẦU BẮT BUỘC: Giữ nguyên 100% bản gốc. KHÔNG THÊM bất kỳ chi tiết máy móc, công nghệ, hay yếu tố ngoại lai nào.
        - TÊN NHÂN VẬT: Phải là "${selectedChars[0].name}" (Có thể kèm trạng thái như "Goku Super Saiyan Blue"). TUYỆT ĐỐI KHÔNG thêm các hậu tố như "-Machina", "Summoner", "Cyborg", v.v.
        - NGOẠI HÌNH: Phải giống hệt nguyên tác Dragon Ball. KHÔNG được có các bộ phận cơ khí hay hào quang lạ.
        - Chỉ tạo mô tả và ngoại hình cho nhân vật ở đúng thời kỳ, trạng thái; không tự tạo chỉ số hay rank.
        - Độ tương thích (compatibility_score) cho triệu hồi bản gốc luôn là 100% và status là "Perfect".`;
      }

      if (selectedChars.some(c => c.name === "Virus Zombie")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Virus Zombie):
        - Nếu có Virus Zombie tham gia, thực thể tạo ra PHẢI mang đặc tính: Bất tử (Immortal), Mất trí (Lost mind), Điên cuồng (Frenzied).
        - AI HÃY TỰ QUYẾT ĐỊNH: Phân tích DNA của các nhân vật khác để đưa ra "Độ tương thích" (zombie_compatibility) từ 0% đến 100%.
        - Ngoại hình phải thể hiện sự biến dị, đáng sợ, mang dấu ấn của đại dịch zombie.`;
      }
      const pinInfinity = selectedChars.find(c => c.name === "Pin Infinity");
      if (pinInfinity) {
        if (pinInfinity.state === "Nguồn năng lượng vô hạn") {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Pin Infinity - Nguồn năng lượng vô hạn):
          - Thực thể PHẢI có nguồn năng lượng vô hạn, không bao giờ kiệt sức.
          - Ngoại hình có các chi tiết máy móc hoặc hào quang năng lượng xanh lam rực rỡ.`;
        } else if (pinInfinity.state === "Hút 99.9% năng lượng của vật chủ") {
          if (!hasPurifier) {
            specialInstructions += `
            LƯU Ý ĐẶC BIỆT (Pin Infinity - Hút 99.9% năng lượng của vật chủ):
            - Thực thể bị Pin Infinity hút cạn kiệt năng lượng (99.9%).
            - Ngoại hình thể hiện sự kiệt quệ, hào quang mờ nhạt, có thể có các dây cáp hoặc thiết bị đang hút năng lượng từ cơ thể.
            - Tên thực thể nên có hậu tố "(Kiệt quệ)" hoặc "(Drained)".`;
          } else {
            specialInstructions += `
            LƯU Ý ĐẶC BIỆT (Pin Infinity - Năng lượng đã được thanh tẩy):
            - Pin Infinity đã bị thanh tẩy, không còn hút năng lượng.
            - Thực thể duy trì sức mạnh bình thường.`;
          }
        }
      }
      if (selectedChars.some(c => c.name === "DNA Saiyan")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA Saiyan):
        - Thực thể mang dòng máu Saiyan, có khả năng tăng tiến sức mạnh vô hạn sau mỗi trận chiến.
        - Phải thể hiện được đặc điểm của người Saiyan (tóc dựng, hào quang).
        - Có thể đạt đến các trạng thái từ Super Saiyan đến Saiyan Blue.`;
      }
      if (selectedChars.some(c => c.name === "Vĩnh hằng sharingan")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Vĩnh hằng sharingan):
        - Thực thể sở hữu đôi mắt Vĩnh hằng Sharingan (Eternal Mangekyou Sharingan).
        - Có khả năng sử dụng ảo thuật tối thượng, triệu hồi Susanoo toàn chân thể.
        - Tăng khả năng phản xạ, đọc trước chuyển động của đối thủ.
        - Ngoại hình: Đôi mắt có hoa văn phức tạp màu đỏ rực rỡ, hào quang Susanoo bao quanh.`;
      }
      if (selectedChars.some(c => c.name === "Rinnegan")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Rinnegan):
        - Thực thể sở hữu đôi mắt Rinnegan (Lục Đạo Nhãn).
        - Có khả năng sử dụng Lục Đạo Luân Hồi, hấp thụ nhẫn thuật và điều khiển trọng lực (Thần La Thiên Chinh).
        - Ngoại hình: Đôi mắt có các vòng tròn đồng tâm màu tím nhạt, hào quang mang tính tâm linh huyền bí.`;
      }
      if (selectedChars.some(c => c.name === "Teiseigan")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Teiseigan):
        - Thực thể sở hữu đôi mắt Teiseigan (Tenseigan - Chuyển Sinh Nhãn).
        - Có khả năng điều khiển sức mạnh của mặt trăng, kích hoạt Chế độ hiền nhân Tenseigan.
        - Ngoại hình: Đôi mắt màu xanh dương rực rỡ với hoa văn bông tuyết, hào quang màu xanh lục bảo.`;
      }
      if (selectedChars.some(c => c.name === "Thập vĩ")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Thập vĩ):
        - Thực thể sở hữu sức mạnh của Thập Vĩ (Juubi) - nguồn gốc của mọi Chakra.
        - Có khả năng bắn Bom Vĩ Thú (Bijuu Dama) và gây ra Thiên Địa Biến Dạng.
        - Ngoại hình: Có 10 cái đuôi khổng lồ, cơ thể mang đặc điểm của quái thú cổ đại, một con mắt Rinne-Sharingan lớn trên trán.`;
      }
      if (selectedChars.some(c => c.name === "Gomu Gomu no Mi")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Gomu Gomu no Mi):
        - Thực thể sở hữu cơ thể cao su, miễn nhiễm hoàn toàn với các đòn tấn công bằng điện.
        - Nếu ở trạng thái Gear 5, thực thể mang hình dáng Thần Mặt Trời Nika: Tóc và quần áo chuyển sang màu trắng, có dải mây bao quanh cổ, nụ cười rạng rỡ.
        - Khả năng chiến đấu tự do, biến mọi thứ xung quanh thành cao su.`;
      }
      if (selectedChars.some(c => c.name === "Lục nhãn & Vô hạ hạn")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Lục nhãn & Vô hạ hạn):
        - Thực thể sở hữu Lục Nhãn (Six Eyes) và Vô Hạ Hạn (Limitless).
        - Khả năng "Vô Hạn" khiến đối thủ không bao giờ có thể chạm vào thực thể.
        - Có thể sử dụng "Hư Thức: Tử" (Hollow Purple) để xóa sổ mọi vật chất trên đường đi.
        - Ngoại hình: Đôi mắt màu xanh dương rực rỡ như bầu trời, hào quang mang tính áp đảo tuyệt đối.`;
      }
      if (selectedChars.some(c => c.name === "Sức mạnh Saitama")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Sức mạnh Saitama):
        - Thực thể sở hữu sức mạnh tuyệt đối, có thể kết thúc mọi trận chiến chỉ bằng một cú đấm.
        - Ngoại hình: Có thể mang đặc điểm đầu hói hoặc ánh mắt nghiêm túc, áo choàng trắng.
        - Trong phần mô tả, hãy nhấn mạnh vào sự nhàm chán vì quá mạnh.`;
      }
      if (selectedChars.some(c => c.name === "Hơi thở của mặt trời")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Hơi thở của mặt trời):
        - Thực thể sử dụng kỹ thuật kiếm thuật cổ xưa nhất, mang sức mạnh của mặt trời.
        - Các đòn tấn công mang hiệu ứng lửa rực rỡ, có khả năng chém đứt mọi loại phòng ngự.
        - Ngoại hình: Có các vết bớt đỏ trên trán, hào quang lửa mặt trời bao quanh vũ khí.`;
      }
      if (selectedChars.some(c => c.name === "Sức mạnh Naruto (Lục đạo)")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Sức mạnh Naruto - Lục đạo):
        - Thực thể sở hữu sức mạnh của Lục Đạo Hiền Nhân.
        - Có khả năng sử dụng các quả Cầu Đạo Ngọc (Truth-Seeking Balls) bay quanh lưng.
        - Có thể sử dụng Bom Vĩ Thú Rasenshuriken.
        - Ngoại hình: Áo choàng hào quang màu vàng rực rỡ, đôi mắt có hoa văn đặc trưng của Lục Đạo.`;
      }
      if (selectedChars.some(c => c.name === "Sức mạnh Ichigo (Bankai)")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Sức mạnh Ichigo - Bankai):
        - Thực thể sở hữu sức mạnh Tử Thần tối thượng.
        - Sử dụng thanh kiếm Tensa Zangetsu màu đen tuyền, tốc độ cực nhanh.
        - Có thể sử dụng tuyệt kỹ Mugetsu (Vô Nguyệt) để xóa sổ đối thủ.
        - Ngoại hình: Trang phục Tử Thần màu đen, có thể mang mặt nạ Hollow một phần.`;
      }
      if (selectedChars.some(c => c.name === "Sức mạnh Natsu (Hỏa long vương)")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Sức mạnh Natsu - Hỏa long vương):
        - Thực thể sở hữu sức mạnh của Hỏa Long Vương.
        - Các đòn tấn công bằng lửa có nhiệt độ cực cao, có thể đốt cháy cả ma thuật.
        - Ngoại hình: Có vảy rồng xuất hiện trên da, hào quang lửa đỏ thẫm bao phủ.`;
      }
      if (selectedChars.some(c => c.name === "Sức mạnh Meliodas (Ma thần vương)")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Sức mạnh Meliodas - Ma thần vương):
        - Thực thể sở hữu sức mạnh của Ma Thần Vương.
        - Có khả năng "Phản đòn toàn phần" (Full Counter) để phản lại mọi đòn tấn công năng lượng.
        - Ngoại hình: Dấu ấn ma thần trên trán, đôi cánh bóng tối, hào quang đen tím huyền bí.`;
      }
      if (selectedChars.some(c => c.name === "DNA Hakai")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA Hakai):
        - Thực thể sở hữu sức mạnh Hủy Diệt (Hakai), có thể xóa sổ vật chất.
        - Lực chiến cực lớn, hào quang màu tím đậm đặc trưng của Thần Hủy Diệt.
        - Tính cách có phần lạnh lùng, quyết đoán.`;
      }
      if (selectedChars.some(c => c.name === "DNA Thiên sứ")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA Thiên sứ):
        - Thực thể sở hữu quyền năng của Thiên Sứ, tốc độ và phản xạ tuyệt đối (Bản Năng Vô Cực).
        - Hào quang màu trắng bạc rực rỡ, vẻ ngoài thanh cao, điềm tĩnh.
        - Lực chiến ở mức tối thượng, vượt xa các cấp độ thông thường.`;
      }
      if (selectedChars.some(c => c.name === "DNA Kaioshin")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA Kaioshin):
        - Thực thể sở hữu sức mạnh sáng tạo và phép thuật của các vị thần tối cao.
        - Có khả năng sử dụng phép thuật Potara, chữa trị và tạo ra vật chất.
        - Hào quang dịu nhẹ màu xanh lá hoặc vàng, trang phục mang phong cách thần thánh.`;
      }
      if (selectedChars.some(c => c.name === "DNA Mabu")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA Mabu):
        - Thực thể sở hữu khả năng tái tạo vô hạn (Regeneration) và hấp thụ (Absorption).
        - Có thể biến đối thủ thành kẹo hoặc socola bằng ma thuật.
        - Thân hình co giãn linh hoạt, cực kỳ khó bị tiêu diệt vật lý.
        - Ngoại hình mang đặc điểm của chủng tộc Mabu (da hồng, có vòi trên đầu).`;
      }
      if (selectedChars.some(c => c.name === "DNA Kaioken x1000000000")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA Kaioken x1000000000):
        - Hào quang đỏ rực bao phủ toàn bộ không gian, áp lực cực lớn khiến vạn vật xung quanh tan biến.
        - Thực thể mang sức mạnh hủy diệt đa vũ trụ chỉ bằng một hơi thở.
        - Tuy nhiên, cơ thể luôn trong tình trạng quá tải năng lượng cực độ.`;
      }
      if (selectedChars.some(c => c.name === "Người Phàm")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Người Phàm):
        - Thực thể mang trong mình ý chí và sự bền bỉ của con người.
        - Nếu dung hợp với các thực thể thần thánh, hãy nhấn mạnh vào sự cân bằng giữa sức mạnh tối thượng và tâm hồn phàm trần.
        - Có thể sở hữu những kỹ năng võ thuật tinh xảo hoặc trí tuệ công nghệ vượt trội.
        - Lực chiến có thể không quá cao nhưng khả năng thích nghi và tiềm năng là vô hạn.`;
      }
      if (selectedChars.some(c => c.name === "DNA 10 quả tim")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA 10 quả tim):
        - Thực thể sở hữu 10 quả tim, mang lại sức sống mãnh liệt và khả năng hồi phục không tưởng.
        - Mỗi quả tim đại diện cho một mạng sống hoặc một nguồn năng lượng dự trữ khổng lồ.
        - Lực chiến và khả năng chịu đựng tăng vọt.`;
      }
      if (selectedChars.some(c => c.name === "Đoạt linh hồn")) {
        const otherChar = selectedChars.find(c => c.name !== "Đoạt linh hồn");
        if (otherChar) {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Đoạt linh hồn):
          - ĐÂY LÀ QUÁ TRÌNH CƯỚP ĐOẠT LINH HỒN.
          - Thực thể tạo ra PHẢI là "Linh hồn của ${otherChar.name}".
          - NGOẠI HÌNH (Visual Prompt): Một thực thể dạng linh hồn (soul/spirit/ghostly form) mờ ảo, phát sáng xanh lam hoặc trắng nhạt, mang hình dáng của ${otherChar.name} (${otherChar.era}, ${otherChar.state}). Cơ thể có thể hơi trong suốt, có các dải năng lượng linh hồn bao quanh.
          - TÊN THỰC THỂ: Phải là "Linh hồn của ${otherChar.name}".
          - MÔ TẢ: Nhấn mạnh vào việc đây là phần tinh túy nhất, sức mạnh tâm linh thuần khiết của ${otherChar.name} sau khi bị tước đoạt khỏi thể xác.`;
        }
      }
      if (selectedChars.some(c => c.name === "Sợi xích infinity")) {
        if (!hasPurifier) {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Sợi xích infinity):
          - Nếu ở trạng thái "Phong ấn", lực chiến bị giảm đáng kể nhưng tiềm năng ẩn giấu cực lớn.
          - Ngoại hình có các sợi xích quấn quanh cơ thể hoặc hào quang bị kìm hãm.`;
        } else {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Sợi xích infinity - Đã thanh tẩy):
          - Sợi xích đã bị phá vỡ hoặc thanh tẩy, không còn kìm hãm sức mạnh.
          - Thực thể bùng nổ sức mạnh tối đa.`;
        }
      }
      if (selectedChars.some(c => c.name === "Găng tay vô cực")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Găng tay vô cực):
        - Thực thể sở hữu Găng tay vô cực với 6 viên đá vô cực.
        - Có khả năng thao túng thực tại, thời gian, không gian, linh hồn, sức mạnh và trí tuệ.
        - Ngoại hình: Đeo một chiếc găng tay vàng lớn với 6 viên đá phát sáng rực rỡ.`;
      }
      if (selectedChars.some(c => c.name === "DNA sao chép")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (DNA sao chép):
        - Thực thể có khả năng sao chép hoàn hảo sức mạnh của đối thủ hoặc các nhân vật khác trong danh sách dung hợp.
        - Ngoại hình có thể có các bộ phận dạng gương hoặc trong suốt, phản chiếu hình ảnh của các nhân vật khác.
        - Kỹ năng bao gồm việc tái hiện lại các chiêu thức của đối phương với độ chính xác cực cao.`;
      }
      if (selectedChars.some(c => c.name === "Đóng băng vĩnh viễn")) {
        if (!hasPurifier) {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Đóng băng vĩnh viễn):
          - Thực thể bị nhốt hoàn toàn trong một khối băng khổng lồ, vĩnh cửu.
          - Trạng thái: Mất ý thức hoàn toàn, không thể cử động.
          - Ngoại hình: Toàn bộ cơ thể bị bao phủ bởi lớp băng dày, trong suốt, có hơi lạnh tỏa ra.`;
        } else {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Đóng băng vĩnh viễn - Đã tan chảy):
          - Khối băng đã tan chảy nhờ sức mạnh Thanh Tẩy.
          - Thực thể đã tỉnh lại và sẵn sàng chiến đấu.`;
        }
      }
      if (selectedChars.some(c => c.name === "Dơi hút máu")) {
        if (!hasPurifier) {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Dơi hút máu):
          - Thực thể bị đàn dơi quỷ tấn công và hút cạn máu.
          - Ngoại hình: Da dẻ tái nhợt, hốc hác, có các vết cắn trên cổ hoặc cơ thể. Có đàn dơi đen bay xung quanh.
          - Tên thực thể nên có hậu tố "(Cạn máu)" hoặc "(Bloodless)".
          - Trong phần logic, hãy giải thích rằng việc mất máu khiến thực thể không thể duy trì sức mạnh thần thánh.`;
        } else {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Dơi hút máu - Đã thanh tẩy):
          - Mọi vết thương đã được chữa lành, lượng máu đã được khôi phục hoàn toàn.
          - Thực thể khỏe mạnh và tràn đầy sinh lực.`;
        }
      }
      if (selectedChars.some(c => c.name === "Bộ não siêu máy tính")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Bộ não siêu máy tính):
        - Thực thể được cấy ghép Bộ não siêu máy tính, mang lại khả năng tính toán và phân tích đa vũ trụ.
        - Trí tuệ vượt xa mọi thực thể sống, có thể dự đoán trước mọi chiêu thức của đối thủ.
        - Ngoại hình: Có các vi mạch phát sáng trên đầu hoặc cơ thể, mắt có thể hiển thị các dòng code hoặc dữ liệu.`;
      }
      if (selectedChars.some(c => c.name === "Sinh mệnh vô hạn")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Sinh mệnh vô hạn):
        - Thực thể sở hữu sinh mệnh vô hạn, bất tử bất diệt theo nghĩa đen.
        - Khả năng hồi phục tuyệt đối, không thể bị tiêu diệt bởi bất kỳ đòn tấn công vật lý hay năng lượng nào.
        - Lực chiến tăng mạnh, hào quang xanh lá cây dịu nhẹ nhưng vô tận.`;
      }
      if (selectedChars.some(c => c.name === "Thánh kiếm vô cực")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Thánh kiếm vô cực):
        - Thực thể sở hữu Thánh kiếm vô cực, vũ khí có thể chém đứt không gian và thời gian.
        - Có khả năng sát thần, bỏ qua mọi lớp phòng thủ của đối phương.
        - Ngoại hình: Cầm một thanh kiếm phát sáng rực rỡ với các ký tự cổ đại.`;
      }
      if (selectedChars.some(c => c.name === "Thanh tẩy debuff")) {
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Thanh tẩy debuff):
        - Thực thể có khả năng thanh tẩy mọi trạng thái tiêu cực (debuff) như đóng băng, phong ấn, cạn máu, kiệt sức.
        - Luôn duy trì trạng thái chiến đấu hoàn hảo nhất.
        - Hào quang thanh khiết màu vàng kim bao quanh cơ thể.`;
      }
      if (selectedChars.some(c => c.name === "Bàn tay phải của Daishinkan (bị chặt đứt)")) {
        const item = selectedChars.find(c => c.name === "Bàn tay phải của Daishinkan (bị chặt đứt)");
        if (item?.state === "Nguồn sức mạnh tối cao") {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Bàn tay phải của Daishinkan - Nguồn sức mạnh tối cao):
          - Thực thể sở hữu một phần sức mạnh của Đại Thiên Sứ (Daishinkan).
          - Có khả năng thao túng quy luật vật lý và thời gian ở mức độ sơ khai.
          - Ngoại hình: Có một cánh tay phải phát sáng rực rỡ hào quang Thiên Sứ, các vòng tròn thiên sứ xuất hiện xung quanh.`;
        } else if (item?.state === "Lời nguyền của Thiên Sứ") {
          if (!hasPurifier) {
            specialInstructions += `
            LƯU Ý ĐẶC BIỆT (Bàn tay phải của Daishinkan - Lời nguyền của Thiên Sứ):
            - Thực thể bị áp chế bởi lời nguyền từ bàn tay bị chặt đứt của Daishinkan.
            - Sức mạnh cực lớn nhưng cơ thể bị hủy hoại từ bên trong.
            - Trạng thái (compatibility_status) thường là "Unstable" hoặc "Fatal".
            - Ngoại hình: Cánh tay phải bị đen hóa hoặc rò rỉ năng lượng tối, cơ thể có các vết nứt phát sáng.`;
          } else {
            specialInstructions += `
            LƯU Ý ĐẶC BIỆT (Bàn tay phải của Daishinkan - Lời nguyền đã được thanh tẩy):
            - Lời nguyền đã bị xóa bỏ bởi sức mạnh Thanh Tẩy.
            - Thực thể thừa hưởng sức mạnh thuần khiết của Thiên Sứ mà không chịu tác động xấu.`;
          }
        }
      }
      if (selectedChars.some(c => c.name === "Tước đoạt")) {
        const victim = selectedChars.find(c => c.name !== "Tước đoạt");
        const victimName = victim ? victim.name : "nhân vật";
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Tước đoạt):
        - Thực thể kết quả CHÍNH LÀ ${victimName} nhưng ở trạng thái SAU KHI BỊ TƯỚC ĐOẠT.
        - Tên nhân vật: Phải là "${victimName} (Bị tước đoạt)" hoặc tương tự.
        - Nội dung: ${victimName} đã bị cướp đi hoàn toàn huyết mạch, sức mạnh hoặc tinh hoa bởi kỹ năng "Tước đoạt".
        - Ngoại hình: ${victimName} trông kiệt quệ, nhợt nhạt, đôi mắt vô hồn, hoặc mang những dấu vết của việc bị rút cạn năng lượng. Nếu bị cướp huyết mạch Saiyan, tóc có thể mất đi độ bóng hoặc chuyển sang màu xám xịt.
        - Trong phần mô tả, hãy tập trung vào sự mất mát, nỗi đau và trạng thái suy yếu của ${victimName} sau khi bị tước đoạt.`;
      }
      if (selectedChars.some(c => c.name === "Máy Hút DNA")) {
        const targetChar = selectedChars.find(c => c.name !== "Máy Hút DNA") || selectedChars[0];
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Máy Hút DNA - CHIẾT XUẤT 100% TINH HOA):
        - ĐÂY KHÔNG PHẢI LÀ DUNG HỢP. Máy Hút DNA chỉ là công cụ chiết xuất.
        - Máy Hút DNA đang chiết xuất 100% tinh hoa DNA của nhân vật: ${targetChar.name} (${targetChar.era}, ${targetChar.state}).
        - KẾT QUẢ TẠO RA PHẢI LÀ MỘT VẬT PHẨM: "Ống DNA: ${targetChar.name}".
        - TÊN VẬT PHẨM: Phải là "Ống DNA: ${targetChar.name}".
        - dna_components: PHẢI phản ánh 100% chủng tộc của ${targetChar.name}. Ví dụ: nếu là Goku thì là 100% Saiyan.
        - MÔ TẢ: Hãy mô tả đây là một thanh thủy tinh nhỏ, tinh khiết, bên trong chứa toàn bộ mã gen, sức mạnh và tiềm năng của ${targetChar.name}. Nó tỏa ra hào quang rực rỡ đặc trưng của nhân vật đó.
        - NGOẠI HÌNH (Visual Prompt): Một ống thủy tinh nhỏ (glass vial/tube) trong suốt, bên trong chứa dung dịch DNA lỏng đang cuộn xoáy và phát sáng rực rỡ với màu sắc năng lượng đặc trưng của ${targetChar.name}. TUYỆT ĐỐI KHÔNG ĐƯỢC xuất hiện khuôn mặt hay cơ thể nhân vật.
        - Độ tương thích luôn là 100% vì đây là chiết xuất nguyên chất.`;
      }
      if (selectedChars.some(c => c.name === "Thiện Ác")) {
        const item = selectedChars.find(c => c.name === "Thiện Ác");
        const isTurningEvil = item?.state === "Chuyển đổi Thiện sang Ác";
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Thiện Ác):
        - Thực thể bị biến đổi bản chất: ${isTurningEvil ? "Từ THIỆN sang ÁC" : "Từ ÁC sang THIỆN"}.
        - Năng lượng (Ki/Chakra/Reiatsu) cũng bị biến đổi tương ứng (ví dụ: Năng lượng thần thánh chuyển thành năng lượng hắc ám, hoặc ngược lại).
        - Tên nhân vật: Nên thêm hậu tố "(Evil)" hoặc "(Good)" hoặc "Sa ngã" / "Thức tỉnh".
        - Ngoại hình: Thay đổi màu sắc hào quang và ánh mắt để phản ánh sự thay đổi bản chất.`;
      }
      if (selectedChars.some(c => c.name === "Dragon Ball Super")) {
        const item = selectedChars.find(c => c.name === "Dragon Ball Super");
        const wish = item?.wish || "Ước có sức mạnh vô hạn";
        specialInstructions += `
        LƯU Ý ĐẶC BIỆT (Dragon Ball Super - SIÊU NGỌC RỒNG):
        - Thực thể được tạo ra từ điều ước với Rồng Thần Siêu Cấp (Super Shenron).
        - ĐIỀU ƯỚC: "${wish}".
        - Thực thể PHẢI sở hữu đặc điểm hoặc sức mạnh từ điều ước này.
        - Ngoại hình: Có hào quang vàng kim rực rỡ của Siêu Ngọc Rồng, có thể có hình ảnh rồng thần thấp thoáng phía sau.`;
      }
      if (selectedChars.some(c => c.name === "Đoạt linh hồn" || c.name === "Nụ hôn tử thần" || c.name === "Đoạt xác")) {
        const item = selectedChars.find(c => c.name === "Đoạt linh hồn" || c.name === "Nụ hôn tử thần" || c.name === "Đoạt xác");
        if (item?.state === "Hút hồn" || item?.state === "Đoạt xác") {
          const victim = selectedChars.find(c => c.name !== "Đoạt linh hồn" && c.name !== "Nụ hôn tử thần" && c.name !== "Đoạt xác");
          const victimName = victim ? victim.name : "nhân vật";
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Hút hồn / Đoạt xác):
          - ĐÂY LÀ TRẠNG THÁI ĐOẠT XÁC: ${victimName} + ${item?.state} = Xác ${victimName}.
          - Thực thể kết quả PHẢI là "Xác ${victimName}" (hoặc "Xác nhân vật: ${victimName}").
          - Tên nhân vật: Phải là "Xác ${victimName}" hoặc "${victimName} (Vô hồn)".
          - Trạng thái: Đã bị đoạt linh hồn và thể xác, trở thành một cái xác rỗng.
          - Ngoại hình: Cơ thể tái nhợt, đôi mắt trắng dã hoặc xám xịt, không có ánh sáng sự sống. Có thể có hiệu ứng linh hồn mờ ảo đang bay lơ lửng phía sau hoặc bị hút vào vật phẩm.
          - Mô tả: Tập trung vào sự trống rỗng, cái chết lâm sàng và việc linh hồn đã bị tước đoạt hoàn toàn.`;
        }
      }
      if (selectedChars.some(c => c.name === "Linh hồn")) {
        const item = selectedChars.find(c => c.name === "Linh hồn");
        const target = selectedChars.find(c => c.name !== "Linh hồn");
        const targetName = target ? target.name : "nhân vật";
        
        if (item?.state === "Nhập hồn" || item?.state === "Hồi sinh") {
          specialInstructions += `
          LƯU Ý ĐẶC BIỆT (Linh hồn - Hồi sinh):
          - ĐÂY LÀ QUÁ TRÌNH HỒI SINH: Linh hồn + ${targetName} = ${targetName} (Thức tỉnh).
          - Nếu ${targetName} đang ở trạng thái "Xác" hoặc "Vô hồn", thực thể kết quả sẽ được hồi sinh hoàn toàn.
          - Tên nhân vật: Phải là "${targetName} (Hồi sinh)" hoặc "${targetName} (Thức tỉnh)".
          - Ngoại hình: Hào quang rực rỡ, đôi mắt sáng rực năng lượng, cơ thể tràn đầy sức sống. Có thể có các ký tự cổ hoặc vòng tròn ma thuật xuất hiện khi linh hồn nhập thể.
          - Mô tả: Sự trở lại từ cõi chết, sức mạnh thần thánh được đánh thức, linh hồn và thể xác hợp nhất làm một.
          - visual_prompt: Phải mô tả một nhân vật tràn đầy sức sống, hào quang rực rỡ, mắt sáng rực, không còn dấu vết của cái chết.`;
        }
      }
      if (upgradeFusion) {
        specialInstructions += `
        ĐÂY LÀ MỘT BẢN NÂNG CẤP (UPGRADE):
        - Thực thể gốc là: ${upgradeFusion.name} (Lực chiến: ${fusionLabel(upgradeFusion, fusions)}, Hệ thống: v2).
        - Các item mới được thêm vào để nâng cấp thực thể này.
        - Hãy giữ nguyên các đặc điểm cốt lõi của ${upgradeFusion.name} nhưng thêm các tính năng từ các item mới.`;
      }
      const charList = upgradeFusion 
        ? `${upgradeFusion.name} + ${selectedChars.map(c => {
            if (c.fusionId) {
              const f = fusions.find(x => x.id === c.fusionId);
              return `${f?.name} (Kết quả dung hợp từ: ${f?.baseCharacters.map(bc => bc.name).join(", ")}, Hồ sơ ${f ? fusionLabel(f, fusions) : "chưa rõ"})`;
            }
            return `${c.name} (${c.era}, ${c.state})`;
          }).join(", ")}`
        : selectedChars.map(c => {
            if (c.fusionId) {
              const f = fusions.find(x => x.id === c.fusionId);
              return `${f?.name} (Kết quả dung hợp từ: ${f?.baseCharacters.map(bc => bc.name).join(", ")}, Hồ sơ ${f ? fusionLabel(f, fusions) : "chưa rõ"})`;
            }
            return `${c.name} (${c.era}, ${c.state})`;
          }).join(", ");
      
      const prompt = isSummon 
        ? `Triệu hồi nhân vật Dragon Ball bản gốc: ${charList}.
        ${specialInstructions}
        Yêu cầu:
        - Tên: Đúng nguyên tác (${selectedChars[0].name}).
        - Ngoại hình: Đúng nguyên tác của ${selectedChars[0].name} ở thời kỳ ${selectedChars[0].era} và trạng thái ${selectedChars[0].state}.
        - DNA & Logic: Phân tích sức mạnh bản gốc dựa trên cốt truyện.
        - Trả về JSON: { "name": "Tên", "description": "Mô tả", "dna_analysis": "DNA", "dna_components": [{ "race": "Tên chủng tộc", "percentage": number, "color": "Tailwind color class (e.g. bg-blue-500)" }], "fusion_logic": "Logic", "quote": "Câu thoại đặc trưng",  "power_comparison": "So sánh", "compatibility_score": 100, "compatibility_status": "Perfect", "visual_prompt": "Detailed English prompt for image gen of ${selectedChars[0].name} in ${selectedChars[0].state} state. High quality, original Dragon Ball art style, NO mechanical parts, NO machine details, NO cyborg elements, 100% original character appearance." }`
        : `Dung hợp Dragon Ball: ${charList}.
      ${specialInstructions}
      YÊU CẦU ĐẶC BIỆT: ĐỘ TƯƠNG THÍCH & LOGIC VẬT PHẨM (CRITICAL)
      - Phân tích sự tương thích giữa các nguồn năng lượng:
        + Năng lượng Hủy Diệt (Hakai) vs Năng lượng Sáng Tạo: Độ tương thích cực thấp.
        + Tà ác thuần túy vs Lòng tốt thuần túy: Độ tương thích thấp.
        + Thần thánh vs Phàm nhân: Cần sự cân bằng.
      - LOGIC VẬT PHẨM ĐẶC BIỆT:
        + "Sợi xích infinity" (Infinity Chain) chỉ giải phóng sức mạnh hiện có trong cơ thể. Nếu sức mạnh đã bị "Tước đoạt", việc giải phong ấn KHÔNG THỂ tạo ra sức mạnh thần thánh hay vượt bậc. Nó chỉ giải phóng cái "vỏ rỗng" còn sót lại.
      - Nếu độ tương thích thấp (< 40%):
        + Ngoại hình: Biến dạng, không ổn định.
      - Nếu độ tương thích cực thấp (< 10%):
        + Thực thể bị coi là "Thất bại" (Failed Fusion) hoặc "Tử vong" (Fatal).
      Yêu cầu:
      - Tên: BẮT BUỘC đúng nguyên tác nếu là nhân vật đơn, hoặc sáng tạo hợp lý nếu là dung hợp. Không được sai lệch tên nhân vật gốc.
      - Ngoại hình: Kết hợp đặc điểm của TẤT CẢ nhân vật. TUYỆT ĐỐI KHÔNG mặc định ngoại hình giống Goku (tóc, mặt, quần áo) trừ khi Goku có trong danh sách dung hợp. Phải tạo ra một diện mạo hoàn toàn mới dựa trên sự kết hợp thực tế của các nhân vật.
      - DNA & Logic: Phân tích chi tiết.
      - Hệ thống sức mạnh v2 do ứng dụng tính độc lập từ nhân vật, thời kỳ và trạng thái.
      - KHÔNG tự tạo BP, level, rank hay tỷ lệ sức mạnh. Chỉ viết nội dung, DNA và ngoại hình.
      - CHỈ bao gồm zombie_compatibility và zombie_multiplier NẾU có Virus Zombie tham gia.
      - Trả về JSON: { "name": "Tên", "description": "Mô tả", "dna_analysis": "DNA", "dna_components": [{ "race": "Tên chủng tộc", "percentage": number, "color": "Tailwind color class (e.g. bg-blue-500)" }], "fusion_logic": "Logic", "quote": "Câu thoại",  "power_comparison": "Chuỗi so sánh", "compatibility_score": number (0-100), "compatibility_status": "Perfect/Stable/Unstable/Failed/Fatal", "zombie_compatibility": number (optional), "zombie_multiplier": number (optional), "visual_prompt": "MANDATORY: Detailed English prompt for image generation. Describe the character's appearance based on the fusion logic. Include details about hair, eyes, skin, and clothing. Focus on the 'Xác' or 'Hồi sinh' state if applicable." }
      LƯU Ý: KHÔNG ĐƯỢC có dấu phẩy thừa ở cuối mảng hoặc đối tượng.
      Ngôn ngữ: Tiếng Việt (trừ visual_prompt).`;
      const dataResponse = await currentAi.models.generateContent({ model: textModel, contents: prompt });
      const text = dataResponse.text?.trim() || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const rawJson = jsonMatch ? jsonMatch[0] : text;
      const cleanJson = rawJson
        .replace(/,\s*\]/g, ']')
        .replace(/,\s*\}/g, '}');
      const fusionData = JSON.parse(cleanJson);
      
      if (!fusionData || typeof fusionData.name !== 'string') throw new Error('AI trả về tên nhân vật không hợp lệ.');
      const powerProfile = fusionPower(selectedChars, fusions, upgradeFusion);
      fusionData.powerProfile = powerProfile;
      fusionData.rank = powerTier(powerProfile);
      // Deprecated placeholders for old backup readers; never used for calculation.
      fusionData.powerLevel = 0;
      fusionData.level = 0;
      fusionData.power_comparison = `${powerLabel(powerProfile)} — ${powerProfile.note}`;

      setFusionStep("Đang kiến tạo hình ảnh thực thể...");
      let imagePrompt = "";
      const isDnaTube = fusionData.name.startsWith("Ống DNA:") || UNIVERSES["DNA"].includes(fusionData.name);
      
      if (isDnaTube) {
        imagePrompt = `Dragon Ball Z pixel art style, high quality 2D game asset. Item: A small, elegant glass vial/tube containing swirling, glowing liquid DNA. The liquid is vibrant and reflects the energy of ${fusionData.name}. TUYỆT ĐỐI KHÔNG ĐƯỢC xuất hiện khuôn mặt hay cơ thể nhân vật bên trong hay bên ngoài ống, chỉ là 1 ống thủy tinh chứa DNA lỏng đang cuộn xoáy. Style: 16-bit pixel art, sharp pixels, clean outlines, vibrant colors. Background: Solid dark laboratory background with subtle energy sparks.`;
      } else {
        const isCorpse = fusionData.name.toLowerCase().includes("xác") || fusionData.name.toLowerCase().includes("vô hồn");
        const isRevived = fusionData.name.toLowerCase().includes("hồi sinh") || fusionData.name.toLowerCase().includes("thức tỉnh");
        
        let stateDescription = "";
        if (isCorpse) {
          stateDescription = "The character is in a soulless state, pale skin, opaque eyes, no energy aura. Eerie atmosphere.";
        } else if (isRevived) {
          stateDescription = "The character is fully restored and awakened, glowing with divine energy, vibrant aura, powerful stance, eyes shining with life.";
        }

        imagePrompt = `Dragon Ball Z pixel art sprite style, high quality 2D fighting game character portrait. Character: ${fusionData.visual_prompt || `Fusion of ${charList}`}. ${stateDescription} Face: Unique fusion face, balanced mix of features from ${charList}, serious expression. Style: 16-bit pixel art, sharp pixels, clean outlines, vibrant colors, iconic Dragon Ball sprite aesthetic. Pose: Heroic standing battle stance. Background: Solid dark laboratory background with subtle energy sparks.`;
      }
      
      imagePrompt = sanitizePrompt(imagePrompt);
      
      let imageUrl = "";
      try {
        const imageResponse = await currentAi.models.generateContent({ 
          model: imageModel, 
          contents: { parts: [{ text: imagePrompt }] }, 
          config: { imageConfig: { aspectRatio: "1:1" } } 
        });
        
        const parts = imageResponse.candidates?.[0]?.content?.parts || [];
        for (const part of parts) { 
          if (part.inlineData && part.inlineData.data) { 
            imageUrl = await compressImage(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`); 
            break; 
          } 
        }
      } catch (imageError) {
        console.error(`Image generation failed with ${imageModel}:`, imageError);
        // Fallback retry with default gemini-3.1-flash-lite-image if another model was selected
        if (imageModel !== "gemini-3.1-flash-lite-image") {
          try {
            const fallbackResponse = await currentAi.models.generateContent({ 
              model: "gemini-3.1-flash-lite-image", 
              contents: { parts: [{ text: imagePrompt }] }, 
              config: { imageConfig: { aspectRatio: "1:1" } } 
            });
            const parts = fallbackResponse.candidates?.[0]?.content?.parts || [];
            for (const part of parts) { 
              if (part.inlineData && part.inlineData.data) { 
                imageUrl = await compressImage(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`); 
                break; 
              } 
            }
          } catch (retryErr) {
            console.error("Fallback image generation failed:", retryErr);
          }
        }
      }

      setFusionStep("Đang nén dữ liệu sinh học...");
        const isSoulFusion = selectedChars.some(c => c.name === "Linh hồn");
        const fallbackSeed = isSoulFusion ? `revive-${fusionData.name}` : `dbz-${fusionData.name}`;

        const finalFusion: FusionResult = { 
          ...fusionData, 
          compatibility_score: fusionData.compatibility_score ?? 100,
          compatibility_status: fusionData.compatibility_status ?? "Stable",
          id: crypto.randomUUID(), 
          imageUrl: imageUrl || `https://picsum.photos/seed/${encodeURIComponent(fallbackSeed)}/512/512`, 
        baseCharacters: upgradeFusion 
          ? [...upgradeFusion.baseCharacters, ...selectedChars.filter(c => c.name !== "Máy Hút DNA").map(({ id, ...rest }) => rest)] 
          : selectedChars.filter(c => c.name !== "Máy Hút DNA").map(({ id, ...rest }) => rest), 
        userId: "guest", 
        createdAt: new Date().toISOString() 
      };
      
      setFusions(prev => {
        // Nếu đang nâng cấp, xóa thực thể cũ khỏi danh sách
        const filtered = upgradeFusion ? prev.filter(f => f.id !== upgradeFusion.id) : prev;
        return [finalFusion, ...filtered];
      });

      setCurrentFusion(finalFusion);
      setUpgradeFusion(null);
      updateQuota();
      setView('lab');
    } catch (err: any) {
      console.error("Fusion error:", err);
      if (err.message?.includes("PERMISSION_DENIED") || err.message?.includes("403")) {
        setError(
          <div className="flex flex-col gap-2">
            <p className="font-bold">Lỗi quyền truy cập API (403 Permission Denied).</p>
            <p className="text-xs opacity-80">Vui lòng chọn API Key từ dự án Google Cloud có bật thanh toán (Billing) để sử dụng các mô hình cao cấp như Gemini 3.8 Flash và Gemini 3.1 Flash Lite Image.</p>
            <div className="flex gap-2 mt-1">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Tài liệu Billing
              </a>
            </div>
          </div>
        );
      } else {
        setError(err.message || "Quá trình dung hợp thất bại.");
      }
    } finally {
      setIsFusing(false);
      setFusionStep("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[200]"
          >
            <MainMenu onStart={() => setShowMenu(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 cursor-pointer min-w-0" onClick={() => setView('lab')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <FlaskConical className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hidden xs:block truncate uppercase">
              DBZ FUSION LAB
            </h1>
          </div>

          <nav className="flex items-center gap-3 sm:gap-6 shrink-0">
            <button 
              onClick={() => { setView('lab'); setMode('fusion'); }}
              className={cn(
                "text-xs sm:text-sm font-medium transition-colors hover:text-cyan-400 flex items-center gap-1 sm:gap-2",
                view === 'lab' && mode === 'fusion' ? "text-cyan-400" : "text-slate-400"
              )}
            >
              <FlaskConical className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Dung Hợp</span>
            </button>
            <button 
              onClick={() => { setView('lab'); setMode('comparison'); }}
              className={cn(
                "text-xs sm:text-sm font-medium transition-colors hover:text-cyan-400 flex items-center gap-1 sm:gap-2",
                view === 'lab' && mode === 'comparison' ? "text-cyan-400" : "text-slate-400"
              )}
            >
              <Trophy className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">So Sánh</span>
            </button>
            <button 
              onClick={() => setView('fusions')}
              className={cn(
                "text-xs sm:text-sm font-medium transition-colors hover:text-cyan-400 flex items-center gap-1 sm:gap-2",
                view === 'fusions' ? "text-cyan-400" : "text-slate-400"
              )}
            >
              <Book className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Sổ Dung Hợp</span>
            </button>
          </nav>

          {/* Active AI Models indicator */}
          <button 
            onClick={() => setShowSettings(true)}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/60 border border-cyan-500/30 hover:border-cyan-400 rounded-xl transition-all cursor-pointer group shrink-0"
            title="Nhấp để xem & cài đặt mô hình AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] font-bold text-slate-200">
                AI: <span className="text-cyan-400">{textModel.replace('gemini-', '')}</span>
              </span>
              <span className="text-[9px] text-slate-400">
                Ảnh: <span className="text-emerald-400">{imageModel.replace('gemini-', '').replace('-image', '')}</span>
              </span>
            </div>
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-cyan-500/30 transition-colors text-slate-400 hover:text-cyan-400 shrink-0"
            title="Cài đặt trò chơi & Mô hình AI"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Quota Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2 bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl hover:border-cyan-500/30 transition-colors group cursor-default min-w-0">
            <div className="relative hidden xs:block shrink-0">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 animate-pulse" />
              <div className="absolute inset-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 animate-ping opacity-20" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[7px] sm:text-[9px] uppercase tracking-[0.1em] text-slate-500 font-black leading-none mb-0.5 truncate">Hạn Mức</span>
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-[10px] sm:text-sm font-mono font-black text-slate-200">
                  {DAILY_QUOTA_LIMIT - quotaUsed}
                </span>
                <span className="text-[8px] sm:text-[10px] font-mono font-bold text-slate-600">/{DAILY_QUOTA_LIMIT}</span>
              </div>
            </div>
            <div className="hidden md:block w-px h-8 bg-slate-800 mx-1 shrink-0" />
            <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8 w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm flex items-center gap-3">
            <Shield className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {view === 'lab' ? (
          mode === 'fusion' ? (
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-start w-full">
              {/* Left: Input */}
              <section className="space-y-6 sm:space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Cấu Hình Dung Hợp</h2>
                  <p className="text-slate-400 text-sm sm:text-base">Chọn các nhân vật huyền thoại để tạo ra thực thể mới.</p>
                </div>

              <div className="space-y-3 sm:space-y-4">
                {upgradeFusion && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/50 rounded-2xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-2">
                      <div className="text-[8px] font-black bg-cyan-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Đang Nâng Cấp</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <img src={upgradeFusion.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-cyan-500/30" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-cyan-400 mb-0.5">Thực thể gốc</div>
                        <div className="font-black text-white text-lg truncate tracking-tighter italic uppercase">{upgradeFusion.name}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span>{fusionLabel(upgradeFusion, fusions)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span>{fusionTier(upgradeFusion, fusions)}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setUpgradeFusion(null)}
                      className="absolute bottom-2 right-2 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Hủy nâng cấp"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                <AnimatePresence mode="wait">
                  {selectedChars.map((char) => (
                    <motion.div 
                      key={char.id}
                      layout
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, x: 20 }}
                      className="p-3 sm:p-4 bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl relative group"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-500">Nhân Vật</label>
                          <CharacterSelector 
                            value={char.fusionId ? `FUSION:${char.fusionId}` : char.name}
                            onChange={(val) => {
                              const idx = selectedChars.findIndex(c => c.id === char.id);
                              updateCharacter(idx, 'name', val);
                            }}
                            fusions={fusions}
                            upgradeFusion={upgradeFusion}
                            isNsfw={isNsfw}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-500">Thời Kỳ</label>
                          <select 
                            value={char.era}
                            disabled={!!char.fusionId}
                            onChange={(e) => {
                              const idx = selectedChars.findIndex(c => c.id === char.id);
                              updateCharacter(idx, 'era', e.target.value);
                            }}
                            className="w-full max-w-full bg-slate-800 border-none rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 py-1.5 sm:py-2"
                          >
                            {char.fusionId ? (
                              <option value={char.era}>{char.era}</option>
                            ) : (
                              CHARACTER_DATA[char.name].eras.map(e => <option key={e} value={e}>{e}</option>)
                            )}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-500">Trạng Thái</label>
                          <select 
                            value={char.state}
                            disabled={!!char.fusionId}
                            onChange={(e) => {
                              const idx = selectedChars.findIndex(c => c.id === char.id);
                              updateCharacter(idx, 'state', e.target.value);
                            }}
                            className="w-full max-w-full bg-slate-800 border-none rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 py-1.5 sm:py-2"
                          >
                            {char.fusionId ? (
                              <option value={char.state}>{char.state}</option>
                            ) : (
                              CHARACTER_DATA[char.name].states[char.era]?.map(s => <option key={s} value={s}>{s}</option>)
                            )}
                          </select>
                        </div>
                      </div>

                      {char.name === "Dragon Ball Super" && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 space-y-1"
                        >
                          <label className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-yellow-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Nhập điều ước của bạn
                          </label>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                              type="text"
                              placeholder="Ví dụ: Ước có thân thể bất tử..."
                              value={char.wish || ""}
                              onChange={(e) => {
                                const idx = selectedChars.findIndex(c => c.id === char.id);
                                updateCharacter(idx, 'wish', e.target.value);
                              }}
                              className="w-full bg-slate-800 border-none rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-yellow-500 py-2 pl-10 pr-4 text-yellow-100 placeholder:text-slate-600"
                            />
                          </div>
                        </motion.div>
                      )}
                      {selectedChars.length > 1 && (
                        <button 
                          onClick={() => removeCharacter(char.id)}
                          className="absolute -top-1.5 -right-1.5 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg z-10 flex items-center justify-center"
                          title="Xóa nhân vật"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {selectedChars.length < 6 && (
                  <button 
                    onClick={addCharacter}
                    className="w-full py-2.5 sm:py-3 border-2 border-dashed border-slate-800 rounded-xl sm:rounded-2xl text-slate-500 hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm nhân vật
                  </button>
                )}
              </div>

              <button 
                onClick={startFusion}
                disabled={isFusing}
                className={cn(
                  "w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-3 shadow-2xl",
                  isFusing 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : selectedChars.length === 1 && !upgradeFusion
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20"
                      : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20"
                )}
              >
                {isFusing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {selectedChars.length === 1 && !upgradeFusion ? "Đang Triệu Hồi..." : "Đang Dung Hợp..."}
                  </>
                ) : (
                  <>
                    {selectedChars.length === 1 && !upgradeFusion ? <Sparkles className="w-6 h-6 fill-current" /> : <Zap className="w-6 h-6 fill-current" />}
                    {selectedChars.length === 1 && !upgradeFusion ? "TRIỆU HỒI BẢN GỐC" : "BẮT ĐẦU DUNG HỢP"}
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-600">
                <Shield className="w-3 h-3" />
                <span>Còn lại {DAILY_QUOTA_LIMIT - quotaUsed} lượt dung hợp trong hôm nay</span>
              </div>
            </section>

            {/* Right: Result */}
            <section className="relative min-h-[600px]">
              <AnimatePresence mode="wait">
                {isFusing ? (
                  <motion.div 
                    key="fusing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center space-y-8 bg-slate-900/20 backdrop-blur-sm rounded-3xl border border-slate-800"
                  >
                    <div className="relative">
                      <div className="w-32 h-32 border-4 border-cyan-500/20 rounded-full animate-ping" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-white animate-pulse">{fusionStep}</h3>
                      <p className="text-slate-500 text-sm">Quá trình này có thể mất vài giây...</p>
                    </div>
                  </motion.div>
                ) : currentFusion ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
                  >
                    <div className="aspect-square sm:aspect-video relative bg-slate-950 max-h-[400px] sm:max-h-none overflow-hidden">
                      {currentFusion.imageUrl ? (
                        <img 
                          src={currentFusion.imageUrl} 
                          alt={currentFusion.name}
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${currentFusion.id}/512/512`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 flex-wrap">
                        <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-cyan-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full">
                          THỰC THỂ MỚI
                        </div>
                        {currentFusion.baseCharacters.some(c => c.name === "Pin Infinity") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-yellow-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-yellow-500/20">
                            <Zap className="w-2 h-2 sm:w-3 sm:h-3 fill-current" />
                            NĂNG LƯỢNG VÔ HẠN
                          </div>
                        )}
                        {currentFusion.baseCharacters.some(c => c.name === "DNA Saiyan") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-red-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-red-500/20">
                            <Dna className="w-2 h-2 sm:w-3 sm:h-3" />
                            GEN SAIYAN
                          </div>
                        )}
                        {currentFusion.baseCharacters.some(c => c.name === "DNA Hakai") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-purple-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-purple-500/20">
                            <Flame className="w-2 h-2 sm:w-3 sm:h-3 fill-current" />
                            SỨC MẠNH HỦY DIỆT
                          </div>
                        )}
                        {currentFusion.baseCharacters.some(c => c.name === "DNA Thiên sứ") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-blue-400 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-blue-400/20">
                            <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 fill-current" />
                            QUYỀN NĂNG THIÊN SỨ
                          </div>
                        )}
                        {currentFusion.baseCharacters.some(c => c.name === "DNA Kaioshin") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-emerald-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                            <Shield className="w-2 h-2 sm:w-3 sm:h-3" />
                            LINH HỒN KAIOSHIN
                          </div>
                        )}
                        {currentFusion.baseCharacters.some(c => c.name === "Người Phàm") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-slate-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-slate-500/20">
                            <User className="w-2 h-2 sm:w-3 sm:h-3" />
                            Ý CHÍ NGƯỜI PHÀM
                          </div>
                        )}
                        {currentFusion.baseCharacters.some(c => c.name === "Linh hồn") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-indigo-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-indigo-500/20">
                            <Ghost className="w-2 h-2 sm:w-3 sm:h-3" />
                            LINH HỒN THỨC TỈNH
                          </div>
                        )}
                        {currentFusion.baseCharacters.some(c => c.name === "Dơi hút máu") && (
                          <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-red-950 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-lg shadow-red-900/40 border border-red-500/30">
                            <Skull className="w-2 h-2 sm:w-3 sm:h-3" />
                            CẠN MÁU (DEBUFF)
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                      <div className="space-y-1.5 sm:space-y-2 min-w-0 w-full">
                        <h3 className="text-xl sm:text-3xl font-black tracking-tighter text-white uppercase italic break-all leading-tight w-full">
                          {currentFusion.name}
                        </h3>
                        <p className="text-cyan-400 font-medium italic text-xs sm:text-base break-words">"{currentFusion.quote}"</p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 p-3 sm:p-6 bg-slate-900/80 border border-cyan-500/20 rounded-xl sm:rounded-3xl relative overflow-hidden group w-full min-w-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-10 h-10 sm:w-16 sm:h-16 bg-cyan-500/10 rounded-lg sm:rounded-2xl flex items-center justify-center text-cyan-400 relative z-10 shrink-0">
                          <Zap className="w-5 h-5 sm:w-8 sm:h-8 fill-current" />
                        </div>
                        <div className="flex-1 text-center sm:text-left relative z-10 min-w-0 w-full flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-8 overflow-hidden">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="text-[7px] sm:text-[10px] uppercase tracking-[0.3em] font-black text-cyan-500/60 mb-1">Chỉ số sức mạnh</div>
                            <div 
                              title={savedPower(currentFusion, fusions).note}
                              className="text-lg sm:text-4xl font-black tracking-tighter text-white font-mono flex flex-wrap items-baseline gap-1 sm:gap-2 justify-center sm:justify-start break-all leading-none w-full overflow-hidden"
                            >
                              {fusionLabel(currentFusion, fusions)}
                            </div>
                          </div>
                          <div className="shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-8 min-w-0 overflow-hidden">
                            <div className="text-[7px] sm:text-[10px] uppercase tracking-[0.3em] font-black text-yellow-500/60 mb-1">Phân tầng</div>
                            <div className="text-xl sm:text-4xl font-black tracking-tighter text-yellow-500 italic leading-none break-all">
                              {fusionTier(currentFusion, fusions)}
                            </div>
                          </div>
                        </div>
                        <div className={cn(
                          "px-2 py-1 sm:px-6 sm:py-3 border rounded-lg sm:rounded-2xl font-black italic text-xs sm:text-3xl relative z-10 shrink-0 shadow-xl break-all",
                          getRankColor(fusionTier(currentFusion, fusions)),
                          getRankBg(currentFusion.rank)
                        )}>
                          {fusionTier(currentFusion, fusions)}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 sm:p-4 border rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4 shadow-lg",
                        currentFusion.compatibility_score >= 80 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5" :
                        currentFusion.compatibility_score >= 40 ? "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/5" :
                        "bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/5"
                      )}>
                        <div className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                          currentFusion.compatibility_score >= 80 ? "bg-emerald-500/20 text-emerald-500" :
                          currentFusion.compatibility_score >= 40 ? "bg-amber-500/20 text-amber-500" :
                          "bg-red-500/20 text-red-500"
                        )}>
                          <Activity className="w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "text-[7px] sm:text-[10px] uppercase tracking-[0.2em] font-black mb-0.5 sm:mb-1",
                            currentFusion.compatibility_score >= 80 ? "text-emerald-500/60" :
                            currentFusion.compatibility_score >= 40 ? "text-amber-500/60" :
                            "text-red-500/60"
                          )}>Độ tương thích linh hồn & DNA</div>
                          <div className="text-xs sm:text-lg font-bold italic leading-tight break-words">
                            {currentFusion.compatibility_score}% - Trạng thái: {currentFusion.compatibility_status}
                          </div>
                        </div>
                      </div>

                      {currentFusion.power_comparison && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 sm:p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4 shadow-lg shadow-yellow-500/5"
                        >
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-500 shrink-0">
                            <Trophy className="w-4 h-4 sm:w-6 sm:h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[7px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-yellow-500/60 mb-0.5 sm:mb-1">So sánh sức mạnh</div>
                            <div className="text-xs sm:text-lg font-bold text-white italic leading-tight break-words">
                              {savedPower(currentFusion, fusions).note}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="prose prose-invert prose-sm max-w-none text-slate-300 break-words overflow-hidden">
                        <Markdown>{currentFusion.description}</Markdown>
                      </div>

                      {currentFusion.baseCharacters.some(c => c.name === "Virus Zombie") && currentFusion.zombie_compatibility !== undefined && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-red-900/30">
                          <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl space-y-1">
                            <div className="text-[10px] uppercase font-black text-red-500 flex items-center gap-2">
                              <Dna className="w-3 h-3" />
                              Độ tương thích Zombie
                            </div>
                            <div className="text-2xl font-black text-white font-mono">
                              {currentFusion.zombie_compatibility}%
                            </div>
                          </div>
                          <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl space-y-1">
                            <div className="text-[10px] uppercase font-black text-red-500 flex items-center gap-2">
                              <Zap className="w-3 h-3" />
                              Hệ số cường hóa
                            </div>
                            <div className="text-2xl font-black text-white font-mono">
                              x{currentFusion.zombie_multiplier?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}

                      {currentFusion.dna_components && currentFusion.dna_components.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-xs">
                            <Activity className="w-4 h-4" />
                            Phân tích DNA Chi tiết
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentFusion.dna_components.map((comp, idx) => (
                              <div key={idx} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">{comp.race}</span>
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{comp.percentage}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${comp.percentage}%` }}
                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                    className={cn("h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]", comp.color || "bg-emerald-500")}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentFusion.dna_analysis && (
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
                            <Dna className="w-4 h-4" />
                            Phân tích DNA & Sinh học
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none text-slate-400 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 break-words overflow-hidden">
                            <Markdown>{currentFusion.dna_analysis}</Markdown>
                          </div>
                        </div>
                      )}

                      {currentFusion.fusion_logic && (
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                          <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider text-xs">
                            <Cpu className="w-4 h-4" />
                            Logic Dung Hợp & Tương Thích
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none text-slate-400 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 break-words overflow-hidden">
                            <Markdown>{currentFusion.fusion_logic}</Markdown>
                          </div>
                        </div>
                      )}

                      <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
                        <button 
                          onClick={() => {
                            setUpgradeFusion(currentFusion);
                            setSelectedChars([{ id: crypto.randomUUID(), name: "Pin Infinity", era: "Vật phẩm (Items)", state: "Nguồn năng lượng vô hạn" }]);
                            setView('lab');
                          }}
                          className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                        >
                          <Plus className="w-5 h-5" />
                          NÂNG CẤP VỚI ITEM
                        </button>
                        <button 
                          onClick={() => {
                            setCurrentFusion(null);
                            setUpgradeFusion(null);
                            setSelectedChars([
                              { id: crypto.randomUUID(), name: "Goku", era: "Dragon Ball Z (Frieza Saga)", state: "Base" },
                              { id: crypto.randomUUID(), name: "Vegeta", era: "Dragon Ball Z (Frieza Saga)", state: "Base" }
                            ]);
                          }}
                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <FlaskConical className="w-5 h-5" />
                          DUNG HỢP MỚI
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl sm:rounded-3xl p-6 text-center">
                    <FlaskConical className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-20" />
                    <p className="text-base sm:text-lg font-medium">Sẵn sàng thí nghiệm</p>
                    <p className="text-xs sm:text-sm">Kết quả dung hợp sẽ xuất hiện tại đây</p>
                  </div>
                )}
              </AnimatePresence>
            </section>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter italic uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                So sánh sức mạnh · V2
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm">
                PI là chỉ số cân bằng game: Goku Super Saiyan Namek = 100 PI; +10 PI tương ứng ×10 lực thuần. Không phải BP chính thức. So sánh chạy ngay, không cần API. Chọn đúng giai đoạn để đối chiếu.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-start relative">
              {/* Character 1 */}
              <div className="space-y-4 p-5 sm:p-6 bg-slate-900/60 border border-slate-800 rounded-3xl relative z-20 shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent opacity-60 rounded-t-3xl" />
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-cyan-400 tracking-widest flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Thực Thể 1
                  </span>
                  {compareChar1.fusionId && (
                    <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      Sổ Dung Hợp
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Chọn Thực Thể / Nhân Vật</label>
                    <CharacterSelector 
                      value={compareChar1.fusionId ? `FUSION:${compareChar1.fusionId}` : compareChar1.name} 
                      onChange={(val) => {
                        if (val.startsWith('FUSION:')) {
                          const fid = val.replace('FUSION:', '');
                          const fusion = fusions.find(f => f.id === fid);
                          if (fusion) {
                            setCompareChar1({ ...compareChar1, name: fusion.name, era: "Sổ Dung Hợp", state: `Rank ${fusion.rank}`, fusionId: fusion.id });
                          }
                        } else {
                          const era = CHARACTER_DATA[val]?.eras?.[0] || "Dragon Ball Super";
                          const state = CHARACTER_DATA[val]?.states?.[era]?.[0] || "Base";
                          setCompareChar1({ id: 'c1', name: val, era, state, fusionId: undefined });
                        }
                      }}
                      fusions={fusions}
                      isNsfw={isNsfw}
                    />
                  </div>

                  {/* Era & State Selectors if standard character */}
                  {!compareChar1.fusionId && CHARACTER_DATA[compareChar1.name] && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Thời kỳ</label>
                        <select
                          value={compareChar1.era}
                          onChange={(e) => {
                            const newEra = e.target.value;
                            const newState = CHARACTER_DATA[compareChar1.name]?.states?.[newEra]?.[0] || "Base";
                            setCompareChar1(prev => ({ ...prev, era: newEra, state: newState }));
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs py-1.5 px-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          {CHARACTER_DATA[compareChar1.name].eras.map(era => (
                            <option key={era} value={era}>{era}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Trạng thái</label>
                        <select
                          value={compareChar1.state}
                          onChange={(e) => setCompareChar1(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs py-1.5 px-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          {(CHARACTER_DATA[compareChar1.name].states[compareChar1.era] || ["Base"]).map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Live Power Badge Preview */}
                  {(() => {
                    const info = getEntityPowerInfo(compareChar1, fusions);
                    return (
                      <div title={info.description} className="mt-3 p-3 bg-slate-950/80 border border-cyan-500/20 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("text-[10px] font-black italic px-2 py-0.5 rounded border shadow-sm", getRankColor(info.rank), getRankBg(info.rank))}>
                            {info.rank}
                          </span>
                          <span className="text-xs font-mono text-slate-300 font-bold truncate">
                            {info.powerProfile.logPower === null ? "Chưa đủ dữ liệu" : "Ước tính game"}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-black text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-lg border border-cyan-400/20 shrink-0">
                          {info.formattedPower}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* VS Divider */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-slate-950 border-4 border-slate-900 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                  <span className="text-xl font-black italic text-cyan-400">VS</span>
                </div>
              </div>

              {/* Character 2 */}
              <div className="space-y-4 p-5 sm:p-6 bg-slate-900/60 border border-slate-800 rounded-3xl relative z-20 shadow-xl">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-red-500 to-transparent opacity-60 rounded-t-3xl" />
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-red-400 tracking-widest flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Thực Thể 2
                  </span>
                  {compareChar2.fusionId && (
                    <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      Sổ Dung Hợp
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Chọn Thực Thể / Nhân Vật</label>
                    <CharacterSelector 
                      value={compareChar2.fusionId ? `FUSION:${compareChar2.fusionId}` : compareChar2.name} 
                      onChange={(val) => {
                        if (val.startsWith('FUSION:')) {
                          const fid = val.replace('FUSION:', '');
                          const fusion = fusions.find(f => f.id === fid);
                          if (fusion) {
                            setCompareChar2({ ...compareChar2, name: fusion.name, era: "Sổ Dung Hợp", state: `Rank ${fusion.rank}`, fusionId: fusion.id });
                          }
                        } else {
                          const era = CHARACTER_DATA[val]?.eras?.[0] || "Dragon Ball Super";
                          const state = CHARACTER_DATA[val]?.states?.[era]?.[0] || "Base";
                          setCompareChar2({ id: 'c2', name: val, era, state, fusionId: undefined });
                        }
                      }}
                      fusions={fusions}
                      isNsfw={isNsfw}
                    />
                  </div>

                  {/* Era & State Selectors if standard character */}
                  {!compareChar2.fusionId && CHARACTER_DATA[compareChar2.name] && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Thời kỳ</label>
                        <select
                          value={compareChar2.era}
                          onChange={(e) => {
                            const newEra = e.target.value;
                            const newState = CHARACTER_DATA[compareChar2.name]?.states?.[newEra]?.[0] || "Base";
                            setCompareChar2(prev => ({ ...prev, era: newEra, state: newState }));
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs py-1.5 px-2 text-slate-200 focus:outline-none focus:border-red-500"
                        >
                          {CHARACTER_DATA[compareChar2.name].eras.map(era => (
                            <option key={era} value={era}>{era}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Trạng thái</label>
                        <select
                          value={compareChar2.state}
                          onChange={(e) => setCompareChar2(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs py-1.5 px-2 text-slate-200 focus:outline-none focus:border-red-500"
                        >
                          {(CHARACTER_DATA[compareChar2.name].states[compareChar2.era] || ["Base"]).map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Live Power Badge Preview */}
                  {(() => {
                    const info = getEntityPowerInfo(compareChar2, fusions);
                    return (
                      <div title={info.description} className="mt-3 p-3 bg-slate-950/80 border border-red-500/20 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("text-[10px] font-black italic px-2 py-0.5 rounded border shadow-sm", getRankColor(info.rank), getRankBg(info.rank))}>
                            {info.rank}
                          </span>
                          <span className="text-xs font-mono text-slate-300 font-bold truncate">
                            {info.powerProfile.logPower === null ? "Chưa đủ dữ liệu" : "Ước tính game"}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-black text-red-400 bg-red-400/10 px-2.5 py-1 rounded-lg border border-red-400/20 shrink-0">
                          {info.formattedPower}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Live Instant Power Ratio Meter */}
            {(() => {
              const info1 = getEntityPowerInfo(compareChar1, fusions);
              const info2 = getEntityPowerInfo(compareChar2, fusions);
              const meta = comparePower(info1, info2);
              return (
                <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl space-y-3.5 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs uppercase font-black tracking-wider text-slate-200">
                        Ước tính tương quan v2
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700/60 w-fit">
                      {meta.tierDisparity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-cyan-400 font-bold truncate max-w-[45%]">
                      {info1.name}: <span className="text-slate-300">{info1.formattedPower}</span>
                    </span>
                    <span className="text-red-400 font-bold truncate max-w-[45%] text-right">
                      {info2.name}: <span className="text-slate-300">{info2.formattedPower}</span>
                    </span>
                  </div>

                  {/* Relative Power Proportion Bar */}
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800/80 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${meta.known ? `${meta.prob1}%` : '—'}` }}
                      />
                      <div 
                        className="h-full bg-gradient-to-l from-red-500 to-orange-500 transition-all duration-300"
                        style={{ width: `${meta.known ? `${meta.prob2}%` : '—'}` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                      <span className="text-cyan-400">{meta.known ? `${meta.prob1}%` : '—'}</span>
                      <span className="text-yellow-400 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-center max-w-[70%] truncate">
                        ⚡ {meta.ratioText}
                      </span>
                      <span className="text-red-400">{meta.known ? `${meta.prob2}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-center pt-2">
              <button
                onClick={startComparison}
                disabled={isComparing}
                className="px-10 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(6,182,212,0.3)] flex items-center gap-3 cursor-pointer"
              >
                {isComparing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                {isComparing ? "Đang phân tích tương quan..." : "So sánh ngay · Không cần mạng"}
              </button>
            </div>

            {comparisonResult && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="p-6 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-[2rem] backdrop-blur-xl relative overflow-hidden shadow-2xl">
                  {/* Winner Top Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-md shadow-yellow-500/20 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Kết quả mô phỏng
                        </span>
                        {comparisonResult.powerRatio && (
                          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold rounded-full">
                            {comparisonResult.powerRatio}
                          </span>
                        )}
                      </div>
                      <h3 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                        {comparisonResult.winner}
                      </h3>
                    </div>

                    {/* Relative Power Share Bar */}
                    {comparisonResult.winProbability && (
                      <div className="w-full sm:w-72 space-y-1.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="flex justify-between text-[10px] font-mono font-bold">
                          <span className="text-cyan-400 truncate max-w-[120px]">{compareChar1.name}: {comparisonResult.winProbability.char1}%</span>
                          <span className="text-red-400 truncate max-w-[120px]">{compareChar2.name}: {comparisonResult.winProbability.char2}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${comparisonResult.winProbability.char1}%` }} />
                          <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${comparisonResult.winProbability.char2}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decisive Reason */}
                  <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <p className="text-yellow-200 text-sm sm:text-base leading-relaxed italic font-medium">
                      "{comparisonResult.winnerReason}"
                    </p>
                  </div>

                  {/* 2-Column Power Analysis & Battle Scenario */}
                  <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mt-8">
                    <div className="space-y-3 p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-cyan-400 uppercase tracking-wider">
                        <Activity className="w-4 h-4" /> Phân tích sức mạnh & Cấp bậc
                      </h4>
                      <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-slate-300 leading-relaxed">
                        <Markdown>{comparisonResult.powerAnalysis}</Markdown>
                      </div>
                    </div>
                    <div className="space-y-3 p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-red-400 uppercase tracking-wider">
                        <Flame className="w-4 h-4" /> Kịch bản đối đầu thực chiến
                      </h4>
                      <div className="text-slate-300 text-xs sm:text-sm leading-relaxed italic">
                        {comparisonResult.battleScenario}
                      </div>
                    </div>
                  </div>

                  {/* Stats Comparison */}
                  {comparisonResult.winProbability && <div className="mt-8 space-y-4 pt-6 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-center uppercase tracking-widest text-slate-400">
                      Chỉ số đối kháng tương quan
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { key: 'power', label: 'Lực công phá' },
                        { key: 'speed', label: 'Tốc độ' },
                        { key: 'intelligence', label: 'Trí tuệ / Kỹ năng' },
                        { key: 'durability', label: 'Sức chịu đựng' }
                      ].map(({ key, label }) => (
                        <div key={key} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-center">
                            {label}
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500" style={{ width: `${comparisonResult.stats.char1[key as keyof typeof comparisonResult.stats.char1]}%` }} />
                            </div>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500" style={{ width: `${comparisonResult.stats.char2[key as keyof typeof comparisonResult.stats.char2]}%` }} />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono font-bold">
                            <span className="text-cyan-400">{comparisonResult.stats.char1[key as keyof typeof comparisonResult.stats.char1]}</span>
                            <span className="text-red-400">{comparisonResult.stats.char2[key as keyof typeof comparisonResult.stats.char2]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>}
                </div>
              </motion.div>
            )}
          </div>
        )
      ) : (
        <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Sổ Dung Hợp</h2>
                <p className="text-slate-400">Bộ sưu tập của bạn · Chạm thẻ để khám phá nhân vật.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử dung hợp?")) {
                      setFusions([]);
                      localStorage.setItem('fusion_history', JSON.stringify([]));
                    }
                  }}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  title="Xóa toàn bộ lịch sử dung hợp"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Xóa tất cả</span>
                </button>
                <button 
                  onClick={exportBackup}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  title="Sao lưu toàn bộ dữ liệu (Dung hợp & Chiến đấu)"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Sao lưu tất cả</span>
                </button>
                <label className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2 text-sm cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Khôi phục tất cả</span>
                  <input type="file" className="hidden" accept=".json" onChange={importBackup} />
                </label>
              </div>
            </div>

            {fusions.length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl">
                <Book className="w-12 h-12 mx-auto opacity-20" />
                <p className="text-slate-500">Chưa có bản ghi dung hợp nào.</p>
              </div>
            ) : (
              <div className="fusion-card-grid">
                {fusions.map((f, cardIndex) => (
                  <motion.article
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fusion-card"
                    data-tier={fusionTier(f, fusions)}
                  >
                    <button className="fusion-card-face" aria-label={`Xem chi tiết ${f.name}`}
                      onClick={() => { setCurrentFusion(f); setView('lab'); setMode('fusion'); }}>
                      <div className="fusion-card-heading">
                        <span className="fusion-card-series">FUSION LAB · THẺ NHÂN VẬT</span>
                        <div className="fusion-card-name-row">
                          <h4 title={f.name}>{f.name}</h4>
                          <span className="fusion-card-energy"><Zap size={12} />{fusionLabel(f, fusions)}</span>
                        </div>
                      </div>
                      <div className="fusion-card-art">
                        <div className="fusion-card-placeholder"><Dna size={38} /><span>FUSION LAB</span></div>
                        {f.imageUrl && <img src={f.imageUrl} alt={f.name} loading="lazy" referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        <div className="fusion-card-foil" />
                        <span className="fusion-card-tier">✦ {fusionTier(f, fusions)}</span>
                        {f.name.startsWith('Ống DNA:') && <span className="fusion-card-type">DNA</span>}
                      </div>
                      <div className="fusion-card-info">
                        <div className="fusion-card-compatibility"><span><Activity size={12} /> Tương thích</span><strong>{Number.isFinite(f.compatibility_score) ? f.compatibility_score : '—'}%</strong></div>
                        <div className="fusion-card-meter"><i style={{width: `${Math.min(100, Math.max(0, Number(f.compatibility_score) || 0))}%`}} /></div>
                        <div className="fusion-card-origins"><span>NGUỒN DUNG HỢP</span><p title={(f.baseCharacters || []).map(c => c.name).join(' + ')}>{(f.baseCharacters || []).map(c => c.name).join(' + ') || 'Chưa có dữ liệu nguồn'}</p></div>
                        <div className="fusion-card-footer"><span>DB · {String(cardIndex + 1).padStart(3, '0')}</span><span>PI · ƯỚC TÍNH GAME</span><Sparkles size={12} /></div>
                      </div>
                    </button>
                    <div className="fusion-card-controls">
                      <div className="fusion-card-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!compareChar1.fusionId || compareChar1.fusionId !== f.id) {
                              if (compareChar1.fusionId && (!compareChar2.fusionId || compareChar2.fusionId !== f.id)) {
                                setCompareChar2(compareChar1);
                              }
                              setCompareChar1({ id: crypto.randomUUID(), name: f.name, era: "Sổ Dung Hợp", state: `Rank ${fusionTier(f, fusions)}`, fusionId: f.id });
                            }
                            setMode('comparison');
                            setView('lab');
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                            (compareChar1.fusionId === f.id || compareChar2.fusionId === f.id)
                              ? "bg-yellow-500 text-black"
                              : "bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400"
                          )}
                        >
                          <Zap className="w-3 h-3 fill-current" />
                          { (compareChar1.fusionId === f.id || compareChar2.fusionId === f.id) ? "ĐÃ CHỌN" : "SO SÁNH" }
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUpgradeFusion(f);
                            setSelectedChars([{ id: crypto.randomUUID(), name: "Pin Infinity", era: "Vật phẩm (Items)", state: "Nguồn năng lượng vô hạn" }]);
                            setView('lab');
                            setMode('fusion');
                          }}
                          className="flex-1 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          NÂNG CẤP
                        </button>
                        <button onClick={(e) => deleteFusion(f.id, e)} className="fusion-card-delete"
                          aria-label={isDeleting === f.id ? `Xác nhận xóa ${f.name}` : `Xóa ${f.name}`}
                          title={isDeleting === f.id ? 'Nhấn lại để xác nhận xóa' : 'Xóa thẻ'}>
                          {isDeleting === f.id ? 'Xóa?' : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-50">
            <FlaskConical className="w-5 h-5" />
            <span className="font-bold tracking-widest text-xs uppercase">Fusion Multiverse Lab</span>
          </div>
          <p className="text-slate-500 text-xs">Powered by Gemini AI & Firebase</p>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  Cài đặt & Mô hình AI
                </h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1">
                {/* AI Text/Logic Model Configuration */}
                <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        Mô hình Phân tích & Lực chiến
                      </p>
                      <p className="text-xs text-slate-400">Điều khiển logic dung hợp & thang đo cấp độ</p>
                    </div>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Mới nhất
                    </span>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleTextModelChange('gemini-3.8-flash')}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3",
                        textModel === 'gemini-3.8-flash'
                          ? "bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-200">Gemini 3.8 Flash</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">Khuyên dùng</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Tạo nội dung dung hợp. Chỉ số và so sánh do hệ thống v2 tính độc lập.</p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                        textModel === 'gemini-3.8-flash' ? "border-cyan-400 bg-cyan-400" : "border-slate-600"
                      )}>
                        {textModel === 'gemini-3.8-flash' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTextModelChange('gemini-4-argon')}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3",
                        textModel === 'gemini-4-argon'
                          ? "bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-200">Gemini 4 Argon</span>
                          <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-semibold">Tư duy sâu</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Khả năng lập luận cao cấp, thích hợp so sánh chiến thuật và kịch bản đối đầu chuyên sâu.</p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                        textModel === 'gemini-4-argon' ? "border-cyan-400 bg-cyan-400" : "border-slate-600"
                      )}>
                        {textModel === 'gemini-4-argon' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* AI Image Generation Model Configuration */}
                <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        Mô hình Tạo ảnh (Image Model)
                      </p>
                      <p className="text-xs text-slate-400">Xuất hình ảnh sprite 16-bit Extreme Butoden</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Mới nhất
                    </span>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleImageModelChange('gemini-3.1-flash-lite-image')}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3",
                        imageModel === 'gemini-3.1-flash-lite-image'
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-200">Gemini 3.1 Flash Lite Image</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">Khuyên dùng</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Mô hình tạo ảnh thế hệ mới nhất, thay thế hoàn toàn gemini-2.5-flash-image cũ. Tạo sprite DBZ sắc nét và ổn định.</p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                        imageModel === 'gemini-3.1-flash-lite-image' ? "border-emerald-400 bg-emerald-400" : "border-slate-600"
                      )}>
                        {imageModel === 'gemini-3.1-flash-lite-image' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleImageModelChange('gemini-nano-banana-2.1')}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3",
                        imageModel === 'gemini-nano-banana-2.1'
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-200">Gemini Nano Banana 2.1</span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">HQ Pro</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Mô hình tạo hình ảnh độ phân giải cao cao cấp (yêu cầu API key kích hoạt tính năng hình ảnh).</p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                        imageModel === 'gemini-nano-banana-2.1' ? "border-emerald-400 bg-emerald-400" : "border-slate-600"
                      )}>
                        {imageModel === 'gemini-nano-banana-2.1' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Status Notice */}
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex gap-3 items-start">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-cyan-200/80 leading-relaxed">
                    Hệ thống đã nâng cấp toàn diện: Cả mô hình văn bản và mô hình tạo ảnh đều được cập nhật lên các phiên bản mới nhất từ Google GenAI.
                  </p>
                </div>

                {/* NSFW Option */}
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">Chế độ NSFW</p>
                    <p className="text-xs text-slate-500">Bật nội dung người lớn và gợi cảm.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const newVal = !isNsfw;
                      setIsNsfw(newVal);
                      localStorage.setItem('is_nsfw', String(newVal));
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isNsfw ? "bg-cyan-500" : "bg-slate-700"
                    )}
                  >
                    <motion.div 
                      animate={{ x: isNsfw ? 24 : 4 }}
                      className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                    />
                  </button>
                </div>
                {isNsfw && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 items-start">
                    <ShieldAlert className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-yellow-200/70 leading-relaxed">
                      Lưu ý: Chế độ NSFW có thể khiến AI từ chối tạo nội dung nếu vi phạm chính sách an toàn của Google. Nếu gặp lỗi, hãy thử tắt chế độ này.
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
              >
                Lưu và đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MainMenu({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center space-y-8 max-w-md w-full text-center"
      >
        {/* Author Image */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className="relative w-32 h-32 rounded-full border-2 border-slate-800 overflow-hidden shadow-2xl bg-slate-900">
            <img 
              src="https://i.pinimg.com/736x/f1/73/4e/f1734e565985011684c3600f1352467d.jpg"
              alt="Author"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/tom-thinking/300/300";
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            FUSION MULTIVERSE
          </h1>
          <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono text-sm font-bold">
            <Sparkles className="w-4 h-4" />
            <span>PHIÊN BẢN 2.5</span>
          </div>
        </div>

        <div className="w-full space-y-4 pt-8">
          <button 
            onClick={onStart}
            className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            <Zap className="w-6 h-6 fill-current group-hover:animate-pulse" />
            BẮT ĐẦU GAME
          </button>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Tác giả</p>
              <p className="text-sm font-bold text-slate-200">Lá bài tẩy</p>
            </div>
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Zalo</p>
              <p className="text-sm font-bold text-slate-200">0799885135</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 font-medium pt-8">
          © 2024 Fusion Multiverse Lab. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
