/** 剧情扩写幕的背景插画：每个函数返回 360×220 的内部 SVG 片段（外框/渐变由 scene-art.ts 的 frame 提供）。 */
import type { ExtraArtId } from "../core/scenes";

function busstop(): string {
  return `<g opacity=".9">
      <rect x="0" y="34" width="360" height="16" fill="#1b1620"/>
      <rect x="0" y="50" width="360" height="5" fill="#241d2a"/>
      <rect x="64" y="55" width="15" height="150" fill="#1e1824"/>
      <rect x="292" y="55" width="15" height="150" fill="#1e1824"/>
      <path d="M0 55 H360" stroke="#3a3040" stroke-width="1" opacity=".7"/>
    </g>
    <g>
      <rect x="96" y="74" width="164" height="7" rx="2" fill="#2a2231"/>
      <rect x="96" y="74" width="164" height="2" fill="#5c4760" opacity=".8"/>
      <rect x="104" y="81" width="6" height="92" fill="#251e2b"/>
      <rect x="246" y="81" width="6" height="92" fill="#251e2b"/>
      <rect x="110" y="86" width="140" height="82" fill="#171320" opacity=".55"/>
      <path d="M110 86 H250 M110 128 H250 M180 86 V168" stroke="#6b5c74" stroke-width="1" opacity=".3"/>
    </g>
    <rect x="112" y="150" width="136" height="9" rx="2" fill="#38293a"/>
    <rect x="118" y="158" width="8" height="26" fill="#2a2030"/>
    <rect x="234" y="158" width="8" height="26" fill="#2a2030"/>
    <rect x="146" y="138" width="70" height="12" rx="3" fill="#4a3548" opacity=".9"/>
    <rect x="66" y="96" width="26" height="60" rx="2" fill="#1d2330" stroke="#8e93a8" stroke-opacity=".35"/>
    <g stroke="#b9c2d4" stroke-width="1.6" opacity=".4">
      <path d="M71 106 H87"/><path d="M71 114 H83"/><path d="M71 122 H87"/><path d="M71 130 H80"/>
    </g>
    <circle cx="79" cy="143" r="4" fill="#b4516b" opacity=".8"/>
    <path d="M30 96 v96" stroke="#2c2634" stroke-width="4"/>
    <path d="M14 96 h32 l-5 -9 h-22 Z" fill="#3a3344"/>
    <path d="M30 105 L14 176 H46 Z" fill="#e8d9c2" opacity=".08"/>
    <ellipse cx="30" cy="180" rx="34" ry="8" fill="#b4516b" opacity=".12"/>
    <path d="M0 178 H360" stroke="#332a3a" stroke-width="2" opacity=".9"/>
    <ellipse cx="126" cy="192" rx="46" ry="9" fill="#7b6aa8" opacity=".14"/>
    <ellipse cx="214" cy="200" rx="60" ry="11" fill="#7b6aa8" opacity=".1"/>
    <g stroke="#dfe8f2" stroke-width="1" opacity=".2">
      <path d="M42 12 l-3 12"/><path d="M88 4 l-3 12"/><path d="M136 16 l-3 12"/>
      <path d="M184 6 l-3 12"/><path d="M232 18 l-3 12"/><path d="M280 8 l-3 12"/>
      <path d="M320 20 l-3 12"/><path d="M20 40 l-3 10"/><path d="M262 42 l-3 10"/>
    </g>
    <g fill="#12101a">
      <rect x="8" y="60" width="30" height="40"/><rect x="318" y="66" width="34" height="34"/>
    </g>
    <g fill="#c9a06a" opacity=".5">
      <rect x="14" y="70" width="5" height="5"/><rect x="26" y="70" width="5" height="5"/>
      <rect x="326" y="76" width="5" height="5"/><rect x="338" y="86" width="5" height="5"/>
    </g>`;
}

