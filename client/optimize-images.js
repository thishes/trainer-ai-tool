const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminWebp = require('imagemin-webp');
const path = require('path');

(async () => {
  const inputDir = path.join(__dirname, 'public');
  const outputDir = path.join(__dirname, 'public', 'optimized');

  console.log('开始压缩图片...');

  // 压缩 PNG
  await imagemin([path.join(inputDir, '*.png')], {
    destination: outputDir,
    plugins: [
      imageminPngquant({
        quality: [0.6, 0.8], // 质量 60-80%
        speed: 1 // 最慢但质量最好
      })
    ]
  });

  console.log('PNG 压缩完成');

  // 转换为 WebP
  await imagemin([path.join(inputDir, '*.png'), path.join(inputDir, '*.jpg')], {
    destination: outputDir,
    plugins: [
      imageminWebp({
        quality: 75,
        method: 6 // 最高压缩级别
      })
    ]
  });

  console.log('WebP 转换完成');
  console.log('优化后的图片在 public/optimized/ 目录');
})();
