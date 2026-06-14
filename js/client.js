(function() {
  function switchLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-btn').forEach(function(btn) { btn.classList.remove('active'); });
    document.getElementById('lang-' + lang).classList.add('active');
    try { localStorage.setItem('lang', lang); } catch(e) {}
  }
  document.getElementById('lang-en').addEventListener('click', function() { switchLang('en'); });
  document.getElementById('lang-ja').addEventListener('click', function() { switchLang('ja'); });
  try {
    var saved = localStorage.getItem('lang');
    if (saved === 'ja') switchLang('ja');
  } catch(e) {}
})();
