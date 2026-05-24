/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  PenTool, 
  Library, 
  Bookmark, 
  Maximize2, 
  Download, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Copy, 
  BookOpen, 
  Search, 
  Filter, 
  Sparkles, 
  Check, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  X, 
  Sliders, 
  Send, 
  HelpCircle,
  Hash,
  Award,
  Lock,
  User as UserIcon,
  LogOut,
  History,
  UserCheck,
  Github
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { GALLERY_LETTERS, PRESET_TEMPLATES } from "./data";
import { SavedLetter, LetterCustomStyle, UserProfile } from "./types";

// Firebase imports
import { 
  auth, 
  db, 
  OperationType, 
  handleFirestoreError 
} from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  onSnapshot 
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  User
} from "firebase/auth";

export default function App() {
  // Navigation & General state
  const [currentTab, setCurrentTab] = useState<string>("write");
  const [vintageTheme, setVintageTheme] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Letter Writing States
  const [recipient, setRecipient] = useState<string>("意映卿卿如晤");
  const [letterBody, setLetterBody] = useState<string>(
    "见字如面。落笔之时，窗外正催动一窗新绿，山色隐隐。常忆及与你执手溪堂，听风辨雨，不知阁下近日身体安泰否？此地晴雪初霁，偶得素笺一幅，遥寄尺素，万望珍重。"
  );
  const [sender, setSender] = useState<string>("林深见鹿 顿首");
  const [letterDate, setLetterDate] = useState<string>("丙午年孟夏 四月廿四");
  
  // Custom Letter Styles
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("fish-雁书");
  const [customStyle, setCustomStyle] = useState<LetterCustomStyle>({
    fontFamily: "Kaiti", // "Kaiti" | "FangSong" | "SimSun" | "cursive"
    fontSize: "md", // "sm" | "md" | "lg" | "xl"
    inkColor: "#2c2416", // 松烟黑 #2c2416, 朱砂红 #c43a31, 竹绿 #1a4d1a, 石青 #1a334d
    bgColor: "#fcf8ee",
    gridType: "red-row", // "none" | "row" | "grid" | "red-row"
    stampEnabled: true,
    stampText: "见字相欢",
    stampShape: "square",
    stampSize: "md",
    stampFontFamily: "cursive",
    stampX: 0,
    stampY: 0,
    hasGrid: true,
    gridColor: "rgba(196, 58, 49, 0.2)",
    stampName: "见字相欢",
    stampActive: true,
    stampSelection: "crane", // 'none' | 'landscape' | 'crane' | 'plum' | 'lotus'
    showLetterDate: true,
    signatureAlign: "right",
    uploadedImage: "",
    uploadedImageRole: "none",
    uploadedImageOpacity: 0.12,
    uploadedImageScale: 1.0
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [exportedImgUrl, setExportedImgUrl] = useState<string | null>(null);

  const isVertical = PRESET_TEMPLATES.find(t => t.id === selectedTemplateId)?.direction === "vertical";

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    if (isVertical) {
      const timer = setTimeout(() => {
        container.scrollLeft = container.scrollWidth - container.clientWidth;
      }, 150);
      return () => clearTimeout(timer);
    } else {
      container.scrollLeft = 0;
    }
  }, [selectedTemplateId, isVertical]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      if (isVertical) {
        // If there's scrollable horizontal content
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll > 0) {
          const delta = e.deltaY || e.detail * 40;
          // In LTR layout: recipient is on the far right (maxScroll), signature/footer is on far left (0)
          // Scrolling down (delta > 0) wants to read onwards, so we should scroll towards the left (0)
          // Scrolling up (delta < 0) wants to go back, so we should scroll towards the right (maxScroll)
          const newScrollLeft = container.scrollLeft - delta;
          
          const isScrollingToFooter = delta > 0;
          if (
            (isScrollingToFooter && container.scrollLeft > 0) ||
            (!isScrollingToFooter && container.scrollLeft < maxScroll)
          ) {
            e.preventDefault();
          }
          container.scrollLeft = Math.max(0, Math.min(maxScroll, newScrollLeft));
        }
      }
    };

    container.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheelNative);
    };
  }, [isVertical]);

  const applyFormatTag = (type: "bold" | "italic" | "underline" | "red" | "blue" | "large" | "small" | "divider" | "clear") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = letterBody;
    const selectedText = text.substring(start, end);

    let replacement = "";
    if (type === "clear") {
      const cleanText = letterBody.replace(/<\/?[^>]+(>|$)/g, "");
      setLetterBody(cleanText);
      triggerToast("已为您洗尽格式，恢复素色民谣字句。");
      return;
    }

    if (type === "divider") {
      replacement = "\n✦ ┈┈┈┈┈┈┈┈ ✦\n";
    } else {
      let openTag = "";
      let closeTag = "";
      switch (type) {
        case "bold":
          openTag = "<strong>";
          closeTag = "</strong>";
          break;
        case "italic":
          openTag = "<em>";
          closeTag = "</em>";
          break;
        case "underline":
          openTag = "<u>";
          closeTag = "</u>";
          break;
        case "red":
          openTag = '<span style="color:#c43a31">';
          closeTag = "</span>";
          break;
        case "blue":
          openTag = '<span style="color:#1a334d">';
          closeTag = "</span>";
          break;
        case "large":
          openTag = '<span style="font-size:1.25em">';
          closeTag = "</span>";
          break;
        case "small":
          openTag = "<small>";
          closeTag = "</small>";
          break;
      }
      replacement = `${openTag}${selectedText || "撰写字卷"}${closeTag}`;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setLetterBody(newText);
    
    setTimeout(() => {
      textarea.focus();
      const offset = replacement.length - selectedText.length;
      textarea.setSelectionRange(start, end + offset);
    }, 50);
  };

  const [illustrationStyle, setIllustrationStyle] = useState<"none" | "ink-bamboo" | "lotus" | "mountain" | "cloud-border">("ink-bamboo");

  // Editorial Style UI collapsed/expanded States
  const [stylePanelExpanded, setStylePanelExpanded] = useState<boolean>(true);
  const [aiPanelExpanded, setAiPanelExpanded] = useState<boolean>(true);

  // AI Polish states
  const [aiStyle, setAiStyle] = useState<string>("classical");
  const [aiAudience, setAiAudience] = useState<string>("挚友张侯");
  const [aiFocus, setAiFocus] = useState<string>("客游在外，思念友人与江南春色，嘱托保重身体。");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Saved Letters (墨痕斋 Local Storage)
  const [savedLetters, setSavedLetters] = useState<SavedLetter[]>([]);
  
  // Gallery states
  const [gallerySearch, setGallerySearch] = useState<string>("包装");
  const [galleryCategory, setGalleryCategory] = useState<string>("all");
  const [galleryDynasty, setGalleryDynasty] = useState<string>("all");
  const [expandedGalleryId, setExpandedGalleryId] = useState<string | null>("yu-qi-shu");
  
  // Audio state
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // User Profile States
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "林深见鹿",
    title: "竹林散人",
    email: "tutuyuwei@gmail.com",
    signature: "尺素寸心，一苇可航。寄身于笔墨红尘，闲观晴雪，淡对江山。",
    hometown: "江南 姑苏",
    avatarId: "4",
    joinedDate: "2026年孟夏 结识于此"
  });
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // Authentication States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitLoading, setIsAuthSubmitLoading] = useState<boolean>(false);

  // Active envelope/letter & version tracking
  const [activeEnvelopeId, setActiveEnvelopeId] = useState<string | null>(null);
  const [activeVersionName, setActiveVersionName] = useState<string | null>(null);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState<boolean>(false);

  // Load Saved data and hook up Firebase sync on mount/auth-state-change
  useEffect(() => {
    let unsubscribeLetters: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        // Logged in! Synchronize with Cloud Firestore
        const lettersPath = `users/${user.uid}/letters`;
        const q = collection(db, lettersPath);
        
        unsubscribeLetters = onSnapshot(q, (snapshot) => {
          const list: SavedLetter[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as SavedLetter;
            list.push(data);
          });
          // sort descending by savedAt
          list.sort((a,b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
          setSavedLetters(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, lettersPath);
        });

        const profilePath = `users/${user.uid}`;
        const profileRef = doc(db, profilePath);
        unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            setUserProfile(data);
          } else {
            // Document doesn't exist yet, seed with initial state or user's Google display details
            const initial: UserProfile = {
              uid: user.uid,
              name: user.displayName || "林深见鹿",
              title: "竹林散人",
              email: user.email || "",
              signature: "尺素寸心，一苇可航。寄身于笔墨红尘，闲观晴雪，淡对江山。",
              hometown: "江南 姑苏",
              avatarId: "4",
              joinedDate: "2026年孟夏 结识于此"
            } as any;
            
            setDoc(profileRef, initial).catch(err => {
              console.error("Failed to seed user profile:", err);
            });
            setUserProfile(initial);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, profilePath);
        });

      } else {
        // Guest/Logged out: revert to local storage
        if (unsubscribeLetters) unsubscribeLetters();
        if (unsubscribeProfile) unsubscribeProfile();
        
        const letters = localStorage.getItem("yushu_saved_letters");
        if (letters) {
          try {
            setSavedLetters(JSON.parse(letters));
          } catch (e) {
            console.error(e);
          }
        } else {
          // Initialize with default
          const defaultSaved: SavedLetter[] = [
            {
              id: "default-1",
              envelopeId: "default-env-1",
              versionName: "版本一",
              title: "寄山阴知己手札",
              recipient: "山阴张侯 阁下",
              content: "快雪时晴，佳想安泰。未果为结，力不次。别后瞬息经秋，春华不复，唯松柏长青。盼重温浊酒，共话沧桑。",
              sender: "羲之 顿首",
              date: "丙午年仲冬 廿四下浣",
              templateId: "fish-雁书",
              customStyle: {
                fontFamily: "Kaiti",
                fontSize: "md",
                inkColor: "#2c2416",
                bgColor: "#fcf8ee",
                gridType: "red-row",
                stampEnabled: true,
                stampText: "安泰",
                stampShape: "square",
                stampSize: "md",
                stampFontFamily: "cursive",
                hasGrid: true,
                gridColor: "rgba(196, 58, 49, 0.2)",
                stampName: "安泰",
                stampActive: true,
                stampSelection: "landscape"
              },
              illustrationType: "mountain",
              savedAt: new Date().toLocaleString()
            }
          ];
          setSavedLetters(defaultSaved);
          localStorage.setItem("yushu_saved_letters", JSON.stringify(defaultSaved));
        }

        const profile = localStorage.getItem("yushu_user_profile");
        if (profile) {
          try {
            setUserProfile(JSON.parse(profile));
          } catch (e) {
            console.error(e);
          }
        }
      }
    });

    const theme = localStorage.getItem("yushu_vintage_theme");
    if (theme) {
      setVintageTheme(theme === "true");
    }

    return () => {
      unsubAuth();
      if (unsubscribeLetters) unsubscribeLetters();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Save changes helper
  const saveLettersToStorage = (updatedList: SavedLetter[]) => {
    setSavedLetters(updatedList);
    localStorage.setItem("yushu_saved_letters", JSON.stringify(updatedList));
  };

  // Toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Theme Toggle handler
  const toggleTheme = () => {
    const nextTheme = !vintageTheme;
    setVintageTheme(nextTheme);
    localStorage.setItem("yushu_vintage_theme", String(nextTheme));
    triggerToast(nextTheme ? "已切换为: 复古文艺主题 (纸墨染古色)" : "已切换为: 古典素雅主题 (极简宣纸卷)");
  };

  // Apply a preset template
  const handleApplyTemplate = (id: string) => {
    const preset = PRESET_TEMPLATES.find(t => t.id === id);
    if (!preset) return;
    
    if (preset.direction === "vertical" && letterBody.length > 500) {
      triggerToast(`竖排尺素限额最多500字（当前${letterBody.length}字）。请删减字数或转用横排，以臻绝佳古典排版。`, "error");
      return;
    }
    
    setSelectedTemplateId(id);
    
    // Choose appropriate fontFamily mapping
    let font = "Kaiti";
    if (preset.fontFamily.includes("Kaiti")) font = "Kaiti";
    else if (preset.fontFamily.includes("FangSong")) font = "FangSong";
    else if (preset.fontFamily.includes("SimSun")) font = "SimSun";

    setIllustrationStyle(preset.illustrations as any);
    setCustomStyle(prev => ({
      ...prev,
      bgColor: preset.bgColor,
      gridType: preset.gridType,
      fontFamily: font,
      hasGrid: preset.gridType !== "none",
      gridColor: preset.gridColor
    }));

    triggerToast(`已铺展: ${preset.name} 笺纸！`);
  };

  // Save/Overwrite a specific version of a letter
  const performSaveLetter = async (
    targetEnvelopeId: string, 
    versionToOverwriteId: string | null, // null means save as a new version
    assignedVersionName: string
  ) => {
    const documentId = versionToOverwriteId || "letter_" + Date.now();
    const saveTimeStr = new Date().toLocaleString();
    const titleStr = letterBody.substring(0, 10).trim().replace(/\n/g, " ") + "..." || "未命名书信";

    const savedDoc: SavedLetter = {
      id: documentId,
      envelopeId: targetEnvelopeId,
      versionName: assignedVersionName,
      title: titleStr,
      recipient,
      content: letterBody,
      sender,
      date: letterDate,
      templateId: selectedTemplateId,
      customStyle: { ...customStyle },
      illustrationType: illustrationStyle,
      savedAt: saveTimeStr
    };

    if (currentUser) {
      // Cloud Firestore save
      const docPath = `users/${currentUser.uid}/letters/${documentId}`;
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/letters`, documentId), {
          ...savedDoc,
          userId: currentUser.uid
        });
        triggerToast(`【${assignedVersionName}】已保存至云端「墨痕斋」`, "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
        triggerToast("云端保存失败，请检查网络权限", "error");
        return;
      }
    } else {
      // Local Storage save
      let currentList = [...savedLetters];
      if (versionToOverwriteId) {
        currentList = currentList.map(item => item.id === versionToOverwriteId ? savedDoc : item);
      } else {
        currentList = [savedDoc, ...currentList];
      }
      saveLettersToStorage(currentList);
      triggerToast(`【${assignedVersionName}】已存入本地「珍藏阁」`, "success");
    }

    setActiveEnvelopeId(targetEnvelopeId);
    setActiveVersionName(assignedVersionName);
    setShowSaveVersionModal(false);
  };

  // Trigger Save Sequence (Either direct version-one save or triggers popup if editing existing)
  const handleSaveLetter = () => {
    if (!letterBody.trim()) {
      triggerToast("请至少随手挥毫几字，再行封卷珍藏。", "error");
      return;
    }

    if (!activeEnvelopeId) {
      // Brand new letter: auto save as "版本一"
      const newEnvelopeId = "env_" + Date.now();
      performSaveLetter(newEnvelopeId, null, "版本一");
    } else {
      // Existing letter envelope: prompt with version options in modal
      setShowSaveVersionModal(true);
    }
  };

  // Edit Profile Sync
  const saveProfileChange = async () => {
    if (currentUser) {
      const docPath = `users/${currentUser.uid}`;
      try {
        await setDoc(doc(db, "users", currentUser.uid), {
          ...userProfile,
          uid: currentUser.uid,
          updatedAt: new Date().toISOString()
        });
        setIsEditingProfile(false);
        triggerToast("阁下雅照及生平简介已同步至云端", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
        triggerToast("云端同步失败，请检查网络", "error");
      }
    } else {
      localStorage.setItem("yushu_user_profile", JSON.stringify(userProfile));
      setIsEditingProfile(false);
      triggerToast("阁下雅照及生平简介已重新入卷(本地)", "success");
    }
  };

  // Delete specific version
  const deleteSavedLetter = async (id: string, e: any) => {
    if (e) e.stopPropagation();
    
    // Check if we are deleting the currently editing active version
    const itemToDelete = savedLetters.find(l => l.id === id);
    
    if (currentUser) {
      const docPath = `users/${currentUser.uid}/letters/${id}`;
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/letters`, id));
        triggerToast("此幅书简已在砚池中焚化褪墨。", "info");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
        triggerToast("云端焚毁失败，请检查网络", "error");
        return;
      }
    } else {
      const filtered = savedLetters.filter(l => l.id !== id);
      saveLettersToStorage(filtered);
      triggerToast("此幅书简已在本地砚池中焚化褪墨。", "info");
    }

    if (id === activeVersionName || (itemToDelete && itemToDelete.envelopeId === activeEnvelopeId && itemToDelete.versionName === activeVersionName)) {
      setActiveVersionName(null);
      setActiveEnvelopeId(null);
    }
  };

  // Delete entire envelope group
  const deleteEnvelopeGroup = async (envelopeId: string, e: any) => {
    if (e) e.stopPropagation();
    const versionsToDelete = savedLetters.filter(l => l.envelopeId === envelopeId || l.id === envelopeId);
    
    if (currentUser) {
      try {
        for (const ver of versionsToDelete) {
          await deleteDoc(doc(db, `users/${currentUser.uid}/letters`, ver.id));
        }
        triggerToast("此信封及其所有版本已在云端砚池中彻底焚除。", "info");
      } catch (err) {
        console.error("Failed to delete envelope versions from cloud:", err);
        triggerToast("部分云端版本焚毁失败，请检查网络", "error");
      }
    } else {
      const filtered = savedLetters.filter(l => l.envelopeId !== envelopeId && l.id !== envelopeId);
      saveLettersToStorage(filtered);
      triggerToast("此本地信封及其所有历史版本已彻底焚除。", "info");
    }

    if (envelopeId === activeEnvelopeId) {
      setActiveEnvelopeId(null);
      setActiveVersionName(null);
    }
  };

  // Load saved letter or version
  const loadSavedLetterToDraft = (letter: SavedLetter) => {
    setRecipient(letter.recipient);
    
    let contentVal = letter.content;
    let templateIdVal = letter.templateId;
    const preset = PRESET_TEMPLATES.find(t => t.id === templateIdVal);
    
    if (preset?.direction === "vertical" && contentVal.length > 500) {
      templateIdVal = "paper-素笺"; // Auto fall back to "素笺"
      triggerToast(`此幅旧信字数达${contentVal.length}字（超竖排500字上限），自动铺展在横排「素笺」中以全篇面貌呈现。`, "info");
    }

    setLetterBody(contentVal);
    setSender(letter.sender);
    setLetterDate(letter.date);
    setSelectedTemplateId(templateIdVal);
    
    const targetPreset = PRESET_TEMPLATES.find(t => t.id === templateIdVal);
    setCustomStyle(prev => ({
      ...prev,
      ...letter.customStyle,
      gridType: targetPreset?.gridType ?? letter.customStyle.gridType,
      hasGrid: targetPreset?.gridType !== "none"
    }));
    setIllustrationStyle(letter.illustrationType as any);
    
    // Set tracking IDs
    setActiveEnvelopeId(letter.envelopeId || letter.id);
    setActiveVersionName(letter.versionName || "版本一");

    setCurrentTab("write");
    // Scroll to top of letter editor
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Authentication Handlers
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError("邮箱与密码不可空缺");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("登阁密码最少六位");
      return;
    }
    setIsAuthSubmitLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      const user = userCredential.user;
      
      // Update profile displayName
      await updateProfile(user, { displayName: userProfile.name });

      // Create initial Firestore Profile
      const initial: UserProfile = {
        uid: user.uid,
        name: userProfile.name,
        title: userProfile.title,
        email: user.email || "",
        signature: userProfile.signature,
        hometown: userProfile.hometown,
        avatarId: userProfile.avatarId,
        joinedDate: "2026年孟夏 登临墨阁"
      } as any;
      await setDoc(doc(db, "users", user.uid), initial);

      setUserProfile(initial);
      triggerToast("恭喜阁下顺利登临雅阁，账号已入卷！");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setAuthError("此邮箱已存在于雅客名册中");
      } else {
        setAuthError(err.message || "登阁注册受阻，请确信网络或联系主持。");
      }
    } finally {
      setIsAuthSubmitLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError("请填写已登记的邮箱与密码");
      return;
    }
    setIsAuthSubmitLoading(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      triggerToast("客官久候！墨客大厅已为您敞开。");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setAuthError("邮箱登临名牌或密码不符，请核实。");
      } else {
        setAuthError(err.message || "未能登临阁楼，请核实或注册新客。");
      }
    } finally {
      setIsAuthSubmitLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      triggerToast("Google 雅客快捷配对成功，已登临墨阁。");
    } catch (err: any) {
      console.error(err);
      setAuthError("Google 快捷登阁受阻，多因沙盒浏览器或网络所致。可使用邮箱注册登入。");
    }
  };

  const handleGithubLogin = async () => {
    setAuthError(null);
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      triggerToast("GitHub 雅客快捷配对成功，已登临墨阁。");
    } catch (err: any) {
      console.error(err);
      setAuthError("GitHub 快捷登阁受阻，多因沙盒浏览器或网络所致。可使用邮箱注册登入。");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveEnvelopeId(null);
      setActiveVersionName(null);
      triggerToast("已退阁作客，笔台已还原为客用素案。", "info");
    } catch (err) {
      console.error("SignOut Exception:", err);
    }
  };

  // One-click apply from Gallery to Write Desk
  const handleLoadFromGallery = (gallery: any) => {
    setRecipient(gallery.category === "love" ? "见信如晤：" : gallery.category === "family" ? "双亲大人福绥：" : "足下雅鉴：");
    setLetterBody(gallery.content);
    setSender(`${gallery.author} 敬书`);
    setLetterDate(gallery.period);
    
    // Auto design matching aesthetics based on category
    if (gallery.category === "love") {
      handleApplyTemplate("flower-花间");
    } else if (gallery.category === "family") {
      if (gallery.content.length > 500) {
        handleApplyTemplate("paper-素笺");
        triggerToast(`文言《${gallery.title}》字数较多，已自动适配为「素笺(温润横排)」样式。`, "info");
      } else {
        handleApplyTemplate("fish-雁书");
      }
    } else {
      handleApplyTemplate("paper-素笺");
    }
    
    setCurrentTab("write");
    window.scrollTo({ top: 0, behavior: "smooth" });
    triggerToast(`已一键套用古人《${gallery.title}》绝唱入契，请在此修改您的心怀。`, "info");
  };

  const handleAiPolish = async () => {
    if (!letterBody) {
      triggerToast("请先在上方输入起草的尺素文字或草稿，方可进行研墨润笔！", "error");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: letterBody,
          style: aiStyle,
          audience: aiAudience,
          focus: aiFocus,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLetterBody(data.text);
        triggerToast("✨ 研云拂尘，尺素已妙笔生花！", "success");
      } else {
        setAiError(data.error || "书简重构受阻，请稍后重试。");
        triggerToast(data.error || "研墨润笔遇阻，请修改并重试", "error");
      }
    } catch (err: any) {
      setAiError("无法连通阁下书斋服务器。");
      triggerToast("连接后台润墨服务失败", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Text to Speech logic (TTS) using SpeechSynthesis
  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
    }
  };

  const speakGalleryLetter = (gallery: any) => {
    if (!window.speechSynthesis) {
      triggerToast("您的浏览器未装配语音发声机关，推荐使用现代 Chrome / Edge 浏览器。", "error");
      return;
    }

    if (activeSpeechId === gallery.id) {
      // Toggle pause/stop
      stopSpeech();
      return;
    }

    stopSpeech(); // Clear any playing speech
    
    const textToRead = `书信名：${gallery.title}。作者：${gallery.author}。年代：${gallery.dynasty}。正文：${gallery.content}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Find a nice Chinese voice
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes("zh") || v.lang.includes("CN"));
    if (zhVoice) {
      utterance.voice = zhVoice;
    }
    
    // Elegant steady pacing for classical writings
    utterance.rate = 0.82; 
    utterance.pitch = 0.95;

    utterance.onend = () => {
      setActiveSpeechId(null);
    };

    utterance.onerror = () => {
      setActiveSpeechId(null);
    };

    speechUtteranceRef.current = utterance;
    setActiveSpeechId(gallery.id);
    window.speechSynthesis.speak(utterance);
    triggerToast(`正在琴台朗读《${gallery.title}》，静心聆听古人心跳`);
  };

  // Stop TTS when switching tabs
  useEffect(() => {
    stopSpeech();
  }, [currentTab]);

  // Copy helper
  const copyTextToClipboard = (text: string, title?: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(title ? `《${title}》原文已拓印入心，存入您的剪贴板 📋` : "文本已复制入墨盘 📋");
  };

  // OKLCH / OKLab color conversion helpers for browser rendering compat with html2canvas
  const oklchToRgb = (L: number, C: number, H: number, A: number = 1): string => {
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    return oklabToRgb(L, a, b, A);
  };

  const oklabToRgb = (L: number, a: number, b: number, A: number = 1): string => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    
    let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    const f = (x: number) => x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    
    const r8 = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
    const g8 = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
    const b8 = Math.max(0, Math.min(255, Math.round(f(b_rgb) * 255)));
    
    return A !== 1 ? `rgba(${r8}, ${g8}, ${b8}, ${A})` : `rgb(${r8}, ${g8}, ${b8})`;
  };

  const parseOklch = (str: string): string => {
    return str.replace(/oklch\(([^)]+)\)/gi, (match, contents) => {
      try {
        const parts = contents.trim().split(/[\s,\/]+/);
        if (parts.length < 3) return "rgb(200, 200, 200)";
        
        let L = parseFloat(parts[0]);
        if (parts[0].includes('%')) L = L / 100;
        
        let C = parseFloat(parts[1]);
        if (parts[1].includes('%')) C = C / 100;
        
        let H = parseFloat(parts[2]);
        
        let A = 1;
        if (parts.length >= 4) {
          A = parseFloat(parts[3]);
          if (parts[3].includes('%')) A = A / 100;
          if (isNaN(A)) A = 1;
        }
        
        if (isNaN(L) || isNaN(C) || isNaN(H)) return "rgb(200, 200, 200)";
        return oklchToRgb(L, C, H, A);
      } catch (e) {
        return "rgb(200, 200, 200)";
      }
    });
  };

  const parseOklab = (str: string): string => {
    return str.replace(/oklab\(([^)]+)\)/gi, (match, contents) => {
      try {
        const parts = contents.trim().split(/[\s,\/]+/);
        if (parts.length < 3) return "rgb(200, 200, 200)";
        
        let L = parseFloat(parts[0]);
        if (parts[0].includes('%')) L = L / 100;
        
        let a = parseFloat(parts[1]);
        let b = parseFloat(parts[2]);
        
        let A = 1;
        if (parts.length >= 4) {
          A = parseFloat(parts[3]);
          if (parts[3].includes('%')) A = A / 100;
          if (isNaN(A)) A = 1;
        }
        
        if (isNaN(L) || isNaN(a) || isNaN(b)) return "rgb(200, 200, 200)";
        return oklabToRgb(L, a, b, A);
      } catch (e) {
        return "rgb(200, 200, 200)";
      }
    });
  };

  // Image Export with full modern color support and sanitization
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const exportAsPng = async () => {
    const el = document.getElementById("letter-sheet-capture");
    if (!el) {
      triggerToast("未找到信纸实体，无法画影。", "error");
      return;
    }

    setIsExporting(true);
    triggerToast("画室画仙正在为您泼墨画影，恢复朱砂黛颜色，请勿触碰信笺...", "info");

    const styleBackups: { node: HTMLElement; parent: Node | null; nextSibling: Node | null }[] = [];
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      // 1. Temporarily patch window.getComputedStyle for on-the-fly conversion
      window.getComputedStyle = function(element, pseudoElt) {
        const style = originalGetComputedStyle(element, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            const val = Reflect.get(target, prop);
            if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
              return parseOklab(parseOklch(val));
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        });
      };

      // 2. Temporarily sanitize and swap active stylesheets that contain oklch or oklab
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const node = sheet.ownerNode as HTMLElement;
          if (!node) continue;
          
          let cssText = "";
          try {
            const rules = Array.from(sheet.cssRules);
            cssText = rules.map(r => r.cssText).join("\n");
          } catch (e) {
            continue; // Ignore cross-origin sheets html2canvas misses anyway
          }
          
          if (cssText.includes("oklch") || cssText.includes("oklab")) {
            const sanitizedCss = parseOklab(parseOklch(cssText));
            
            const tempStyle = document.createElement("style");
            tempStyle.setAttribute("data-temp-sanitized", "true");
            tempStyle.textContent = sanitizedCss;
            document.head.appendChild(tempStyle);
            
            const parent = node.parentNode;
            const nextSibling = node.nextSibling;
            
            styleBackups.push({ node, parent, nextSibling });
            node.remove();
          }
        } catch (err) {
          console.warn("Could not sanitize sheet:", err);
        }
      }

      const canvas = await html2canvas(el, {
        scale: 2.5, // high-res crisp printing
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      setExportedImgUrl(imgData); // Active beautiful classic artwork popup overlay

      try {
        const link = document.createElement("a");
        link.download = `与书_${recipient ? recipient.substring(0, 10).replace(/[\s\n\r<>]/g, "") : "良友"}_${Date.now()}.png`;
        link.href = imgData;
        link.click();
        triggerToast("尺素珍图已尝试传送书案！若未能自动下载，请右键/长按弹窗图片手存。", "success");
      } catch (downloadErr) {
        console.warn("Direct download blocked by sandboxing, displaying modal fallback", downloadErr);
        triggerToast("画轴印制成功！已将画幅呈案，请在弹窗中右键或长按手存。", "info");
      }
    } catch (e: any) {
      console.error(e);
      triggerToast("画影遭遇水汽晕染(失败)，您亦可使用浏览器截图功能直接留存宣纸画面。", "error");
    } finally {
      // Restore all original styles and computedStyle getters
      window.getComputedStyle = originalGetComputedStyle;
      styleBackups.forEach(({ node, parent, nextSibling }) => {
        if (parent) {
          parent.insertBefore(node, nextSibling);
        }
      });
      document.querySelectorAll("style[data-temp-sanitized]").forEach((el) => el.remove());
      setIsExporting(false);
    }
  };

  // jsPDF dynamic high-fidelity landscape/portrait vector printing
  const exportAsPdfReal = async () => {
    const el = document.getElementById("letter-sheet-capture");
    if (!el) {
      triggerToast("未找到信纸实体，无法印制PDF。", "error");
      return;
    }

    setIsExportingPdf(true);
    triggerToast("画室画仙正在为您精工编排PDF雅卷，请勿触碰信笺...", "info");

    const styleBackups: { node: HTMLElement; parent: Node | null; nextSibling: Node | null }[] = [];
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      // 1. Temporarily patch window.getComputedStyle for on-the-fly conversion
      window.getComputedStyle = function(element, pseudoElt) {
        const style = originalGetComputedStyle(element, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            const val = Reflect.get(target, prop);
            if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
              return parseOklab(parseOklch(val));
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        });
      };

      // 2. Temporarily sanitize and swap active stylesheets that contain oklch or oklab
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const node = sheet.ownerNode as HTMLElement;
          if (!node) continue;
          
          let cssText = "";
          try {
            const rules = Array.from(sheet.cssRules);
            cssText = rules.map(r => r.cssText).join("\n");
          } catch (e) {
            continue;
          }
          
          if (cssText.includes("oklch") || cssText.includes("oklab")) {
            const sanitizedCss = parseOklab(parseOklch(cssText));
            
            const tempStyle = document.createElement("style");
            tempStyle.setAttribute("data-temp-sanitized", "true");
            tempStyle.textContent = sanitizedCss;
            document.head.appendChild(tempStyle);
            
            const parent = node.parentNode;
            const nextSibling = node.nextSibling;
            
            styleBackups.push({ node, parent, nextSibling });
            node.remove();
          }
        } catch (err) {
          console.warn("Could not sanitize sheet:", err);
        }
      }

      const canvas = await html2canvas(el, {
        scale: 2.5, // Crisp rendering for vector PDF containers
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const orientation = imgWidth > imgHeight ? "l" : "p";

      const pdf = new jsPDF({
        orientation: orientation,
        unit: "px",
        format: [imgWidth, imgHeight]
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
      
      const fileName = `与书_${recipient ? recipient.substring(0, 10).replace(/[\s\n\r<>]/g, "") : "良友"}_${Date.now()}.pdf`;
      pdf.save(fileName);
      triggerToast("尺素雅集精印完毕！已尝试传送 PDF 雅卷至您的书几之上。", "success");
    } catch (e: any) {
      console.error(e);
      triggerToast("画影印制 PDF 失败，您亦可直接转换明信照或系统打印。", "error");
    } finally {
      // Restore all original styles and computedStyle getters
      window.getComputedStyle = originalGetComputedStyle;
      styleBackups.forEach(({ node, parent, nextSibling }) => {
        if (parent) {
          parent.insertBefore(node, nextSibling);
        }
      });
      document.querySelectorAll("style[data-temp-sanitized]").forEach((el) => el.remove());
      setIsExportingPdf(false);
    }
  };

  // Simple window fallback printing
  const triggerPdfExport = () => {
    triggerToast("正在呼唤画师编排版面，即将为您开启系统打印或PDF排版台……", "info");
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  // Derived style parameters based on user selections
  const fontClass = 
    customStyle.fontFamily === "Kaiti" ? "font-serif tracking-wide text-justify" :
    customStyle.fontFamily === "FangSong" ? "font-mono font-light tracking-wide leading-relaxed" :
    customStyle.fontFamily === "SimSun" ? "font-serif tracking-widest text-[#222] font-semibold" :
    customStyle.fontFamily === "STXingkai" ? "font-serif font-medium tracking-wide italic" :
    customStyle.fontFamily === "LiSu" ? "font-serif tracking-wider font-light" :
    customStyle.fontFamily === "cursive" ? "font-serif tracking-widest italic" :
    "font-sans";

  const getFontFamilyStyle = () => {
    switch (customStyle.fontFamily) {
      case "Kaiti": return "STKaiti, Kaiti, KaiTi_GB2312, serif";
      case "FangSong": return "STFangsong, FangSong, serif";
      case "SimSun": return "SimSun, STSong, serif";
      case "STXingkai": return "STXingkai, cursive, serif";
      case "LiSu": return "LiSu, serif";
      case "cursive": return "cursive, STKaiti, Kaiti, serif";
      default: return "inherit";
    }
  };

  const getPaperTextureClass = () => {
    switch (customStyle.paperTexture) {
      case "pure-xuan": return "paper-tex-pure-xuan";
      case "cooked-xuan": return "paper-tex-cooked-xuan";
      case "antique-tea": return "paper-tex-antique-tea";
      case "gold-flecks": return "paper-tex-gold-flecks";
      case "linen-weave": return "paper-tex-linen-weave";
      case "cloud-mica": return "paper-tex-cloud-mica";
      case "fibrous-parchment": return "paper-tex-fibrous-parchment";
      case "mottled-parchment": return "paper-tex-mottled-parchment";
      case "gilded-border": return "paper-tex-pure-xuan";
      default: return "";
    }
  };

  const getFontSizeClass = () => {
    switch (customStyle.fontSize) {
      case "xs": return "text-xs leading-[1.6rem]";
      case "sm": return "text-sm leading-[1.8rem]";
      case "md": return "text-base leading-[2.1rem]";
      case "lg": return "text-lg leading-[2.5rem]";
      case "xl": return "text-xl leading-[2.8rem]";
      case "2xl": return "text-2xl leading-[3.4rem]";
      default: return "text-base leading-[2.1rem]";
    }
  };

  const getVerticalBodyWidth = () => {
    // Estimations of characters per vertical column
    let charsPerCol = 18;
    switch (customStyle.fontSize) {
      case "xs": charsPerCol = 25; break;
      case "sm": charsPerCol = 22; break;
      case "md": charsPerCol = 18; break;
      case "lg": charsPerCol = 15; break;
      case "xl": charsPerCol = 13; break;
      case "2xl": charsPerCol = 10; break;
    }

    const paragraphs = letterBody.split("\n");
    let totalCols = 0;
    paragraphs.forEach(p => {
      const len = p.length;
      if (len === 0) {
        totalCols += 1;
      } else {
        totalCols += Math.ceil(len / charsPerCol);
      }
    });

    // We add 2 extra spacing columns for beautiful negative space and padding at the end of the text block
    totalCols += 2;

    // Minimum width is 300px (around 8.5 columns since 1 column size is 2.22rem)
    totalCols = Math.max(totalCols, 9);

    // Give each column 2.22rem (maps directly to the background lines grid size)
    return `${totalCols * 2.22}rem`;
  };

  // Traditional color selections
  const primaryInkColor = customStyle.inkColor;

  const getVerticalGridBackgroundImage = () => {
    switch (customStyle.gridType) {
      case "red-row":
        return "linear-gradient(to left, rgba(196, 58, 49, 0.15) 1px, transparent 1px)";
      case "row":
        return "linear-gradient(to left, rgba(140, 123, 101, 0.12) 1px, transparent 1px)";
      case "green-row":
        return "linear-gradient(to left, rgba(82, 120, 82, 0.22) 1px, transparent 1px)";
      case "brown-row":
        return "linear-gradient(to left, rgba(140, 100, 60, 0.16) 1px, transparent 1px)";
      case "blue-row":
        return "linear-gradient(to left, rgba(70, 95, 120, 0.16) 1px, transparent 1px)";
      case "double-red":
        return "linear-gradient(to left, rgba(196, 58, 49, 0.2) 1px, transparent 1px), linear-gradient(to left, rgba(196, 58, 49, 0.08) 2px, transparent 2px)";
      case "grid":
        return "linear-gradient(to left, rgba(184, 150, 62, 0.15) 1px, transparent 1px), linear-gradient(rgba(184, 150, 62, 0.1) 1px, transparent 1px)";
      case "vermilion-box":
        return "linear-gradient(to left, rgba(196, 58, 49, 0.18) 1px, transparent 1px), linear-gradient(rgba(196, 58, 49, 0.1) 1px, transparent 1px)";
      default:
        return "none";
    }
  };

  const getVerticalGridBackgroundSize = () => {
    if (customStyle.gridType === "double-red") {
      return "2.22rem 100%, 1.11rem 100%";
    }
    if (customStyle.gridType === "grid" || customStyle.gridType === "vermilion-box") {
      return "2.22rem 2.22rem, 2.22rem 2.22rem";
    }
    return "2.22rem 100%";
  };

  const getHorizontalGridBackgroundImage = () => {
    switch (customStyle.gridType) {
      case "red-row":
        return "linear-gradient(rgba(196, 58, 49, 0.15) 1px, transparent 1px)";
      case "row":
        return "linear-gradient(rgba(140, 123, 101, 0.12) 1px, transparent 1px)";
      case "green-row":
        return "linear-gradient(rgba(82, 120, 82, 0.22) 1px, transparent 1px)";
      case "brown-row":
        return "linear-gradient(rgba(140, 100, 60, 0.16) 1px, transparent 1px)";
      case "blue-row":
        return "linear-gradient(rgba(70, 95, 120, 0.16) 1px, transparent 1px)";
      case "double-red":
        return "linear-gradient(rgba(196, 58, 49, 0.2) 1px, transparent 1px), linear-gradient(rgba(196, 58, 49, 0.08) 2px, transparent 2px)";
      case "grid":
        return "radial-gradient(ellipse at center, rgba(184, 150, 62, 0.15) 20%, transparent 20%), linear-gradient(rgba(184, 150, 62, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(184, 150, 62, 0.1) 1px, transparent 1px)";
      case "vermilion-box":
        return "linear-gradient(rgba(196, 58, 49, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(196, 58, 49, 0.1) 1px, transparent 1px)";
      default:
        return "none";
    }
  };

  const getHorizontalGridBackgroundSize = () => {
    if (customStyle.gridType === "double-red") {
      return "100% 2.1rem, 100% 1.05rem";
    }
    if (customStyle.gridType === "grid") {
      return "2rem 2rem, 2rem 2rem, 2rem 2rem";
    }
    if (customStyle.gridType === "vermilion-box") {
      return "2rem 2rem, 2rem 2rem";
    }
    return "100% 2.1rem";
  };

  // Filtered letters for the Gallery
  const filteredGalleryLetters = GALLERY_LETTERS.filter(letItem => {
    const searchString = `${letItem.title} ${letItem.author} ${letItem.summary} ${letItem.content}`.toLowerCase();
    const matchesSearch = !gallerySearch || searchString.includes(gallerySearch.toLowerCase());
    const matchesCategory = galleryCategory === "all" || letItem.category === galleryCategory;
    const matchesDynasty = galleryDynasty === "all" || letItem.dynasty.includes(galleryDynasty) || (galleryDynasty === "唐宋" && (letItem.dynasty.includes("唐") || letItem.dynasty.includes("宋"))) || (galleryDynasty === "古典" && (letItem.dynasty.includes("魏晋") || letItem.dynasty.includes("汉") || letItem.dynasty.includes("秦")));
    return matchesSearch && matchesCategory && matchesDynasty;
  });

  // Group saved letters by envelopeId
  interface EnvelopeGroup {
    envelopeId: string;
    latestSavedAt: string;
    latestLetter: SavedLetter;
    versions: SavedLetter[];
  }

  const getEnvelopeGroups = (): EnvelopeGroup[] => {
    const groupsMap: { [key: string]: SavedLetter[] } = {};
    savedLetters.forEach(letter => {
      const eid = letter.envelopeId || letter.id;
      if (!groupsMap[eid]) {
        groupsMap[eid] = [];
      }
      groupsMap[eid].push(letter);
    });

    const groupsList: EnvelopeGroup[] = Object.keys(groupsMap).map(eid => {
      const versions = [...groupsMap[eid]];
      // Sort versions within group so latest SavedAt is first
      versions.sort((a,b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      
      return {
        envelopeId: eid,
        latestSavedAt: versions[0]?.savedAt || "",
        latestLetter: versions[0],
        versions: versions
      };
    });

    // Sort groups so the group with the most recent saved activity comes first
    groupsList.sort((a,b) => new Date(b.latestSavedAt).getTime() - new Date(a.latestSavedAt).getTime());

    return groupsList;
  };

  // Stamp components renderer helper inside the dynamic letter pad
  const getStampColor = () => "#c43a31"; // Traditional 朱砂红

  return (
    <div id="app-root-container" className="min-h-screen flex flex-col transition-colors duration-500 selection:bg-[#c43a31]/20 font-sans"
         style={{
           backgroundColor: vintageTheme ? "#f5efe1" : "#fbfaf8",
           color: vintageTheme ? "#3d3525" : "#2c2c2c"
         }}>
      
      {/* Dynamic Absolute Toast Message */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-bounce shadow-xl border p-4 rounded-lg flex items-start space-x-3 transition-all duration-300 transform translate-y-0
          style-success:bg-[#f3f9f3] bg-[#fbfaf8] border-[#c8b99d]"
          style={{
            backgroundColor: toast.type === "success" ? "#f2f9f1" : toast.type === "error" ? "#fbf5f4" : "#f5f6f8",
            borderColor: toast.type === "success" ? "#a8cf9a" : toast.type === "error" ? "#eab9b5" : "#e0ddd5",
            borderLeftWidth: "6px",
            borderLeftColor: toast.type === "success" ? "#c43a31" : toast.type === "error" ? "#c43a31" : "#8c7b65"
          }}>
          <div className="flex-1">
            <p className="text-xs font-serif text-[#333] font-semibold" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Styled Ancient/Minimal Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md bg-opacity-95 transition-all duration-300"
              style={{
                backgroundColor: vintageTheme ? "rgba(242, 235, 219, 0.96)" : "rgba(251, 250, 248, 0.96)",
                borderColor: vintageTheme ? "#ded0b6" : "#e0ddd5"
              }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Identity / Seal Logo */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setCurrentTab("write")}>
            <div className="w-9 h-9 flex items-center justify-center rounded-sm bg-[#c43a31] border border-[#a42c24] shadow-sm transform hover:scale-105 active:scale-95 transition-all">
              <span className="font-serif font-semibold text-white text-base tracking-widest" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                与
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold font-serif tracking-widest text-[#2c2c2c] -mb-1" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                与书
              </span>
              <span className="text-[9px] tracking-[0.15em] text-[#8c887d] font-serif uppercase">
                Yu Letter · 尺素寸心
              </span>
            </div>
          </div>

          {/* Navigation Links with Editorial aesthetic */}
          <nav className="flex space-x-2 sm:space-x-5">
            <button
              onClick={() => setCurrentTab("write")}
              className={`px-3 py-1.5 text-xs sm:text-sm font-serif tracking-wider transition-all duration-300 flex items-center space-x-1.5 border-b-2
                ${currentTab === "write" 
                  ? "border-[#c43a31] text-[#c43a31] font-bold" 
                  : "border-transparent text-[#5c544d] hover:text-[#c43a31]"
                }`}
              style={{ fontFamily: "STKaiti, Kaiti, sans-serif" }}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>尺素书案</span>
            </button>

            <button
              onClick={() => setCurrentTab("gallery")}
              className={`px-3 py-1.5 text-xs sm:text-sm font-serif tracking-wider transition-all duration-300 flex items-center space-x-1.5 border-b-2
                ${currentTab === "gallery" 
                  ? "border-[#c43a31] text-[#c43a31] font-bold" 
                  : "border-transparent text-[#5c544d] hover:text-[#c43a31]"
                }`}
              style={{ fontFamily: "STKaiti, Kaiti, sans-serif" }}
            >
              <Library className="w-3.5 h-3.5" />
              <span>明信文化馆</span>
            </button>

            <button
              onClick={() => setCurrentTab("home")}
              className={`px-3 py-1.5 text-xs sm:text-sm font-serif tracking-wider transition-all duration-300 flex items-center space-x-1.5 border-b-2 relative
                ${currentTab === "home" 
                  ? "border-[#c43a31] text-[#c43a31] font-bold" 
                  : "border-transparent text-[#5c544d] hover:text-[#c43a31]"
                }`}
              style={{ fontFamily: "STKaiti, Kaiti, sans-serif" }}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>墨痕斋 (个人主页)</span>
              {savedLetters.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#c43a31] text-[9px] text-white">
                  {savedLetters.length}
                </span>
              )}
            </button>
          </nav>

          {/* Slogan and Action buttons (Theme trigger) */}
          <div className="flex items-center space-x-3">
            <button
              id="theme-toggle"
              onClick={toggleTheme}
              className="p-2 rounded-full border border-[#e0ddd5] hover:bg-[#c43a31]/5 text-[#5c544d] hover:text-[#c43a31] transition-all transform hover:rotate-12 duration-300"
              title={vintageTheme ? "切换为: 古典素雅" : "切换为: 复古文艺"}
            >
              <Sparkles className="w-4 h-4 text-[#c43a31] animate-[pulse_2s_infinite]" />
            </button>
            
            <div className="hidden lg:flex flex-col items-end text-right border-l border-[#e0ddd5] pl-3">
              <span className="text-xs font-serif text-[#8c887d]" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                岁在丙午仲夏
              </span>
              <span className="text-[10px] text-[#aa9c85] tracking-widest uppercase">
                见字如面
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {/* ========================================================= */}
        {/* TAB 1: 尺素书案 (Write Letter Desk) - Splitted Structure */}
        {/* ========================================================= */}
        {currentTab === "write" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (Grid span 5): Controls, Editor Form, and AI Polish Panel */}
            <div className="lg:col-span-5 space-y-6 flex flex-col">
              
              {/* Paper Template Selector Selection */}
              <div className="bg-[#f0ede6]/40 p-5 rounded-md border border-[#e0ddd5] backdrop-blur-sm"
                   style={{ backgroundColor: vintageTheme ? "#ebdcb9" : "#fbfaf8", borderColor: "#e0ddd5" }}>
                <h3 className="text-xs font-serif uppercase tracking-widest text-[#8c887d] mb-3 pb-1 border-b border-[#e0ddd5] flex items-center justify-between">
                  <span>挑选尺素笺格 / Choose Motif</span>
                  <HelpCircle className="w-3 h-3 text-gray-400 group relative" title="不同的模板预设提供契合不同主题的配色及底栏样式" />
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_TEMPLATES.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyTemplate(preset.id)}
                      className={`p-2 rounded text-center transition-all duration-300 relative border flex flex-col justify-between h-20 group
                        ${selectedTemplateId === preset.id 
                          ? "border-[#c43a31] bg-white text-[#c43a31] ring-1 ring-[#c43a31]/20 shadow-md"
                          : "border-[#e0ddd5] bg-white/40 text-gray-600 hover:border-[#8c887d] hover:bg-white"
                        }`}
                    >
                      <span className="text-xl mx-auto group-hover:scale-110 transition-transform">{preset.emoji}</span>
                      <span className="text-[10px] font-serif block truncate font-semibold">{preset.name.split(" ")[0]}</span>
                      <span className="text-[8px] text-gray-400 block tracking-tighter truncate font-sans">
                        {preset.direction === "vertical" ? "古风竖排" : "温婉横排"}
                      </span>
                      {selectedTemplateId === preset.id && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#c43a31] rounded-full flex items-center justify-center text-[7px] text-white">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {isVertical && letterBody.length > 200 && (
                  <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-sm text-[10.5px] font-serif space-y-1">
                    <div className="flex items-center space-x-1 font-bold">
                      <span>⚠️ 竖排字数过长提醒</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-mono">{letterBody.length}字</span>
                    </div>
                    <p className="leading-relaxed">
                      当前墨笔已达二百余字。古风竖排长信在尺素中会横向无限延展或造成排版重叠，不易通篇连贯点阅。
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/40">
                      <span className="text-[9.5px] text-amber-700/80">建议转为横排以自适应无限自适应大字幅排版：</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleApplyTemplate("paper-素笺");
                          triggerToast("已为您转为「素笺寄情 (温润横排)」形式，容纳长篇大论极佳！", "info");
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-sans px-2 py-0.5 rounded text-[10px] transition-colors shadow-xs"
                      >
                        转为温婉横排 📝
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Classic Editor Panel */}
              <div className="bg-white p-6 shadow-sm border border-[#e0ddd5]"
                   style={{ backgroundColor: vintageTheme ? "#f7f1e5" : "#ffffff", borderColor: "#e0ddd5" }}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f0ede6]">
                  <h3 className="text-sm font-serif italic text-[#3a352d] flex items-center space-x-1.5">
                    <PenTool className="w-4 h-4 text-[#c43a31]" />
                    <span>尺素遣情 (落笔书写)</span>
                  </h3>
                  <button 
                    onClick={() => {
                      setRecipient("某某好友");
                      setLetterBody("");
                      setSender("落款 顿首");
                      setLetterDate("岁值丙午春暖");
                      triggerToast("书墨案头已被重新拂尘，请铺纸起笔。");
                    }} 
                    className="text-[10px] text-gray-500 hover:text-red-700 font-serif flex items-center space-x-0.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>洗笔重来</span>
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Recipient Title */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                      收笺雅启 (称呼 / Dear)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31]"
                      style={{
                        backgroundColor: vintageTheme ? "#fcfcf9" : "#fafaf9",
                        borderColor: "#e0ddd5"
                      }}
                      placeholder="如：双亲大人侍右、意映卿卿如晤"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                  </div>

                  {/* Letter Main Content Body */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                      尺素正文 (Body / Content)
                    </label>

                    {/* Word-style styling formatting toolbar */}
                    <div className="flex flex-wrap items-center gap-1 bg-[#fbfaf8]/90 p-1.5 border border-[#e0ddd5] border-b-0 rounded-t-sm select-none" style={{ backgroundColor: vintageTheme ? "#ebdcb9" : "#fafafa" }}>
                      <span className="text-[9px] font-bold text-[#8c887d] font-serif uppercase px-1 pb-0.5 border-r border-[#e0ddd5] mr-1">Word 格式调理</span>
                      
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("bold")} 
                        className="p-1 text-gray-700 hover:bg-[#c43a31]/10 hover:text-[#c43a31] font-bold rounded text-[11px] min-w-[20px] transition-colors"
                        title="加粗 (Bold)"
                      >
                        B
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("italic")} 
                        className="p-1 text-gray-700 hover:bg-[#c43a31]/10 hover:text-[#c43a31] italic rounded text-[11px] min-w-[20px] transition-colors"
                        title="斜体 (Italic)"
                      >
                        I
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("underline")} 
                        className="p-1 text-gray-700 hover:bg-[#c43a31]/10 hover:text-[#c43a31] underline rounded text-[11px] min-w-[20px] transition-colors"
                        title="下划线 (Underline)"
                      >
                        U
                      </button>
                      <span className="w-px h-3 bg-gray-200 mx-1"></span>
                      
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("red")} 
                        className="p-1.5 text-[#c43a31] hover:bg-[#c43a31]/10 font-bold font-serif rounded text-[10px] leading-none transition-colors"
                        title="朱砂红字 (Vermilion)"
                      >
                        🔴 朱砂
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("blue")} 
                        className="p-1.5 text-[#1a334d] hover:bg-[#c19a4e]/10 font-bold font-serif rounded text-[10px] leading-none transition-colors"
                        title="黛蓝墨色 (Blue)"
                      >
                        🔵 黛蓝
                      </button>
                      
                      <span className="w-px h-3 bg-gray-200 mx-1"></span>
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("large")} 
                        className="p-1 text-gray-700 hover:bg-gray-100 rounded text-[10px] leading-none px-1.5 transition-colors"
                        title="放大字体"
                      >
                        A+
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("small")} 
                        className="p-1 text-gray-700 hover:bg-gray-100 rounded text-[10px] leading-none px-1.5 transition-colors"
                        title="缩小字体"
                      >
                        A-
                      </button>
                      
                      <span className="w-px h-3 bg-gray-200 mx-1"></span>
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("divider")} 
                        className="p-1 text-gray-700 hover:bg-gray-100 rounded text-[10px] px-1 transition-colors font-serif"
                        title="插入分隔符"
                      >
                        ✦ 隔断
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyFormatTag("clear")} 
                        className="p-1 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded text-[11px] ml-auto transition-colors"
                        title="清除所有 HTML 标签"
                      >
                        🧹 还原
                      </button>
                    </div>

                    <textarea
                      ref={textareaRef}
                      rows={6}
                      className="w-full px-3 py-2 border rounded-b-sm rounded-t-none focus:outline-none focus:ring-1 focus:ring-[#c43a31] font-serif text-sm leading-relaxed"
                      style={{
                        backgroundColor: vintageTheme ? "#fcfcf9" : "#fafaf9",
                        borderColor: "#e0ddd5",
                        fontFamily: "Kaiti, STKaiti, serif",
                        borderTopWidth: 0
                      }}
                      placeholder="快雪晴空，佳想安泰……写下您的万缕思绪。您可以使用上方的 Word 格式工具条对选中字句加粗、画线、或印染朱朱红泥等。"
                      value={letterBody}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isVertical && val.length > 500) {
                          setLetterBody(val.slice(0, 500));
                          triggerToast("竖式信笺尺幅有限，最多容纳500字已达上限，超出部分已被截留，建议切换横排！", "error");
                        } else {
                          setLetterBody(val);
                        }
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-serif">
                      <span>已蓄墨量：{letterBody.length} / 500 玑字级 · 支持 Word 原生富印</span>
                      <span>💡 划选下方字词，点击格式条即染香</span>
                    </div>

                    {isVertical && (
                      <div className="mt-2.5 p-2.5 bg-red-50/70 border border-red-200 text-red-900 text-[10.5px] rounded-sm font-serif leading-relaxed space-y-2 shadow-2xs">
                        <div className="flex items-start space-x-1.5">
                          <span className="text-sm shrink-0 leading-none col-span-1">⚠️</span>
                          <div>
                            <strong>古风竖排长信字限管理：</strong>
                            {letterBody.length >= 500 ? (
                              <span>您已写满满额 <strong className="text-red-700 font-mono">500</strong> 字！继续书写已被限度拦截。竖格长信若超出此数，版卷在尺素中会横向膨胀过度，不便赏阅。</span>
                            ) : letterBody.length > 350 ? (
                              <span>已落墨 <strong className="text-amber-700 font-mono">{letterBody.length}</strong> 字，临近 <strong className="font-mono">500</strong> 字极高刻度，溢出将会截止，请珍重精简字句。</span>
                            ) : (
                              <span>已落墨 <strong className="text-red-700 font-mono">{letterBody.length}</strong> 字。竖笺不宜千言万语，最多限刻 <strong className="font-mono">500</strong> 字以确保流丽布局。</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-red-250/20">
                          <span className="text-[9.5px] text-red-800/80">建议转为温婉横排（无限自适应长卷）：</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleApplyTemplate("paper-素笺");
                              triggerToast("已帮您转为「素笺寄情 (温润横排)」形式！", "info");
                            }}
                            className="bg-[#c43a31] hover:bg-red-700 text-white font-sans px-2.5 py-0.5 rounded text-[10px] transition-colors shadow-xs hover:shadow-sm"
                          >
                            转为温雅横排 📝
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sender & Stamp Configuration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                        落款属名 (From / Sender)
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31]"
                        style={{
                          backgroundColor: vintageTheme ? "#fcfcf9" : "#fafaf9",
                          borderColor: "#e0ddd5"
                        }}
                        placeholder="如：儿小明 敬启、羲之 顿首"
                        value={sender}
                        onChange={(e) => setSender(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] uppercase tracking-wider text-[#8c887d] font-semibold">
                          落款日期 (Date / Optional)
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={customStyle.showLetterDate ?? true} 
                            onChange={(e) => setCustomStyle(p => ({ ...p, showLetterDate: e.target.checked }))}
                            className="accent-[#c43a31]"
                          />
                          <span className="text-[9px] text-[#8c887d] font-serif">显示日期</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!(customStyle.showLetterDate ?? true)}
                        className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31] transition-opacity duration-300
                          ${(customStyle.showLetterDate ?? true) ? "opacity-100" : "opacity-45"}`}
                        style={{
                          backgroundColor: vintageTheme ? "#fcfcf9" : "#fafaf9",
                          borderColor: "#e0ddd5"
                        }}
                        placeholder="不设定日期可不选"
                        value={letterDate}
                        onChange={(e) => setLetterDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Signature Alignment Selector */}
                  <div className="bg-[#fcfaf8]/70 p-2.5 border border-[#e0ddd5]/80 rounded-sm text-xs flex items-center justify-between"
                       style={{ backgroundColor: vintageTheme ? "#ebdcb9/30" : "#fdfdfd" }}>
                    <span className="font-serif font-bold text-[#8c887d] flex items-center space-x-1">
                      <span>✒️</span>
                      <span>落款位置 / Signature Alignment</span>
                    </span>
                    <div className="flex space-x-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setCustomStyle(p => ({ ...p, signatureAlign: "left" }));
                          triggerToast("落款已设为：左下角");
                        }}
                        className={`px-3 py-1 rounded border text-[10px] font-serif transition-all duration-300
                          ${(customStyle.signatureAlign ?? "right") === "left" 
                            ? "border-[#c43a31] bg-[#c43a31]/5 text-[#c43a31] font-semibold" 
                            : "border-gray-200 bg-white text-gray-600 hover:border-[#8c887d]"}`}
                      >
                        左下 (Left)
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setCustomStyle(p => ({ ...p, signatureAlign: "right" }));
                          triggerToast("落款已设为：右下角");
                        }}
                        className={`px-3 py-1 rounded border text-[10px] font-serif transition-all duration-300
                          ${(customStyle.signatureAlign ?? "right") === "right" 
                            ? "border-[#c43a31] bg-[#c43a31]/5 text-[#c43a31] font-semibold" 
                            : "border-gray-200 bg-white text-gray-600 hover:border-[#8c887d]"}`}
                      >
                        右下 (Right)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save and Store Action Buttons */}
                <div className="mt-5 pt-3 border-t border-[#f0ede6] flex flex-col space-y-3">
                  <button
                    onClick={handleSaveLetter}
                    className="w-full bg-[#c43a31] text-white text-xs font-serif uppercase tracking-widest py-2.5 px-4 hover:bg-[#a42c24] transition-colors flex items-center justify-center space-x-2 shadow-sm rounded-sm"
                    style={{ fontFamily: "STKaiti, Kaiti, serif" }}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>寄珍藏阁 (保存墨宝)</span>
                  </button>

                  {activeEnvelopeId && (
                    <div className="p-3 bg-neutral-50/85 border border-[#e0ddd5] rounded text-xs text-gray-750 flex items-center justify-between">
                      <div className="flex flex-col text-left">
                        <span className="font-serif text-[#c43a31] font-bold">
                          已载入信封：{savedLetters.find(l => l.envelopeId === activeEnvelopeId || l.id === activeEnvelopeId)?.title || "自创笺卷"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          正编辑版本：<span className="font-bold underline text-gray-700">{activeVersionName || "未载入版本"}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveEnvelopeId(null);
                          setActiveVersionName(null);
                          setRecipient("意映卿卿如晤");
                          setLetterBody(
                            "见字如面。落笔之时，窗外正催动一窗新绿，山色隐隐。常忆及与你执手溪堂，听风辨雨，不知阁下近日身体安泰否？此地晴雪初霁，偶得素笺一幅，遥寄尺素，万望珍重。"
                          );
                          setSender("林深见鹿 顿首");
                          setLetterDate("丙午年仲夏 四月廿四");
                          triggerToast("已为您铺展全新笺纸，可起墨新信！", "info");
                        }}
                        className="text-[10px] text-[#c43a31] border border-[#c43a31]/30 hover:bg-[#c43a31]/5 px-2 py-1 rounded transition-colors font-serif font-bold"
                      >
                        铺设新信 ✒️
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Letter Polish Desk (AI 润笔工具) */}
              <div className="bg-white p-5 shadow-sm border border-[#e0ddd5] relative overflow-hidden"
                   style={{ backgroundColor: vintageTheme ? "#f3ecd9" : "#fdfdfd", borderColor: "#e0ddd5" }}>
                
                {/* Visual subtle calligraphy brush behind background */}
                <div className="absolute right-2 bottom-2 text-6xl text-[#8c7b65]/5 font-serif select-none pointer-events-none font-bold">
                  墨
                </div>

                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f0ede6]">
                  <h3 className="text-sm font-serif italic text-[#3a352d] flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#c43a31]" />
                    <span>AI 研墨润笔 (智能文学助手)</span>
                  </h3>
                  <button 
                    onClick={() => setAiPanelExpanded(!aiPanelExpanded)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {aiPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {aiPanelExpanded && (
                  <div className="space-y-4 text-xs animate-[fadeIn_0.3s_ease]">
                    <p className="text-[11px] text-[#8c7b65] italic tracking-wide">
                      “写下几缕直白浅语，AI 助您将其化为半文半白、诗意昂然或朴实情深的传统美文”
                    </p>

                    {/* AI Tone/Style Slider */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#8c887d] mb-1.5 font-semibold">
                        欲行墨风 (润色文学调型 / Stylize Style)
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <label className={`p-2 border rounded-sm flex items-center space-x-2 cursor-pointer transition-all
                          ${aiStyle === "classical" ? "bg-[#c43a31]/5 border-[#c43a31] text-[#c43a31]" : "bg-white border-gray-200"}`}>
                          <input type="radio" name="aiStyle" value="classical" checked={aiStyle === "classical"} onChange={() => setAiStyle("classical")} className="accent-[#c43a31] hidden" />
                          <span>🏮 雅致古典 (半文言)</span>
                        </label>
                        <label className={`p-2 border rounded-sm flex items-center space-x-2 cursor-pointer transition-all
                          ${aiStyle === "poetic" ? "bg-[#c43a31]/5 border-[#c43a31] text-[#c43a31]" : "bg-white border-gray-200"}`}>
                          <input type="radio" name="aiStyle" value="poetic" checked={aiStyle === "poetic"} onChange={() => setAiStyle("poetic")} className="accent-[#c43a31] hidden" />
                          <span>🌸 唯美浪漫 (诗情)</span>
                        </label>
                        <label className={`p-2 border rounded-sm flex items-center space-x-2 cursor-pointer transition-all
                          ${aiStyle === "vernacular-warm" ? "bg-[#c43a31]/5 border-[#c43a31] text-[#c43a31]" : "bg-white border-gray-200"}`}>
                          <input type="radio" name="aiStyle" value="vernacular-warm" checked={aiStyle === "vernacular-warm"} onChange={() => setAiStyle("vernacular-warm")} className="accent-[#c43a31] hidden" />
                          <span>🏡 朴实深情 (致家书)</span>
                        </label>
                        <label className={`p-2 border rounded-sm flex items-center space-x-2 cursor-pointer transition-all
                          ${aiStyle === "short-chic" ? "bg-[#c43a31]/5 border-[#c43a31] text-[#c43a31]" : "bg-white border-gray-200"}`}>
                          <input type="radio" name="aiStyle" value="short-chic" checked={aiStyle === "short-chic"} onChange={() => setAiStyle("short-chic")} className="accent-[#c43a31] hidden" />
                          <span>🌬️ 洒脱干练 (小札)</span>
                        </label>
                      </div>
                    </div>

                    {/* AI Target Recipient Relation */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                          契合笔友关系 (Audience)
                        </label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31]"
                          placeholder="小辈给阿妈/平辈知己"
                          value={aiAudience}
                          onChange={(e) => setAiAudience(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                          信风归期 (核心意境背景)
                        </label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31]"
                          placeholder="如：时移事易/问候借宿"
                          value={aiFocus}
                          onChange={(e) => setAiFocus(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* AI execution prompt Button */}
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={handleAiPolish}
                      className="w-full bg-[#2c2c2c] text-[#fbfaf8] text-[10px] uppercase tracking-[0.2em] py-2.5 hover:bg-black transition-all flex items-center justify-center space-x-2 shadow-sm rounded-sm disabled:opacity-55"
                    >
                      {isAiLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#c43a31]" />
                          <span className="font-serif">研墨铺纸，运笔染香中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400 rotate-12" />
                          <span className="font-serif block">起笔润色 (AI Transform)</span>
                        </>
                      )}
                    </button>

                    {aiError && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-sm border border-red-100 text-[10px] leading-relaxed">
                        <span className="font-bold">温馨提示：</span>
                        {aiError}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column (Grid span 7): Realistic letter preview & stamp offset controller */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Layout styling and stamp adjustment bar */}
              <div className="bg-[#f0ede6]/40 p-4 rounded-md border border-[#e0ddd5] flex flex-wrap gap-4 items-center justify-between"
                   style={{ backgroundColor: vintageTheme ? "#eedfad" : "#fbfaf8", borderColor: "#e0ddd5" }}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-gray-700 flex items-center space-x-1 font-serif">
                    <Sliders className="w-3.5 h-3.5 text-[#c43a31]" />
                    <span>笺砚样式细调</span>
                  </span>
                  
                  {/* Grid selector */}
                  <select 
                    value={customStyle.gridType} 
                    onChange={(e: any) => setCustomStyle(p => ({ ...p, gridType: e.target.value }))}
                    className="border border-[#e0ddd5] py-1 px-1.5 text-[11px] bg-white rounded-sm focus:ring-1 focus:ring-[#c43a31] font-semibold outline-none text-[#7c5936]"
                  >
                    <option value="none">无格素纸 (Plain Paper)</option>
                    <option value="red-row">朱茶赤行 (Red Columns)</option>
                    <option value="row">浅墨淡行 (Grey Columns)</option>
                    <option value="green-row">修竹翠痕 (Green Columns)</option>
                    <option value="brown-row">古陶熟褐 (Sepia Columns)</option>
                    <option value="blue-row">黛蓝水墨 (Indigo Columns)</option>
                    <option value="double-red">官窑双栏 (Double Columns)</option>
                    <option value="grid">金泥古方 (Gold Grids)</option>
                    <option value="vermilion-box">朱砂栏格 (Vermilion Grid)</option>
                  </select>
 
                  {/* Font picker */}
                  <select 
                    value={customStyle.fontFamily} 
                    onChange={(e: any) => setCustomStyle(p => ({ ...p, fontFamily: e.target.value }))}
                    className="border border-[#e0ddd5] py-1 px-1.5 text-[11px] bg-white rounded-sm focus:ring-1 focus:ring-[#c43a31] font-serif outline-none font-semibold text-[#7c5936]"
                  >
                    <option value="Kaiti">✍️ 正楷雅音 (Regular KaiTi)</option>
                    <option value="SimSun">📖 宋体雅正 (Imperial SimSun)</option>
                    <option value="STXingkai">✒️ 手写行楷 (Flowing Running Kai)</option>
                    <option value="cursive">🖌️ 手写行草 (Flowing Cursive)</option>
                    <option value="FangSong">📜 徽刻仿宋 (Classical FangSong)</option>
                    <option value="LiSu">🏺 古风汉隶 (Clerical LiSu)</option>
                  </select>
 
                  {/* Font Size picker */}
                  <select 
                    value={customStyle.fontSize} 
                    onChange={(e: any) => setCustomStyle(p => ({ ...p, fontSize: e.target.value }))}
                    className="border border-[#e0ddd5] py-1 px-1.5 text-[11px] bg-white rounded-sm focus:ring-1 focus:ring-[#c43a31] font-semibold outline-none text-[#7c5936]"
                  >
                    <option value="xs">极细 (Tiny draft)</option>
                    <option value="sm">细字 (Fine Writer)</option>
                    <option value="md">中等 (Medium space)</option>
                    <option value="lg">饱满 (Large Verse)</option>
                    <option value="xl">恢弘 (Poetic Broad)</option>
                    <option value="2xl">泼墨 (Giant Brush)</option>
                  </select>
 
                  {/* Faux Paper Texture Picker */}
                  <select 
                    value={customStyle.paperTexture || "pure-xuan"} 
                    onChange={(e: any) => setCustomStyle(p => {
                      const val = e.target.value;
                      let matchedBg = p.bgColor;
                      if (val === "pure-xuan") matchedBg = "#fdfcf7";
                      else if (val === "cooked-xuan") matchedBg = "#f7f1e5";
                      else if (val === "antique-tea") matchedBg = "#eee0cc";
                      else if (val === "gold-flecks") matchedBg = "#ebdca5";
                      else if (val === "linen-weave") matchedBg = "#fdfaf2";
                      else if (val === "cloud-mica") matchedBg = "#e6e8e6";
                      else if (val === "fibrous-parchment") matchedBg = "#f4efdf";
                      else if (val === "mottled-parchment") matchedBg = "#ebdcb9";
                      else if (val === "gilded-border") matchedBg = "#fbf9f3";
                      return { ...p, paperTexture: val, bgColor: matchedBg };
                    })}
                    className="border border-[#e0ddd5] py-1 px-1.5 text-[11px] bg-white rounded-sm focus:ring-1 focus:ring-[#c43a31] outline-none font-serif text-[#c32f26] font-bold"
                  >
                    <option value="pure-xuan">🔬 宣白生宣 (Raw Xuan)</option>
                    <option value="cooked-xuan">📜 熟宣煮硾 (Cooked Xuan)</option>
                    <option value="fibrous-parchment">📜 剡藤古纸 (Fibrous Pulp)</option>
                    <option value="mottled-parchment">🏺 斑驳古卷 (Mottled Parchment)</option>
                    <option value="antique-tea">🍂 复古陈纸 (Retro Tea)</option>
                    <option value="gold-flecks">✨ 澄泥洒金 (Gold Flecks)</option>
                    <option value="linen-weave">🕸️ 罗纹老绢 (Linen Silk)</option>
                    <option value="cloud-mica">🌫️ 碎玉云母 (Cloud Mica)</option>
                    <option value="gilded-border">⚜️ 金泥法帖 (Gilded Border)</option>
                  </select>
                </div>

                {/* Print Post Stamps Selector */}
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <span className="text-[#8c887d] font-bold">寄贴邮票:</span>
                  <select
                    value={customStyle.stampSelection}
                    onChange={(e: any) => setCustomStyle(p => ({ ...p, stampSelection: e.target.value }))}
                    className="border border-[#e0ddd5] py-0.5 px-1 bg-white rounded-sm"
                  >
                    <option value="none">不贴</option>
                    <option value="crane">🌲 仙鹤延年</option>
                    <option value="landscape">🌅 泰山旭日</option>
                    <option value="plum">🌸 寒梅傲雪</option>
                    <option value="lotus">🪷 步步荷香</option>
                  </select>
                </div>
              </div>

              {/* Stamp Designer sub-card to add custom seals */}
              <div className="bg-[#fcfaf8] p-4 rounded-md border border-[#e0ddd5] text-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
                   style={{ backgroundColor: vintageTheme ? "#ebdcb9/30" : "#fdfdfd" }}>
                
                {/* Checkbox for seal active */}
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="stamp-toggle" 
                    checked={customStyle.stampEnabled} 
                    onChange={(e) => setCustomStyle(p => ({ ...p, stampEnabled: e.target.checked }))}
                    className="accent-[#c43a31]"
                  />
                  <label htmlFor="stamp-toggle" className="font-serif text-[#333] font-semibold cursor-pointer select-none">
                    落印名章 (Approve Seal)
                  </label>
                </div>

                {/* Input text */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-400 mb-0.5">印章篆刻文字 (4字内)</label>
                  <input 
                    type="text" 
                    maxLength={4}
                    value={customStyle.stampText || ""}
                    onChange={(e) => setCustomStyle(p => ({ ...p, stampText: e.target.value }))}
                    className="border border-gray-200 px-2 py-1 bg-white text-[11px] rounded"
                    placeholder="如：见字相欢"
                    disabled={!customStyle.stampEnabled}
                  />
                </div>

                {/* Shape Selector */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-400 mb-0.5">朱记形状 (Shape)</label>
                  <select 
                    value={customStyle.stampShape}
                    onChange={(e: any) => setCustomStyle(p => ({ ...p, stampShape: e.target.value }))}
                    className="border border-gray-200 px-1.5 py-1 bg-white text-[11px] rounded"
                    disabled={!customStyle.stampEnabled}
                  >
                    <option value="square">古拙方印 (Square Stamped)</option>
                    <option value="circle">圆满印信 (Circle Seal)</option>
                  </select>
                </div>

                {/* Seal Ink option */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-400 mb-0.5">落水墨汁 (Font Ink Color)</label>
                  <div className="flex space-x-1.5 items-center mt-1">
                    {[
                      { hex: "#2c2416", title: "松烟黑" },
                      { hex: "#c43a31", title: "朱砂红" },
                      { hex: "#1a4d1a", title: "石竹绿" },
                      { hex: "#1a334d", title: "黛蓝" }
                    ].map(item => (
                      <button
                        key={item.hex}
                        type="button"
                        onClick={() => setCustomStyle(p => ({ ...p, inkColor: item.hex }))}
                        className={`w-4.5 h-4.5 rounded-full border transform hover:scale-110 active:scale-95 transition-all
                          ${customStyle.inkColor === item.hex ? "ring-2 ring-offset-1 ring-[#c19a4e]" : "border-gray-200"}`}
                        style={{ backgroundColor: item.hex }}
                        title={item.title}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 绘客丹青: Custom Background / Illustration Upload Card */}
              <div className="bg-[#fcfaf8] p-5 rounded-md border border-[#e0ddd5] shadow-xs"
                   style={{ backgroundColor: vintageTheme ? "#f5eedb" : "#ffffff", borderColor: "#e0ddd5" }}>
                <h4 className="text-xs font-serif uppercase tracking-widest text-[#8c887d] mb-4 pb-1.5 border-b border-[#e0ddd5] flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <span>🌄</span>
                    <span>绘影丹青 (自定义底纹与插图)</span>
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Custom Paint Motif</span>
                </h4>
                
                <div className="space-y-4 text-xs">
                  {/* Image selection row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Native File Input Picker */}
                    <div className="flex flex-col justify-center border-2 border-dashed border-[#d4cbba] hover:border-[#c43a31] rounded-md p-3.5 text-center cursor-pointer transition-colors bg-white/50 relative overflow-hidden group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const base64 = evt.target?.result as string;
                              setCustomStyle(p => ({ 
                                ...p, 
                                uploadedImage: base64,
                                uploadedImageRole: p.uploadedImageRole === "none" ? "illustration" : p.uploadedImageRole
                              }));
                              triggerToast("丹青画轴载入宣案！您可以将该画置为底纹或配插画。", "success");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      />
                      <span className="text-2xl mx-auto mb-1 group-hover:scale-110 transition-transform">🎨</span>
                      <span className="text-[10px] font-serif text-[#3a352d] block font-semibold leading-tight">上传本地画集 (底图/插图)</span>
                      <span className="text-[8px] text-gray-400 block mt-0.5">支持格式：PNG, JPG, WEBP</span>
                    </div>

                    {/* Pre-included preset motifs (ink wash themes) */}
                    <div className="flex flex-col justify-between">
                      <label className="block text-[10px] text-[#8c887d] mb-1 font-semibold font-serif">推荐墨客精选画作 (Presets)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStyle(p => ({ 
                              ...p, 
                              uploadedImage: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop",
                              uploadedImageRole: "background",
                              uploadedImageOpacity: 0.08
                            }));
                            triggerToast("烟波水纹淡雅底图已铺设在书案。");
                          }}
                          className="p-1.5 bg-white border border-[#e0ddd5] text-[9.5px] rounded text-left hover:border-[#c43a31] font-serif transition-colors"
                        >
                          🌊 水墨烟波
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStyle(p => ({ 
                              ...p, 
                              uploadedImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop",
                              uploadedImageRole: "illustration",
                              uploadedImageScale: 0.85,
                              uploadedImageOpacity: 0.9
                            }));
                            triggerToast("雪落江梅插画已嵌入尺素笺缝中。");
                          }}
                          className="p-1.5 bg-white border border-[#e0ddd5] text-[9.5px] rounded text-left hover:border-[#c43a31] font-serif transition-colors"
                        >
                          🌺 梅傲冷雪
                        </button>
                      </div>

                      {customStyle.uploadedImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStyle(p => ({ ...p, uploadedImage: "", uploadedImageRole: "none" }));
                            triggerToast("已抹平自定义绘画，净纸书桌。");
                          }}
                          className="mt-2 p-1 bg-red-50 text-red-700 text-[10px] rounded hover:bg-red-100 font-serif w-full text-center transition-colors"
                        >
                          🧹 剔除自定义底图/插画
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Motif parameters configure dashboard (only when item loaded) */}
                  {customStyle.uploadedImage && (
                    <div className="p-3 bg-white/60 border border-[#e0ddd5]/80 rounded-sm space-y-3 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-[#3a352d] font-semibold">画迹应用形态 / Style Mode</span>
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStyle(p => ({ ...p, uploadedImageRole: "background" }));
                              triggerToast("已设为: 背景底纹 (铺满整张信笺)");
                            }}
                            className={`px-3 py-1 rounded text-[10px] border transition-colors
                              ${customStyle.uploadedImageRole === "background" 
                                ? "bg-[#c43a31] text-white border-[#c43a31]" 
                                : "bg-white text-gray-650 hover:border-[#8c887d] border-gray-200"}`}
                          >
                            📜 背景底纹
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStyle(p => ({ ...p, uploadedImageRole: "illustration" }));
                              triggerToast("已设为: 点缀插图 (伴落款立旁)");
                            }}
                            className={`px-3 py-1 rounded text-[10px] border transition-colors
                              ${customStyle.uploadedImageRole === "illustration" 
                                ? "bg-[#c43a31] text-white border-[#c43a31]" 
                                : "bg-white text-gray-650 hover:border-[#8c887d] border-gray-200"}`}
                          >
                            🖼️ 墨宝插图
                          </button>
                        </div>
                      </div>

                      {/* Opacity slider */}
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>丹青透光度 (Opacity): {Math.round((customStyle.uploadedImageOpacity ?? 0.12) * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.02" 
                          max="1.0" 
                          step="0.02"
                          value={customStyle.uploadedImageOpacity ?? 0.12}
                          onChange={(e) => setCustomStyle(p => ({ ...p, uploadedImageOpacity: parseFloat(e.target.value) }))}
                          className="w-full accent-[#c43a31] cursor-pointer"
                        />
                      </div>

                      {/* Illustration scale slider */}
                      {customStyle.uploadedImageRole === "illustration" && (
                        <div>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>画轴画卷比例 (Scale): {Math.round((customStyle.uploadedImageScale ?? 1.0) * 100)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.3" 
                            max="1.8" 
                            step="0.05"
                            value={customStyle.uploadedImageScale ?? 1.0}
                            onChange={(e) => setCustomStyle(p => ({ ...p, uploadedImageScale: parseFloat(e.target.value) }))}
                            className="w-full accent-[#c43a31] cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic rendering container for beautiful traditional letter sheets */}
              <div 
                ref={previewContainerRef}
                className="w-full overflow-auto max-h-[820px] py-6 bg-[#f0ede6]/25 border border-dashed border-[#d4cbba] rounded p-4 flex justify-start md:justify-center items-start relative select-text"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#c4c0b5 rgba(240, 237, 230, 0.4)"
                }}
              >
                <div 
                  id="letter-sheet-capture"
                  className={`relative p-8 md:p-12 shadow-md transition-all rounded-[3px] overflow-hidden flex flex-col justify-between select-all mx-auto shrink-0 ${getPaperTextureClass()} ${
                    isVertical 
                      ? "w-max max-w-none min-w-[580px] h-[720px] md:h-[750px]" 
                      : "w-full max-w-[580px] min-h-[700px] h-auto"
                  }`}
                  style={{
                    backgroundColor: customStyle.bgColor,
                    borderWidth: selectedTemplateId === "fish-雁书" ? "12px" : "1px",
                    borderColor: selectedTemplateId === "fish-雁书" ? "#c43a31" : "#e0ddd5",
                    borderStyle: selectedTemplateId === "fish-雁书" ? "double" : "solid",
                    backgroundImage: illustrationStyle === "ink-bamboo" ? "linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><path d=\"M10,80 Q20,20 18,10 Q22,40 10,80 M20,80 Q35,30 32,5 Q37,45 20,80\" fill=\"none\" stroke=\"%233a6b3a\" stroke-width=\"0.5\" opacity=\"0.15\"/></svg>')" : "none"
                  }}
                >
                  
                  {/* User custom background image if set to background role */}
                  {customStyle.uploadedImage && customStyle.uploadedImageRole === "background" && (
                    <img 
                      src={customStyle.uploadedImage} 
                      alt="背景" 
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0" 
                      style={{ opacity: customStyle.uploadedImageOpacity ?? 0.12 }}
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Ornate corner gilded borders (Gilded Border template) */}
                  {customStyle.paperTexture === "gilded-border" && (
                    <div className="absolute inset-5 border-2 border-[#b8963e]/25 pointer-events-none select-none z-0 rounded-[2px]" style={{ pointerEvents: 'none' }}>
                      {/* Top Left Corner */}
                      <svg className="absolute -top-[10px] -left-[10px] w-9 h-9 text-[#b8963e]/85" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5,50 C15,40 40,15 50,5 M5,5 L5,85 L35,55 C25,35 35,25 55,35 L85,5 L5,5 Z M20,20 L20,45 C20,25 25,20 45,20 Z" />
                      </svg>
                      {/* Top Right Corner */}
                      <svg className="absolute -top-[10px] -right-[10px] w-9 h-9 text-[#b8963e]/85 rotate-90" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5,50 C15,40 40,15 50,5 M5,5 L5,85 L35,55 C25,35 35,25 55,35 L85,5 L5,5 Z M20,20 L20,45 C20,25 25,20 45,20 Z" />
                      </svg>
                      {/* Bottom Left Corner */}
                      <svg className="absolute -bottom-[10px] -left-[10px] w-9 h-9 text-[#b8963e]/85 -rotate-90" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5,50 C15,40 40,15 50,5 M5,5 L5,85 L35,55 C25,35 35,25 55,35 L85,5 L5,5 Z M20,20 L20,45 C20,25 25,20 45,20 Z" />
                      </svg>
                      {/* Bottom Right Corner */}
                      <svg className="absolute -bottom-[10px] -right-[10px] w-9 h-9 text-[#b8963e]/85 rotate-180" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5,50 C15,40 40,15 50,5 M5,5 L5,85 L35,55 C25,35 35,25 55,35 L85,5 L5,5 Z M20,20 L20,45 C20,25 25,20 45,20 Z" />
                      </svg>
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* VERTICAL CHINESE CALLIC TYPEWRITING WRITING MODE */}
                  {/* ---------------------------------------------------- */}
                   {PRESET_TEMPLATES.find(t => t.id === selectedTemplateId)?.direction === "vertical" ? (
                    <div className="flex-grow flex flex-row justify-start gap-8 h-full w-max min-w-full overflow-visible relative select-all leading-relaxed">
                      
                      {/* Grid background lines representation if active */}
                      {customStyle.gridType === "red-row" && (
                        <div className="absolute inset-0 vertical-lines-grid pointer-events-none opacity-70 z-0"></div>
                      )}
                      {customStyle.gridType === "row" && (
                        <div className="absolute inset-0 vertical-lines-grid-grey pointer-events-none opacity-50 z-0"></div>
                      )}
                      {customStyle.gridType === "green-row" && (
                        <div className="absolute inset-0 vertical-lines-grid-green pointer-events-none opacity-60 z-0"></div>
                      )}
                      {customStyle.gridType === "double-red" && (
                        <div className="absolute inset-0 vertical-lines-grid-double-red pointer-events-none opacity-75 z-0"></div>
                      )}
                      {(customStyle.gridType === "grid" || customStyle.gridType === "vermilion-box") && (
                        <div className="absolute inset-0 pointer-events-none opacity-45 z-0" 
                             style={{ 
                               backgroundImage: customStyle.gridType === "vermilion-box" 
                                 ? "linear-gradient(to left, rgba(196, 58, 49, 0.18) 1px, transparent 1px), linear-gradient(rgba(196, 58, 49, 0.1) 1px, transparent 1px)"
                                 : "linear-gradient(to left, rgba(184, 150, 62, 0.18) 1px, transparent 1px), linear-gradient(rgba(184, 150, 62, 0.1) 1px, transparent 1px)",
                               backgroundSize: "2.22rem 2.22rem, 2.22rem 2.22rem"
                             }} />
                      )}

                      {/* Spacer to align content to the right when sheet is wider than content */}
                      <div className="ml-auto pointer-events-none z-0 shrink-0" />

                      {/* Footer signing and date at the left end of the paper */}
                      <div 
                        className={`writing-vertical h-full flex flex-col ${(customStyle.signatureAlign ?? "right") === "right" ? "justify-start pt-12" : "justify-end pb-4"} items-end pl-2 z-10 ${fontClass} transition-all duration-300`} 
                        style={{ color: primaryInkColor }}
                      >
                        <div className="space-y-4 mb-2 flex flex-col items-end">
                          <span className="text-sm border-r border-[#c43a31]/20 pr-1 leading-[2.2rem] opacity-90">{sender}</span>
                          {(customStyle.showLetterDate ?? true) && (
                            <span className="text-[11px] text-gray-400 leading-[1.8rem] pt-2">{letterDate}</span>
                          )}
                        </div>

                        {/* Stamp signature seal stamp block if enabled */}
                        {customStyle.stampEnabled && customStyle.stampText && (
                          <div className={`m-1 mt-6 animate-[pulse_2.5s_infinite] border-2 border-[#c43a31] text-red-700 text-center font-bold font-serif flex items-center justify-center p-0.5 select-none
                            ${customStyle.stampShape === "circle" ? "rounded-full" : "rounded-sm"}`}
                            style={{
                              width: "36px",
                              height: "36px",
                              backgroundColor: "rgba(196, 58, 49, 0.04)",
                              boxShadow: "0 0 1px #c43a31",
                              borderColor: getStampColor()
                            }}>
                            <span className="text-[10px] leading-tight scale-90 tracking-tighter" style={{ fontFamily: "STKaiti, Kaiti, serif", color: getStampColor() }}>
                               {customStyle.stampText.substring(0, 4)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Custom illustration placing if Vertical layout */}
                      {customStyle.uploadedImageRole === "illustration" && customStyle.uploadedImage && (
                        <div className="writing-mode-normal flex flex-col items-center justify-center mx-2 z-10 pointer-events-none select-none shrink-0 my-auto">
                          <div 
                            className="border border-[#e0ddd5] p-1 bg-white/85 shadow-xs rounded-sm"
                            style={{ 
                              transform: `scale(${customStyle.uploadedImageScale ?? 1.0})`,
                              opacity: customStyle.uploadedImageOpacity ?? 0.85,
                              transition: "transform 0.2s"
                            }}
                          >
                            <img 
                              src={customStyle.uploadedImage} 
                              alt="插图" 
                              referrerPolicy="no-referrer"
                              className="max-w-[125px] max-h-[190px] object-contain rounded-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Body section column texts */}
                      <div className={`writing-vertical h-full shrink-0 px-2 md:px-6 z-10 prose ${fontClass} ${getFontSizeClass()}`} 
                           style={{ 
                             color: primaryInkColor,
                             width: getVerticalBodyWidth(),
                             backgroundImage: getVerticalGridBackgroundImage(),
                             backgroundSize: getVerticalGridBackgroundSize(),
                             fontFamily: getFontFamilyStyle()
                           }}>
                        <p 
                          className="indent-8 leading-[2.2rem] whitespace-pre-wrap text-justify"
                          style={{ fontFamily: getFontFamilyStyle() }}
                          dangerouslySetInnerHTML={{ 
                            __html: letterBody ? letterBody.replace(/\n/g, "<br/>") : "（笔干墨枯，静候泼墨）" 
                          }}
                        />
                      </div>

                      {/* Header line columns for Recipient */}
                      <div className={`writing-vertical h-full pr-1 md:pr-4 flex flex-col justify-start z-10 ${fontClass}`} style={{ color: primaryInkColor, fontFamily: getFontFamilyStyle() }}>
                        <div className="text-base font-bold mb-4 pr-1 leading-[2.2rem]" style={{ fontFamily: getFontFamilyStyle() }}>
                          {recipient}
                        </div>
                      </div>

                    </div>
                  ) : (
                    // ----------------------------------------------------
                    // HORIZONTAL MODERN CHINESE TRADITIONAL WRITING TYPE
                    // ----------------------------------------------------
                    <div className="flex-1 flex flex-col justify-between overflow-visible relative z-10 select-all leading-relaxed font-serif" style={{ color: primaryInkColor, fontFamily: getFontFamilyStyle() }}>
                      
                      {/* Grid row background lines representation if active */}
                      {customStyle.gridType === "row" && (
                        <div className="absolute inset-0 horizontal-lines-grid-grey pointer-events-none opacity-60 z-0"></div>
                      )}
                      {customStyle.gridType === "red-row" && (
                        <div className="absolute inset-0 horizontal-lines-grid pointer-events-none opacity-70 z-0"></div>
                      )}
                      {customStyle.gridType === "green-row" && (
                        <div className="absolute inset-0 horizontal-lines-grid-green pointer-events-none opacity-65 z-0"></div>
                      )}
                      {customStyle.gridType === "double-red" && (
                        <div className="absolute inset-0 horizontal-lines-grid pointer-events-none opacity-60 z-0"
                             style={{
                               backgroundImage: "linear-gradient(rgba(196, 58, 49, 0.18) 1px, transparent 1px), linear-gradient(rgba(196, 58, 49, 0.08) 2px, transparent 2px)",
                               backgroundSize: "100% 2.1rem, 100% 1.05rem"
                             }} />
                      )}
                      {customStyle.gridType === "grid" && (
                        <div className="absolute inset-0 pointer-events-none opacity-40 z-0" 
                             style={{ 
                               backgroundImage: "radial-gradient(ellipse at center, rgba(184, 150, 62, 0.15) 20%, transparent 20%), linear-gradient(rgba(184, 150, 62, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(184, 150, 62, 0.1) 1px, transparent 1px)",
                               backgroundSize: "2rem 2rem, 2rem 2rem, 2rem 2rem"
                             }} />
                      )}
                      {customStyle.gridType === "vermilion-box" && (
                        <div className="absolute inset-0 horizontal-lines-grid-vermilion-box pointer-events-none opacity-45 z-0"></div>
                      )}

                      {/* Recipient Title Header */}
                      <div className={`w-full font-bold mb-4 ${fontClass}`} style={{ color: primaryInkColor, fontFamily: getFontFamilyStyle() }}>
                        <span className="text-base select-all">{recipient}</span>
                      </div>

                      {/* Body paragraph content text */}
                      <div className={`w-full flex-grow mb-6 z-10 prose ${fontClass} ${getFontSizeClass()}`} style={{ fontFamily: getFontFamilyStyle() }}>
                        <div 
                          className="indent-8 text-justify whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: letterBody ? letterBody.replace(/\n/g, "<br/>") : "（万般相思，尽在此行空白中）"
                          }}
                        />
                      </div>

                      {/* Custom illustration placing if Horizontal layout */}
                      {customStyle.uploadedImageRole === "illustration" && customStyle.uploadedImage && (
                        <div className="w-full flex justify-center my-4 z-10 pointer-events-none">
                          <div 
                            className="border border-[#e0ddd5] p-1 bg-white/85 shadow-xs rounded-sm"
                            style={{ 
                              transform: `scale(${customStyle.uploadedImageScale ?? 1.0})`,
                              opacity: customStyle.uploadedImageOpacity ?? 0.85,
                              transition: "transform 0.2s"
                            }}
                          >
                            <img 
                              src={customStyle.uploadedImage} 
                              alt="插图" 
                              referrerPolicy="no-referrer"
                              className="max-h-[160px] object-contain rounded-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Sign-off footer lines (Right corner or Bottom center Alignment) */}
                      <div className={`w-full pt-4 border-t border-dashed border-[#e0ddd5]/60 flex flex-col ${(customStyle.signatureAlign ?? "right") === "right" ? "items-end" : "items-start"} ${fontClass} transition-all duration-300`}>
                        <div className={(customStyle.signatureAlign ?? "right") === "right" ? "text-right" : "text-left pl-4"}>
                          <span className="font-bold text-sm block">{sender}</span>
                          {(customStyle.showLetterDate ?? true) && (
                            <span className="text-xs text-gray-400 block mt-1">{letterDate}</span>
                          )}
                        </div>

                        {/* Stamped seal decoration */}
                        {customStyle.stampEnabled && customStyle.stampText && (
                          <div className={`mt-2 border-2 border-[#c43a31] text-red-700 text-center font-bold tracking-tighter flex items-center justify-center font-serif select-none
                            ${customStyle.stampShape === "circle" ? "rounded-full" : "rounded-sm"}`}
                            style={{
                              width: "36px",
                              height: "36px",
                              backgroundColor: "rgba(196, 58, 49, 0.04)",
                              boxShadow: "0 0 1px #c43a31",
                              borderColor: getStampColor()
                            }}>
                            <span className="text-[10px] leading-tight scale-90 tracking-tighter" style={{ fontFamily: "STKaiti, Kaiti, serif", color: getStampColor() }}>
                              {customStyle.stampText.substring(0, 4)}
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* Elegant vintage bottom page border */}
                  <div className="absolute bottom-1.5 left-0 right-0 py-1 flex justify-between px-8 text-[9px] text-[#8c887d]/40 font-serif border-t border-gray-200/40 pointer-events-none select-none uppercase">
                    <span>与书·明信尺素案卷</span>
                    <span>丙午宣笔寄心</span>
                  </div>

                </div>
              </div>

              {/* Scrolling Tip bar */}
              <div className="text-center text-[10px] sm:text-[10.5px] text-[#8c887d] font-serif flex items-center justify-center space-x-1.5 -mt-1.5 mb-2.5 animate-pulse select-none">
                <span>💡</span>
                <span>
                  {isVertical 
                    ? "【竖排长卷】请滑动鼠标滚轮（上/下）即可自动「横向」畅读千里书简。"
                    : "【横排长卷】请滑动鼠标滚轮即可向下进行「无界自适应」尺素纵览。"}
                </span>
              </div>

              {/* Action output utility buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 w-full">
                <button
                  onClick={exportAsPng}
                  disabled={isExporting || isExportingPdf}
                  className="flex-1 bg-[#c43a31] text-white text-xs font-serif uppercase tracking-widest py-3 px-5 hover:bg-[#a42c24] transition-all flex items-center justify-center space-x-2 shadow-sm rounded-sm disabled:opacity-50"
                  style={{ fontFamily: "STKaiti, Kaiti, serif" }}
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? "正在研磨画印..." : "导出明信图片 (PNG)"}</span>
                </button>

                <button
                  onClick={exportAsPdfReal}
                  disabled={isExporting || isExportingPdf}
                  className="flex-1 bg-transparent text-[#c43a31] border border-[#c43a31] text-xs font-serif uppercase tracking-widest py-3 px-5 hover:bg-[#c43a31]/5 transition-all flex items-center justify-center space-x-2 rounded-sm disabled:opacity-50"
                  style={{ fontFamily: "STKaiti, Kaiti, serif" }}
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>{isExportingPdf ? "正在排印雅卷..." : "导出 PDF 雅卷 (PDF)"}</span>
                </button>

                <button
                  onClick={triggerPdfExport}
                  disabled={isExporting || isExportingPdf}
                  className="bg-transparent text-[#8c887d] border border-[#8c887d]/40 text-xs font-serif py-3 px-4 hover:bg-[#8c887d]/5 transition-all flex items-center justify-center space-x-1.5 rounded-sm disabled:opacity-50"
                  style={{ fontFamily: "STKaiti, Kaiti, serif" }}
                >
                  <span>系统排印 (打印)</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 明信文化馆 (Classic Literary Letters Collection)  */}
        {/* ========================================================= */}
        {currentTab === "gallery" && (
          <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            
            {/* Header statement describing Chinese correspondence culture */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-6 border-[#e0ddd5]">
              <div>
                <h2 className="text-3xl font-serif text-[#2c2c2c] italic flex items-center space-x-2 pr-2" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                  <span>明信文化馆</span>
                  <Award className="w-5 h-5 text-yellow-600 self-center animate-[pulse_2s_infinite]" />
                </h2>
                <p className="text-xs text-[#8c887d] italic mt-1 pb-1">
                  “尺素传情，寸心相寄。中国历史上最深情的名作书章汇编”
                </p>
              </div>
              
              {/* Active Audio State alert indicator */}
              {activeSpeechId && (
                <div className="mt-3 md:mt-0 bg-[#c43a31]/5 p-2 px-3 border border-[#c43a31]/20 rounded-md flex items-center space-x-2 text-xs text-[#c43a31] animate-[pulse_2.5s_infinite]">
                  <Volume2 className="w-4 h-4 animate-bounce" />
                  <span className="font-serif font-bold">听雨古台：正在朗读古代锦绣信扎中...</span>
                  <button onClick={stopSpeech} className="underline text-[10px] pl-2 hover:font-bold">寂静 (静音)</button>
                </div>
              )}
            </div>

            {/* Filter Pill Panels & Search boxes */}
            <div className="bg-[#f0ede6]/40 p-5 rounded-md border border-[#e0ddd5] grid grid-cols-1 md:grid-cols-2 gap-6 items-start md:items-center"
                 style={{ backgroundColor: vintageTheme ? "#ebdcb9/30" : "#fdfdfd" }}>
              
              {/* Left Column: Category & Dynasty vertically stacked */}
              <div className="space-y-5">
                {/* Category Filter */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8c887d] tracking-widest block">所属种目 / Category</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { key: "all", label: "全部尺素" },
                      { key: "family", label: "🏡 骨肉家书" },
                      { key: "love", label: "🌸 儿女情长" },
                      { key: "friend", label: "🤝 挚友酬唱" },
                      { key: "breaking", label: "⚔️ 绝代断章" }
                    ].map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setGalleryCategory(cat.key)}
                        className={`px-2.5 py-1 text-xs font-serif transition-colors rounded-3xl
                          ${galleryCategory === cat.key 
                            ? "bg-[#c43a31] text-white" 
                            : "bg-[#e0ddd5]/45 hover:bg-[#c43a31]/10 text-[#2c2c2c] border border-transparent"
                          }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynasty Filter */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8c887d] tracking-widest block">古今宏代 / Dynasty</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { key: "all", label: "各朝代" },
                      { key: "古典", label: "汉晋风流" },
                      { key: "唐宋", label: "唐宋傲骨" },
                      { key: "明清", label: "清词手稿" },
                      { key: "近现代", label: "近现代绝唱" }
                    ].map(dyn => (
                      <button
                        key={dyn.key}
                        onClick={() => setGalleryDynasty(dyn.key)}
                        className={`px-2.5 py-1 text-xs font-serif transition-colors rounded-3xl
                          ${galleryDynasty === dyn.key 
                            ? "bg-[#c43a31] text-white" 
                            : "bg-[#e0ddd5]/45 hover:bg-[#c43a31]/10 text-[#2c2c2c]"
                          }`}
                      >
                        {dyn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Search text input */}
              <div className="space-y-1 w-full md:pl-2">
                <span className="text-[10px] uppercase font-bold text-[#8c887d] tracking-widest block">查找经典 / Search Title, Words</span>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    placeholder="如：快雪时晴、林觉民、思念..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#c43a31] rounded-sm placeholder-gray-400"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  {gallerySearch && (
                    <button 
                      onClick={() => setGallerySearch("")} 
                      className="absolute right-2 px-1 text-[10px] text-[#c43a31] top-1.5"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* List grid of elegant paper blocks */}
            {filteredGalleryLetters.length === 0 ? (
              <div className="text-center py-16 bg-[#e0ddd5]/20 rounded-md border border-dashed border-[#e0ddd5]">
                <span className="text-4xl block mb-2 opacity-50">📭</span>
                <p className="text-sm font-serif text-[#8c887d] italic">网络朦胧，未寻得符合此种目之纸信。</p>
                <button 
                  onClick={() => { setGallerySearch(""); setGalleryCategory("all"); setGalleryDynasty("all"); }}
                  className="mt-3 text-[#c43a31] text-xs underline font-serif border-t border-dashed border-[#c43a31]/20 pt-2"
                >
                  清除所有筛选，重新阅信
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGalleryLetters.map(letter => {
                  const isExpanded = expandedGalleryId === letter.id;
                  
                  // Category Badge Theme Stylings
                  const getCatStyling = (cat: string) => {
                    switch (cat) {
                      case "family": return "bg-emerald-50 text-emerald-800 border-emerald-100";
                      case "love": return "bg-rose-50 text-rose-850 border-rose-100";
                      case "friend": return "bg-indigo-50 text-indigo-850 border-indigo-100";
                      case "breaking": return "bg-orange-50 text-orange-850 border-orange-100";
                      default: return "bg-amber-50 text-amber-850 border-amber-100";
                    }
                  };

                  return (
                    <div 
                      key={letter.id} 
                      id={`gallery-${letter.id}`}
                      className={`border p-6 transition-all duration-300 flex flex-col justify-between hover:shadow-md transform hover:-translate-y-0.5
                        ${isExpanded 
                          ? "bg-white border-[#c8b99d]" 
                          : "bg-white/55 border-[#e0ddd5]"
                        }`}
                      style={{
                        backgroundColor: isExpanded ? (vintageTheme ? "#f7f2e6" : "#ffffff") : "transparent",
                        borderColor: isExpanded ? "#c8b99d" : "#e0ddd5"
                      }}
                    >
                      {/* Top Header Card Info */}
                      <div>
                        <div className="flex items-center justify-between mb-3 text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-wide font-sans
                            ${getCatStyling(letter.category)}`}>
                            {letter.category === "family" && "🏡 家书"}
                            {letter.category === "love" && "🌸 情信"}
                            {letter.category === "friend" && "🤝 友人酬书"}
                            {letter.category === "breaking" && "⚔️ 绝交绝笔"}
                          </span>
                          <span className="text-gray-400 font-mono tracking-wider">{letter.period}</span>
                        </div>

                        {/* Title and Author */}
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-lg font-bold font-serif text-[#2c2c2c]" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                            {letter.title}
                          </h3>
                          <span className="text-xs font-serif text-gray-500 italic pr-1">
                            {letter.author} · {letter.dynasty}
                          </span>
                        </div>

                        {/* Summary / Snippet */}
                        <p className="text-xs leading-relaxed text-[#7a7465] italic my-3 bg-[#e0ddd5]/15 p-2 rounded-sm border-l-2 border-[#c43a31]">
                          {letter.summary}
                        </p>

                        {/* Expanded details block */}
                        {isExpanded ? (
                          <div className="mt-4 pt-4 border-t border-[#f0ede6] space-y-4 animate-[fadeIn_0.35s_ease-out]">
                            
                            {/* Original Text display on warm traditional stationary look */}
                            <div>
                              <span className="text-[10px] uppercase font-extrabold text-[#c43a31] tracking-wider block mb-1.5 font-serif">
                                尺素名篇原文 / Original Text
                              </span>
                              <div className="p-4 bg-[#fcf8ee] border border-[#ded0b6] text-sm leading-relaxed text-[#3a352d] font-serif whitespace-pre-wrap select-all shadow-inner relative italic rounded-sm"
                                   style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                                <div className="absolute right-2 top-2 text-3xl opacity-5 select-none font-bold">与书</div>
                                {letter.content}
                              </div>
                            </div>

                            {/* Expert Appreciative Comment */}
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[#8c887d] tracking-wider block mb-1">
                                编修赏析点评 / Commentary & Appreciation
                              </span>
                              <p className="text-xs text-justify leading-relaxed text-[#514c3e] border-l-2 border-amber-600/35 pl-3">
                                {letter.appreciation}
                              </p>
                            </div>

                          </div>
                        ) : null}
                      </div>

                      {/* Expanded trigger and interactive tools toolbar */}
                      <div className="mt-5 pt-4 border-t border-[#f0ede6] flex items-center justify-between text-xs">
                        
                        {/* Collapse - Expand Toggle */}
                        <button
                          onClick={() => setExpandedGalleryId(isExpanded ? null : letter.id)}
                          className="text-[#c43a31] font-serif hover:underline flex items-center space-x-1"
                        >
                          <span>{isExpanded ? "收拢墨卷" : "展开全文赏析"}</span>
                          <span className="text-[9px]">{isExpanded ? "▲" : "▼"}</span>
                        </button>

                        {/* Copy, Speach, and Run To Desk actions */}
                        <div className="flex items-center space-x-2">
                          
                          {/* Speak aloud Web Speech TTS Button */}
                          <button
                            onClick={() => speakGalleryLetter(letter)}
                            className={`p-1.5 rounded-sm border hover:bg-gray-100 transition-colors flex items-center space-x-1
                              ${activeSpeechId === letter.id 
                                ? "border-[#c43a31] bg-[#c43a31]/5 text-[#c43a31] animate-[pulse_1.5s_infinite]" 
                                : "border-[#e0ddd5] text-gray-500 hover:text-[#c43a31]"
                              }`}
                            title={activeSpeechId === letter.id ? "停止诵读" : "音频古典朗诵"}
                          >
                            {activeSpeechId === letter.id ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-serif font-bold">静音</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-serif">朗读</span>
                              </>
                            )}
                          </button>

                          {/* Copy code text */}
                          <button
                            onClick={() => copyTextToClipboard(letter.content, letter.title)}
                            className="p-1.5 rounded-sm border border-[#e0ddd5] text-gray-500 hover:text-[#c43a31] hover:bg-gray-100 transition-colors"
                            title="复制原文"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Load as client draft inside writing page */}
                          <button
                            onClick={() => handleLoadFromGallery(letter)}
                            className="bg-[#2c2c2c] text-white py-1 px-3 rounded-sm hover:bg-black transition-colors font-serif text-[10px] uppercase tracking-wider flex items-center space-x-1"
                            style={{ fontFamily: "STKaiti, Kaiti, serif" }}
                          >
                            <Send className="w-3 h-3 text-[#c19a4e]" />
                            <span>套用写信 (Edit Draft)</span>
                          </button>

                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Cultural background information footer section */}
            <div className="mt-8 p-6 bg-[#f0ede6]/30 rounded-md border border-[#e0ddd5] flex items-center space-x-4">
              <BookOpen className="w-8 h-8 text-[#c43a31]/60 shrink-0" />
              <div className="text-xs leading-relaxed text-[#7c7569]">
                <strong className="block text-[#2c2c2c] mb-1 font-serif">明信小识 / Cultural Trivia:</strong>
                古人写信因其材质、长短差异有诸多雅致合称：
                写在绢帛上的称作“尺素”；长约一尺的书简称为“尺牍”；
                藏于雕刻成鲤鱼形状之木函中的称为“鱼雁书”。
                “见字如面，尺素存心”历来凝聚了中华游子最温存的心灵寄托。
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: 墨痕斋 (Saved Letters Store) - Editorial Homepage */}
        {/* ========================================================= */}
        {currentTab === "home" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-[fadeIn_0.5s_ease-out]">
            
            {/* Left Hand Column: Personalized profile card styled minimalism */}
            <div className="md:col-span-4 space-y-6">
              
              {/* Authenticated member area or Guest Login registry */}
              {!currentUser ? (
                <div className="bg-white p-6 shadow-sm border border-[#e0ddd5] relative overflow-hidden text-center"
                     style={{ backgroundColor: vintageTheme ? "#f6f1e5" : "#ffffff", borderColor: "#e0ddd5" }}>
                  
                  {/* Visual background subtle ornament */}
                  <div className="absolute right-2 bottom-2 text-6xl text-[#8c7b65]/5 font-serif select-none pointer-events-none font-bold">
                    玺
                  </div>

                  <header className="mb-4 pb-2 border-b border-[#f0ede6] text-center">
                    <h3 className="text-sm font-serif italic text-[#3a352d] flex items-center justify-center space-x-1.5" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                      <Lock className="w-4 h-4 text-[#c43a31]" />
                      <span>墨客登记登临 (Registry)</span>
                    </h3>
                    <p className="text-[10px] text-[#8c7b65] italic tracking-wide mt-1">
                      “登记在册可享云端墨宝同步，并开启历史三版本存底。”
                    </p>
                  </header>

                  <div className="grid grid-cols-2 gap-2 mb-4 bg-neutral-100/50 p-1 rounded border border-neutral-200/50 text-xs">
                    <button 
                      type="button"
                      onClick={() => { setAuthMode("login"); setAuthError(null); }}
                      className={`py-1.5 rounded-sm font-serif font-bold transition-all
                        ${authMode === "login" 
                          ? "bg-[#c43a31] text-white shadow-xs" 
                          : "text-[#5a564d] hover:bg-neutral-200/50"}`}
                    >
                      旧客登临 (Login)
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setAuthMode("register"); setAuthError(null); }}
                      className={`py-1.5 rounded-sm font-serif font-bold transition-all
                        ${authMode === "register" 
                          ? "bg-[#c43a31] text-white shadow-xs" 
                          : "text-[#5a564d] hover:bg-neutral-200/50"}`}
                    >
                      新客注册 (Register)
                    </button>
                  </div>

                  <form onSubmit={authMode === "login" ? handleEmailLogin : handleEmailRegister} className="space-y-3 text-xs text-left">
                    {authError && (
                      <div className="p-2 bg-red-50 border border-red-100 text-[#c43a31] rounded-sm text-[10px] font-serif leading-tight">
                        🏮 {authError}
                      </div>
                    )}

                    {authMode === "register" && (
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                          阁下尊姓大名 (Your Nickname)
                        </label>
                        <input
                          type="text"
                          required
                          value={userProfile.name}
                          onChange={(e) => setUserProfile(p => ({ ...p, name: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31] bg-[#fdfdfc]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                        登记信差邮箱 (Email Address)
                      </label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31] bg-[#fdfdfc] text-xs"
                        placeholder="例如 mail@qq.com 或 master@github.com"
                      />
                      {/* Suffix Assistants */}
                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] text-[#8c887d] font-serif">快速后缀：</span>
                        {[
                          { suffix: "@qq.com", label: "QQ邮箱" },
                          { suffix: "@github.com", label: "GitHub" },
                          { suffix: "@gmail.com", label: "Gmail" },
                          { suffix: "@163.com", label: "163网易" }
                        ].map((item) => (
                          <button
                            key={item.suffix}
                            type="button"
                            onClick={() => {
                              const idx = authEmail.indexOf("@");
                              if (idx === -1) {
                                setAuthEmail(authEmail + item.suffix);
                              } else {
                                setAuthEmail(authEmail.substring(0, idx) + item.suffix);
                              }
                            }}
                            className="px-1.5 py-0.5 text-[9px] bg-[#f5ede0]/50 hover:bg-[#c43a31]/10 hover:text-[#c43a31] text-[#5a554a] border border-[#e0ddd5]/80 rounded transition-colors font-serif"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#8c887d] mb-1 font-semibold">
                        登阁凭据密码 (Password - Min 6 digits)
                      </label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#c43a31] bg-[#fdfdfc]"
                        placeholder="••••••"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthSubmitLoading}
                      className="w-full bg-[#c43a31] hover:bg-[#a42c24] text-white py-1.5 px-3 shadow-xs font-serif tracking-widest uppercase transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-1 rounded-sm text-[11px]"
                      style={{ fontFamily: "STKaiti, Kaiti, serif" }}
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{isAuthSubmitLoading ? "在册中..." : authMode === "login" ? "登入墨阁" : "新建名册入阁"}</span>
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-3 flex items-center">
                    <div className="flex-grow border-t border-[#f0ede6]"></div>
                    <span className="flex-shrink mx-2 text-[9px] text-[#8c887d] font-serif">或快捷登临</span>
                    <div className="flex-grow border-t border-[#f0ede6]"></div>
                  </div>

                  {/* Google & GitHub Authentications */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleGoogleLogin}
                      type="button"
                      className="bg-[#fafafa] hover:bg-neutral-50 text-[10px] py-2 px-1 border border-gray-300 rounded shadow-3xs font-serif flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <span className="text-sm">🌟</span>
                      <span className="font-bold text-[#5c544d]">Google 登临</span>
                    </button>
                    <button
                      onClick={handleGithubLogin}
                      type="button"
                      className="bg-[#fafafa] hover:bg-neutral-50 text-[10px] py-2 px-1 border border-gray-300 rounded shadow-3xs font-serif flex items-center justify-center space-x-1.5 transition-colors animate-pulse hover:animate-none"
                    >
                      <Github className="w-3.5 h-3.5 text-[#333]" />
                      <span className="font-bold text-[#5c544d]">GitHub 登临</span>
                    </button>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-dashed border-[#e0ddd5] text-[9.5px] text-gray-400 text-center leading-relaxed font-serif">
                    您当前已散客身份于此挥墨。
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/50 p-4 border border-emerald-200/50 rounded-sm text-xs flex items-center justify-between text-left">
                  <div className="flex items-center space-x-1.5 text-left">
                    <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse shrink-0" />
                    <span className="font-serif text-[11px]">
                      阁下认证登阁：<strong className="text-green-800 break-all">{currentUser.email}</strong>
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] text-red-700 font-serif font-bold hover:underline flex items-center space-x-0.5 shrink-0 ml-2"
                  >
                    <LogOut className="w-3 h-3 text-red-700" />
                    <span>作客退阁</span>
                  </button>
                </div>
              )}

              {/* Profile details card */}
              <div className="bg-white p-6 shadow-sm border border-[#e0ddd5] text-center"
                   style={{ backgroundColor: vintageTheme ? "#f6f1e5" : "#ffffff", borderColor: "#e0ddd5" }}>
                
                {/* Vintage large editorial initial frame */}
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-[#e0ddd5] mx-auto flex items-center justify-center border-2 border-[#c8b99d]">
                    <span className="text-3xl italic font-serif text-[#c43a31] font-bold">
                      {userProfile.name.substring(0, 1)}
                    </span>
                  </div>
                  <span className="absolute bottom-0 right-1/2 translate-x-12 px-2.5 py-0.5 text-[9px] uppercase tracking-widest font-serif bg-[#c43a31] text-white rounded-full">
                    {userProfile.title}
                  </span>
                </div>

                {isEditingProfile ? (
                  <div className="space-y-3 text-left">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5 font-serif">阁下称呼 / Nickname</label>
                      <input 
                        type="text" 
                        value={userProfile.name}
                        onChange={(e) => setUserProfile(p => ({ ...p, name: e.target.value }))}
                        className="w-full text-xs px-2 py-1 border border-gray-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5 font-serif">文学雅号 / Lit Title</label>
                      <select 
                        value={userProfile.title}
                        onChange={(e) => setUserProfile(p => ({ ...p, title: e.target.value }))}
                        className="w-full text-xs px-2 py-1 border border-gray-200 bg-white"
                      >
                        <option value="林深见鹿">林深见鹿</option>
                        <option value="竹林散人">竹林散人</option>
                        <option value="松风书吏">松风书吏</option>
                        <option value="寒山墨客">寒山墨客</option>
                        <option value="沧海寄羽">沧海寄羽</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5 font-serif">心言居舍 / Home Location</label>
                      <input 
                        type="text" 
                        value={userProfile.hometown}
                        onChange={(e) => setUserProfile(p => ({ ...p, hometown: e.target.value }))}
                        className="w-full text-xs px-2 py-1 border border-gray-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5 font-serif">平生言志 / Bio Signature</label>
                      <textarea 
                        rows={3}
                        value={userProfile.signature}
                        onChange={(e) => setUserProfile(p => ({ ...p, signature: e.target.value }))}
                        className="w-full text-xs px-2 py-1 border border-gray-200 bg-white font-serif"
                      />
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <button 
                        onClick={saveProfileChange}
                        className="flex-1 bg-black text-white text-[10px] py-1.5 font-serif uppercase tracking-widest"
                      >
                        印信保存
                      </button>
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 border border-gray-300 text-gray-650 text-[10px] py-1.5"
                      >
                        作罢
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-serif text-[#2c2c2c] italic mb-1" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                      {userProfile.name}
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-[#8c887d] font-semibold">
                      {userProfile.title} · {userProfile.hometown}
                    </p>
                    
                    <p className="text-xs leading-relaxed italic text-[#6a6557] my-4 px-3 py-2 bg-neutral-150/40 rounded border-l-2 border-gray-300">
                      “{userProfile.signature}”
                    </p>

                    <div className="text-[10px] text-gray-400 font-mono flex items-center justify-center space-x-1.5 mb-4">
                      <span>已寄藏墨宝：{savedLetters.length} 件</span>
                      <span>·</span>
                      <span>修养自省度：高雅安稳</span>
                    </div>

                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="text-xs text-[#c43a31] hover:underline hover:font-bold font-serif border-t border-[#f0ede6] pt-3 block w-full text-center"
                    >
                      修改雅好与个性签名 (Edit Bio)
                    </button>
                  </>
                )}
              </div>

              {/* Literary Accomplishment stat index box */}
              <div className="bg-[#f0ede6]/40 p-5 rounded-md border border-[#e0ddd5]"
                   style={{ backgroundColor: vintageTheme ? "#ebdcol_light" : "#fbfaf8" }}>
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#8c887d] mb-3 pb-1 border-b border-[#e0ddd5]">
                  文化修养档案 / Literary Achievements
                </h4>
                <div className="space-y-3.5 text-xs text-[#5a564d]">
                  <div className="flex justify-between items-center text-justify">
                    <span className="flex items-center space-x-1.5">
                      <Hash className="w-3.5 h-3.5 text-[#c43a31]" />
                      <span>攒存自创笺幅</span>
                    </span>
                    <span className="font-mono font-bold text-[#c43a31] bg-white px-2 rounded-full border text-[11px]">
                      {savedLetters.length} 幅
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-justify">
                    <span className="flex items-center space-x-1.5">
                      <Hash className="w-3.5 h-3.5 text-[#c43a31]" />
                      <span>品阅古典名帖</span>
                    </span>
                    <span className="font-mono font-bold text-gray-700 bg-white px-2 rounded-full border text-[11px]">
                      10 卷全精阅
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-justify">
                    <span className="flex items-center space-x-1.5">
                      <Hash className="w-3.5 h-3.5 text-[#c43a31]" />
                      <span>最契合墨风</span>
                    </span>
                    <span className="font-serif font-bold text-gray-700">
                      雅致古典 (Kaiti)
                    </span>
                  </div>
                </div>
              </div>

              {/* Interests tag list */}
              <div className="bg-white p-5 rounded-md border border-[#e0ddd5]"
                   style={{ backgroundColor: vintageTheme ? "#f5f0e4" : "#fdfdfd", borderColor: "#e0ddd5" }}>
                <h4 className="text-[9px] uppercase tracking-[0.2em] text-[#8c887d] mb-2 font-bold border-b pb-1">雅致情兴 / Hobbies</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 text-[10px] bg-[#f0ede6] rounded border border-[#e0ddd5]">古典诵读</span>
                  <span className="px-2 py-0.5 text-[10px] bg-[#f0ede6] rounded border border-[#e0ddd5]">金石篆刻</span>
                  <span className="px-2 py-0.5 text-[10px] bg-[#f0ede6] rounded border border-[#e0ddd5]">松烟研墨</span>
                  <span className="px-2 py-0.5 text-[10px] bg-[#f0ede6] rounded border border-[#e0ddd5]">修研魏晋史</span>
                </div>
              </div>

            </div>

            {/* Right Hand Column: Active dynamic inventory list of previously drafts */}
            <div className="md:col-span-8 space-y-6">
              
              <div className="bg-white p-6 shadow-sm border border-[#e0ddd5]"
                   style={{ backgroundColor: vintageTheme ? "#f7f2e4" : "#ffffff", borderColor: "#e0ddd5" }}>
                
                <header className="mb-6 pb-2 border-b border-[#f0ede6] flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-serif text-[#2c2c2c] italic" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                      曾存墨宝珍阁 (Saved Correspondences)
                    </h3>
                    <p className="text-[11px] text-[#8c887d] mt-0.5">
                      您在当前浏览器中保存的自书名札，支持加载编辑、焚稿、预览
                    </p>
                  </div>
                </header>

                {savedLetters.length === 0 ? (
                  <div className="text-center py-16 bg-[#faf9f6]/95 border border-dashed border-gray-200">
                    <span className="text-5xl block mb-3 opacity-45">✍️</span>
                    <p className="text-sm font-serif text-[#8c887d] italic">万籁俱寂，尚未动笔。良辰美景，阁下不来手札一封么？</p>
                    <button
                      onClick={() => setCurrentTab("write")}
                      className="mt-4 bg-[#c43a31] text-white text-xs py-2 px-5 hover:bg-[#a42c24] transition-colors rounded-sm shadow-sm font-serif"
                      style={{ fontFamily: "STKaiti, Kaiti, serif" }}
                    >
                      现展尺素写就一幅
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 text-left">
                    {(() => {
                      const groups = getEnvelopeGroups();
                      return groups.map((group) => {
                        const principal = group.latestLetter;
                        return (
                          <div 
                            key={group.envelopeId}
                            className="p-5 bg-white/40 border border-[#e0ddd5] rounded-xs hover:shadow-md transition-all h-auto relative duration-300"
                            style={{ backgroundColor: vintageTheme ? "rgba(255,255,255,0.4)" : "rgba(251,250,248,0.7)" }}
                          >
                            {/* Header / Meta */}
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-dashed border-[#e0ddd5]">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 text-[9px] bg-[#c43a31]/10 text-[#c43a31] rounded font-serif font-bold">
                                  信封名卷
                                </span>
                                <span className="font-mono text-[10px] text-gray-400">
                                  末次存墨：{group.latestSavedAt}
                                </span>
                              </div>
                              
                              <button
                                onClick={(e) => deleteEnvelopeGroup(group.envelopeId, e)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1 text-[10px] flex items-center space-x-1"
                                title="焚毁整卷信封"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span className="font-serif font-bold text-red-600">焚毁此封</span>
                              </button>
                            </div>

                            {/* Letter Title / Content preview */}
                            <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-2">
                              <h4 className="text-base font-bold font-serif text-[#2c2c2c] truncate max-w-sm" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
                                致：{principal.recipient.substring(0, 15)} 启
                              </h4>
                              <span className="text-xs italic text-[#8c7b65] font-serif mt-1 md:mt-0">
                                署：{principal.sender || "落款 顿首"}
                              </span>
                            </div>

                            <p className="text-xs leading-relaxed text-[#5a554a] italic bg-[#fcfbf9]/60 p-3 border border-neutral-100 rounded-sm line-clamp-2 select-all mb-4">
                              {principal.content}
                            </p>

                            {/* Versions control pill listing */}
                            <div className="pt-2 border-t border-[#f0ede6]/70 flex flex-col space-y-2">
                              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold font-sans block">
                                历史修存版本 ({group.versions.length}/3 Versions):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {group.versions.map((ver, vidx) => {
                                  const isActive = activeEnvelopeId === group.envelopeId && activeVersionName === ver.versionName;
                                  return (
                                    <div 
                                      key={ver.id}
                                      className={`p-2 p-y-3 rounded-sm border transition-all flex flex-col justify-between text-[11px]
                                        ${isActive 
                                          ? "bg-[#c43a31]/5 border-[#c43a31]/80 text-[#c43a31] shadow-2xs" 
                                          : "bg-white/80 border-[#ebdcb9]/50 hover:border-gray-400"}`}
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-serif font-bold text-[11px] flex items-center space-x-1">
                                          <span>📜</span>
                                          <span>{ver.versionName || `版本 ${vidx + 1}`}</span>
                                        </span>
                                        
                                        <button
                                          onClick={(e) => deleteSavedLetter(ver.id, e)}
                                          className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                                          title="焚毁此单独版本"
                                        >
                                          <X className="w-3 h-3 text-gray-400 hover:text-red-600" />
                                        </button>
                                      </div>
                                      <span className="text-[9px] text-gray-400 mb-2 font-mono block">
                                        {ver.savedAt.split(" ")[1] || ver.savedAt}
                                      </span>
                                      <button
                                        onClick={() => loadSavedLetterToDraft(ver)}
                                        className={`w-full py-1 text-[10px] font-serif uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center space-x-1
                                          ${isActive 
                                            ? "bg-[#c43a31] text-white hover:bg-[#a42c24]" 
                                            : "bg-[#2c2c2c] text-white hover:bg-black"}`}
                                      >
                                        <PenTool className="w-2.5 h-2.5" />
                                        <span>{isActive ? "执笔中" : "展读此版"}</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Persistent Page Footer */}
      <footer className="py-8 border-t transition-colors duration-300 text-center text-xs text-[#8c887d]/85"
              style={{
                backgroundColor: vintageTheme ? "#f3ecd9" : "#fafaf9",
                borderColor: vintageTheme ? "#ded0b6" : "#e0ddd5"
              }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
          <p className="font-serif italic" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
            「尺素寸心，见字如面。与书带您拾回指尖的温度。」
          </p>
          <div className="flex space-x-4 text-[10px] font-mono uppercase tracking-wider">
            <span>© 2026 与书 · Traditional Creative Lab</span>
            <span>·</span>
            <span>V2.2 Standard Client</span>
          </div>
        </div>
      </footer>

      {/* Dynamic image preview modal popped after exportAsPng */}
      {exportedImgUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.3s_ease]">
          <div className="bg-[#fcfaf2] border-2 border-[#ded0b6] w-full max-w-[540px] p-6 rounded-md shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Traditional top visual stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#c43a31]" />
            
            {/* Close button */}
            <button 
              onClick={() => setExportedImgUrl(null)}
              className="absolute top-3 right-3 text-[#5c544d] hover:text-[#c43a31] transition-colors p-1 bg-white/60 border border-gray-255 rounded-full"
              title="收起画卷"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-serif text-[#2c2c2c] italic mb-2 tracking-widest text-center mt-2 flex items-center space-x-1" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
              <span>📜 尺素丹青绘卷已成</span>
            </h3>
            <p className="text-[10px] text-[#8c887d] font-serif mb-4 leading-tight text-center">
              由于沙盒浏览器限制，若系统未能自动下载，您可 <strong>右键点击图片选择另存为</strong>，或 <strong>长按图片保存到相册</strong>。
            </p>

            {/* High quality Image artifact renderer */}
            <div className="max-h-[385px] w-full overflow-y-auto border border-[#ebdcb9] bg-white rounded-xs p-1 flex justify-center shadow-inner">
              <img 
                src={exportedImgUrl} 
                alt="与书 墨宝画篇" 
                className="max-w-full h-auto object-contain rounded-[1px] shadow-sm select-all cursor-zoom-in"
                style={{ MozUserSelect: "text", WebkitUserSelect: "text", userSelect: "text" }}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Actions inside popup */}
            <div className="mt-5 flex space-x-3 w-full">
              <button
                onClick={() => {
                  setExportedImgUrl(null);
                  triggerToast("尺素已被收回藏阁。");
                }}
                className="flex-1 bg-transparent text-[#5c544d] border border-gray-300 hover:bg-neutral-100 text-[10.5px] font-serif py-2.5 rounded-sm transition-colors"
              >
                收案重来
              </button>
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.download = `与书_${recipient ? recipient.substring(0, 10).replace(/[\s\n\r<>]/g, "") : "良友"}_${Date.now()}.png`;
                  link.href = exportedImgUrl;
                  link.click();
                  triggerToast("已再次发出自动下载请求！");
                }}
                className="flex-1 bg-[#c43a31] text-white hover:bg-[#a42c24] text-[10.5px] font-serif py-2.5 rounded-sm flex items-center justify-center space-x-1 transition-colors"
                style={{ fontFamily: "STKaiti, Kaiti, serif" }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>再试一次自动下载</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Three historical versions overwrite / save modal dialog */}
      {showSaveVersionModal && (
        <div id="save-version-dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.3s_ease]">
          <div className="bg-[#fcfaf2] border-2 border-[#ded0b6] w-full max-w-[500px] p-6 rounded-md shadow-2xl relative overflow-hidden flex flex-col">
            {/* Traditional visual top stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#c43a31]" />
            
            {/* Close button */}
            <button 
              onClick={() => setShowSaveVersionModal(false)}
              className="absolute top-3 right-3 text-[#5c544d] hover:text-[#c43a31] transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-serif text-[#2c2c2c] italic mb-2 tracking-widest flex items-center space-x-2" style={{ fontFamily: "STKaiti, Kaiti, serif" }}>
              <span>📜 封存笺章 · 历史版本管理</span>
            </h3>
            
            <p className="text-xs text-gray-500 mb-4 leading-relaxed font-serif">
              您正在编辑已有的笺纸。为了让您的手札脉络分明，本阁最多支持保存其<strong>三个历史版本</strong>。若超过，可选择覆盖已有旧版。
            </p>

            {/* List existing versions for active envelope */}
            <div className="space-y-3 mb-6">
              <span className="text-[11px] font-bold text-[#8c887d] uppercase tracking-wider block">
                已有版本名录 / Existing Versions:
              </span>
              
              {(() => {
                const versions = savedLetters.filter(l => l.envelopeId === activeEnvelopeId);
                const versionNamesUsed = versions.map(v => v.versionName);
                
                return (
                  <>
                    <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                      {versions.map((ver, idx) => (
                        <div key={ver.id} className="p-3 border border-[#ebdcb9]/80 bg-[#fdfdfc] rounded flex items-center justify-between text-xs">
                          <div className="flex flex-col">
                            <span className="font-serif font-bold text-[#c43a31]">
                              {ver.versionName || `版本 ${idx + 1}`}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              保存时间：{ver.savedAt}
                            </span>
                            <span className="text-[11px] text-gray-400 max-w-[240px] truncate italic mt-1 bg-neutral-50 px-1 py-0.5 rounded border border-neutral-100">
                              前瞻: "{ver.content.substring(0, 30)}..."
                            </span>
                          </div>
                          <button
                            onClick={() => performSaveLetter(activeEnvelopeId!, ver.id, ver.versionName || `版本 ${idx + 1}`)}
                            className="bg-[#c43a31] hover:bg-[#a42c24] text-white text-[10px] px-2.5 py-1.5 rounded transition-all font-serif"
                          >
                            覆盖此版
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* If we have less than 3 versions, offer to save as a brand new version! */}
                    {versions.length < 3 ? (
                      <div className="pt-3 border-t border-dashed border-[#e0ddd5]">
                        <button
                          onClick={() => {
                            // Find the next available version name
                            let nextName = "版本一";
                            if (!versionNamesUsed.includes("版本一")) nextName = "版本一";
                            else if (!versionNamesUsed.includes("版本二")) nextName = "版本二";
                            else if (!versionNamesUsed.includes("版本三")) nextName = "版本三";
                            else nextName = `版本 ${versions.length + 1}`;
                            
                            performSaveLetter(activeEnvelopeId!, null, nextName);
                          }}
                          className="w-full bg-[#2c2c2c] hover:bg-black text-white text-xs font-serif uppercase tracking-wider py-3 px-4 rounded transition-all flex items-center justify-center space-x-2"
                        >
                          <Plus className="w-4 h-4 text-[#c19a4e]" />
                          <span>作为新版本存入 (当前有 {versions.length}/3 个版本)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#c43a31]/5 text-[#c43a31] rounded text-[11px] font-serif border border-[#c43a31]/10">
                        <span>⚠️ 本信封已集齐「版本一、二、三」三幅饱满真迹。若追加，请在上面选择复写覆盖任意一个已有旧版以腾挪书柜。</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Cancel/Dismiss action */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowSaveVersionModal(false)}
                className="text-xs text-gray-500 hover:text-gray-800 transition-colors py-2 px-4 rounded-sm"
              >
                罢笔 (取消)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
