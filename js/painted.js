/* Generated raster artwork: small inline images also serve crew/pile portraits. Missing files fall back to the card's emoji. */
const ART_FALLBACK={},ART_MISSING=new Set();
const missingArt=key=>`<span class="art-missing" aria-hidden="true">${ART_FALLBACK[key]||'⚙️'}</span>`;
function artMissing(img){ART_MISSING.add(img.dataset.art);const s=document.createElement('span');s.className='art-missing';s.setAttribute('aria-hidden','true');s.textContent=ART_FALLBACK[img.dataset.art]||'⚙️';img.replaceWith(s)}
function paintedAsset(key){if(ART_MISSING.has(key))return missingArt(key);return `<img class="painted-art" data-art="${key}" src="assets/images/handdrawn/${key}.jpg" alt="" loading="lazy" decoding="async" onerror="artMissing(this)">`}
for(const key of Object.keys(CARDS)){ART_FALLBACK[key]=CARDS[key].symbol;CARDS[key].symbol=paintedAsset(key)}
const LEGACY_PORTRAITS=['bert','mechanic','foreman','frog'];
ENEMIES.forEach((e,i)=>{const key=e.portrait||LEGACY_PORTRAITS[i];if(!key)return;ART_FALLBACK[key]??=e.icon;e.icon=paintedAsset(key)});
render();
