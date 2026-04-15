const fs = require('fs');

const files = [
  'c:/Users/juans/Desktop/padel-tournament-app/app/admin/torneo/[id]/page.tsx',
  'c:/Users/juans/Desktop/padel-tournament-app/app/calendario/[id]/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // React interpolation
  content = content.replace(/\{([a-zA-Z0-9_.]+)\.j1_nombre\} \{([a-zA-Z0-9_.]+)\.j1_apellido\?\.charAt\(0\)\}\./g, '{$1.j1_apellido} {$2.j1_nombre?.charAt(0)}.');
  content = content.replace(/\{([a-zA-Z0-9_.]+)\.j2_nombre\} \{([a-zA-Z0-9_.]+)\.j2_apellido\?\.charAt\(0\)\}\./g, '{$1.j2_apellido} {$2.j2_nombre?.charAt(0)}.');

  // Template literals ${w.j1_nombre}
  content = content.replace(/\$\{([a-zA-Z0-9_.]+)\.j1_nombre\} \$\{([a-zA-Z0-9_.]+)\.j1_apellido\?\.charAt\(0\)\}\./g, '${$1.j1_apellido} ${$2.j1_nombre?.charAt(0)}.');
  content = content.replace(/\$\{([a-zA-Z0-9_.]+)\.j2_nombre\} \$\{([a-zA-Z0-9_.]+)\.j2_apellido\?\.charAt\(0\)\}\./g, '${$1.j2_apellido} ${$2.j2_nombre?.charAt(0)}.');

  // jugador1_nombre etc
  content = content.replace(/\{([a-zA-Z0-9_.]+)\.jugador1_nombre\} \{([a-zA-Z0-9_.]+)\.jugador1_apellido\}/g, '{$1.jugador1_apellido} {$2.jugador1_nombre}');
  content = content.replace(/\{([a-zA-Z0-9_.]+)\.jugador2_nombre\} \{([a-zA-Z0-9_.]+)\.jugador2_apellido\}/g, '{$1.jugador2_apellido} {$2.jugador2_nombre}');
  
  // Calendario
  content = content.replace(/\{([a-zA-Z0-9_.]+)\.j1_nombre\?\.\[0\]\}\./g, '{$1.j1_nombre?.charAt(0)}.');
  content = content.replace(/\{([a-zA-Z0-9_.]+)\.j2_nombre\?\.\[0\]\}\./g, '{$1.j2_nombre?.charAt(0)}.');
  
  // Specific replacements that didn't match the regex nicely
  content = content.replace(/\$\{partido.p1_j1_apellido\} \$\{partido.p1_j1_nombre\?\.\[0\] \|\| \'\'\}\./g, '${partido.p1_j1_apellido} ${partido.p1_j1_nombre?.charAt(0) || ""}.');
  content = content.replace(/\$\{partido.p1_j2_apellido\} \$\{partido.p1_j2_nombre\?\.\[0\] \|\| \'\'\}\./g, '${partido.p1_j2_apellido} ${partido.p1_j2_nombre?.charAt(0) || ""}.');
  content = content.replace(/\$\{partido.p2_j1_apellido\} \$\{partido.p2_j1_nombre\?\.\[0\] \|\| \'\'\}\./g, '${partido.p2_j1_apellido} ${partido.p2_j1_nombre?.charAt(0) || ""}.');
  content = content.replace(/\$\{partido.p2_j2_apellido\} \$\{partido.p2_j2_nombre\?\.\[0\] \|\| \'\'\}\./g, '${partido.p2_j2_apellido} ${partido.p2_j2_nombre?.charAt(0) || ""}.');

  fs.writeFileSync(file, content);
}
console.log("Done");