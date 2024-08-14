"use client"

import Live2d from "./ui/home/live2d";
import Chatbot from "./ui/home/chatbot";
import { InteractionMode, useInteractionModeStore } from "./lib/store";

export default function Home() {
  const interactionMode = useInteractionModeStore((state) => state.mode)
  const showCharacter = interactionMode != InteractionMode.CHATBOT;
  const showChatbot = interactionMode != InteractionMode.IMMERSIVE;

  return (
      <div className="flex-1 overflow-auto">
        { showCharacter ? <Live2d/> : <></>}
        { showChatbot ? <Chatbot showChatHistory={true}/> : <></>}
      </div>
  );
}
