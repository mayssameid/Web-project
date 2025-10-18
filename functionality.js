
(function () {
  /* ---------- Constants & Helpers ---------- */
  const FORUM_KEY = 'cod_forum_posts_v1';

  function safeParse(json) {
    try { return JSON.parse(json || '[]'); } catch (e) { return []; }
  }

  function readSaved() {
    return safeParse(localStorage.getItem(FORUM_KEY));
  }

  function saveEntry(entry) {
    const arr = readSaved();
    arr.unshift(entry);
    localStorage.setItem(FORUM_KEY, JSON.stringify(arr.slice(0, 500)));
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function truncate(s, n = 140) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* ---------- Feedback forum: render + form handling ---------- */
  function renderPosts() {
    const list = document.getElementById('feedback-list');
    if (!list) return;
    list.innerHTML = '';
    const arr = readSaved();
    if (!arr.length) return; // leave empty when no posts
    arr.forEach(item => {
      const post = document.createElement('article');
      post.className = 'forum-post';
      const challenges = (item.challenges && item.challenges.length)
        ? item.challenges.join(', ')
        : (item.challengesOther || '—');
      post.innerHTML = `
        <div class="title">${escapeHtml(item.title || item.name)} — ${escapeHtml(String(item.rating || '—'))}/5</div>
        <div class="meta">${escapeHtml(item.name)} • ${escapeHtml(item.email)} • ${escapeHtml(challenges)}</div>
        <div class="body">
          <strong>Likes:</strong> ${escapeHtml(item.like || '—')}<br>
          <strong>Dislikes:</strong> ${escapeHtml(item.dislike || '—')}<br>
          <strong>Features:</strong> ${escapeHtml(item.features || '—')}<br>
          <strong>Additional:</strong> ${escapeHtml(item.additional || '—')}
        </div>
      `;
      list.appendChild(post);
    });
  }

  function initForumForm() {
    const form = document.getElementById('feedback-form');
    if (!form) return;
    const status = document.getElementById('fb-status');
    const thankYou = document.getElementById('thank-you');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = (form.querySelector('#fb-name') || {}).value?.trim() || '';
      const email = (form.querySelector('#fb-email') || {}).value?.trim() || '';
      const title = (form.querySelector('#fb-title') || {}).value?.trim() || name;
      const ratingEl = form.querySelector('input[name="rating"]:checked');
      const rating = ratingEl ? Number(ratingEl.value) : null;
      const like = (form.querySelector('#fb-like') || {}).value?.trim() || '';
      const dislike = (form.querySelector('#fb-dislike') || {}).value?.trim() || '';
      const features = (form.querySelector('#fb-features') || {}).value?.trim() || '';
      const additional = (form.querySelector('#fb-additional') || {}).value?.trim() || '';
      const challenges = Array.from(form.querySelectorAll('input[name="challenges"]:checked')).map(i => i.value);
      const challengesOther = (form.querySelector('#challenges-other') || {}).value?.trim() || '';

      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!name || !email) {
        if (status) { status.textContent = 'Name and email are required.'; status.style.color = '#e94560'; }
        return;
      }
      if (!emailRe.test(email)) {
        if (status) { status.textContent = 'Enter a valid email.'; status.style.color = '#e94560'; }
        return;
      }
      if (!rating || rating < 1 || rating > 5) {
        if (status) { status.textContent = 'Please select a rating (1-5).'; status.style.color = '#e94560'; }
        return;
      }

      const entry = {
        title, name, email, rating, like, dislike, features, additional,
        challenges, challengesOther, created: Date.now()
      };

      saveEntry(entry);
      renderPosts();
      renderTestimonials();

      form.reset();
      if (status) { status.textContent = ''; }
      if (thankYou) {
        thankYou.style.display = 'block';
        setTimeout(() => { if (thankYou) thankYou.style.display = 'none'; }, 4500);
      }
    });
  }

  /* ---------- Testimonials: saved + sample filler ---------- */
  function getSampleTestimonials() {
    const samples = [
      { name: 'Lina', text: 'Love the pacing — quick rounds keep me coming back.' },
      { name: 'Omar', text: 'Multiplayer is fun.' },
      { name: 'Maya', text: 'Would love daily challenges.' },
    ];
    for (let i = samples.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [samples[i], samples[j]] = [samples[j], samples[i]];
    }
    return samples;
  }

  function renderTestimonials() {
    const target = document.getElementById('testimonials-list');
    if (!target) return;
    target.innerHTML = '';

    const arr = readSaved();
    const result = [];
    if (arr && arr.length) result.push(...arr.slice(0, 4));

    if (result.length < 4) {
      const samples = getSampleTestimonials();
      let i = 0;
      while (result.length < 4 && i < samples.length) {
        const s = samples[i++];
        if (!result.find(r => (r.name || '').toLowerCase() === (s.name || '').toLowerCase())) {
          result.push({ name: s.name, like: s.text, created: Date.now() });
        }
      }
    }

    result.slice(0, 4).forEach(item => {
      const text = item.like || item.features || item.additional || item.dislike || item.message || '';
      const el = document.createElement('div');
      el.className = 'testimonial';
      el.innerHTML = `
        <p class="testimonial-text">${escapeHtml(truncate(text.trim() || 'Shared feedback', 140))}</p>
        <p class="testimonial-author">— ${escapeHtml(item.name || 'Player')}</p>
      `;
      target.appendChild(el);
    });
  }

  /* ---------- Player input / startGame (kept separate) ---------- */
  function initPlayerInput() {
    const radios = Array.from(document.getElementsByName('game-mode') || []);
    const player2Section = document.querySelector('.multiplayer') || document.getElementById('player2-section');
    const player1Input = document.getElementById('player1');
    const player2Input = document.getElementById('player2');

    if (player2Section) player2Section.style.display = 'none';

    function updatePlayer2Visibility() {
      const checked = document.querySelector('input[name="game-mode"]:checked');
      const isMulti = checked && checked.value === 'multiplayer';
      if (player2Section) player2Section.style.display = isMulti ? 'block' : 'none';
      if (player2Input) {
        if (isMulti) player2Input.setAttribute('required', 'required');
        else player2Input.removeAttribute('required');
      }
    }

    radios.forEach(r => r.addEventListener('change', updatePlayer2Visibility));
    updatePlayer2Visibility();

    window.startGame = function () {
      const player1 = (player1Input && player1Input.value.trim()) || '';
      const player2 = (player2Input && player2Input.value.trim()) || '';
      const mode = (document.querySelector('input[name="game-mode"]:checked') || {}).value || 'single-player';
      const difficulty = (document.getElementById('difficulty') || {}).value || 'easy';

      if (mode === 'multiplayer' && (!player1 || !player2)) {
        alert('Please enter names for both players.');
        return;
      }

      sessionStorage.setItem('player1', player1);
      sessionStorage.setItem('player2', player2);
      sessionStorage.setItem('mode', mode);
      sessionStorage.setItem('difficulty', difficulty);

      window.location.href = 'arena.html';
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderPosts();
    renderTestimonials();
    initForumForm();
    initPlayerInput();
  });
})();

