(function () {
  var path = window.location.pathname;
  var slug = path.split('/').pop().toLowerCase().replace(/\.html$/, '');
  var page = '';
  if (slug === '' || slug === 'index') page = 'home';
  else if (slug === 'projects') page = 'projects';
  else if (slug === 'blog') page = 'blog';

  var links = [
    { href: '/', key: 'home', label: 'Home' },
    { href: 'projects.html', key: 'projects', label: 'Projects' },
    { href: 'blog.html', key: 'blog', label: 'Blog' },
    { href: page === 'home' ? '#contact' : '/#contact', key: 'contact', label: 'Contact' }
  ];

  var html = '<nav class="navbar">';
  html += '<a href="/" class="nav-brand">Justin Narciso<span class="period">.</span> <span class="scribble">marketing</span></a>';
  html += '<ul class="nav-links">';
  links.forEach(function (l) {
    html += '<li><a href="' + l.href + '"' + (l.key === page ? ' class="active"' : '') + '>' + l.label + '</a></li>';
  });
  html += '<li><a href="Justin_Narciso_resume.pdf" target="_blank" class="resume-link">resume &rarr;</a></li>';
  html += '</ul></nav>';

  document.write(html);
})();
