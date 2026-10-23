/* Generated raster artwork: small inline images also serve crew/pile portraits. */
function paintedAsset(key){return `<img class="painted-art" data-art="${key}" src="assets/images/handdrawn/${key}.png" alt="" loading="lazy" decoding="async">`}
for(const key of Object.keys(CARDS))CARDS[key].symbol=paintedAsset(key);
ENEMIES[0].icon=paintedAsset('bert');
ENEMIES[1].icon=paintedAsset('mechanic');
ENEMIES[2].icon=paintedAsset('foreman');
ENEMIES[3].icon=paintedAsset('frog');
render();
