"use client";

import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";

interface SocialCtaBarProps {
  whatsappUrl?: string;
  telegramUrl?: string;
}

export function SocialCtaBar({
  whatsappUrl = "https://whatsapp.com/channel/fresherportal",
  telegramUrl = "https://t.me/fresherportal",
}: SocialCtaBarProps) {
  return (
    <div className="bg-gradient-to-r from-[#0F1729]/[0.03] to-[#1F7A5C]/[0.05] border border-[#E4E1D9] rounded-lg px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-3">
      <span className="text-xs font-semibold text-[#4B5768]">
        Get instant job alerts →
      </span>
      <div className="flex items-center gap-2.5">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white text-xs font-bold rounded-lg hover:bg-[#1fba59] transition-all hover:scale-[1.02] shadow-sm"
          >
            <MessageCircle size={14} />
            Join WhatsApp
          </a>
        )}
        {telegramUrl && (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0088cc] text-white text-xs font-bold rounded-lg hover:bg-[#006da3] transition-all hover:scale-[1.02] shadow-sm"
          >
            <Send size={14} />
            Join Telegram
          </a>
        )}
      </div>
    </div>
  );
}
