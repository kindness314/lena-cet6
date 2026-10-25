import type { ExtraArtId, Scene } from "../core/scenes";
import { mountArt } from "./art";
import { EXTRA_ART } from "./scene-art-extra";

function frame(scene: Scene, art: string): string {
  const id = scene.id;
  return `<svg viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice" class="scene-svg" aria-hidden="true">
    <defs>
      <linearGradient id="sky-${id}" x1="0" y1="0" x2="0.85" y2="1">
        <stop offset="0" style="stop-color:var(--scene-a)" stop-opacity=".72"/>
        <stop offset=".55" style="stop-color:var(--scene-b)" stop-opacity=".42"/>
        <stop offset="1" stop-color="#0d0a12" stop-opacity=".94"/>
      </linearGradient>
      <radialGradient id="glow-${id}" cx="50%" cy="50%" r="50%">
        <stop offset="0" style="stop-color:var(--scene-a)" stop-opacity=".46"/>
        <stop offset="1" style="stop-color:var(--scene-a)" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="haze-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b0810" stop-opacity="0"/>
        <stop offset="1" stop-color="#0b0810" stop-opacity=".68"/>
      </linearGradient>
    </defs>
    <rect width="360" height="220" fill="#100c16"/>
    <rect width="360" height="220" fill="url(#sky-${id})"/>
    <circle cx="302" cy="48" r="72" fill="url(#glow-${id})"/>
    ${art}
    <rect y="128" width="360" height="92" fill="url(#haze-${id})"/>
  </svg>`;
}

