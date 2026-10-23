/* Generated raster artwork: small inline images also serve crew/pile portraits. */
function paintedAsset(key){return `<img class="painted-art" data-art="${key}" src="assets/images/${key}.png" alt="" loading="lazy" decoding="async">`}
for(const key of Object.keys(CARDS))CARDS[key].symbol=paintedAsset(key);
ENEMIES[1].icon=paintedAsset('mechanic');
ENEMIES[3].icon=paintedAsset('frog');
render();
