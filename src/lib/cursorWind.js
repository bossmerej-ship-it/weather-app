const pointCount = 10;
const maxGap = 16;

function ribbonPath(points, length) {
  const nearEdge = [];
  const farEdge = [];
  const width = 9 * Math.min(1, length / 38);

  points.forEach((point, index) => {
    const ahead = points[Math.max(0, index - 1)];
    const behind = points[Math.min(points.length - 1, index + 1)];
    const dx = ahead.x - behind.x;
    const dy = ahead.y - behind.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    const progress = index / (points.length - 1);
    const halfWidth = width * Math.sin(Math.PI * progress) * (1 - .55 * progress);
    const offsetX = -dy / magnitude * halfWidth;
    const offsetY = dx / magnitude * halfWidth;
    nearEdge.push({ x: point.x + offsetX, y: point.y + offsetY });
    farEdge.push({ x: point.x - offsetX, y: point.y - offsetY });
  });

  const outline = [...nearEdge, ...farEdge.reverse()];
  const coordinates = ({ x, y }) => x.toFixed(1) + ' ' + y.toFixed(1);
  const midpoint = (a, b) => coordinates({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const curves = outline.map((point, index) => {
    const next = outline[(index + 1) % outline.length];
    return 'Q' + coordinates(point) + ' ' + midpoint(point, next);
  });
  return 'M' + midpoint(outline.at(-1), outline[0]) + curves.join('') + 'Z';
}

export function createCursorWind(path) {
  let points = [];
  let target;
  let lastFrame = 0;
  let lastMove = -Infinity;
  let opacity = 0;

  function clear() {
    points = [];
    lastMove = -Infinity;
    opacity = 0;
    path.removeAttribute('d');
    path.setAttribute('opacity', '0');
  }

  function move(x, y, timestamp) {
    if (points.length === 0) {
      points = Array.from({ length: pointCount }, () => ({ x, y }));
      target = { x, y };
      lastFrame = timestamp;
    } else if (x !== target.x || y !== target.y) {
      target = { x, y };
      lastMove = timestamp;
    }
  }

  function draw(timestamp) {
    if (points.length === 0 || lastMove === -Infinity) return false;
    const idle = timestamp - lastMove;
    const elapsed = Math.min(40, timestamp - lastFrame);
    lastFrame = timestamp;
    const moving = idle < 60;
    const desiredOpacity = moving ? .78 : 0;
    opacity += (desiredOpacity - opacity) * (1 - Math.exp(-elapsed / (moving ? 55 : 105)));
    if (idle > 600 || (!moving && opacity < .008)) {
      clear();
      return false;
    }

    const headPull = 1 - Math.exp(-elapsed / 25);
    // Let the tail linger briefly as it fades, instead of collapsing into the cursor.
    const tailTime = 24 + 70 * Math.max(0, Math.min(1, (idle - 35) / 125));
    const tailPull = 1 - Math.exp(-elapsed / tailTime);
    let length = 0;
    points.forEach((point, index) => {
      const leader = index === 0 ? target : points[index - 1];
      const dx = leader.x - point.x;
      const dy = leader.y - point.y;
      const distance = Math.hypot(dx, dy);
      // The tail bends through turns, with a limited stretch on fast swipes.
      const pull = index === 0 ? headPull : Math.max(tailPull, 1 - maxGap / (distance || 1));
      point.x += dx * pull;
      point.y += dy * pull;
      if (index !== 0) length += distance * (1 - pull);
    });

    if (length > 2) {
      path.setAttribute('d', ribbonPath(points, length));
      path.setAttribute('opacity', (opacity * Math.min(1, length / 22)).toFixed(3));
    } else {
      path.removeAttribute('d');
    }
    return true;
  }

  return { move, draw, clear };
}
