// MBA Wiki shared JS — language toggle + search
(function(){
  var saved = localStorage.getItem('mbaLang') || 'en';
  if(saved === 'ar') document.body.classList.add('lang-ar');
  var btn = document.getElementById('langBtn');
  function label(){ btn.textContent = document.body.classList.contains('lang-ar') ? 'English' : 'عربي'; }
  if(btn){
    label();
    btn.onclick = function(){
      document.body.classList.toggle('lang-ar');
      localStorage.setItem('mbaLang', document.body.classList.contains('lang-ar') ? 'ar' : 'en');
      label();
    };
  }
  var s = document.getElementById('search');
  if(s){
    s.addEventListener('input', function(){
      var q = s.value.trim().toLowerCase();
      document.querySelectorAll('[data-search]').forEach(function(el){
        el.classList.toggle('hidden', q !== '' && el.getAttribute('data-search').toLowerCase().indexOf(q) === -1);
      });
      document.querySelectorAll('.letter').forEach(function(h){ h.classList.toggle('hidden', q !== ''); });
    });
  }
})();
