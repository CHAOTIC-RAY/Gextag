const fetchUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://maps.app.goo.gl/r3aCj1VwzR3n2s17A');
fetch(fetchUrl)
  .then(res => res.json())
  .then(data => console.log(data.status))
  .catch(err => console.error(err));
