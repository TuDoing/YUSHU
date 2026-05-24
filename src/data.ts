/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GalleryLetter, LetterTemplate } from "./types";

export const PRESET_TEMPLATES: LetterTemplate[] = [
  {
    id: "fish-雁书",
    name: "鱼雁传书 (古典竖排)",
    description: "自右向左，朱红竖格。最宜书写深厚情怀与长句，字里行间宛若惊鸿绝艳。",
    direction: "vertical",
    bgColor: "#fcf8ee", // 宣纸微黄
    gridColor: "rgba(196, 58, 49, 0.25)", // 朱茶浅红
    gridType: "red-row",
    borderStyle: "border-double border-4 border-[#b8963e]", // 描泥金双线边栏
    illustrations: "ink-bamboo",
    fontFamily: "STKaiti, Kaiti, serif", // 楷体
    emoji: "🐟"
  },
  {
    id: "paper-素笺",
    name: "素笺寄情 (温润横排)",
    description: "横排文行，幽灰横栏。适合款款深情，笔调闲适温雅，尽显古典温润之意。",
    direction: "horizontal",
    bgColor: "#faf6ed", // 暮色新笺
    gridColor: "rgba(140, 123, 101, 0.2)", // 澹墨横栏
    gridType: "row",
    borderStyle: "border border-[#d4c5a9]", // 灰淡竹色细边
    illustrations: "mountain",
    fontFamily: "FangSong, serif", // 仿宋
    emoji: "📝"
  },
  {
    id: "flower-花间",
    name: "花间词话 (唯美情真)",
    description: "浪漫轻漾，温软淡粉。适合闺秀雅韵、闺怨相思、爱意倾诉，纸上微蕴桃花春雨。",
    direction: "horizontal",
    bgColor: "#fdf8f7", // 桃花淡粉
    gridColor: "rgba(235, 178, 173, 0.3)", // 桃粉横栏
    gridType: "row",
    borderStyle: "border-2 border-[#e6b3b0]",
    illustrations: "lotus",
    fontFamily: "STKaiti, Kaiti, serif",
    emoji: "🌸"
  },
  {
    id: "classic-简白",
    name: "简白尺素 (素心极简)",
    description: "片云舒卷，大璞不玩。白底无格之制，超脱物外，容纳最洒脱自由的情感与妙笔。",
    direction: "horizontal",
    bgColor: "#fbfbfc", // 素绢洁白
    gridColor: "transparent",
    gridType: "none",
    borderStyle: "border border-gray-200 shadow-sm",
    illustrations: "cloud-border",
    fontFamily: "SimSun, serif", // 宋体
    emoji: "⬜"
  },
  {
    id: "bamboo-幽篁",
    name: "竹林幽篁 (修竹翠笺)",
    description: "幽篁修竹，清雅翠竹。自右向左，淡绿竹痕格，散发隐逸林泉的高迈气节。",
    direction: "vertical",
    bgColor: "#edf4ec", // 淡雅竹绿
    gridColor: "rgba(82, 120, 82, 0.25)", // 翠色格子
    gridType: "row", // 绿色横纵行线
    borderStyle: "border-double border-4 border-[#81a673]/60",
    illustrations: "ink-bamboo",
    fontFamily: "FangSong, serif",
    emoji: "🎋"
  },
  {
    id: "ancient-古卷",
    name: "澄泥洒金 (金砂熟笺)",
    description: "泥金斑驳，仿古熟笺。自左向右横排（或竖排自适应），带金丝古纹底蕴，最宜千古大作。",
    direction: "horizontal",
    bgColor: "#ebdcb9", // 澄泥熟褐
    gridColor: "rgba(130, 95, 45, 0.25)", // 古色灰红栏 grid
    gridType: "grid",
    borderStyle: "border-4 border-[#8c7a50] shadow-md",
    illustrations: "mountain",
    fontFamily: "STKaiti, Kaiti, serif",
    emoji: "📜"
  }
];

