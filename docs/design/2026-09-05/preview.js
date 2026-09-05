/* Isolated, fictional demo data. No app APIs, tracking, authentication, or payments. */
(() => {
  'use strict';
  const designs = [
    { id: 'atlas', name: 'Atlas Studio', file: '01-atlas-studio.html', title: 'A different way<br>to <em>find your place.</em>', intro: 'Go beyond the obvious. Discover thoughtful guides and memories left by people who know the way.', eyebrow: 'Local knowledge. Your own direction.', note: 'A city, seen differently', caption: 'Three local perspectives on Tbilisi.' },
    { id: 'postcard', name: 'Postcard Club', file: '02-postcard-club.html', title: 'Good places.<br><em>Great stories.</em><br>Yours to find.', intro: 'Take a little local curiosity with you. Save a guide, follow a feeling, leave a memory for someone else.', eyebrow: 'For the places you will talk about later', note: 'Wish you were here.', caption: 'A little something, waiting in the city.' },
    { id: 'field', name: 'Field Notes', file: '03-field-notes.html', title: 'Less searching.<br><em>More out there.</em>', intro: 'Local routes, useful stops, and a clear plan for the day. Find your next walk through Tbilisi.', eyebrow: 'Tbilisi / Georgia / Walking collection', note: 'Your day, mapped out', caption: 'Six stops. One unhurried afternoon.' },
    { id: 'gallery', name: 'After Hours', file: '04-after-hours.html', title: 'Every city has<br><em>another story.</em>', intro: 'Find the people who can show you. Independent guides, quiet corners, and memories worth keeping.', eyebrow: 'Brooks presents / the local perspective', note: 'Through a local lens', caption: 'Discover the city between the landmarks.' },
    { id: 'current', name: 'Clear Current', file: '05-clear-current.html', title: 'Your next discovery.<br><em>Closer than you think.</em>', intro: 'Useful guides and little memories, all in one view. Choose what you see and let the city open up.', eyebrow: 'Make room for a little discovery', note: 'Something is waiting', caption: 'Explore guides and memories on the map.' },
  ];
  const design = designs.find(d => d.id === document.body.dataset.design) || designs[0];
  const art = '../../../web/public/images/brooks-hero-bg.webp';
  const paths = {
    pin: '<path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/>',
    search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    map: '<path d="m3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2Zm6-2v16m6-13v16"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    person: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18"/>',
    heart: '<path d="M12 21 3 12a5.5 5.5 0 0 1 9-7 5.5 5.5 0 0 1 9 7Z"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pin}</svg>`;
  const guides = [
    {id: 'old', title: 'The slower side of Tbilisi', creator: 'Nino K.', initials: 'NK', category: 'Culture', info: '1 day / 6 places / walking', price: 'GEL 24', x:43,y:49, cls:'old-town'},
    {id: 'food', title: 'Small tables, big stories', creator: 'Luka M.', initials: 'LM', category: 'Food', info: '1 day / 5 places / food & wine', price: 'GEL 18', x:67,y:66, cls:'harbor'},
    {id: 'hill', title: 'Above the everyday', creator: 'Mariam G.', initials: 'MG', category: 'Outdoors', info: '1 day / 4 places / viewpoints', price: 'GEL 16', x:32,y:72, cls:'hill'},
  ];
  let selectedGuide = guides[0];
  const saved = new Set();
  let category = 'All';
  let toastTimer;
  const avatar = (initials, cls = '') => `<span class="avatar ${cls}" aria-label="Illustrative creator ${initials}">${initials}</span>`;
  const bookmark = id => `<button class="icon-button bookmark" data-save="${id}" aria-label="${saved.has(id) ? 'Unsave' : 'Save'} guide" aria-pressed="${saved.has(id)}">${icon('bookmark')}</button>`;
  const map = (interactive = false) => `<div class="map-surface">
    <svg class="map-drawing" viewBox="0 0 600 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Schematic city map, not for navigation">
      <rect class="map-land" width="600" height="520"/>
      <path class="map-park" d="M0 40 100 20 145 80 103 175 10 208ZM460 295l140-40v265H480l-50-120ZM150 360l100-20 40 90-90 50-80-45Z"/>
      <g class="map-street"><path d="m0 80 600 320M0 150l600 320M0 225l480 295M0 305l370 215M0 10l600 320M140 0 600 247M40 0 0 180M145 0 0 340M240 0 0 520M335 0 90 520M440 0 195 520M545 0 300 520M600 80 405 520M600 300 505 520"/></g>
      <path class="map-water" d="M300-30C230 90 480 130 342 260S205 390 370 550"/>
      <g class="map-road"><path d="M-20 180C200 180 240 310 630 235M0 410C120 330 160 80 590 90M160-20C130 230 130 310 100 540"/></g>
      <path class="map-route" d="M170 373 215 315 260 250 330 310 406 344"/>
      <text x="125" y="150">MTATSMINDA</text><text x="345" y="195">TBILISI</text><text x="367" y="430">OLD TOWN</text><text x="65" y="465">BOTANICAL GARDEN</text>
    </svg>
    <span class="map-place">${interactive ? 'Map area: ' : ''}Tbilisi, Georgia</span>
    ${guides.map(g => `<button class="pin${g.id === selectedGuide.id ? ' active' : ''}" style="left:${g.x}%;top:${g.y}%" data-pin="${g.id}" aria-label="Select ${g.title}">${g.price}</button>`).join('')}
    <button class="pin memory" style="left:72%;top:31%" data-memory aria-label="Open sample memory">${icon('heart')}</button>
    <small class="map-caption">Illustrative map / no live location</small>
  </div>`;
  const card = g => `<article class="guide-card" data-category="${g.category}" data-search="${g.title.toLowerCase()} ${g.creator.toLowerCase()} tbilisi ${g.category.toLowerCase()}">
    <div class="cover ${g.cls}"><img src="${art}" alt="Brooks travel artwork, illustrative guide cover" loading="lazy" width="600" height="400">${bookmark(g.id)}<span class="cover-label">${g.category}</span></div>
    <div class="card-copy"><a class="creator-line" href="#creator">${avatar(g.initials)}<span>By ${g.creator}</span></a><h3><a href="#guide" data-guide="${g.id}">${g.title}</a></h3><p>${g.info}</p><div class="card-bottom"><strong>${g.price}<span class="muted"> / guide</span></strong><a href="#guide" data-guide="${g.id}">See guide ${icon('arrow')}</a></div></div>
  </article>`;
  const screenNames = ['Discover','Map','Guide','Creator','Trip'];
  const screenIds = ['discover','map','guide','creator','trip'];
  document.getElementById('app').innerHTML = `
    <a class="skip" href="#content">Skip to content</a>
    <div class="preview-bar"><a href="index.html">All five directions</a><span>Design preview / fictional content / nothing is purchased or posted</span><div class="preview-controls"><label for="direction" class="small">Version</label><select id="direction" aria-label="Choose design direction">${designs.map((d,i)=>`<option value="${d.file}"${d.id===design.id?' selected':''}>${i+1}. ${d.name}</option>`).join('')}</select></div></div>
    <div class="wrap"><header class="site-header"><a class="brand" href="#discover" aria-label="Brooks home">${icon('pin')}brooks</a>
      <form class="search" role="search">${icon('search')}<input id="search" type="text" placeholder="Places, guides, or people" aria-label="Search example guides and creators" autocomplete="off"><button type="button" id="clear" aria-label="Clear search" hidden>${icon('close')}</button></form>
      <nav class="desktop-nav" aria-label="Main"><a href="#map">Explore</a><a href="#trip">My trip</a><a class="create-link" href="#creator">Creators</a><button class="icon-button tone-toggle" id="tone" aria-label="Switch light or dark appearance" aria-pressed="false">Tone</button><a href="#creator" aria-label="Your example profile">${avatar('BK')}</a></nav></header>
      <nav class="views" aria-label="Preview screens">${screenIds.map((id,i)=>`<button data-screen="${id}" aria-pressed="false">${screenNames[i]}</button>`).join('')}</nav>
      <main id="content" tabindex="-1"></main>
      <footer class="footer"><span>Brooks / ${design.name}</span><span>Illustrative prices, people, guides and maps. No live app connection.</span><a href="research.md">Research and architecture notes</a></footer>
    </div><nav class="mobile-nav" aria-label="Mobile navigation"><a href="#discover">${icon('search')}Discover</a><a href="#map">${icon('map')}Map</a><a href="#trip">${icon('calendar')}Trip</a><a href="#creator">${icon('person')}Profile</a></nav><div class="toast" role="status" aria-live="polite" hidden></div>`;

  function discover() {
    const useMap = ['atlas','field','current'].includes(design.id);
    return `<section class="hero"><div class="hero-copy"><p class="eyebrow">${design.eyebrow}</p><h1>${design.title}</h1><p>${design.intro}</p><div class="hero-actions"><a class="button" href="#map">Explore the map ${icon('arrow')}</a><a class="button secondary" href="#collection">Find a guide</a></div><div class="hero-meta"><div class="avatar-stack">${avatar('NK')}${avatar('LM')}${avatar('MG')}</div><span>Made by people.<br>Connected to places.</span></div><div class="hero-notes"><span><strong>6</strong> places to discover</span><span><strong>1</strong> day at your pace</span></div></div><div class="hero-visual"><div class="hero-art">${useMap ? map() : `<img src="${art}" alt="Brooks pop-art travel scene" width="1200" height="800" fetchpriority="high">`}</div><a href="#guide" class="floating-note"><p class="eyebrow"><span class="status-dot"></span>Local perspective</p><h3>${design.note}</h3><p>${design.caption}</p></a></div></section>
      <section id="collection"><div class="section-heading"><div><h2>${design.id==='field'?'Choose your next route':design.id==='gallery'?'Independent perspectives':'Follow a local perspective'}</h2><p class="muted small">Small discoveries. Thoughtfully put together.</p></div><a href="#map">View on map ${icon('arrow')}</a></div><div class="chips" aria-label="Guide categories">${['All','Culture','Food','Outdoors'].map(c=>`<button class="chip" data-category-filter="${c}" aria-pressed="${c===category}">${c}</button>`).join('')}</div><p id="search-result" class="small muted" aria-live="polite"></p><div class="guides">${guides.map(card).join('')}</div><div id="no-results" class="empty" hidden><h3>No matching example guides</h3><p>Try Tbilisi, Nino, food, or clear your search.</p><button class="button secondary" data-reset>Clear filters</button></div></section>
      <section class="memory-banner"><div><p class="eyebrow">Memories belong somewhere</p><h3>A little story. A real place.</h3><p>Find memories on the map. Locked stories stay hidden until you are close enough and signed in.</p></div><a href="#map" class="button secondary">Discover memories ${icon('heart')}</a></section>`;
  }
  function mapScreen() {
    return `<section class="map-layout"><aside class="map-sidebar"><p class="eyebrow">In this map area</p><h1>Find your Tbilisi.</h1><p class="small muted">Choose the layers you want to explore.</p><div class="layers"><label><input type="checkbox" id="guide-layer" checked>Guides & creators</label><label><input type="checkbox" id="memory-layer" checked>Memories</label></div><div id="map-guides">${guides.map(g=>`<button class="map-row ${g.id===selectedGuide.id?'active':''}" data-row="${g.id}" aria-label="Select ${g.title}"><span><strong>${g.title}</strong><small>${g.creator} / ${g.price}</small><small>${g.info}</small></span>${avatar(g.initials)}</button>`).join('')}</div><p id="map-selection" class="small muted" role="status">Selected: ${selectedGuide.title}</p><a class="button" href="#guide">Open selected guide ${icon('arrow')}</a><p class="small muted" style="margin-top:20px">Sample map only. Positions represent guide areas, never a creator's live location.</p></aside><div class="map-pane">${map(true)}</div></section>`;
  }
  function guideScreen() {
    const g = selectedGuide;
    return `<section class="detail-layout"><div><p class="eyebrow">Tbilisi / ${g.category}</p><h1 class="detail-title">${g.title}</h1><a class="creator-line" href="#creator">${avatar(g.initials)}A guide by ${g.creator} ${icon('arrow')}</a><img class="detail-photo" src="${art}" alt="Illustrative Brooks guide artwork" width="1200" height="800"><h2>Take the scenic way.</h2><p class="muted">Courtyards you could walk past, a long lunch, and a view worth slowing down for. This guide leaves space for the discoveries you make along the way.</p><div class="facts"><div><strong>1 day</strong><small>At your pace</small></div><div><strong>6 places</strong><small>Local suggestions</small></div><div><strong>Walking</strong><small>With time to pause</small></div></div><h3>A glimpse of your day</h3><ol class="timeline"><li><span class="step-marker">1</span><div><h3>Start with a courtyard coffee</h3><p>A gentle beginning in the old town.</p></div></li><li><span class="step-marker">2</span><div><h3>Wander the quieter streets</h3><p>Architecture, small shops, and a few local stories.</p></div></li></ol><details><summary>What unlocks after purchase?</summary><p>The full guide, all six place details, and trip scheduling. This preview does not process purchases.</p></details><h3>Reviews</h3><p class="muted small">No real reviews in this design preview. Ratings must come from eligible purchasers.</p></div><aside class="purchase-card"><p class="eyebrow">Your own local perspective</p><div class="price">${g.price}</div><p class="muted small">One guide. Keep the version you buy.</p><button class="button" data-demo="Checkout is a preview only. No payment has been made.">Get this guide ${icon('arrow')}</button><button class="button secondary" data-save="${g.id}" aria-pressed="${saved.has(g.id)}">${icon('bookmark')} ${saved.has(g.id)?'Saved':'Save for later'}</button><p class="small muted" style="margin:20px 0 0">You can save a guide before buying it.</p></aside></section>`;
  }
  function creatorScreen() {
    return `<section class="profile-head">${avatar('NK')}<div><p class="eyebrow">A local perspective / Tbilisi</p><h1>Nino K.</h1><p>I collect quiet corners, courtyard stories, and places to stay a little longer. Come see my city.</p></div><button class="button" data-follow aria-pressed="false">Follow Nino</button></section><div class="facts"><div><strong>Tbilisi, Georgia</strong><small>Public region</small></div><div><strong>Culture & walking</strong><small>Guide interests</small></div></div><div class="section-heading"><h2>Nino's guides</h2></div><div class="guides">${card(guides[0])}</div><section class="review"><p class="eyebrow">Community perspective</p><h3>Creator reviews</h3><p class="muted">Reviews appear here after an eligible purchase history. This design shows no invented ratings or endorsements.</p></section>`;
  }
  function tripScreen() {
    return `<section class="detail-layout"><div><p class="eyebrow">Your trip / sample purchased guide</p><h1 class="detail-title">A day to wander.</h1><p class="muted">Tbilisi / ${selectedGuide.title}</p><div class="facts"><div><strong>Day 1</strong><small>Your own pace</small></div><div><strong id="progress">0 of 3</strong><small>Preview stops visited</small></div></div><ol class="timeline">${['Courtyard coffee','The old town, on foot','A view above the rooftops'].map((s,i)=>`<li><span class="step-marker">${i+1}</span><div><p class="eyebrow">${['09:30','11:00','16:30'][i]} / suggested time</p><h3>${s}</h3><p>${['Leave time for a slow start and a good conversation.','Follow the smaller streets and see where they take you.','Find a comfortable spot and watch the city change.'][i]}</p><button class="button secondary" data-visited="${i}" aria-pressed="false">Mark as visited</button></div></li>`).join('')}</ol></div><aside class="purchase-card"><div class="trip-map">${map()}</div><h3>Your day, at a glance</h3><p class="small muted">Sample schedule. All times can change to suit your trip.</p><button class="button" data-demo="Calendar preview: the selected design will use Brooks' existing Google Calendar connection.">${icon('calendar')} Add to calendar</button><a class="button secondary" href="#map">Explore nearby</a></aside></section>`;
  }
  const content = document.getElementById('content');
  const search = document.getElementById('search');
  function render() {
    const requested = location.hash.slice(1);
    const screen = requested === 'collection' ? 'discover' : screenIds.includes(requested) ? requested : 'discover';
    content.innerHTML = `<div class="screen">${({discover,map:mapScreen,guide:guideScreen,creator:creatorScreen,trip:tripScreen}[screen])()}</div>`;
    document.querySelectorAll('[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===screen)));
    document.querySelectorAll('.mobile-nav a').forEach(a=>{if(a.hash===`#${screen}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    filter();
    if(requested==='collection')document.getElementById('collection')?.scrollIntoView();
  }
  function filter() {
    const q=search.value.trim().toLowerCase();
    document.getElementById('clear').hidden=!q;
    const cards=Array.from(document.querySelectorAll('[data-search]'));
    cards.forEach(c=>c.hidden=!(c.dataset.search.includes(q)&&(category==='All'||c.dataset.category===category)));
    const count=cards.filter(c=>!c.hidden).length;
    const empty=document.getElementById('no-results');
    if(empty)empty.hidden=count>0;
    const result=document.getElementById('search-result');
    if(result)result.textContent=q?`${count} example guide${count===1?'':'s'} matching your search`:'';
  }
  function notify(message) {const t=document.querySelector('.toast');clearTimeout(toastTimer);t.textContent=message;t.hidden=false;toastTimer=setTimeout(()=>t.hidden=true,4500);}
  function selectGuide(id){selectedGuide=guides.find(g=>g.id===id)||selectedGuide;document.querySelectorAll('[data-pin],[data-row]').forEach(e=>e.classList.toggle('active',(e.dataset.pin||e.dataset.row)===id));const status=document.getElementById('map-selection');if(status)status.textContent=`Selected: ${selectedGuide.title}`;}
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');if(!target)return;
    if(target.dataset.screen){location.hash=target.dataset.screen;return;}
    if(target.dataset.guide){selectGuide(target.dataset.guide);if(location.hash==='#guide')render();}
    if(target.dataset.save){const id=target.dataset.save;if(saved.has(id))saved.delete(id);else saved.add(id);document.querySelectorAll(`[data-save="${id}"]`).forEach(b=>{b.setAttribute('aria-pressed',String(saved.has(id)));if(b.classList.contains('bookmark'))b.setAttribute('aria-label',`${saved.has(id)?'Unsave':'Save'} guide`);else b.innerHTML=`${icon('bookmark')} ${saved.has(id)?'Saved':'Save for later'}`;});notify(saved.has(id)?'Saved in this preview.':'Removed from saved previews.');}
    if(target.dataset.categoryFilter){category=target.dataset.categoryFilter;document.querySelectorAll('[data-category-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.categoryFilter===category)));filter();}
    if(target.dataset.row||target.dataset.pin)selectGuide(target.dataset.row||target.dataset.pin);
    if(target.hasAttribute('data-memory'))notify('Locked memory: sign in and reach its location to reveal. This is a preview.');
    if(target.hasAttribute('data-reset')){search.value='';category='All';render();}
    if(target.hasAttribute('data-follow')){const active=target.getAttribute('aria-pressed')!=='true';target.setAttribute('aria-pressed',String(active));target.textContent=active?'Following Nino':'Follow Nino';notify('Follow preference changed in this preview only.');}
    if(target.hasAttribute('data-visited')){const done=target.getAttribute('aria-pressed')!=='true';target.setAttribute('aria-pressed',String(done));target.textContent=done?'Visited / undo':'Mark as visited';document.getElementById('progress').textContent=`${document.querySelectorAll('[data-visited][aria-pressed=true]').length} of 3`;}
    if(target.dataset.demo)notify(target.dataset.demo);
  });
  document.addEventListener('pointerover',e=>{const row=e.target.closest('[data-row]');if(row)document.querySelectorAll('[data-pin]').forEach(p=>p.classList.toggle('active',p.dataset.pin===row.dataset.row));});
  document.addEventListener('focusin',e=>{const row=e.target.closest('[data-row]');if(row)document.querySelectorAll('[data-pin]').forEach(p=>p.classList.toggle('active',p.dataset.pin===row.dataset.row));});
  document.addEventListener('change',e=>{if(e.target.id==='guide-layer'){document.querySelectorAll('[data-pin],#map-guides').forEach(p=>p.hidden=!e.target.checked);}if(e.target.id==='memory-layer')document.querySelectorAll('[data-memory]').forEach(p=>p.hidden=!e.target.checked);});
  search.addEventListener('input',()=>{if(!['','discover','collection'].includes(location.hash.slice(1)))location.hash='discover';filter();});
  document.querySelector('.search').addEventListener('submit',e=>{e.preventDefault();location.hash='collection';filter();});
  document.getElementById('clear').addEventListener('click',()=>{search.value='';filter();search.focus();});
  document.getElementById('direction').addEventListener('change',e=>location.href=e.target.value+location.hash);
  document.getElementById('tone').addEventListener('click',e=>{const alternate=document.body.dataset.mode!=='alternate';document.body.dataset.mode=alternate?'alternate':'';e.currentTarget.setAttribute('aria-pressed',String(alternate));});
  window.addEventListener('hashchange',render);
  render();
})();
