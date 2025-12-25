import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convertImages() {
  const logoDir = './public/assets/logos';
  const files = fs.readdirSync(logoDir).filter(f => f.endsWith('.png'));

  for (const file of files) {
    const inputPath = path.join(logoDir, file);
    const outputPath = path.join(logoDir, file.replace('.png', '.webp'));
    
    try {
      await sharp(inputPath)
        .webp({ quality: 85 })
        .toFile(outputPath);
      console.log(`Converted: ${file} -> ${file.replace('.png', '.webp')}`);
    } catch (err: any) {
      console.error(`Failed: ${file}`, err.message);
    }
  }
}

convertImages();
