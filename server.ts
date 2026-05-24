import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialization helper for GoogleGenAI
let ai: any = null;
function getGenAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
      return null;
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// AI Letter Polish / Composition Router
app.post("/api/ai/compose", async (req, res) => {
  try {
    const { content, style, audience, focus } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "正文内容不能为空。写下你的寥寥数语，AI 会为你写就锦绣书信。" });
    }

    const aiClient = getGenAI();
    if (!aiClient) {
      return res.status(503).json({ 
        error: "未配置 AI 润笔服务。请在界面右上角 [设置] 中配置并保存您的 GEMINI_API_KEY 密钥。" 
      });
    }

    let styleInstruction = "";
    switch (style) {
      case "classical":
        styleInstruction = "使用雅致古朴的半文言或古典古风词句。遣词造句极具传统书香之气、尺素之美，并适度运用传统书信问候礼辞（比如：久疏通问、时在念中、言不尽意、叩请金安等）。";
        break;
      case "poetic":
        styleInstruction = "行文富有诗意，情感浪漫委婉或旷远清朗。多采用优美的传统意象（如：落叶斜阳、山长水阁、雁字回时、鸿雁传情等），充满文字的画面感。";
        break;
      case "vernacular-warm":
        styleInstruction = "使用极其温暖、朴实真诚的白话文。饱含细腻深情，温暖人心，抚慰关怀，拉近笔友间的灵魂共鸣。";
        break;
      case "short-chic":
        styleInstruction = "精炼洒脱、言简意深。字字珠玑，绝无冗余铺排，语气洒脱如风，句句耐人寻味。";
        break;
      default:
        styleInstruction = "理顺语句，纠正语法与错别字，提升文字的流畅度与美感。";
    }

    let audienceInstruction = "";
    if (audience) {
      audienceInstruction = `收信人是：${audience}。称谓和书信内称呼要礼貌、契合两人关系。落款应该谦和对应。`;
    }

    let focusInstruction = "";
    if (focus) {
      focusInstruction = `书信的核心诉求或背景是：${focus}。请将其巧妙地融合进文字中，富有情致地表达出来。`;
    }

    const systemInstruction = `你是一位精通中国传统尺素书信文化、家书传统和现代文艺写作的一流书信撰写宗师。
你的任务是将用户的白话文草稿、短句或大纲，精致润色重写为一封精美的书信正文。
要求：
- 请只返回【书信正文内容本身】，不要添加任何AI废话、前缀或总结说明。
- 不要带有任何 Markdown 的段落加粗 (如 **重点**)，也不要带有 \`\`\` 包装。
- 书信内容应当分段落，首行可按照古典习惯进行排版。
- 如果用户没有明确指定落款和称呼，不要在正文头部或尾端强行捏造收件人和写信人名字，专注输出书信的主体文学部分。`;

    const userPrompt = `
以下是我的草稿内容：
------
${content}
------

润色风格要求：
1. 风格：${styleInstruction}
2. ${audienceInstruction}
3. ${focusInstruction}

请帮我进行精致重写与深情表达。
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.75,
      }
    });

    const resultText = response.text || "";
    res.json({ success: true, text: resultText });
  } catch (error: any) {
    console.error("Gemini API error during custom composition:", error);
    res.status(500).json({ error: "书信润色失败，请稍后重试或检查网络接入。", details: error?.message });
  }
});

// Serve static assets and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[与书 Backend] Full-stack Server listening on port ${PORT}`);
  });
}

startServer();
