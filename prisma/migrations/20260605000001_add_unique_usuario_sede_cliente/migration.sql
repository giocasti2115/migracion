-- Remove duplicate rows before adding unique constraints
DELETE uvc1 FROM usuarios_vs_clientes uvc1
INNER JOIN usuarios_vs_clientes uvc2
  ON uvc1.id_usuario = uvc2.id_usuario
  AND uvc1.id_cliente = uvc2.id_cliente
  AND uvc1.id > uvc2.id;

DELETE uvs1 FROM usuarios_vs_sedes uvs1
INNER JOIN usuarios_vs_sedes uvs2
  ON uvs1.id_usuario = uvs2.id_usuario
  AND uvs1.id_sede = uvs2.id_sede
  AND uvs1.id > uvs2.id;

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_vs_clientes_id_usuario_id_cliente_key` ON `usuarios_vs_clientes`(`id_usuario`, `id_cliente`);

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_vs_sedes_id_usuario_id_sede_key` ON `usuarios_vs_sedes`(`id_usuario`, `id_sede`);
