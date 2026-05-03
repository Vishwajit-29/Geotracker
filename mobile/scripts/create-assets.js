const fs   = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// 1×1 transparent PNG — valid minimal PNG
const TRANSPARENT_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
  '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);

const files = ['icon.png', 'splash-icon.png', 'adaptive-icon.png', 'favicon.png', 'notification-icon.png'];
files.forEach(f => {
  const p = path.join(assetsDir, f);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, TRANSPARENT_PNG);
    console.log('created', f);
  } else {
    console.log('exists ', f);
  }
});
console.log('done');
