export const MESSAGE_CHANNELS = ["email", "whatsapp"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const CHANNEL_LABELS: Record<MessageChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
};

export function isChannel(v: string): v is MessageChannel {
  return MESSAGE_CHANNELS.includes(v as MessageChannel);
}
