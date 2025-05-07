// Loads a grayscale PNG heightmap and returns a 2D array of normalized height values
// Usage: HeightmapLoader.load(url).then(heightData => ...)
import * as THREE from 'three';

class HeightmapLoader {
  static async load(url, size = 256) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.ImageLoader();
      loader.load(url, img => {
        // Draw image to canvas to extract pixel data
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size).data;
        // Convert to 2D array of height values [0,1]
        const heights = [];
        for (let y = 0; y < size; y++) {
          const row = [];
          for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            // Use R channel (assume grayscale)
            row.push(imageData[i] / 255);
          }
          heights.push(row);
        }
        resolve(heights);
      }, undefined, err => reject(err));
    });
  }
}

export default HeightmapLoader;
