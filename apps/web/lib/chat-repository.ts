import { openDB, type IDBPDatabase } from "idb";
import type { Conversation, StockistMessage } from "@/lib/chat-types";
import type { StoreLead } from "@/lib/types";

type StockistDB = {
  conversations: { key: string; value: Conversation };
  messages: { key: string; value: StockistMessage & { conversationId: string } };
  leads: { key: string; value: StoreLead & { conversationId: string } };
};

let databasePromise: Promise<IDBPDatabase<StockistDB>> | undefined;

function database() {
  databasePromise ??= openDB<StockistDB>("stockist-local", 1, {
    upgrade(db) {
      db.createObjectStore("conversations", { keyPath: "id" });
      db.createObjectStore("messages", { keyPath: "id" });
      db.createObjectStore("leads", { keyPath: "id" });
    },
  });
  return databasePromise;
}

export const chatRepository = {
  async listConversations() {
    return (await database()).getAll("conversations");
  },
  async getConversation(id: string) {
    return (await database()).get("conversations", id);
  },
  async saveConversation(conversation: Conversation) {
    await (await database()).put("conversations", conversation);
  },
  async getMessages(id: string) {
    return (await database()).getAll("messages").then((messages) => messages.filter((message) => message.conversationId === id));
  },
  async saveMessages(id: string, messages: StockistMessage[]) {
    const db = await database();
    const tx = db.transaction("messages", "readwrite");
    const existing = (await tx.store.getAll()).filter((message) => message.conversationId === id);
    await Promise.all(existing.map((message) => tx.store.delete(message.id)));
    await Promise.all(messages.map((message) => tx.store.put({ ...message, conversationId: id })));
    await tx.done;
  },
  async saveLeads(id: string, leads: StoreLead[]) {
    const db = await database();
    const tx = db.transaction("leads", "readwrite");
    await Promise.all(leads.map((lead) => tx.store.put({ ...lead, conversationId: id })));
    await tx.done;
  },
  async deleteConversation(id: string) {
    const db = await database();
    const tx = db.transaction(["conversations", "messages", "leads"], "readwrite");
    await tx.objectStore("conversations").delete(id);
    for (const store of ["messages", "leads"] as const) {
      const records = (await tx.objectStore(store).getAll()).filter((record) => record.conversationId === id);
      await Promise.all(records.map((record) => tx.objectStore(store).delete(record.id)));
    }
    await tx.done;
  },
};
