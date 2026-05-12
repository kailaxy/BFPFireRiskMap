// Small helper to smoothly animate map zoom in steps. Works with map objects that implement getZoom/setZoom.
export function smoothPanAndZoom(map, targetZoom, steps = 8, delay = 25) {
  try {
    const current = map.getZoom();
    if (current === undefined || current === null) {
      map.setZoom(targetZoom);
      return;
    }
    const delta = (targetZoom - current) / steps;
    let i = 1;
    const t = setInterval(() => {
      try {
        const z = current + delta * i;
        map.setZoom(Math.round(z * 100) / 100);
        i += 1;
        if (i > steps) {
          clearInterval(t);
          map.setZoom(targetZoom);
        }
      } catch (err) {
        clearInterval(t);
      }
    }, delay);
  } catch (err) {
    try { map.setZoom(targetZoom); } catch (e) {}
  }
}

export default smoothPanAndZoom;