function stars(): string {
  const points = [
    [36, 36, 1.4], [66, 62, 1], [96, 28, 1.7], [128, 48, 1.1], [160, 20, 1.3],
    [192, 55, 1], [226, 30, 1.5], [252, 70, 1.2], [286, 24, 1], [318, 58, 1.6],
    [342, 34, 1], [118, 76, 1], [206, 84, 1.3], [270, 88, 1],
  ];
  return points
    .map(
      ([x, y, r], i) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${i % 3 === 0 ? ".92" : ".62"}"/>
         ${i % 4 === 0 ? `<path d="M${x - 4} ${y} h8 M${x} ${y - 4} v8" stroke="#fff" stroke-opacity=".3" stroke-width=".7"/>` : ""}`,
    )
    .join("");
}

function rain(count: number, y0 = 0, height = 120): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = (i * 41 + 13) % 360;
    const y = y0 + ((i * 27) % height);
    out += `<path d="M${x} ${y} l-3 11" stroke="#dfe8f2" stroke-width="1" opacity=".26"/>`;
  }
  return out;
}

function bookshop(): string {
  return `${rain(24, 0, 150)}
    <rect x="18" y="52" width="92" height="138" rx="3" fill="#241a25" opacity=".9"/>
    <rect x="26" y="64" width="76" height="7" fill="#6f4c55"/>
    <rect x="26" y="88" width="76" height="7" fill="#4e6470"/>
    <rect x="26" y="112" width="76" height="7" fill="#7c6252"/>
    <rect x="26" y="136" width="76" height="7" fill="#5b4e70"/>
    <g fill="#d8b6a2" opacity=".72">
      <rect x="30" y="74" width="7" height="12"/><rect x="41" y="73" width="5" height="13"/>
      <rect x="50" y="76" width="8" height="10"/><rect x="63" y="72" width="6" height="14"/>
      <rect x="74" y="75" width="9" height="11"/><rect x="88" y="74" width="5" height="12"/>
      <rect x="30" y="98" width="6" height="12"/><rect x="40" y="96" width="9" height="14"/>
      <rect x="55" y="99" width="6" height="11"/><rect x="67" y="97" width="7" height="13"/>
      <rect x="80" y="99" width="5" height="11"/><rect x="90" y="96" width="8" height="14"/>
    </g>
    <path d="M250 0 v58" stroke="#d9b98f" stroke-width="3"/>
    <path d="M232 58 h36 l-8 22 h-20 Z" fill="#e0b77c" opacity=".9"/>
    <ellipse cx="250" cy="82" rx="30" ry="12" fill="url(#glow-rain-bookshop)" opacity=".7"/>
    <path d="M150 170 h120 v8 h-120 Z" fill="#2a1c24"/>
    <path d="M166 170 c8 -38 24 -38 32 0" fill="#3b2831"/>
    <path d="M236 170 c8 -30 20 -30 28 0" fill="#33232b"/>
    <rect x="226" y="148" width="14" height="21" rx="2" fill="#d7b18d" opacity=".85"/>
    <path d="M282 158 q20 -10 26 6 q-16 8 -26 -6" fill="#6d8a78" opacity=".8"/>`;
}

function attic(): string {
  return `<path d="M0 0 H360 V96 L250 152 H110 L0 96 Z" fill="#120e18" opacity=".82"/>
    <path d="M0 0 L110 96 H0 Z" fill="#201722" opacity=".76"/>
    <path d="M360 0 L250 96 H360 Z" fill="#201722" opacity=".76"/>
    <rect x="136" y="30" width="88" height="72" rx="2" fill="#1b2330" stroke="#9b8271" stroke-opacity=".5"/>
    <path d="M180 30 V102 M136 66 H224" stroke="#9b8271" stroke-opacity=".5"/>
    <circle cx="214" cy="47" r="14" fill="#d9c9a5" opacity=".5"/>
    <g fill="#e8d7b5" opacity=".3">
      <circle cx="86" cy="116" r="2"/><circle cx="102" cy="132" r="1.4"/><circle cx="74" cy="144" r="1.7"/>
      <circle cx="300" cy="112" r="1.5"/><circle cx="318" cy="136" r="2.2"/><circle cx="276" cy="148" r="1.2"/>
    </g>
    <path d="M126 166 l44 -14 l46 14 l-46 22 Z" fill="#e7d8ba" opacity=".85"/>
    <path d="M126 166 l44 12 l46 -12" fill="none" stroke="#b39b7a" stroke-width="1.2"/>
    <rect x="70" y="154" width="58" height="46" fill="#352631"/>
    <rect x="78" y="148" width="42" height="8" fill="#4a3540"/>
    <rect x="240" y="160" width="52" height="40" fill="#2c222c"/>
    <rect x="248" y="154" width="36" height="7" fill="#45323b"/>
    <path d="M158 14 q22 24 8 48" stroke="#d9c9a5" stroke-width="1" opacity=".24" fill="none"/>`;
}

function cafe(): string {
  return `${rain(18, 20, 110)}
    <rect x="38" y="38" width="116" height="104" rx="3" fill="#17212a" opacity=".82"/>
    <path d="M96 38 V142 M38 90 H154" stroke="#9b8271" stroke-opacity=".45"/>
    <g fill="#c99a82" opacity=".2">
      <circle cx="63" cy="62" r="2"/><circle cx="138" cy="118" r="1.4"/><circle cx="76" cy="120" r="1.2"/>
    </g>
    <path d="M232 0 v44" stroke="#c9a477" stroke-width="2.5"/>
    <path d="M212 44 h40 l-7 18 h-26 Z" fill="#d4a267" opacity=".95"/>
    <ellipse cx="232" cy="68" rx="34" ry="14" fill="url(#glow-closing-cafe)" opacity=".75"/>
    <path d="M188 156 h116 v7 h-116 Z" fill="#33232b"/>
    <path d="M224 128 h28 v20 h-28 Z" fill="#c8a88d" opacity=".72"/>
    <path d="M252 132 q14 -2 12 8 q-3 8 -12 5" fill="none" stroke="#c8a88d" stroke-width="3" opacity=".7"/>
    <path d="M212 149 h58" stroke="#c8a88d" stroke-width="2" opacity=".55"/>
    <path d="M176 190 c4 -34 18 -34 24 0" fill="#241a23"/>
    <path d="M292 190 c4 -30 17 -30 24 0" fill="#241a23"/>
    <path d="M218 115 q8 -10 20 0" fill="none" stroke="#e7d6c2" stroke-width="1.2" opacity=".35"/>`;
}

function rooftop(): string {
  return `${stars()}
    <circle cx="286" cy="48" r="18" fill="#f4e5c7" opacity=".9"/>
    <circle cx="292" cy="43" r="17" fill="#1a1730" opacity=".55"/>
    <path d="M0 160 H46 V126 H72 V142 H104 V112 H128 V150 H160 V120 H186 V138 H220 V104 H248 V144 H276 V118 H304 V152 H332 V128 H360 V220 H0 Z" fill="#1a1422" opacity=".92"/>
    <g fill="#e9c98f" opacity=".7">
      <rect x="55" y="152" width="3" height="5"/><rect x="82" y="152" width="4" height="4"/>
      <rect x="142" y="158" width="3" height="4"/><rect x="230" y="150" width="4" height="5"/>
      <rect x="316" y="162" width="3" height="4"/>
    </g>
    <path d="M0 190 H360" stroke="#8ca6b8" stroke-width="2" opacity=".5"/>
    <path d="M26 190 V166 M86 190 V166 M146 190 V166 M206 190 V166 M266 190 V166 M326 190 V166" stroke="#8ca6b8" stroke-width="1.4" opacity=".36"/>
    <path d="M0 166 H360" stroke="#8ca6b8" stroke-width="1.4" opacity=".36"/>
    <path d="M106 204 q34 -12 68 0 q-34 8 -68 0" fill="#d4a4a9" opacity=".5"/>`;
}

function observatory(): string {
  return `${stars()}
    <path d="M46 220 A134 134 0 0 1 180 86 A134 134 0 0 1 314 220 Z" fill="#171222" opacity=".92"/>
    <path d="M180 86 A134 134 0 0 1 314 220 H180 Z" fill="#1d1829" opacity=".7"/>
    <path d="M180 86 L210 62 L224 220 H180 Z" fill="#0f0b16" opacity=".9"/>
    <g stroke="#9a8fb8" stroke-width="2" opacity=".6">
      <path d="M162 220 L180 132 L200 220"/><path d="M170 182 H194"/>
    </g>
    <path d="M150 132 L212 108" stroke="#c9b9df" stroke-width="8" stroke-linecap="round" opacity=".8"/>
    <path d="M212 108 L224 102" stroke="#e4d3ff" stroke-width="12" stroke-linecap="round" opacity=".55"/>
    <circle cx="226" cy="100" r="7" fill="#fff" opacity=".8"/>
    <path d="M226 100 L296 78" stroke="#e4d3ff" stroke-width="2" opacity=".3"/>
    <path d="M0 220 H360" stroke="#0b0810" stroke-width="20" opacity=".35"/>`;
}

function dawn(): string {
  return `<circle cx="278" cy="154" r="48" fill="#f0c48d" opacity=".42"/>
    <circle cx="278" cy="154" r="24" fill="#f6d9a8" opacity=".8"/>
    <path d="M0 176 C60 142 96 154 140 164 C188 175 224 138 280 150 C310 157 336 170 360 164 V220 H0 Z" fill="#3a3038" opacity=".8"/>
    <path d="M0 198 C60 172 120 184 180 190 C242 196 300 174 360 184 V220 H0 Z" fill="#211b24" opacity=".9"/>
    <path d="M0 164 C70 150 126 166 180 160 C248 152 304 140 360 156" stroke="#e8c6a0" stroke-opacity=".35" fill="none"/>
    <g fill="#e8d9d2" opacity=".5">
      <path d="M52 102 q18 -8 34 0 q-16 6 -34 0"/><path d="M244 88 q22 -8 40 0 q-18 7 -40 0"/>
    </g>
    <g stroke="#1f1820" stroke-width="1.4" opacity=".55" fill="none">
      <path d="M210 74 q6 -5 12 0 q-6 4 -12 0"/><path d="M230 62 q4 -4 9 0 q-5 3 -9 0"/>
    </g>
    <path d="M14 220 C32 206 54 208 72 220 Z" fill="#17131b" opacity=".6"/>
    <path d="M310 220 C326 202 344 204 360 218 Z" fill="#17131b" opacity=".55"/>`;
}

function train(): string {
  return `<rect width="360" height="220" fill="#0d1118" opacity=".4"/>
    <rect x="42" y="34" width="132" height="104" rx="8" fill="#131c26" stroke="#8ca6b8" stroke-opacity=".45"/>
    <rect x="196" y="34" width="122" height="104" rx="8" fill="#131c26" stroke="#8ca6b8" stroke-opacity=".4"/>
    <g stroke="#d9c7a3" stroke-width="2" opacity=".5">
      <path d="M0 30 H360"/><path d="M0 86 H360"/>
    </g>
    <g fill="#d9b06a" opacity=".8">
      <rect x="58" y="48" width="6" height="18" rx="2"/><rect x="150" y="48" width="6" height="18" rx="2"/>
    </g>
    <g stroke="#dce9f2" stroke-width="1" opacity=".3">
      <path d="M64 106 l-10 24 M92 106 l-10 24 M120 106 l-10 24 M148 106 l-10 24"/>
      <path d="M214 106 l-10 24 M242 106 l-10 24 M270 106 l-10 24 M298 106 l-10 24"/>
    </g>
    <path d="M0 170 H360" stroke="#6a7f8e" stroke-width="3" opacity=".5"/>
    <path d="M0 184 H360" stroke="#6a7f8e" stroke-width="2" opacity=".3"/>
    <path d="M22 170 L0 220 M86 170 L74 220 M150 170 L140 220 M214 170 L206 220 M278 170 L272 220 M342 170 L338 220" stroke="#6a7f8e" stroke-width="2" opacity=".22"/>
    <path d="M244 142 h48" stroke="#c97963" stroke-width="2" opacity=".55"/>`;
}

function market(): string {
  return `<path d="M0 44 Q90 84 180 54 Q270 24 360 58" fill="none" stroke="#d9b06a" stroke-width="1" opacity=".45"/>
    <g fill="#e3b66e">
      <circle cx="48" cy="58" r="9" opacity=".85"/><circle cx="98" cy="70" r="7" opacity=".7"/>
      <circle cx="144" cy="64" r="10" opacity=".9"/><circle cx="210" cy="50" r="8" opacity=".75"/>
      <circle cx="268" cy="42" r="11" opacity=".85"/><circle cx="320" cy="52" r="7" opacity=".7"/>
    </g>
    <g fill="#f4d49a" opacity=".25">
      <circle cx="48" cy="58" r="22"/><circle cx="144" cy="64" r="24"/><circle cx="268" cy="42" r="26"/>
    </g>
    <path d="M0 150 H360 V220 H0 Z" fill="#1b1420" opacity=".76"/>
    <g fill="#2d202b">
      <rect x="24" y="146" width="92" height="12"/><rect x="34" y="158" width="6" height="42"/><rect x="100" y="158" width="6" height="42"/>
      <rect x="132" y="154" width="104" height="10"/><rect x="144" y="164" width="5" height="38"/><rect x="220" y="164" width="5" height="38"/>
      <rect x="252" y="150" width="84" height="11"/><rect x="262" y="161" width="5" height="40"/><rect x="322" y="161" width="5" height="40"/>
    </g>
    <g fill="#c97963" opacity=".7">
      <circle cx="52" cy="138" r="5"/><circle cx="74" cy="134" r="4"/><circle cx="96" cy="140" r="5"/>
      <circle cx="176" cy="142" r="4"/><circle cx="198" cy="136" r="5"/><circle cx="284" cy="138" r="5"/>
    </g>
    <g fill="#19121c" opacity=".9">
      <circle cx="142" cy="184" r="8"/><path d="M132 220 v-26 q10 -8 20 0 v26 Z"/>
      <circle cx="184" cy="188" r="7"/><path d="M175 220 v-24 q9 -7 18 0 v24 Z"/>
      <circle cx="300" cy="186" r="7"/><path d="M291 220 v-25 q9 -7 18 0 v25 Z"/>
    </g>`;
}

function cinema(): string {
  return `<rect x="42" y="24" width="276" height="118" rx="4" fill="#12101a" stroke="#d9b06a" stroke-opacity=".35"/>
    <rect x="54" y="36" width="252" height="94" fill="#202033"/>
    <path d="M54 36 h252 v94 h-252 Z" fill="url(#glow-old-cinema)" opacity=".38"/>
    <path d="M54 120 q60 -30 126 -6 q64 24 126 -10" stroke="#e3c18f" stroke-width="1" opacity=".35" fill="none"/>
    <path d="M0 0 L86 128 L110 128 L30 0 Z" fill="#e8dfc9" opacity=".08"/>
    <path d="M0 0 L360 0 L360 18 L0 18 Z" fill="#17111d" opacity=".8"/>
    <g fill="#2a1e2b">
      <path d="M12 220 v-44 q16 -12 32 0 v44 Z"/><path d="M56 220 v-44 q16 -12 32 0 v44 Z"/>
      <path d="M100 220 v-44 q16 -12 32 0 v44 Z"/><path d="M144 220 v-44 q16 -12 32 0 v44 Z"/>
      <path d="M188 220 v-44 q16 -12 32 0 v44 Z"/><path d="M232 220 v-44 q16 -12 32 0 v44 Z"/>
      <path d="M276 220 v-44 q16 -12 32 0 v44 Z"/><path d="M320 220 v-44 q14 -11 28 0 v44 Z"/>
    </g>
    <g fill="#c9a477" opacity=".55">
      <circle cx="22" cy="194" r="3"/><circle cx="66" cy="194" r="3"/><circle cx="154" cy="194" r="3"/><circle cx="242" cy="194" r="3"/><circle cx="330" cy="194" r="3"/>
    </g>`;
}

function radio(): string {
  return `<rect x="22" y="28" width="150" height="100" rx="4" fill="#14212a" opacity=".8"/>
    <path d="M22 84 q38 -14 76 0 q38 14 74 0" stroke="#d9b06a" stroke-width="1.4" fill="none" opacity=".5"/>
    <path d="M22 102 q38 -12 76 0 q38 12 74 0" stroke="#d9b06a" stroke-width="1" fill="none" opacity=".3"/>
    <circle cx="286" cy="48" r="20" fill="#f0d39c" opacity=".45"/>
    <rect x="196" y="142" width="140" height="8" rx="3" fill="#33232b"/>
    <path d="M224 142 V116 q0 -12 12 -12 h20 q12 0 12 12 v26" fill="#241b28"/>
    <circle cx="246" cy="94" r="12" fill="#6f5d72" stroke="#c9b9df" stroke-width="1"/>
    <path d="M264 94 q22 0 22 22" fill="none" stroke="#d9b06a" stroke-width="2" opacity=".6"/>
    <path d="M264 104 q12 0 12 12" fill="none" stroke="#d9b06a" stroke-width="2" opacity=".45"/>
    <g stroke="#e4d3ff" stroke-width="1" opacity=".4" fill="none">
      <path d="M196 60 q-24 20 0 40"/><path d="M186 48 q-42 32 0 64"/>
    </g>
    <rect x="38" y="152" width="110" height="6" rx="3" fill="#33232b"/>
    <g fill="#c97963" opacity=".6">
      <circle cx="58" cy="134" r="4"/><circle cx="76" cy="140" r="3"/><circle cx="104" cy="136" r="5"/>
    </g>`;
}

function lighthouse(): string {
  return `${stars()}
    <path d="M0 168 Q60 154 120 166 Q180 178 240 162 Q300 148 360 164 V220 H0 Z" fill="#10202a" opacity=".9"/>
    <path d="M0 184 Q60 172 120 182 Q180 192 240 178 Q300 166 360 180 V220 H0 Z" fill="#0b151c" opacity=".9"/>
    <path d="M272 220 L278 86 H306 L314 220 Z" fill="#241f2a"/>
    <path d="M282 86 H302 L300 104 H284 Z" fill="#d9b06a" opacity=".9"/>
    <path d="M286 116 h12 v14 h-12 Z" fill="#f4d49a" opacity=".8"/>
    <path d="M282 148 h20 v12 h-20 Z" fill="#f4d49a" opacity=".65"/>
    <path d="M278 74 H306 L302 86 H282 Z" fill="#4a3b3d"/>
    <path d="M302 90 L360 68 V96 Z" fill="#f4d49a" opacity=".16"/>
    <path d="M278 90 L150 112 V136 Z" fill="#f4d49a" opacity=".1"/>
    <circle cx="292" cy="90" r="5" fill="#fff" opacity=".85"/>
    <path d="M0 204 Q50 192 100 202 Q150 212 200 200 Q250 190 300 202 Q330 208 360 200" stroke="#6a8f9a" stroke-width="1" fill="none" opacity=".35"/>`;
}

function glasshouse(): string {
  return `<path d="M30 220 V66 L180 12 L330 66 V220 Z" fill="#12201d" opacity=".72"/>
    <path d="M30 66 L180 12 L330 66 M30 110 H330 M30 154 H330 M30 198 H330 M106 40 V220 M180 12 V220 M254 40 V220" stroke="#b8d4c1" stroke-opacity=".28" fill="none"/>
    <circle cx="288" cy="44" r="18" fill="#f0d39c" opacity=".4"/>
    <g fill="#5f9a88" opacity=".7">
      <path d="M58 220 q-10 -64 24 -86 q12 44 -2 86 Z"/>
      <path d="M86 220 q-6 -42 18 -60 q8 30 0 60 Z" opacity=".8"/>
      <path d="M282 220 q-8 -74 26 -96 q14 52 -2 96 Z"/>
      <path d="M254 220 q-4 -34 16 -50 q6 26 0 50 Z" opacity=".8"/>
    </g>
    <g fill="#c77b8d" opacity=".8">
      <circle cx="72" cy="156" r="7"/><circle cx="86" cy="142" r="5"/><circle cx="302" cy="142" r="8"/><circle cx="286" cy="158" r="5"/>
    </g>
    <path d="M150 220 v-34 h48 v34" fill="#2a2028"/>
    <path d="M158 186 h32" stroke="#d9b06a" stroke-width="2" opacity=".55"/>
    <path d="M168 186 q0 -22 12 -22 q12 0 12 22" fill="#5f9a88" opacity=".55"/>
    <g fill="#e8d9d2" opacity=".22"><circle cx="198" cy="100" r="2"/><circle cx="220" cy="124" r="1.4"/><circle cx="160" cy="128" r="1.2"/></g>`;
}


function store(): string {
  return `${rain(16, 0, 120)}
    <rect x="20" y="30" width="320" height="120" rx="4" fill="#161c22" opacity=".82"/>
    <g stroke="#cfe3ef" stroke-width="1.4" opacity=".34">
      <path d="M68 32 V66 M148 32 V66 M228 32 V66 M308 32 V66"/>
    </g>
    <g fill="#dfeaf3" opacity=".5">
      <rect x="58" y="66" width="20" height="4" rx="2"/><rect x="138" y="66" width="20" height="4" rx="2"/>
      <rect x="218" y="66" width="20" height="4" rx="2"/><rect x="298" y="66" width="20" height="4" rx="2"/>
    </g>
    <g fill="#f0f6fa" opacity=".1">
      <path d="M58 70 L40 152 H82 Z"/><path d="M138 70 L120 152 H162 Z"/>
      <path d="M218 70 L200 152 H242 Z"/><path d="M298 70 L280 152 H322 Z"/>
    </g>
    <g fill="#22282f">
      <rect x="28" y="96" width="86" height="8" rx="2"/><rect x="28" y="128" width="86" height="8" rx="2"/>
      <rect x="128" y="96" width="86" height="8" rx="2"/><rect x="128" y="128" width="86" height="8" rx="2"/>
    </g>
    <g fill="#b9748a" opacity=".75">
      <rect x="34" y="86" width="7" height="10" rx="2"/><rect x="46" y="88" width="7" height="8" rx="2"/>
      <rect x="134" y="86" width="7" height="10" rx="2"/><rect x="146" y="88" width="7" height="8" rx="2"/>
    </g>
    <g fill="#7fb2c4" opacity=".6">
      <rect x="58" y="118" width="7" height="10" rx="2"/><rect x="70" y="120" width="7" height="8" rx="2"/>
      <rect x="158" y="118" width="7" height="10" rx="2"/>
    </g>
    <rect x="236" y="102" width="104" height="52" rx="5" fill="#1d232b" stroke="#cfe3ef" stroke-opacity=".2"/>
    <rect x="246" y="112" width="42" height="26" rx="3" fill="#2b3540"/>
    <path d="M252 128 h30" stroke="#8fd6c4" stroke-width="2" opacity=".7"/>
    <path d="M0 160 Q90 150 180 158 Q270 166 360 156 V220 H0 Z" fill="#1a1f26" opacity=".92"/>
    <g stroke="#dfeaf3" stroke-width="1" opacity=".2">
      <path d="M0 186 H360"/><path d="M0 206 H360"/>
    </g>
    <path d="M0 168 Q60 160 120 168" stroke="#b9748a" stroke-width="1.4" fill="none" opacity=".35"/>`;
}

function tower(): string {
  return `${stars()}
    <path d="M0 176 Q90 160 180 170 Q270 180 360 164 V220 H0 Z" fill="#141a22" opacity=".9"/>
    <g fill="#e3b66e" opacity=".55">
      <circle cx="42" cy="186" r="2"/><circle cx="86" cy="192" r="1.6"/><circle cx="140" cy="188" r="2.2"/>
      <circle cx="212" cy="196" r="1.6"/><circle cx="300" cy="190" r="2"/><circle cx="336" cy="198" r="1.6"/>
    </g>
    <g transform="translate(64,-12)">
      <path d="M148 220 L152 92 H208 L212 220 Z" fill="#1c2230"/>
      <path d="M148 92 H212 L204 70 H156 Z" fill="#242b3a"/>
      <path d="M156 70 L180 24 L204 70 Z" fill="#2b3346"/>
      <circle cx="180" cy="108" r="20" fill="#0f131b" opacity=".96"/>
      <circle cx="180" cy="108" r="20" fill="none" stroke="#f4d49a" stroke-width="1.6" opacity=".55"/>
      <path d="M180 108 V95 M180 108 L189 113" stroke="#f4d49a" stroke-width="2" stroke-linecap="round" opacity=".85"/>
      <g fill="#f4d49a" opacity=".5">
        <rect x="164" y="146" width="10" height="14" rx="2"/><rect x="186" y="164" width="10" height="14" rx="2"/>
        <rect x="164" y="186" width="10" height="14" rx="2"/>
      </g>
      <path d="M180 24 V8" stroke="#e3b66e" stroke-width="1.6" opacity=".5"/>
      <circle cx="180" cy="6" r="3" fill="#f4d49a" opacity=".8"/>
      <path d="M152 92 L126 130 V220" stroke="#1c2230" stroke-width="9" fill="none" opacity=".85"/>
    </g>
    <path d="M0 200 Q80 190 160 198 Q250 208 360 194 V220 H0 Z" fill="#101620" opacity=".92"/>`;
}

function records(): string {
  return `<rect x="0" y="0" width="360" height="220" fill="#1a1418" opacity=".55"/>
    <rect x="18" y="40" width="118" height="126" rx="3" fill="#221a1e" stroke="#d9b06a" stroke-opacity=".22"/>
    <rect x="124" y="52" width="118" height="114" rx="3" fill="#1f181c" stroke="#d9b06a" stroke-opacity=".16"/>
    <rect x="250" y="46" width="94" height="120" rx="3" fill="#221a1e" stroke="#d9b06a" stroke-opacity=".2"/>
    <g fill="#8e6f68" opacity=".85">
      <rect x="26" y="50" width="8" height="104" rx="2"/><rect x="40" y="54" width="8" height="100" rx="2"/>
      <rect x="54" y="48" width="8" height="106" rx="2"/><rect x="68" y="56" width="8" height="98" rx="2"/>
      <rect x="82" y="50" width="8" height="104" rx="2"/><rect x="96" y="58" width="8" height="96" rx="2"/>
      <rect x="110" y="52" width="8" height="102" rx="2"/>
    </g>
    <g fill="#c97963" opacity=".7">
      <rect x="132" y="62" width="7" height="92" rx="2"/><rect x="146" y="68" width="7" height="86" rx="2"/>
      <rect x="160" y="60" width="7" height="94" rx="2"/><rect x="174" y="70" width="7" height="84" rx="2"/>
      <rect x="188" y="64" width="7" height="90" rx="2"/><rect x="202" y="72" width="7" height="82" rx="2"/>
      <rect x="216" y="66" width="7" height="88" rx="2"/>
    </g>
    <g fill="#7d8fb8" opacity=".7">
      <rect x="258" y="58" width="7" height="96" rx="2"/><rect x="272" y="64" width="7" height="90" rx="2"/>
      <rect x="286" y="56" width="7" height="98" rx="2"/><rect x="300" y="66" width="7" height="88" rx="2"/>
      <rect x="314" y="60" width="7" height="94" rx="2"/>
    </g>
    <circle cx="180" cy="176" r="26" fill="#120e12" stroke="#d9b06a" stroke-opacity=".3"/>
    <circle cx="180" cy="176" r="9" fill="#c97963" opacity=".8"/>
    <path d="M180 150 V96 L232 116" stroke="#cfe3ef" stroke-width="2.4" fill="none" opacity=".45"/>
    <path d="M196 120 L244 132" stroke="#cfe3ef" stroke-width="3" opacity=".3"/>
    <path d="M150 202 H210" stroke="#8e6f68" stroke-width="3" opacity=".5"/>
    <path d="M0 150 H360" stroke="#3a2c30" stroke-width="1.4" opacity=".7"/>`;
}

function reef(): string {
  return `<path d="M0 122 Q70 106 140 118 Q210 130 280 112 Q320 102 360 110 V220 H0 Z" fill="#1b2730" opacity=".92"/>
    <path d="M0 148 Q60 132 124 146 Q190 160 250 142 Q310 126 360 138 V220 H0 Z" fill="#16222a" opacity=".95"/>
    <g fill="#26343c">
      <path d="M28 176 q14 -22 34 -12 q8 16 -6 24 q-18 8 -28 -12 Z"/>
      <path d="M118 188 q18 -26 40 -14 q10 18 -6 28 q-22 8 -34 -14 Z"/>
      <path d="M232 172 q16 -20 36 -10 q8 16 -8 24 q-20 6 -28 -14 Z"/>
      <path d="M302 194 q12 -18 30 -10 q6 14 -6 20 q-16 6 -24 -10 Z"/>
    </g>
    <g fill="#7fb2c4" opacity=".2">
      <ellipse cx="72" cy="186" rx="30" ry="6"/><ellipse cx="150" cy="200" rx="34" ry="6"/>
      <ellipse cx="264" cy="182" rx="26" ry="5"/>
    </g>
    <g stroke="#cfe3ef" stroke-width="1" opacity=".22">
      <path d="M0 166 Q90 158 180 168 Q270 178 360 164"/>
      <path d="M0 186 Q100 178 200 188 Q290 196 360 184"/>
      <path d="M0 206 Q110 198 220 206 Q300 212 360 204"/>
    </g>
    <path d="M232 92 L268 88 L274 96 L238 100 Z" fill="#1a242c" opacity=".9"/>
    <path d="M262 88 V70" stroke="#8fa6b4" stroke-width="1.4" opacity=".5"/>
    <path d="M0 74 Q80 58 160 72 Q240 86 360 66" stroke="#a9bcc8" stroke-width="12" fill="none" opacity=".08"/>
    <circle cx="120" cy="66" r="3" fill="#e8dcc8" opacity=".5"/>
    <circle cx="196" cy="58" r="2" fill="#e8dcc8" opacity=".35"/>`;
}

const BASE_ART: Record<Exclude<Scene["art"], ExtraArtId | never>, () => string> = {
  bookshop,
  attic,
  cafe,
  rooftop,
  observatory,
  dawn,
  train,
  market,
  cinema,
  radio,
  lighthouse,
  glasshouse,
  store,
  tower,
  records,
  reef,
};

const ART = { ...BASE_ART, ...EXTRA_ART };

export function sceneArt(scene: Scene): HTMLElement {
  const el = mountArt(frame(scene, ART[scene.art]()), `scene-art art-${scene.art}`, scene);
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `${scene.place}的插画`);
  return el;
}