function laundry(): string {
  return `<rect x="0" y="0" width="360" height="14" fill="#1a1520"/>
    <rect x="52" y="14" width="256" height="6" rx="2" fill="#e4dcbe" opacity=".14"/>
    <rect x="52" y="20" width="256" height="2" fill="#e4dcbe" opacity=".06"/>
    <g>
      <rect x="34" y="58" width="66" height="112" rx="4" fill="#242030" stroke="#6d6478" stroke-opacity=".4"/>
      <rect x="42" y="66" width="50" height="46" rx="3" fill="#1b1826"/>
      <circle cx="67" cy="89" r="17" fill="#12101c"/>
      <circle cx="67" cy="89" r="17" fill="none" stroke="#8f9bb0" stroke-width="1.4" opacity=".5"/>
      <circle cx="67" cy="89" r="11" fill="none" stroke="#b4516b" stroke-width="1" opacity=".45"/>
      <rect x="42" y="120" width="50" height="6" rx="2" fill="#3a3448"/>
      <circle cx="82" cy="138" r="5" fill="#b9c2d4" opacity=".5"/>
      <rect x="50" y="134" width="20" height="14" rx="2" fill="#171420"/>
    </g>
    <g>
      <rect x="106" y="58" width="66" height="112" rx="4" fill="#252132" stroke="#6d6478" stroke-opacity=".4"/>
      <rect x="114" y="66" width="50" height="46" rx="3" fill="#1b1826"/>
      <circle cx="139" cy="89" r="17" fill="#12101c"/>
      <circle cx="139" cy="89" r="17" fill="none" stroke="#8f9bb0" stroke-width="1.4" opacity=".5"/>
      <path d="M132 82 q10 4 14 14" stroke="#7b6aa8" stroke-width="2" fill="none" opacity=".6"/>
      <rect x="114" y="120" width="50" height="6" rx="2" fill="#3a3448"/>
      <circle cx="154" cy="138" r="5" fill="#b9c2d4" opacity=".35"/>
      <rect x="122" y="134" width="20" height="14" rx="2" fill="#171420"/>
    </g>
    <g>
      <rect x="178" y="58" width="66" height="112" rx="4" fill="#242030" stroke="#6d6478" stroke-opacity=".4"/>
      <rect x="186" y="66" width="50" height="46" rx="3" fill="#1d1a28"/>
      <circle cx="211" cy="89" r="17" fill="#1a1724"/>
      <circle cx="211" cy="89" r="17" fill="none" stroke="#8f9bb0" stroke-width="1.4" opacity=".45"/>
      <path d="M204 84 q8 -6 16 2 q-8 7 -16 -2" fill="#d6c6a8" opacity=".28"/>
      <rect x="186" y="120" width="50" height="6" rx="2" fill="#3a3448"/>
      <circle cx="226" cy="138" r="5" fill="#b9c2d4" opacity=".28"/>
      <rect x="194" y="134" width="20" height="14" rx="2" fill="#171420"/>
    </g>
    <rect x="258" y="66" width="52" height="104" rx="3" fill="#201d2c"/>
    <rect x="266" y="74" width="36" height="30" rx="2" fill="#141220"/>
    <circle cx="284" cy="89" r="6" fill="#b4516b" opacity=".7"/>
    <path d="M266 118 H302" stroke="#4b4458" stroke-width="3"/>
    <path d="M266 128 H302" stroke="#4b4458" stroke-width="3" opacity=".6"/>
    <rect x="18" y="138" width="14" height="30" rx="2" fill="#2c3742"/>
    <rect x="20" y="130" width="10" height="10" rx="2" fill="#8fa3b4" opacity=".6"/>
    <rect x="40" y="176" width="300" height="4" fill="#3a3344"/>
    <g fill="#2b2638">
      <rect x="92" y="182" width="8" height="22"/><rect x="176" y="182" width="8" height="22"/>
      <rect x="260" y="182" width="8" height="22"/>
    </g>
    <path d="M112 186 h44 v26 h-44 Z" fill="#332a3a" opacity=".8"/>
    <path d="M112 186 h44 l-6 -8 h-32 Z" fill="#4a3c48" opacity=".85"/>
    <g fill="#d6c6a8" opacity=".55">
      <rect x="116" y="180" width="36" height="6" rx="2"/>
      <rect x="118" y="174" width="32" height="6" rx="2"/>
    </g>
    <path d="M0 212 H360" stroke="#241f30" stroke-width="2"/>
    <g stroke="#dfe8f2" stroke-width="1" opacity=".18">
      <path d="M14 26 l-2 10"/><path d="M78 22 l-2 10"/><path d="M148 28 l-2 10"/>
      <path d="M212 20 l-2 10"/><path d="M276 30 l-2 10"/><path d="M336 24 l-2 10"/>
    </g>`;
}

