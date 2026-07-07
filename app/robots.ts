import type { MetadataRoute } from "next";

// Blocca tutto per default (motori di ricerca, AI crawler come GPTBot,
// ClaudeBot, CCBot, Google-Extended, PerplexityBot, ecc.), ma lascia
// passare i bot che generano le anteprime dei link nelle chat.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: [
          "facebookexternalhit",
          "Facebot",
          "Twitterbot",
          "Slackbot",
          "Slackbot-LinkExpanding",
          "TelegramBot",
          "WhatsApp",
          "LinkedInBot",
          "Discordbot",
          "SkypeUriPreview",
          "redditbot",
          "vkShare",
        ],
        allow: "/",
      },
    ],
  };
}
