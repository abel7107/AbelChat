-- CreateIndex
CREATE INDEX "conversation_members_conversation_id_user_id_idx" ON "conversation_members"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
