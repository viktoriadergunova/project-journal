async function loadProjects() {
  const feed = document.getElementById('feed');
  try {
    const res = await fetch('projects.json', { cache: 'no-store' });
    const index = await res.json();

    if (!index.length) {
      feed.innerHTML = '<p class="empty">no entries yet.</p>';
      return;
    }

    // For each project, fetch all of its entry files in parallel.
    const projects = await Promise.all(index.map(async (proj) => {
      const files = Array.isArray(proj.entryFiles) ? proj.entryFiles : [];
      const entries = await Promise.all(files.map(async (path) => {
        try {
          const r = await fetch(path, { cache: 'no-store' });
          if (!r.ok) throw new Error(`${path}: ${r.status}`);
          return await r.json();
        } catch (err) {
          console.error('Failed to load entry file:', path, err);
          return null;
        }
      }));
      return { ...proj, entries: entries.filter(Boolean) };
    }));

    if (!projects.some(p => p.entries.length)) {
      feed.innerHTML = '<p class="empty">no entries yet.</p>';
      return;
    }

    const withSort = projects.map(p => ({
      project: p,
      latest: Math.max(...p.entries.map(e => new Date(e.date).getTime()), 0)
    }));
    withSort.sort((a, b) => b.latest - a.latest);

    feed.innerHTML = withSort.map(x => renderProject(x.project)).join('');

    if (window.renderMathInElement) {
      renderMathInElement(feed, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  } catch (err) {
    feed.innerHTML = '<p class="empty">could not load projects.json</p>';
    console.error(err);
  }
}

function renderProject(project) {
  const isDone = project.status === 'done';
  const initials = getInitials(project.title);
  const entries = [...(project.entries || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const statusLabel = isDone
    ? 'done' + (project.finished ? ' · ' + formatDate(project.finished) : '')
    : 'active';

  const entriesHtml = entries.map(renderEntry).join('');

  const sourcesHtml = Array.isArray(project.sources) && project.sources.length
    ? `
      <div class="sources">
        <div class="sources-label">SOURCES</div>
        <ul class="sources-list">
          ${project.sources.map(s => `<li>${formatText(s)}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  return `
    <article class="project ${isDone ? 'done' : ''}">
      <div class="project-head">
        <div class="project-icon">${initials}</div>
        <h2 class="project-title">${escapeHtml(project.title || '')}</h2>
        <span class="status ${isDone ? 'done' : 'active'}">${statusLabel}</span>
      </div>
      <div class="entries">${entriesHtml}${sourcesHtml}</div>
    </article>
  `;
}

function renderEntry(entry) {
  const body = Array.isArray(entry.body) ? entry.body : [entry.body];
  const paragraphs = body
    .map(p => {
      const isQuoted = p.trim().startsWith('"') && /["」]\.?\s*$/.test(p.trim());
      return isQuoted
        ? `<p class="quoted">${formatText(p)}</p>`
        : `<p>${formatText(p)}</p>`;
    })
    .join('');
  const imageList = Array.isArray(entry.images)
    ? entry.images
    : (entry.image ? [entry.image] : []);
  const images = imageList
    .map(src => `<img class="log-image" src="${src}" alt="" loading="lazy">`)
    .join('');

  const steps = Array.isArray(entry.steps)
    ? entry.steps.map(s => `
        <div class="log-step">
          <p>${formatText(s.text || '')}</p>
          ${s.image ? `<img class="log-image" src="${s.image}" alt="" loading="lazy">` : ''}
        </div>
      `).join('')
    : '';
  const closing = Array.isArray(entry.closing)
    ? `<div class="log-closing">${entry.closing.map(p => `<p>${formatText(p)}</p>`).join('')}</div>`
    : '';
  const closingImage = entry.closingImage
    ? `<img class="log-image" src="${entry.closingImage}" alt="" loading="lazy">`
    : '';
  const link = entry.link
    ? `<a class="log-link" href="${entry.link}" target="_blank" rel="noopener">view</a>`
    : '';

  const partLabel = entry.part
    ? `<span class="log-part">PART ${escapeHtml(String(entry.part))}</span>`
    : '';

  const subtitle = entry.subtitle
    ? `<span class="log-subtitle">${escapeHtml(entry.subtitle)}</span>`
    : '';

  return `
    <div class="log-entry is-collapsed">
      <div class="line"></div>
      <div class="log-body">
        <button type="button" class="log-meta" aria-expanded="false" onclick="const e=this.closest('.log-entry'); e.classList.toggle('is-collapsed'); this.setAttribute('aria-expanded', !e.classList.contains('is-collapsed'))">
          <span class="log-date">${formatDate(entry.date)}</span>
          ${partLabel}
          ${subtitle}
          <svg class="log-chevron" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M6 8 L10 12 L14 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="log-content">
          ${paragraphs}
          ${images}
          ${steps}
          ${closing}
          ${closingImage}
          ${link}
        </div>
      </div>
    </div>
  `;
}

function getInitials(title) {
  return (title || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatText(str) {
  return escapeHtml(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

loadProjects();
