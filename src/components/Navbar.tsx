/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PenTool, Library, Bookmark, Sparkles } from "lucide-react";

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  vintageTheme: boolean;
  onThemeToggle: () => void;
  savedCount: number;
}

export default function Navbar({
  currentTab,
  onTabChange,
  vintageTheme,
  onThemeToggle,
  savedCount
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md bg-opacity-90 transition-colors duration-300
      vintage-theme:bg-[#ebe1cf] vintage-theme:border-[#d4c5a9]
      bg-[#faf8f5] border-[#eae4d8]"
      style={{
        backgroundColor: vintageTheme ? "rgba(235, 225, 207, 0.92)" : "rgba(250, 248, 245, 0.92)",
        borderColor: vintageTheme ? "#c8b99d" : "#eae4d8"
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => onTabChange("write")}>
          {/* Cinnabar Stamp circular logo icon */}
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-[#c43a31] border border-[#a42c24] shadow-sm transform hover:scale-105 active:scale-95 transition-all">
            <span className="font-serif font-semibold text-white text-base tracking-wider" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
              书
            </span>
          </div>
          <div className="flex flex-col">
            <span 
              className="text-xl font-bold font-serif tracking-widest text-[#2c2416]"
              style={{ fontFamily: "STKaiti, Kaiti, serif" }}
            >
              与书
            </span>
            <span className="text-[10px] tracking-widest text-[#8c7b65] font-sans -mt-0.5">
              尺素寸心 · 见字如面
            </span>
          </div>
        </div>

        {/* Central Nav Links */}
        <nav className="flex items-center space-x-1 sm:space-x-4">
          <button
            id="nav-btn-write"
            onClick={() => onTabChange("write")}
            className={`px-3 py-2 rounded-lg text-sm font-serif transition-all duration-300 flex items-center space-x-2 border-b-2
              ${currentTab === "write" 
                ? "text-[#c43a31] bg-[#c43a31]/5 border-[#c43a31] font-medium" 
                : "text-[#5c4e3b] border-transparent hover:text-[#c43a31] hover:bg-[#c43a31]/5"
              }`}
            style={{ fontFamily: "STKaiti, Kaiti, sans-serif" }}
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline">尺素写信</span>
            <span className="sm:hidden">写信</span>
          </button>

          <button
            id="nav-btn-gallery"
            onClick={() => onTabChange("gallery")}
            className={`px-3 py-2 rounded-lg text-sm font-serif transition-all duration-300 flex items-center space-x-2 border-b-2
              ${currentTab === "gallery" 
                ? "text-[#c43a31] bg-[#c43a31]/5 border-[#c43a31] font-medium" 
                : "text-[#5c4e3b] border-transparent hover:text-[#c43a31] hover:bg-[#c43a31]/5"
              }`}
            style={{ fontFamily: "STKaiti, Kaiti, sans-serif" }}
          >
            <Library className="w-4 h-4" />
            <span className="hidden sm:inline">明信文化馆</span>
            <span className="sm:hidden">文化馆</span>
          </button>

          <button
            id="nav-btn-home"
            onClick={() => onTabChange("home")}
            className={`px-3 py-2 rounded-lg text-sm font-serif transition-all duration-300 flex items-center space-x-2 border-b-2 relative
              ${currentTab === "home" 
                ? "text-[#c43a31] bg-[#c43a31]/5 border-[#c43a31] font-medium" 
                : "text-[#5c4e3b] border-transparent hover:text-[#c43a31] hover:bg-[#c43a31]/5"
              }`}
            style={{ fontFamily: "STKaiti, Kaiti, sans-serif" }}
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">墨痕斋 (画室)</span>
            <span className="sm:hidden">画斋</span>
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#c43a31] text-[9px] text-white">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Side Theme Switch & Slogan */}
        <div className="flex items-center space-x-3">
          <button
            id="theme-toggle-btn"
            onClick={onThemeToggle}
            className="p-2 rounded-full border border-[#d4c5a9] hover:bg-[#c43a31]/5 text-[#5c4e3b] hover:text-[#c43a31] transition-all transform hover:rotate-12 duration-300"
            title={vintageTheme ? "切换为: 古典素雅" : "切换为: 复古文艺"}
          >
            <Sparkles className="w-4 h-4 animate-star" />
          </button>
          
          <div className="hidden lg:flex flex-col items-end text-right border-l border-[#d4c5a9]/50 pl-3">
            <span className="text-xs font-serif text-[#8c7b65]" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
              岁在丙午 · 晴雪初霁
            </span>
            <span className="text-[10px] text-[#aa9c85] scale-90 origin-right">
              笺墨流芳 见字相欢
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
