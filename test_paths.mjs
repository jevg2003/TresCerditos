import fs from 'node:fs';
import path from 'node:path';

const imagesDir = 'src/assets/images';
const files = fs.readdirSync(imagesDir);
console.log("Files in src/assets/images:");
files.forEach(f => console.log(` - ${f}`));

console.log("\nRelative path check for Products.astro:");
const productosList = [
  { nombre: "Lechona Tradicional", imagenPath: "../assets/images/imagen-05.png" },
  { nombre: "Cojín de Lechona", imagenPath: "../assets/images/imagen-03.png" },
  { nombre: "Pernil de Cerdo", imagenPath: "../assets/images/imagen-02.png" },
  { nombre: "Papa Rellena", imagenPath: "../assets/images/imagen-40.jpeg" },
  { nombre: "Empanada", imagenPath: "../assets/images/imagen-24.jpg" },
  { nombre: "Tamal con Lechona", imagenPath: "../assets/images/imagen-26.jpg" },
];

productosList.forEach(p => {
    const fullPath = path.join('src/components', p.imagenPath);
    console.log(`Checking ${p.nombre}: ${p.imagenPath} -> ${fullPath} exists? ${fs.existsSync(fullPath)}`);
});
