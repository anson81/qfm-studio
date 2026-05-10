export const videoModels = [
  { id: "kling-2.5-turbo", name: "Kling 2.5 Turbo", cost: "~\$0.42/10s", duration: "10s" },
  { id: "veo-3.1-fast", name: "Veo 3.1 Fast", cost: "~\$0.40/8s", duration: "8s" },
  { id: "veo-3.1-quality", name: "Veo 3.1 Quality", cost: "~\$2.00/8s", duration: "8s" },
  { id: "seedance-2.0", name: "Seedance 2.0", cost: "Variable", duration: "Various" },
  { id: "seedance-2.0-fast", name: "Seedance 2.0 Fast", cost: "Variable", duration: "Various" },
  { id: "wan-2.6", name: "Wan 2.6", cost: "~\$0.08-0.12/s", duration: "2s/5s/10s" },
  { id: "hailuo-2.3", name: "Hailuo 2.3", cost: "Variable", duration: "6s/10s" },
  { id: "sora-2-pro", name: "Sora 2 Pro", cost: "Higher", duration: "up to 25s" },
  { id: "grok", name: "Grok", cost: "Variable", duration: "6s/30s" },
] as const;

export const imageModels = [
  { id: "flux-kontext-pro", name: "Flux Kontext Pro", credits: "~5-10" },
  { id: "nano-banana-2", name: "Nano Banana 2 (Gemini)", credits: "~8-18" },
  { id: "nano-banana-pro", name: "Nano Banana Pro", credits: "~24" },
  { id: "gpt-image-2", name: "GPT Image 2", credits: "~12" },
] as const;

export const aspectRatios = [
  { value: "9:16", label: "9:16 (TikTok/Shorts)" },
  { value: "16:9", label: "16:9 (YouTube/FB)" },
  { value: "1:1", label: "1:1 (Instagram/Shopee)" },
] as const;

export const resolutions = [
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
] as const;
