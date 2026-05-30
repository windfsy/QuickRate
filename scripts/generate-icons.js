const sharp = require('sharp');
const path = require('path');

const sizes = [16, 48, 128];
const input = path.join(__dirname, '../public/icons/icon.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generate() {
  for (const size of sizes) {
    const output = path.join(outputDir, `icon${size}.png`);
    await sharp(input)
      .resize(size, size)
      .toFile(output);
    console.log(`Generated: icon${size}.png`);
  }
  console.log('Done!');
}

generate().catch(console.error);