function planetarium(): string {
  return `<path d="M22 152 A158 158 0 0 1 338 152 Z" fill="#161327" opacity=".92" stroke="#2c2742" stroke-width="2"/>
    <path d="M70 126 C118 96 200 86 300 110" fill="none" stroke="#cfd4f2" stroke-opacity=".16" stroke-width="11"/>
    <g fill="#f2f0ff">
      <circle cx="62" cy="52" r="1.6" opacity=".72"/><circle cx="88" cy="74" r="1" opacity=".5"/>
      <circle cx="112" cy="40" r="2" opacity=".86"/><circle cx="138" cy="66" r="1.1" opacity=".55"/>
      <circle cx="166" cy="36" r="1.4" opacity=".7"/><circle cx="196" cy="60" r="1" opacity=".5"/>
      <circle cx="224" cy="34" r="1.8" opacity=".8"/><circle cx="252" cy="62" r="1.1" opacity=".55"/>
      <circle cx="284" cy="42" r="1.3" opacity=".66"/><circle cx="308" cy="78" r="1" opacity=".45"/>
      <circle cx="128" cy="96" r="1" opacity=".4"/><circle cx="266" cy="94" r="1.2" opacity=".5"/>
    </g>
    <path d="M199 18 l6 22 l-9 15 l11 21" fill="none" stroke="#d9d3f2" stroke-opacity=".22" stroke-width="1"/>
    <path d="M96 150 V176 M264 150 V176" stroke="#3a3350" stroke-opacity=".7" stroke-width="3"/>
    <path d="M180 118 L112 26 M180 118 L248 22" stroke="var(--scene-a)" stroke-opacity=".14" stroke-width="10"/>
    <path d="M180 118 L142 46 M180 118 L222 42" stroke="var(--scene-b)" stroke-opacity=".12" stroke-width="5"/>
    <rect x="169" y="146" width="22" height="42" fill="#1b1728"/>
    <path d="M163 188 h34 v4 h-34 Z" fill="#241e33"/>
    <circle cx="180" cy="132" r="19" fill="#262039"/>
    <circle cx="180" cy="132" r="19" fill="none" stroke="#7a72a4" stroke-opacity=".5"/>
    <circle cx="180" cy="126" r="6" fill="var(--scene-a)" opacity=".34"/>
    <circle cx="166" cy="138" r="2.2" fill="var(--scene-b)" opacity=".4"/>
    <circle cx="192" cy="140" r="1.8" fill="var(--scene-b)" opacity=".32"/>
    <path d="M150 156 q30 -8 60 0" fill="none" stroke="#4a4266" stroke-opacity=".6" stroke-width="1.4"/>
    <rect x="0" y="188" width="360" height="32" fill="#0f0c18"/>
    <g fill="#191426">
      <path d="M22 190 q3 -22 13 -22 h14 q10 0 13 22 Z"/>
      <path d="M86 192 q3 -26 15 -26 h16 q12 0 15 26 Z"/>
      <path d="M240 192 q3 -26 15 -26 h16 q12 0 15 26 Z"/>
      <path d="M304 190 q3 -22 13 -22 h14 q10 0 13 22 Z"/>
    </g>
    <path d="M160 196 h40" stroke="#2a2438" stroke-width="2"/>
    <rect x="330" y="150" width="18" height="7" rx="1" fill="var(--scene-b)" opacity=".22"/>
    <path d="M338 157 v12" stroke="#4a4266" stroke-opacity=".5"/>`;
}

