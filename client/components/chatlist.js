import { loadConversations } from "../pages/Messages.js";

export async function renderChatList() {
    await loadConversations(false)
}