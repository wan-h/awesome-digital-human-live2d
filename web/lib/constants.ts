import * as PROTOCOL from "./protocol";

export const DROPDOWN_DELAY = 500;
export const PUBLIC_SRC_PATH = "/"
// 关于
export const ABOUT_US = `
每天我们都在探索AI如何改变世界，然而这个世界真正的不同是我们每个人看待世界的内心不同。在这样一个科技爆炸的时代里，似乎给AI提供各种提示词的人类才更像是活在提示词下的机器，但每一个你作为生命独一无二的个体，需要的从来都不是AI在统计学下计算的概率结果，而是对这个世界每一次探索的体验。我们想AI不是为了取代工作，不是为了危言耸听，更不是为了制造焦虑，或许AI也能在这感性的世界里让人们更加热爱这个世界？
我们将聚焦于AI如何在一个快节奏的时代放大人们对世界每一次探索的体验。当你想要看一朵花时，AI也可以在生成之后告诉你今天阳光正好，温度适宜，门外公园的一朵小野花正在微风中摇曳盛开。(于是你推开门走向了世界)
AI是爱的中文拼音，AI不是你需要的全部，对这个世界的热爱才是你需要的全部。
愿你沐光而行。
`;
// 语言选项
export const LANUSAGE_ZH = "中文"
export const LANUSAGE_EN = "English"

// url
export const BUSINESS_COOPERATION_URL = "https://light4ai.feishu.cn/share/base/form/shrcnb0d1Au4dvMaswHNGDbUNTR"
export const JOIN_US_URL = "https://light4ai.feishu.cn/share/base/form/shrcn5zSQvM4c8kjK69LXvtdgqh"
export const FEEDBACK_URL = "https://light4ai.feishu.cn/share/base/form/shrcnL4pzrdKlED6oB94nT9Yiyg"
// sentio
export const SENTIO_GUIDE_URL = "https://light4ai.feishu.cn/docx/XmGFd5QJwoBdDox8M7zcAcRJnje"
export const SENTIO_GITHUB_URL = "https://github.com/wan-h/awesome-digital-human-live2d"
export const SENTIO_BACKGROUND_PATH = "sentio/backgrounds/"
export const SENTIO_BACKGROUND_STATIC_PATH = "sentio/backgrounds/static"
export const SENTIO_BACKGROUND_DYNAMIC_PATH = "sentio/backgrounds/dynamic"
export const SENTIO_BACKGROUND_STATIC_IMAGES: string[] = ["夜晚街道.jpg", "赛博朋克.jpg", "火影忍者.jpg", "插画.jpg", "艺术.jpg", "简约.jpg", "抽象.jpg"]
export const SENTIO_BACKGROUND_DYNAMIC_IMAGES: string[] = ["太空站.mp4", "赛博朋克.mp4", "可爱城市.mp4", "悟空.mp4", "火影忍者.mp4", "几何线条.mp4", "公式.mp4"]
export const SENTIO_CHARACTER_PATH = "sentio/characters/"
export const SENTIO_CHARACTER_IP_PATH = "sentio/characters/ip"
export const SENTIO_CHARACTER_FREE_PATH = "sentio/characters/free"
export const SENTIO_CHARACTER_IP_MODELS: string[] = []
export const SENTIO_CHARACTER_FREE_MODELS: string[] = ["HaruGreeter", "Haru", "Kei", "Chitose", "Epsilon", "Hibiki", "Hiyori", "Izumi", "Mao", "Rice", "Shizuku", "Tsumiki"]
export const SENTIO_CHARACTER_DEFAULT = "HaruGreeter"
export const SENTIO_CHARACTER_DEFAULT_PORTRAIT: string = `${SENTIO_CHARACTER_FREE_PATH}/${SENTIO_CHARACTER_DEFAULT}/${SENTIO_CHARACTER_DEFAULT}.png`
export const SENTIO_TTS_PUNC: string[] = ['；', '！', '？', '。', '?']
export const SENTIO_TTS_SENTENCE_LENGTH_MIN = 6
export const SENTIO_RECODER_MIN_TIME: number = 1000 // 1s
export const SENTIO_RECODER_MAX_TIME: number = 30000 // 30s
export const SENTIO_LIPFACTOR_MIN: number = 0.0
export const SENTIO_LIPFACTOR_DEFAULT = 5.0
export const SENTIO_LIPFACTOR_MAX: number = 10.0
export const SENTIO_VOICE_TEST_ZH: string[] = ["今天最浪漫的事就是遇见你。", "你有百般模样，我也会百般喜欢。", "这里什么都好，因为这就是你。"]
export const SENTIO_VOICE_TEST_EN: string[] = ["Someone said you were looking for me?"]
export const SENTIO_CHATMODE_DEFULT = PROTOCOL.CHAT_MODE.DIALOGUE
export const SENTIO_THENE_DEFAULT = PROTOCOL.APP_TYPE.FREEDOM