function campsite(): string {
  return `<g fill="#f2f0ff">
      <circle cx="42" cy="30" r="1.4" opacity=".7"/><circle cx="74" cy="52" r="1" opacity=".45"/>
      <circle cx="110" cy="24" r="1.7" opacity=".82"/><circle cx="150" cy="46" r="1" opacity=".5"/>
      <circle cx="196" cy="26" r="1.3" opacity=".62"/><circle cx="238" cy="52" r="1" opacity=".44"/>
      <circle cx="286" cy="30" r="1.5" opacity=".72"/><circle cx="322" cy="58" r="1.1" opacity=".5"/>
      <circle cx="190" cy="70" r="1" opacity=".4"/>
    </g>
    <path d="M150 22 l24 16" stroke="#e8e3ff" stroke-opacity=".42" stroke-width="1.4"/>
    <path d="M0 148 L58 124 L104 144 L164 116 L222 142 L282 122 L336 146 L360 138 V182 H0 Z" fill="#12101c" opacity=".94"/>
    <path d="M0 158 h74" stroke="#9c94c8" stroke-opacity=".16" stroke-width="2"/>
    <path d="M0 182 H360" stroke="#2b2538" stroke-width="2"/>
    <path d="M92 182 L150 92 L208 182 Z" fill="#1d1a2b" stroke="var(--scene-a)" stroke-opacity=".38" stroke-width="1.6"/>
    <path d="M150 92 L120 182" stroke="#3b3452" stroke-opacity=".7"/>
    <path d="M156 182 L154 112 L188 182 Z" fill="#e9c48a" opacity=".2"/>
    <path d="M150 112 L186 182" stroke="#e9c48a" stroke-opacity=".28"/>
    <path d="M92 182 L70 184 M208 182 L230 184" stroke="#6d6790" stroke-opacity=".45"/>
    <rect x="64" y="184" width="3" height="8" fill="#4a4266"/>
    <rect x="228" y="184" width="3" height="8" fill="#4a4266"/>
    <circle cx="150" cy="150" r="26" fill="var(--scene-a)" opacity=".1"/>
    <circle cx="168" cy="164" r="5" fill="#e9c48a" opacity=".5"/>
    <rect x="165" y="169" width="6" height="9" fill="#3a3350"/>
    <rect x="252" y="152" width="13" height="26" rx="3" fill="#b9a9d6" opacity=".5"/>
    <rect x="250" y="147" width="17" height="5" rx="1" fill="#8d84b8" opacity=".55"/>
    <path d="M272 176 h14 v-9 h-14 Z" fill="#cfc4e4" opacity=".32"/>
    <path d="M268 166 q11 -7 22 0" fill="none" stroke="#cfc4e4" stroke-opacity=".3"/>
    <g stroke="#5d5679" stroke-opacity=".55">
      <path d="M28 178 l4 -12 M32 178 l2 -9"/>
      <path d="M56 180 l5 -13 M60 180 l2 -8"/>
      <path d="M236 180 l4 -11 M240 180 l3 -9"/>
      <path d="M300 178 l5 -12 M304 178 l2 -8"/>
      <path d="M330 180 l4 -10 M334 180 l3 -8"/>
    </g>
    <g stroke="#8f88b4" stroke-opacity=".45">
      <path d="M124 172 l3 -8 M128 172 l2 -6"/>
      <path d="M214 174 l3 -7 M218 174 l2 -5"/>
      <path d="M278 178 l3 -7"/>
    </g>
    <path d="M96 176 q54 8 112 0" fill="none" stroke="#2f2940" stroke-opacity=".8"/>`;
}

function taxi(): string {
  return `<rect x="0" y="100" width="360" height="120" fill="#10141b" opacity=".5"/>
    <g stroke="#8ca6b8" stroke-width="1.3" opacity=".26">
      <path d="M0 100 H360"/>
      <path d="M24 100 V142 M80 100 V142 M136 100 V142 M192 100 V142 M248 100 V142 M304 100 V142 M356 100 V142"/>
    </g>
    <path d="M0 146 H360 V220 H0 Z" fill="#0d1016" opacity=".92"/>
    <g fill="#dfe8f2" opacity=".2">
      <rect x="18" y="196" width="30" height="3" rx="1.5"/>
      <rect x="118" y="196" width="30" height="3" rx="1.5"/>
      <rect x="218" y="196" width="30" height="3" rx="1.5"/>
      <rect x="318" y="196" width="30" height="3" rx="1.5"/>
    </g>
    <ellipse cx="186" cy="188" rx="96" ry="9" fill="var(--scene-b)" opacity=".18"/>
    <ellipse cx="186" cy="188" rx="70" ry="5" fill="#0a0d12" opacity=".55"/>
    <path d="M96 150 h182 q14 0 16 12 l3 16 H78 l3 -16 q2 -12 15 -12 Z" fill="#1e2731"/>
    <path d="M124 150 L142 118 H212 L232 150 Z" fill="#242f3a"/>
    <path d="M136 146 L150 124 H172 L166 146 Z" fill="#9fc0cf" opacity=".28"/>
    <path d="M180 146 L184 124 H206 L214 146 Z" fill="#9fc0cf" opacity=".22"/>
    <rect x="160" y="104" width="36" height="12" rx="3" fill="var(--scene-a)" opacity=".92"/>
    <ellipse cx="178" cy="110" rx="34" ry="14" fill="var(--scene-a)" opacity=".16"/>
    <circle cx="130" cy="178" r="14" fill="#0b0e13"/>
    <circle cx="130" cy="178" r="5" fill="#59646f" opacity=".8"/>
    <circle cx="244" cy="178" r="14" fill="#0b0e13"/>
    <circle cx="244" cy="178" r="5" fill="#59646f" opacity=".8"/>
    <rect x="280" y="156" width="9" height="6" rx="2" fill="var(--scene-a)" opacity=".85"/>
    <path d="M78 158 L6 148 V196 L78 174 Z" fill="#e8eef5" opacity=".08"/>
    <rect x="92" y="156" width="16" height="3" rx="1.5" fill="#dfe8f2" opacity=".5"/>
    <g stroke="#dfe8f2" stroke-width="1" opacity=".22">
      <path d="M32 4 l-4 16 M94 0 l-4 18 M232 8 l-4 14 M300 2 l-4 17 M340 10 l-4 14"/>
    </g>
    <path d="M0 210 H360" stroke="var(--scene-a)" stroke-width="1.2" opacity=".25"/>`;
}

