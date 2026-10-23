/* Printed workshop stamps replace the cartoon card pictograms. */
function stamp(path){return `<svg class="stamp-art" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter">${path}</g></svg>`}
const STAMPS={
 drill:'<path d="m21 23 18-10 29 41-18 13zM50 67l23 22 7-5-12-30M31 18l-9-10M25 35 12 45l8 12 17-8M55 60l15-7M62 70l13-6M69 80l8-4"/>',
 boiler:'<path d="M26 38h48v41H26zM34 38V24h32v14M35 24V12M65 24V12M26 53H14v15h12M74 48h12v20H74M33 79v10M67 79v10"/><circle cx="50" cy="57" r="11"/><path d="m50 57 5-7"/>',
 rivet:'<path d="M14 37h54v24H14zM68 41h20v16H68M29 61l-8 25h18l9-25M19 29h36v8M20 47h35M79 32v-9M88 67l6 6"/>',
 cannon:'<path d="m15 28 71-10v26L15 56zM18 59h55v15H18M38 53v6M55 48v11"/><circle cx="27" cy="79" r="11"/><circle cx="69" cy="79" r="11"/><path d="m28 30 4 19M70 23v21"/>',
 mechanic:'<path d="m30 22-9-9-4 17 14 14 14-3 38 39-10 10-38-40-15-1-12-16M55 16l17 2 10 14-3 26-15 9-18-12-3-22zM48 34h30M52 43h6M67 43h5M56 53h12"/>',
 smith:'<path d="m48 10-28 35h59zM16 47h68M32 49v22l18 16 19-16V49M39 60h4M58 60h4M43 73h14M70 18l7-7M83 31h9"/>',
 charge:'<path d="M33 12h35v9H33zM23 25h54v61H23zM55 35 38 56h15l-8 20 20-28H50zM12 34H5M88 34h7M13 70l-8 8M87 70l8 8"/>',
 repair:'<path d="m15 32 20-17 51 52-19 19zM32 16l-16 16M68 85l17-17M35 44l10-10 22 22-11 10zM41 45l14 14M54 44 43 55"/>',
 blast:'<path d="m19 32 15-13 48 47-15 16zM35 20l-9 25M47 32 37 56M58 44 48 67M75 20l-7 13M82 34h12M56 12l4 13M80 52l12-7M14 72l13-8M26 88l10-13"/>',
 ore:'<path d="m12 38 22-22h36l19 22-39 48zM12 38h77M34 16 28 38l22 48 22-48-2-22M28 38l22-22 22 22"/>',
 crystal:'<path d="M17 44h66v38H17zM25 44V28h50v16M31 28V16h12v12M56 28V12h12v16M17 63h66M31 72h18M76 53h15v12H76M24 82v7M72 82v7"/>',
 laser:'<circle cx="50" cy="39" r="27"/><path d="M23 39h54M50 12v54M30 22l40 35M31 57l37-36M35 15l-3 25 9 24M65 15l3 25-9 24M50 66v16M33 87h34M10 18 5 9M85 67l9 7"/>',
 wisp:'<path d="m22 72 4-32 8-17 16-9 17 9 8 18 4 31-15-7-13 12-14-11z"/><circle cx="40" cy="41" r="4"/><circle cx="61" cy="41" r="4"/><path d="M43 57h15M14 81l-7 9M84 82l8 7"/>',
 excavator:'<path d="M17 66h62v14H17zM28 66V45h27v21M55 48l18-28 13 7-22 32M77 24l9 26 9 5-6 13-21-10M33 45V33h17v12"/><circle cx="28" cy="83" r="9"/><circle cx="67" cy="83" r="9"/>',
 mend:'<path d="M14 47h72L73 79H28zM23 84h53M32 36c-10-14 12-12 2-27M51 37c-10-14 12-12 2-27M69 36c-10-14 12-12 2-27M34 58h30"/>'
};
for(const [key,path] of Object.entries(STAMPS))CARDS[key].symbol=stamp(path);
ENEMIES.forEach((e,i)=>e.icon=stamp([STAMPS.drill,STAMPS.mechanic,STAMPS.boiler,'<path d="M16 51 24 27l17 4h18l17-4 9 24-9 27H25zM23 49h54M30 61l8 5h25l9-5"/><circle cx="35" cy="36" r="3"/><circle cx="65" cy="36" r="3"/>'][i]));
const cleanStampRender=render;
render=function(){cleanStampRender();document.querySelectorAll('.crew-mini strong,.crew-mini small').forEach(el=>el.title=el.textContent)};
render();
