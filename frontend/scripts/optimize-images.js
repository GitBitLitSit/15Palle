const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");

async function optimizeImage(sourcePath, outputPath, maxWidth = 1600) {
  const fullSource = path.join(publicDir, sourcePath);
  const fullOutput = path.join(publicDir, outputPath);

  if (!fs.existsSync(fullSource)) {
    console.error(`Source not found: ${fullSource}`);
    return false;
  }

  await sharp(fullSource)
    .resize(maxWidth, null, { withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(fullOutput);
  console.log(`Created ${outputPath}`);
  return true;
}

async function main() {
  // Lounge — regenerate from new launge.jpg
  await optimizeImage("new launge.jpg", "lounge.webp");
  console.log("Done.");
}

main().catch(console.error);