export const GALLERY_LETTERS: GalleryLetter[] = [
  {
    id: "yu-qi-shu",
    category: "love",
    title: "《与妻书》",
    author: "林觉民",
    dynasty: "近现代",
    period: "辛亥黄花岗起义前夕 · 1911年",
    summary: "写于慷慨就义前夕的绝笔情书，泣告意映卿卿。将革命大爱与儿女深情完美交融，字字啼血，感人至深，读之无不令人潸然泪下。",
    emoji: "🌸",
    content: `意映卿卿如晤：
吾今以此书与汝诀别矣！吾作此书时，尚是世中一人；汝看此书时，吾已成为阴间一鬼。吾作此书，泪珠和笔墨齐下，不能竟书而欲搁笔，又恐汝不察吾衷，谓吾忍舍汝而死，谓吾不知汝之不欲吾死也，故遂忍悲为汝言之。

吾至爱汝，即此爱汝一念，使吾勇于就死也。吾自遇汝以来，常愿天下有情人都成眷属；然遍地腥云，满街狼犬，称心快意，几家能彀？司马青衫，吾不能学太上之忘情。汝幸而偶我，又何不幸而生今日之中国！吾幸而得汝，又何不幸而生今日之中国！萃汝我之爱，至于忧天下之忧，吾之死，吾之不舍汝，皆为此也。

汝体吾此心，于啼泣之余，亦以天下人为念，当亦乐牺牲吾身与汝身之福利，为天下人谋永福也。汝其勿悲！`,
    appreciation: "林觉民二十四岁慷慨就义，留下了这封写在白色手帕上的家国绝笔。他用最深沉的情话，向爱妻剖白：因为至爱你，所以勇于就死，为天下有情人撑开一片朗朗乾坤。革命者的金石之志与儿女柔情共震，堪称‘最动人的千古第一情书’。"
  },
  {
    id: "jie-zi-shu",
    category: "family",
    title: "《诫子书》",
    author: "诸葛亮",
    dynasty: "魏晋三国",
    period: "蜀汉建兴十二年 · 约建兴中",
    summary: "智慧之化身诸葛亮临终前，写给八岁幼子诸葛瞻的修身齐家指南。字句极简，却高瞻远瞩，‘淡泊明志，宁静致远’历经千百年仍为修身堂名。",
    emoji: "🎋",
    content: `夫君子之行，静以修身，俭以养德。非淡泊无以明志，非宁静无以致远。
夫学须静也，才须学也，非学无以广才，非志无以成学。淫慢则不能励精，险躁则不能治性。
年与时驰，意与日去，遂成枯落，多不接世，悲守穷庐，将复何及！`,
    appreciation: "此书辞约意丰。诸葛亮指出，‘静’与‘俭’是治学修身的关键，告诫儿子必须通过克制欲望、平复躁动来治学。整场书信如清泉涤心，把毕生的修齐智慧，凝练在五十字的严父叮咛之中。"
  },
  {
    id: "kuai-xue-帖",
    category: "friend",
    title: "《快雪时晴帖》",
    author: "王羲之",
    dynasty: "魏晋",
    period: "东晋穆帝时期 · 纸本墨迹",
    summary: "书圣王羲之写给友人‘山阴张侯’的随笔短简。正值冬雪放晴、大地安泰之时，尺素虽短仅二十八字，却被乾隆奉为‘三希’之首。",
    emoji: "️❄️",
    content: `羲之顿首。快雪时晴。佳想安泰。未果。为结。力不次。王羲之顿首。山阴张侯。`,
    appreciation: "‘快雪时晴’。大雪骤降，继而红日东升、晴空如洗。王羲之提笔，欢喜挂念友人。虽‘未果’（因故未能相见），结怀于心。行文优雅洒脱，书法流媚，不仅字珍，其问候情致更能让几百年后的读者感知魏晋名士的晴透风流。"
  },
  {
    id: "zhu-sheng-hao",
    category: "love",
    title: "《醒来觉得甚是爱你》",
    author: "朱生豪",
    dynasty: "近现代",
    period: "写给宋清如的情书 · 1930年代",
    summary: "中国莎士比亚译者朱生豪在烽火岁月里，写给爱人宋清如倾注无限温存的情书结集。他是最纯澈的‘文字儿童’，在纸上将思念化为无尽娇嗔与痴情。",
    emoji: "🧸",
    content: `宋清如：
要是我们现在都在老家，我可以天天来看你。

我愿意舍弃一切，去和你在一起。我不希望别人待我好，只要你一人待我好，世界上也只要你一个人，其他人我都看不见。
我的猫今天很不乖，老是在我的稿子上踩。你寄给我的相片，每天晚上睡前我都要看一会儿。
醒来觉得甚是爱你。祝你今夜也做一个温柔的梦。

朱生豪 顿首`,
    appreciation: "朱生豪行文极其细腻，一生写了数百封书信给宋清如。他一会儿自称‘你的小丈夫’，一会儿戏称宋清如为‘无赖’。这种超脱乱世、近乎赤子纯洁的情书，用‘醒来觉得甚是爱你’这一句浪漫到极致的名言，征服了无数渴望纯粹爱情的灵魂。"
  },
  {
    id: "ceng-guofang-jia-shu",
    category: "family",
    title: "《谕纪泽儿》",
    author: "曾国藩",
    dynasty: "明清/清代",
    period: "咸丰四年 · 围剿太平军行军中",
    summary: "清代名臣曾国藩在军假倥偬中亲笔所立家书。告诫长子修身唯有‘戒骄与惰’最为首要，不依仗荫庇，须以耕读为传家之本。",
    emoji: "🦉",
    content: `纪泽儿左右：
咸丰四年六月二十日，父亲行至九江。寄书以此谕汝。

求业之精，别无他法，唯手熟尔。尔等自立，须由自己。至于修身治家，戒骄与戒惰二者最为致命。
天下古今之庸人，皆以惰字致败；天下古今之才人，皆以骄字致败。
我虽身在行伍、军务万端，仍无不晨起诵读。尔在家，须每日谨记，自修不息，自立于世。
以此示汝，宜体之。`,
    appreciation: "曾国藩写家书一向言传身教、极重细节。他不仅告诫儿子如何自谦自省，更一针见血道出了‘古今平庸者败于惰，天资聪慧者败于骄’的金石玉言，是中国近代家庭德育极具典范性的教材。"
  },
  {
    id: "shen-congwen",
    category: "love",
    title: "《致张兆和书（湘行书简）》",
    author: "沈从文",
    dynasty: "近现代",
    period: "新婚省亲、沅水孤舟 · 1934年",
    summary: "沈从文回乡探母期间，在漫天飞雪和沅水孤舟上写给新婚妻子张兆和的信札。写尽湘西奇美的山水之境和温软纯澈。‘只爱过一个正当最好年龄的人’即出于其中。",
    emoji: "⛵",
    content: `三三：
我行过许多地方的桥，看过许多次数的云，喝过许多种类的酒，却只爱过一个正当最好年龄的人。

我因为今天天气温和，看见一双白小鸟在岸边叫，就分外想你。我坐在这小舱里，听着外头的橹声依呀。我把我的灵魂揉成纸，寄去给你，上面写满了你的好。
我一个人在这里，不觉得寂寞，只是想你，哪怕只是清风吹拂一缕，也盼它是从你身畔吹过来的。

二哥 `,
    appreciation: "沈从文用‘三三’称呼夫人张兆和，自称‘二哥’。船行沅水，他一路上被山川壮怀，并化为笔下的缠绵字字。这不只是一札情书，更是满溢着湘西水汽与山林秀色的绝妙文学风景画，浪漫、诗意，让人沉醉。"
  },
  {
    id: "ji-kang-jue-jiao",
    category: "breaking",
    title: "《与山巨源绝交书》",
    author: "嵇康",
    dynasty: "魏晋",
    period: "魏晋竹林七贤分裂 · 约公元260年",
    summary: "竹林七贤之首嵇康，因好友山涛（山巨源）在罢官后引荐他为官，嵇康极为震怒，并写下流芳千古的著名政论兼绝交宏篇。体现了魏晋风骨至傲。",
    emoji: "🪕",
    content: `山巨源足下：
吾不受足下之荐也。
野人野性，难堪束缚。吾读《庄子》，情之所怀，绝非入朝仕官之辈。
吾常谓，足下相知，当明吾志。岂意今日竟复荐引吾于司马氏名册！
吾不如向之不欲而今勉强之。嵇康非能于俗尘笼络者。
自此，你我绝交，莫复荐引。足下自好，吾自安贫。

嵇康`,
    appreciation: "名列‘魏晋狂澜’的嵇康，在这封信里痛陈仕途之累、自我性灵对自由的终极渴望。虽然名为绝交书，却不掩其对生命意志的绝代追求，句法如干将莫邪，凌厉孤傲，充满名士风骨的一片高冷气格。"
  },
  {
    id: "su-shi-han-shi",
    category: "friend",
    title: "《黄州寒食诗帖》",
    author: "苏轼",
    dynasty: "唐宋/宋代",
    period: "苏子乌台诗案被贬黄州 · 元丰五年",
    summary: "苏轼被贬黄州第三年的寒食节发愤之作。春江欲涨、黄州苦雨。悲戚而洒脱，虽在穷厄之中，其不失豁达飘逸，书法与文字堪称珠联璧合。",
    emoji: "🌦️",
    content: `自我来黄州，已过三寒食。年年欲惜春，春去不容惜。
今年又苦雨，两月秋萧瑟。卧闻海棠花，泥污胭脂雪。
何殊少年子，生盲死无目。君门深九重，坟墓在万里。
也拟哭涂穷，死灰吹不起。

东坡 顿首`,
    appreciation: "黄州寒食诗帖是东坡贬谪期间极度孤寂之中的旷达悲歌。苏轼面对寒食凄雨、柴灶无薪，自嘲‘也拟哭涂穷，死灰吹不起’，在自省里带着高妙的书画诗才，向后世倾诉了其大江东去的赤子之悲与豪迈释怀。"
  },
  {
    id: "qiu-jin-jia",
    category: "breaking",
    title: "《秋瑾绝笔/致挚友》",
    author: "秋瑾",
    dynasty: "近现代",
    period: "大通学堂起义前夕 · 1907年",
    summary: "鉴湖女侠秋瑾义无反顾走上推翻专制道路，深知生死难卜，写给知音的豪情诀别信。‘死在旦夕，誓死不渝’，侠骨铮铮，绝唱于九天。",
    emoji: "⚔️",
    content: `致挚友执事：
吾自投身洪流，已誓死不渝。今暴风雨来，事泄，死在旦夕。
痛祖国社稷之沦亡，哀家人同胞之孤苦，然舍生取义，古今大路。
余死之后，君等切莫哀恸，但乘未竟之志，救世人于涂炭。
虽有万刃在顶、沸鼎在前，有死而已，不改忠魂！

鉴湖女侠 秋瑾`,
    appreciation: "秋瑾作为清末女杰，弃小家、救公天下。她在手札中面对屠刀而毫无惧色。一句‘有死而已，不改忠魂’展露无遗，体现了巾帼英雌救国救民不避刀斧的超凡浩然之气，催人泪下，重若千钧。"
  },
  {
    id: "bing-xin",
    category: "admonish",
    title: "《寄小读者·通讯八》",
    author: "冰心",
    dynasty: "近现代",
    period: "游学北美、遥寄墨音 · 1923年",
    summary: "冰心在远涉重洋之后，写给祖国广大少年儿童的真情慰劳信。风格一如其名，清冰温玉，字里行间盛满大海微风以及‘爱的哲学’。",
    emoji: "✉️",
    content: `亲爱的小读者：
我是你们的大朋友。在大洋彼岸，写一封信，遥寄给你们。

这时天明得很早，隔窗望得见蔚蓝的海面上，白鸥翻飞。窗台上盛放着红色的秋海棠。
我来到这里，心中时时浮现汝等欢跃活泼之状。亲爱的小读者们，愿你们心中永远充满纯洁、欢愉与光明。保持一分赤子真情，不被俗尘所蒙蔽。
夜已阑，海风徐起，遥祝诸儿吉安。

你们的大朋友 冰心`,
    appreciation: "冰心的《寄小读者》以最真挚的平辈姿态，与青少年谈文学、谈母爱、谈山川宇宙。这封信语气清雅温润，把浓郁的海国秋色融为一句‘愿你们心中永远充满光明’的静默祈福，十分洗练而大美。"
  }
];
