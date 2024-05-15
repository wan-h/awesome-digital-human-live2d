export class CharacterManager {
    // 单例
    public static getInstance(): CharacterManager {
        if (! this._instance) {
            this._instance = new CharacterManager();
        }

        return this._instance;
    }

    public getIntro(profession: string, name: string): string {
        switch(profession) {
            case "心理师":
                switch(name) {
                    case "Kei":
                        return "Kei拥有深厚的人类心理学知识，她擅长倾听和理解，能够耐心倾听你的故事，然后给你的故事画上完美的句号。"
                    default:
                        return "暂不支持该角色定义"
                }
            case "女友":
                switch(name) {
                    case "Haru":
                        return "Haru温柔体贴，每天操持着各种家务，她喜欢你，在所有的时候，她也喜欢有些人，在他们像你的时候。"
                    default:
                    return "暂不支持该角色定义"
                }
            default:
                return "暂不支持素人的角色定义"
        }
    }
    
    private static _instance: CharacterManager;
}