function arcade(): string {
  return `<rect width="360" height="96" fill="#0d0f16" opacity=".6"/>
    <g fill="#cfe3ef" opacity=".5">
      <rect x="40" y="16" width="80" height="4" rx="2"/>
      <rect x="152" y="10" width="66" height="4" rx="2"/>
      <rect x="252" y="18" width="72" height="4" rx="2"/>
    </g>
    <g fill="#cfe3ef" opacity=".07">
      <path d="M40 20 L18 150 H142 Z"/>
      <path d="M152 14 L122 150 H248 Z"/>
      <path d="M252 22 L232 150 H342 Z"/>
    </g>
    <rect x="16" y="68" width="90" height="100" rx="6" fill="#1b222c"/>
    <rect x="26" y="78" width="70" height="62" rx="3" fill="#8fb7c6" opacity=".15"/>
    <path d="M61 78 v20" stroke="#cfe3ef" stroke-width="1.6" opacity=".45"/>
    <path d="M47 98 h28 l-6 13 h-16 Z" fill="#cfe3ef" opacity=".3"/>
    <circle cx="61" cy="120" r="9" fill="var(--scene-a)" opacity=".5"/>
    <rect x="26" y="148" width="70" height="10" rx="3" fill="#2b3540"/>
    <g fill="#e3b66e" opacity=".65">
      <circle cx="125" cy="84" r="4"/><circle cx="137" cy="84" r="4"/><circle cx="125" cy="96" r="4"/>
    </g>
    <rect x="114" y="64" width="70" height="104" rx="5" fill="#171d26"/>
    <rect x="122" y="74" width="54" height="36" rx="2" fill="var(--scene-a)" opacity=".45"/>
    <rect x="127" y="79" width="44" height="26" rx="2" fill="#0d1117" opacity=".65"/>
    <rect x="122" y="116" width="54" height="10" rx="3" fill="#2b3540"/>
    <g fill="#cfe3ef" opacity=".5">
      <circle cx="136" cy="132" r="3"/><circle cx="148" cy="132" r="3"/><circle cx="160" cy="132" r="3"/>
    </g>
    <rect x="200" y="60" width="118" height="108" rx="6" fill="#151a22"/>
    <rect x="210" y="70" width="98" height="44" rx="3" fill="var(--scene-b)" opacity=".2"/>
    <path d="M240 114 L244 72 M270 114 L266 72" stroke="#cfe3ef" stroke-width="1.4" opacity=".3"/>
    <path d="M214 102 q22 -10 44 0 q24 10 46 -4" stroke="#cfe3ef" stroke-width="1" fill="none" opacity=".2"/>
    <path d="M250 120 v10" stroke="#cfe3ef" stroke-width="2" opacity=".25"/>
    <rect x="204" y="148" width="50" height="14" rx="4" fill="#202833"/>
    <rect x="264" y="148" width="50" height="14" rx="4" fill="#202833"/>
    <path d="M0 166 H360 V220 H0 Z" fill="#141018" opacity=".9"/>
    <ellipse cx="180" cy="188" rx="150" ry="26" fill="var(--scene-a)" opacity=".08"/>
    <ellipse cx="180" cy="188" rx="150" ry="26" fill="none" stroke="var(--scene-a)" stroke-opacity=".18"/>
    <g fill="#e3b66e" opacity=".5">
      <circle cx="86" cy="198" r="4"/><circle cx="286" cy="196" r="4"/><circle cx="212" cy="204" r="3"/>
    </g>
    <g stroke="#cfe3ef" stroke-width="1" opacity=".12">
      <path d="M24 214 H340"/><path d="M60 176 V220 M300 176 V220"/>
    </g>
    <path d="M120 170 v40 M150 170 v40" stroke="var(--scene-b)" stroke-width="8" opacity=".12"/>`;
}

