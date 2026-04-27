export const visualStyles = {
  "cinematic": {
    "name": "Cinematic",
    "prompt": "Super realistic cinematic 4K quality, photorealistic, natural lighting with shallow depth of field, professional movie look, hyper-realistic REAL HUMANS"
  },
  "3d-animation": {
    "name": "3D Animation",
    "prompt": "High-quality 3D Pixar animation style, smooth colorful 3D rendered characters with big expressive eyes, Disney Pixar quality, vibrant colors, professional 3D animation"
  },
  "anime": {
    "name": "Anime/Manga",
    "prompt": "Japanese anime manga style, cel-shaded animation, vibrant colors, expressive anime characters, dynamic poses, anime aesthetic with clean lines"
  },
  "bokeh": {
    "name": "Cinematic Bokeh",
    "prompt": "Cinematic depth of field with beautiful bokeh background, f/1.2 wide aperture effect, creamy blurred colorful light circles in background, tack-sharp subject isolation, professional cinema lens quality, warm atmospheric tones, dreamy out-of-focus highlights"
  },
  "claymation": {
    "name": "Claymation",
    "prompt": "Claymation stop-motion animation style, visible clay texture, handcrafted look, Wallace and Gromit aesthetic, warm lighting on clay figures"
  },
  "comic": {
    "name": "Comic Book",
    "prompt": "Comic book pop art style, halftone dots, bold black outlines, vibrant primary colors, action-packed superhero comic aesthetic"
  },
  "cyberpunk": {
    "name": "Cyberpunk",
    "prompt": "Cyberpunk neon futuristic style, purple and cyan neon lights, dystopian atmosphere, Blade Runner aesthetic, high-tech low-life urban setting"
  },
  "disney": {
    "name": "Disney Classic",
    "prompt": "Disney classic 2D hand-drawn animation style, warm fairytale colors, magical atmosphere, traditional animation look, storybook illustration quality"
  },
  "diorama": {
    "name": "Tiny Diorama",
    "prompt": "Tiny diorama scene, handcrafted miniature world, detailed tiny landscape with small figurines, craft materials visible, warm soft lighting, whimsical dollhouse aesthetic, contained scene in a small space"
  },
  "donghua": {
    "name": "Donghua",
    "prompt": "Chinese donghua animation style, elegant flowing traditional robes and hanfu clothing, mystical wuxia xianxia fantasy setting, vibrant rich saturated colors, detailed Chinese ink painting inspired 3D animation, martial arts aesthetic, dramatic cinematic lighting, ethereal magical effects"
  },
  "dslr-4k": {
    "name": "DSLR 4K Photo",
    "prompt": "Ultra-realistic DSLR 4K photograph render, Canon EOS R5 or Nikon Z9 quality, professional studio lighting, razor-sharp detail, perfect exposure, hyper-detailed skin pores and textures, magazine cover quality, photojournalistic realism, professional color science"
  },
  "iphone-cinematic": {
    "name": "iPhone 17 Pro",
    "prompt": "iPhone 17 Pro Cinematic Mode 4K camera, best output realism, Apple ProRes quality, natural cinematic shallow depth of field, golden hour warmth, hyper-realistic real humans with natural skin texture, mobile cinematography masterpiece, photorealistic portrait quality"
  },
  "lens-flare": {
    "name": "Lens Flare Haze",
    "prompt": "Cinematic lens flare and ambient atmospheric haze, dramatic anamorphic light streaks, volumetric god rays streaming through fog, JJ Abrams style lens flares, golden hour haze and mist, ethereal atmospheric mood, warm diffused light wrapping around subjects, professional cinema atmosphere"
  },
  "lego": {
    "name": "Lego",
    "prompt": "Lego brick style animation, colorful Lego minifigures with yellow skin and claw hands, brick-built environment and props, plastic toy texture, bright primary colors, everything made of Lego bricks"
  },
  "minecraft": {
    "name": "Minecraft Block",
    "prompt": "Minecraft blocky voxel style, pixelated cubic characters and environment, block-based world with square textures, retro pixel art gaming aesthetic, 8-bit inspired blocky 3D"
  },
  "miniature": {
    "name": "Miniature",
    "prompt": "Miniature tilt-shift photography style, tiny scaled-down people and objects, extreme shallow depth of field, macro lens effect, realistic model train set aesthetic, everything looks impossibly small"
  },
  "noir": {
    "name": "Film Noir",
    "prompt": "Film noir black and white style, high contrast dramatic shadows, 1940s detective movie aesthetic, moody atmospheric lighting"
  },
  "texture-fidelity": {
    "name": "Texture Fidelity",
    "prompt": "Photorealistic texture fidelity, extreme material detail rendering, visible fabric weave and skin micro-texture, hyper-detailed surfaces at 8K resolution quality, every pore fiber and thread visible, studio lighting revealing textures, macro-level detail on all materials and surfaces"
  },
  "vintage": {
    "name": "Vintage Film",
    "prompt": "Vintage retro film style, 1970s aesthetic with film grain, warm nostalgic faded colors, old camera look, analog photography"
  },
  "watercolor": {
    "name": "Watercolor",
    "prompt": "Watercolor painting style, soft delicate brush strokes, pastel colors, dreamy artistic texture, gentle washes of color"
  }
} as const;
export type VisualStyleId = keyof typeof visualStyles;
export function getVisualStylePrompt(id: VisualStyleId): string { return visualStyles[id]?.prompt || visualStyles.cinematic.prompt; }
