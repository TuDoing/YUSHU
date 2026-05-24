/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LayoutDirection = "vertical" | "horizontal";

export interface LetterCustomStyle {
  fontFamily: string; // "font-sans" | "font-serif" (楷体/宋体/仿宋) | "font-mono"
  fontSize: string; // xs, sm, md, lg, xl, 2xl support
  inkColor: string; // 松烟黑 #2c2416, 朱沙红 #c43a31, 石绿 #3a6b3a, 黛蓝 #2c4460
  bgColor: string; // 背景色
  gridType: string; // none, row, grid, red-row, green-row, vermilion-box support
  paperTexture?: string; // xuan, antique, gold, weave, bamboo, cloud mica Support
  stampText?: string; // 印章文字 (e.g. "张印", "吉祥")
  sealName?: string; // 水墨名章
  stampStyle?: "square" | "circle"; // 方印、圆印
  stampPosition?: "top" | "bottom" | "right-bottom"; 
  stampColor?: string; // 印章朱粉
  stampFont?: string; // 隶书、篆体风格等
  stampEnabled: boolean;
  stampX?: number; // 偏移
  stampY?: number;
  stampScale?: number;
  stampStyleType?: string; // "classic" 等
  stampTextType?: string; 
  stampFontFamily?: string; 
  stampSize?: "sm" | "md" | "lg";
  stampShape?: "square" | "circle";
  
  hasGrid: boolean; // 是否绘制传统格
  gridColor: string; // 格子颜色
  stampName: string; // 印章名称

  // 邮票配置
  stampActive: boolean;
  stampSelection: string; // 'none' | 'landscape' | 'crane' | 'plum' | 'lotus'

  // 个性化落款和图片设置 (富文本、图文、落款对齐、隐藏日期)
  showLetterDate?: boolean;
  signatureAlign?: "left" | "right";
  uploadedImage?: string; // Base64 url
  uploadedImageRole?: "none" | "illustration" | "background";
  uploadedImageOpacity?: number;
  uploadedImageScale?: number;
}

export interface LetterTemplate {
  id: string;
  name: string;
  description: string;
  direction: LayoutDirection; // vertical or horizontal
  bgColor: string;
  gridColor: string;
  gridType: "none" | "row" | "grid" | "red-row";
  borderStyle: string; // card borders
  illustrations: string; // decorative background style
  fontFamily: string;
  emoji: string;
}

export interface SavedLetter {
  id: string;
  title: string;
  recipient: string;
  content: string;
  sender: string;
  date: string;
  templateId: string;
  customStyle: LetterCustomStyle;
  illustrationType: "none" | "ink-bamboo" | "lotus" | "mountain" | "cloud-border";
  savedAt: string;
  sealText?: string;
  postmark?: string; // 邮戳
  envelopeId?: string; // 信封ID (信封群组)
  versionName?: string; // 版本名称 (e.g. 版本一, 版本二, 版本三)
}

export interface GalleryLetter {
  id: string;
  category: "family" | "love" | "friend" | "breaking" | "admonish"; // 家书, 情书, 友人书, 绝交书, 谏书
  title: string;
  author: string;
  dynasty: string;
  period: string; // 朝代/年代
  summary: string; // 简介
  content: string; // 原文
  appreciation: string; // 赏析
  emoji: string;
  gridType?: string;
}

export interface UserProfile {
  name: string;
  title: string; // 雅号/笔名, e.g. "竹林散人"
  email: string;
  signature: string; // 个性签名
  hometown: string; // 籍贯/居所
  avatarId: string; // 头像索引
  joinedDate: string;
}