/**
 * sea arc 新增插画：night-ferry / harbor。
 * 每个函数只返回 360×220 容器内部片段；夜色底与渐变由 frame() 负责。
 */

/** 夜航渡轮：雾里的甲板、舱窗、桅灯与栏杆。 */
function ferry(): string {
  return `<path d="M0 152 H360 V220 H0 Z" fill="#101b22" opacity=".92"/>
    <path d="M0 150 H360" stroke="#7fb2c4" stroke-width="1" opacity=".32"/>
    <rect x="12" y="50" width="134" height="100" rx="4" fill="#16232b" opacity=".94"/>
    <rect x="24" y="36" width="110" height="16" rx="3" fill="#1d2c34"/>
    <g fill="#e0a07c">
      <rect x="28" y="68" width="18" height="12" rx="2" opacity=".82"/>
      <rect x="56" y="68" width="18" height="12" rx="2" opacity=".5"/>
      <rect x="84" y="68" width="18" height="12" rx="2" opacity=".7"/>
      <rect x="112" y="68" width="18" height="12" rx="2" opacity=".34"/>
    </g>
    <rect x="28" y="96" width="104" height="54" rx="2" fill="#101a22" opacity=".9"/>
    <path d="M28 108 H132" stroke="#7fb2c4" stroke-width="1" opacity=".18"/>
    <path d="M30 150 V116 h100 v34" fill="none" stroke="#2a3a44" stroke-width="1.4" opacity=".7"/>
    <path d="M168 62 h28 l-5 -28 h-18 Z" fill="#1b2831"/>
    <rect x="162" y="60" width="40" height="7" rx="2" fill="#2b3b45"/>
    <path d="M186 34 q12 -12 24 -8" fill="none" stroke="#cfe3ef" stroke-width="1.2" opacity=".18"/>
    <path d="M252 150 V52" stroke="#8fa6b4" stroke-width="2" opacity=".72"/>
    <path d="M236 60 H268" stroke="#8fa6b4" stroke-width="2" opacity=".5"/>
    <circle cx="252" cy="52" r="5" fill="#f4d49a" opacity=".95"/>
    <circle cx="252" cy="52" r="18" fill="var(--scene-b)" opacity=".14"/>
    <path d="M246 58 L198 150 H306 Z" fill="#f4d49a" opacity=".06"/>
    <g stroke="#9db6c2" stroke-width="1.6" opacity=".42" fill="none">
      <path d="M150 126 H360"/>
      <path d="M150 144 H360"/>
      <path d="M164 126 V152 M204 126 V152 M244 126 V152 M284 126 V152 M324 126 V152"/>
    </g>
    <circle cx="312" cy="104" r="13" fill="none" stroke="#e0a07c" stroke-width="4" opacity=".62"/>
    <circle cx="312" cy="104" r="13" fill="none" stroke="#cfe3ef" stroke-width="1" opacity=".25"/>
    <rect x="176" y="126" width="52" height="7" rx="2" fill="#33232b" opacity=".9"/>
    <path d="M182 133 v12 M222 133 v12" stroke="#5a4a46" stroke-width="2.5" opacity=".8"/>
    <rect x="150" y="156" width="70" height="10" rx="2" fill="#1a242b" opacity=".85"/>
    <path d="M150 166 h70" stroke="#7fb2c4" stroke-width="1" opacity=".18"/>
    <path d="M0 88 Q90 78 180 90 Q270 102 360 86" stroke="#cfe3ef" stroke-width="16" fill="none" opacity=".06"/>
    <path d="M0 118 Q100 108 200 120 Q290 130 360 114" stroke="#cfe3ef" stroke-width="10" fill="none" opacity=".07"/>
    <g fill="#cfe3ef" opacity=".3">
      <circle cx="64" cy="176" r="1.6"/><circle cx="132" cy="190" r="1.2"/><circle cx="214" cy="182" r="1.4"/>
    </g>`;
}

