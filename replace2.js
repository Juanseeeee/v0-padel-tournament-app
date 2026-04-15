const fs = require('fs');
const file = 'c:/Users/juans/Desktop/padel-tournament-app/app/portal/torneo/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/j1a\.nombre \|\| \' \' \|\| LEFT\(j1a\.apellido, 1\)/g, "j1a.apellido || ' ' || LEFT(j1a.nombre, 1)");
content = content.replace(/j1b\.nombre \|\| \' \' \|\| LEFT\(j1b\.apellido, 1\)/g, "j1b.apellido || ' ' || LEFT(j1b.nombre, 1)");
content = content.replace(/j2a\.nombre \|\| \' \' \|\| LEFT\(j2a\.apellido, 1\)/g, "j2a.apellido || ' ' || LEFT(j2a.nombre, 1)");
content = content.replace(/j2b\.nombre \|\| \' \' \|\| LEFT\(j2b\.apellido, 1\)/g, "j2b.apellido || ' ' || LEFT(j2b.nombre, 1)");

content = content.replace(/CONCAT\(j1a\.nombre, \' \', LEFT\(j1a\.apellido, 1\), \'\. \/ \', j1b\.nombre, \' \', LEFT\(j1b\.apellido, 1\), \'\.\'\)/g, "CONCAT(j1a.apellido, ' ', LEFT(j1a.nombre, 1), '. / ', j1b.apellido, ' ', LEFT(j1b.nombre, 1), '.')");
content = content.replace(/CONCAT\(j2a\.nombre, \' \', LEFT\(j2a\.apellido, 1\), \'\. \/ \', j2b\.nombre, \' \', LEFT\(j2b\.apellido, 1\), \'\.\'\)/g, "CONCAT(j2a.apellido, ' ', LEFT(j2a.nombre, 1), '. / ', j2b.apellido, ' ', LEFT(j2b.nombre, 1), '.')");

fs.writeFileSync(file, content);
console.log("Done portal");