-- Escala da fila administrativa: urgência persistente e índices de filtros.
-- Aplique com `npm run db:push` (ou execute este SQL uma única vez no TiDB/MySQL).
ALTER TABLE requests ADD COLUMN isUrgent TINYINT(1) NOT NULL DEFAULT 0;
CREATE INDEX requests_admin_queue_idx ON requests (neighborhood, status, createdAt);
CREATE INDEX requests_urgent_idx ON requests (isUrgent, status, createdAt);
CREATE INDEX resident_credentials_neighborhood_idx ON resident_credentials (neighborhood);
