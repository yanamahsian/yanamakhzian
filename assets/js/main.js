(function(){
  // language toggle — persisted across page loads
  function applyLang(lang){
    document.body.setAttribute('data-lang', lang);
    document.querySelectorAll('.t').forEach(function(el){
      var v = el.getAttribute('data-' + lang);
      if(v !== null) el.innerHTML = v;
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
    });
    document.documentElement.setAttribute('lang', lang);
  }

  var storedLang = 'ru';
  try{ storedLang = localStorage.getItem('anki-lang') || 'ru'; }catch(e){}
  applyLang(storedLang);

  document.querySelectorAll('[data-lang-btn]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var lang = btn.getAttribute('data-lang-btn');
      applyLang(lang);
      try{ localStorage.setItem('anki-lang', lang); }catch(e){}
    });
  });

  // mobile overlay menu
  var overlay = document.getElementById('overlayMenu');
  var openBtn = document.getElementById('menuOpen');
  var closeBtn = document.getElementById('menuClose');
  if(openBtn){ openBtn.addEventListener('click', function(){ overlay.classList.add('open'); }); }
  if(closeBtn){ closeBtn.addEventListener('click', function(){ overlay.classList.remove('open'); }); }

  // questionnaire submission — real Formspree POST, no simulated success
  document.querySelectorAll('.qForm').forEach(function(qForm){
    var confirmEl = qForm.querySelector('.q-confirm');
    var errorEl = qForm.querySelector('.q-error');
    var submitBtn = qForm.querySelector('.q-submit');

    qForm.addEventListener('submit', function(e){
      e.preventDefault();
      if(errorEl){ errorEl.classList.remove('show'); }
      if(confirmEl){ confirmEl.classList.remove('show'); }
      if(submitBtn){ submitBtn.disabled = true; }

      var formData = new FormData(qForm);

      fetch(qForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(function(response){
        if(response.ok){
          if(confirmEl){ confirmEl.classList.add('show'); }
          qForm.reset();
        } else {
          if(errorEl){ errorEl.classList.add('show'); }
        }
      }).catch(function(){
        if(errorEl){ errorEl.classList.add('show'); }
      }).finally(function(){
        if(submitBtn){ submitBtn.disabled = false; }
      });
    });
  });
})();
