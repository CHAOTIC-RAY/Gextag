fetch('https://unshorten.me/json/https://maps.app.goo.gl/y5H2Z')
  .then(res => res.json())
  .then(data => console.log("DATA:", data))
  .catch(err => console.error(err));
