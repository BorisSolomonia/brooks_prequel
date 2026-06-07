-- Linked / reply memories: a reply is a memory whose parent_memory_id points at the memory it
-- was added to. Self-referential, nullable (NULL = a top-level memory). Supports arbitrary nesting.
ALTER TABLE memories ADD COLUMN IF NOT EXISTS parent_memory_id UUID REFERENCES memories(id);
CREATE INDEX IF NOT EXISTS idx_memories_parent_memory_id ON memories(parent_memory_id);
