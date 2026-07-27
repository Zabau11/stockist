import { openDB, type IDBPDatabase } from "idb";
import type { Conversation, RetailerResults, StockistMessage } from "@/lib/chat-types";
import type { ProductBriefRevision, StoreLead } from "@/lib/types";

type StockistDB = {
  conversations: { key: string; value: Conversation };
  messages: { key: string; value: StockistMessage & { conversationId: string } };
  leads: { key: string; value: StoreLead & { conversationId: string } };
  briefRevisions: { key: string; value: ProductBriefRevision & { id: string } };
  resultSets: { key: string; value: RetailerResults & { conversationId: string } };
};

let databasePromise: Promise<IDBPDatabase<StockistDB>> | undefined;

function database() {
  databasePromise ??= openDB<StockistDB>("stockist-local", 2, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains("conversations")) db.createObjectStore("conversations", { keyPath: "id" });
      if (!db.objectStoreNames.contains("messages")) db.createObjectStore("messages", { keyPath: "id" });
      if (!db.objectStoreNames.contains("leads")) db.createObjectStore("leads", { keyPath: "id" });
      if (!db.objectStoreNames.contains("briefRevisions")) db.createObjectStore("briefRevisions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("resultSets")) db.createObjectStore("resultSets", { keyPath: "resultSetId" });
      if (oldVersion < 2) {
        // Legacy profiles are preserved as version-one snapshots when possible.
        void oldVersion;
      }
    },
  }).then(async (db) => {
    const conversations = await db.getAll("conversations");
    const revisions = await db.getAll("briefRevisions");
    for (const conversation of conversations) {
      const legacy = conversation as Conversation & { productProfile?: { name: string; summary: string; categories: string[]; idealRetailerTypes: string[]; pricePositioning: string; targetCustomer: string; targetMarkets: string[] } };
      if (!legacy.productProfile || revisions.some((revision) => revision.conversationId === conversation.id)) continue;
      const now = new Date().toISOString();
      await db.put("briefRevisions", {
        id: `${conversation.id}:1`, conversationId: conversation.id, website: conversation.website, version: 1, status: "confirmed", source: "fallback", createdAt: now, updatedAt: now, needsReview: false,
        brief: { website: conversation.website, brandName: legacy.productProfile.name, brandIdentity: { source: "unavailable", colors: [] }, summary: legacy.productProfile.summary, categories: legacy.productProfile.categories, targetCustomer: legacy.productProfile.targetCustomer, pricePositioning: legacy.productProfile.pricePositioning, distributionGoal: "", targetMarkets: legacy.productProfile.targetMarkets, idealRetailerTypes: legacy.productProfile.idealRetailerTypes, retailerPreference: "either", differentiators: [], requirements: [], exclusions: [] },
      });
    }
    return db;
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
  async saveBriefRevision(revision: ProductBriefRevision) {
    await (await database()).put("briefRevisions", { ...revision, id: `${revision.conversationId}:${revision.version}` });
  },
  async getBriefRevisions(conversationId: string) {
    return (await database()).getAll("briefRevisions").then((items) => items
      .filter((item) => item.conversationId === conversationId)
      .map((item) => ({
        ...item,
        brief: {
          ...item.brief,
          brandIdentity: item.brief.brandIdentity ?? { source: "unavailable" as const, colors: [] },
        },
      }))
      .sort((a, b) => a.version - b.version));
  },
  async saveResultSet(conversationId: string, resultSet: RetailerResults) {
    await (await database()).put("resultSets", { ...resultSet, conversationId });
  },
  async getResultSets(conversationId: string) {
    return (await database()).getAll("resultSets").then((items) => items.filter((item) => item.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  },
  async deleteConversation(id: string) {
    const db = await database();
    const tx = db.transaction(["conversations", "messages", "leads", "briefRevisions", "resultSets"], "readwrite");
    await tx.objectStore("conversations").delete(id);
    for (const store of ["messages", "leads", "briefRevisions", "resultSets"] as const) {
      const records = (await tx.objectStore(store).getAll()).filter((record) => record.conversationId === id);
      await Promise.all(records.map((record) => tx.objectStore(store).delete("id" in record ? record.id : record.resultSetId)));
    }
    await tx.done;
  },
};