/** 清晨渔港：冰厂的门、堆叠的鱼箱、系缆柱与靠岸的蓝船。 */
function harbor(): string {
  return `<rect x="0" y="96" width="360" height="16" fill="#253a42" opacity=".45"/>
    <path d="M0 108 Q90 100 180 106 Q270 112 360 104" stroke="#e0a07c" stroke-width="2" fill="none" opacity=".3"/>
    <rect x="0" y="112" width="360" height="46" fill="#14232b" opacity=".9"/>
    <g stroke="#8fb4bf" stroke-width="1" opacity=".22" fill="none">
      <path d="M0 124 Q60 121 120 125"/>
      <path d="M150 130 Q210 126 270 131"/>
      <path d="M240 120 Q300 117 360 122"/>
    </g>
    <rect x="8" y="42" width="120" height="82" rx="3" fill="#17242b" opacity=".94"/>
    <path d="M8 42 H128 M34 42 V124 M76 42 V124" stroke="#9db6c2" stroke-width="1" opacity=".18"/>
    <rect x="24" y="96" width="34" height="28" fill="#f4d49a" opacity=".5"/>
    <path d="M24 124 L58 124 L96 158 H6 Z" fill="#f4d49a" opacity=".09"/>
    <rect x="76" y="70" width="32" height="20" fill="#cfe3ef" opacity=".16"/>
    <g fill="#3a2f2a" opacity=".9">
      <rect x="136" y="118" width="46" height="26" rx="2"/>
      <rect x="186" y="126" width="38" height="18" rx="2"/>
      <rect x="132" y="146" width="52" height="26" rx="2"/>
    </g>
    <g stroke="#7a6656" stroke-width="1.2" opacity=".55" fill="none">
      <path d="M136 131 H182 M136 159 H184 M186 135 H224"/>
    </g>
    <rect x="248" y="132" width="16" height="30" rx="3" fill="#22303a"/>
    <ellipse cx="256" cy="132" rx="11" ry="4" fill="#2b3b45"/>
    <ellipse cx="256" cy="146" rx="16" ry="5" fill="none" stroke="#8e6f4e" stroke-width="3" opacity=".6"/>
    <ellipse cx="256" cy="152" rx="13" ry="4" fill="none" stroke="#8e6f4e" stroke-width="2.4" opacity=".45"/>
    <path d="M240 170 q14 -8 26 -2 q10 5 20 1" stroke="#8e6f4e" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M286 118 H360 V150 H286 q-10 -16 0 -32 Z" fill="#1d2c34" opacity=".95"/>
    <path d="M286 118 q-8 16 0 32" fill="none" stroke="#8fb4bf" stroke-width="1.4" opacity=".35"/>
    <rect x="300" y="98" width="46" height="22" rx="2" fill="#22323b"/>
    <rect x="306" y="106" width="10" height="8" fill="#e0a07c" opacity=".55"/>
    <path d="M330 98 V74" stroke="#8fa6b4" stroke-width="1.8" opacity=".6"/>
    <circle cx="330" cy="72" r="4" fill="#f4d49a" opacity=".85"/>
    <circle cx="330" cy="72" r="14" fill="var(--scene-a)" opacity=".16"/>
    <path d="M296 150 q22 -12 44 -2 q-20 10 -44 2" fill="#0f1a20" opacity=".9"/>
    <g stroke="#dfeaf3" stroke-width="1.4" fill="none" opacity=".45">
      <path d="M92 78 q6 -5 12 0 q6 -5 12 0"/>
      <path d="M132 62 q4 -4 9 0 q4 -4 9 0"/>
    </g>
    <path d="M0 158 H360" stroke="#7fb2c4" stroke-width="1" opacity=".25"/>
    <g stroke="#f4d49a" stroke-width="2" opacity=".14">
      <path d="M30 160 v10 M42 160 v7 M54 160 v9"/>
    </g>
    <g fill="#cfe3ef" opacity=".22">
      <circle cx="116" cy="182" r="1.5"/><circle cx="198" cy="192" r="1.2"/><circle cx="268" cy="186" r="1.6"/>
    </g>`;
}

export const EXTRA_ART: Record<ExtraArtId, () => string> = {
  busstop,
  laundry,
  planetarium,
  campsite,
  taxi,
  arcade,
  ferry,
  harbor,
};
