import { Live2dManager } from "@/lib/live2d/live2dManager";
import { useSentioLive2DStore } from "@/lib/store/sentio";
import { ResourceModel } from "@/lib/protocol";

export const useLive2D = () => {
    const { ready, setReady } = useSentioLive2DStore();

    const checkLive2DReady = () => {
        if (Live2dManager.getInstance().isReady()) {
            setReady(true);
        } else {
            setTimeout(checkLive2DReady, 1000);
        }
    }

    const setLive2dCharacter = (character: ResourceModel| null) => {
        Live2dManager.getInstance().changeCharacter(character);
        if (character != null) {
            setReady(false);
            checkLive2DReady();
        }

    };

    return {
        setLive2dCharacter,
        ready,
    };
}