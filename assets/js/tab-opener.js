function openOne(url) {
  if (!url) return false;
  const w = window.open(url, "_blank");
  return !!w;
}

function openMany(urls) {
  let success = 0;
  urls.forEach((u) => {
    if (openOne(u)) success += 1;
  });
  return success;
}
window.PttTabOpener = (function () {
  function openInNewTab(url) {
    if (!url) return;
    window.open(url, "_blank");
  }

  function openMany(urls) {
    urls.forEach((u) => {
      if (u) window.open(u, "_blank");
    });
  }

  return {
    openInNewTab,
    openMany
  };
})();