(function () {
  const KEY = 'simple_lb_v1';
  const form = document.getElementById('lb-form');
  const nameInput = document.getElementById('lb-name');
  const scoreInput = document.getElementById('lb-score');
  const tbody = document.getElementById('leaderboard-list');
  const clearBtn = document.getElementById('clear-btn');
  const sampleBtn = document.getElementById('sample-btn');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');

  function safeParse(v) { try { return JSON.parse(v || '[]'); } catch { return []; } }
  function read() { return safeParse(localStorage.getItem(KEY)); }
  function write(arr) { localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 200))); }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function render() {
    const arr = read().slice().sort((a,b) => Number(b.score) - Number(a.score));
    tbody.innerHTML = '';
    arr.forEach((it, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px">${i+1}</td>
        <td style="padding:8px">${esc(it.name)}</td>
        <td style="padding:8px">${esc(String(it.score))}</td>
        <td style="padding:8px">
          <button class="delete-btn" data-id="${it.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function addEntry(name, score) {
    const arr = read();
    arr.push({ id: Date.now(), name: (name||'Player').trim(), score: Number(score) || 0, created: Date.now() });
    write(arr);
    render();
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      addEntry(nameInput.value, scoreInput.value);
      form.reset();
      nameInput.focus();
    });
  }

  // delete via event delegation
  tbody.addEventListener('click', function (e) {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const arr = read().filter(x => x.id !== id);
    write(arr);
    render();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (!confirm('Clear leaderboard?')) return;
      localStorage.removeItem(KEY);
      render();
    });
  }

  if (sampleBtn) {
    sampleBtn.addEventListener('click', function () {
      const samples = [
        { id: Date.now()+1, name: 'Lina', score: 95, created: Date.now()-60000 },
        { id: Date.now()+2, name: 'Omar', score: 88, created: Date.now()-120000 },
        { id: Date.now()+3, name: 'Maya', score: 76, created: Date.now()-180000 }
      ];
      const merged = read().concat(samples);
      write(merged);
      render();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      const data = JSON.stringify(read(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'leaderboard.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', function (e) {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const imported = safeParse(r.result).filter(it => it && it.name && !isNaN(Number(it.score)));
        if (!imported.length) { alert('No valid entries found'); importFile.value = ''; return; }
        const merged = read().concat(imported.map(x => ({ id: Date.now()+Math.random(), name: x.name, score: Number(x.score), created: x.created || Date.now() })));
        write(merged);
        render();
        importFile.value = '';
      };
      r.readAsText(f);
    });
  }

  // initial render
  render();
})();
