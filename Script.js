async function loadProjects() {
  const feed = document.getElementById('feed');
  try {
    const res = await fetch('projects.json', { cache: 'no-store' });
    const projects = await res.json();

    if (!projects.length) {
      feed.innerHTML = '<p class="empty">no entries yet.</p>';
      return;
    }

    const withSort = projects.map(p => ({
      project: p,
      latest: Math.max(...p.entries.map(e => new Date(e.date).getTime()), 0)
    }));
    withSort.sort((a, b) => b.latest - a.latest);

    feed.innerHTML = withSort.map(x => renderProject(x.project)).join('');
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

  return `
    <article class="project ${isDone ? 'done' : ''}">
      <div class="project-head">
        <div class="project-icon">${initials}</div>
        <h2 class="project-title">${escapeHtml(project.title || '')}</h2>
        <span class="status ${isDone ? 'done' : 'active'}">${statusLabel}</span>
      </div>
      <div class="entries">${entriesHtml}</div>
    </article>
  `;
}

function renderEntry(entry) {
  const body = Array.isArray(entry.body) ? entry.body : [entry.body];
  const paragraphs = body.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  const image = entry.image
    ? `<img class="log-image" src="${entry.image}" alt="" loading="lazy">`
    : '';
  const link = entry.link
    ? `<a class="log-link" href="${entry.link}" target="_blank" rel="noopener">view</a>`
    : '';

  return `
    <div class="log-entry">
      <div class="line"></div>
      <div class="log-body">
        <div class="log-date">${formatDate(entry.date)}</div>
        ${paragraphs}
        ${image}
        ${link}
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

loadProjects();
