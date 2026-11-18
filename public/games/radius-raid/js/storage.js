// local storage helpers - source: http://stackoverflow.com/questions/2010892/storing-objects-in-html5-localstorage/3146971#3146971
Storage.prototype.setObject = function (key, value) {
  this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function (key) {
  let value = this.getItem(key);
  return value && JSON.parse(value);
};

Storage.prototype.removeObject = function (key) {
  this.removeItem(key);
};

$.setupStorage = function () {
  let saved; try { saved = JSON.parse(window.gameDeviceStorage.getItem("radiusraid")||"null"); } catch {}
  $.storage = saved || {
    mute: 0,
    score: 0,
    level: 0,
    rounds: 0,
    kills: 0,
    bullets: 0,
    powerups: 0,
    time: 0,
  };
};

$.updateStorage = function () {
  try { window.gameDeviceStorage.setItem("radiusraid", JSON.stringify($.storage)); } catch {}
};

$.clearStorage = function () {
  try { window.gameDeviceStorage.removeItem("radiusraid"); } catch {}
  $.setupStorage();
};

window.addEventListener("game-save-ready",function(){if($.setupStorage)$.setupStorage();});
